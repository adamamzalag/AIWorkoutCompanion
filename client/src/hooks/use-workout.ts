import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import type { ExerciseLog } from '@/lib/types';

export function useWorkout(workoutId: number, userId: number) {
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [exercises, setExercises] = useState<ExerciseLog[]>([]);
  const [isActive, setIsActive] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [exerciseCompletions, setExerciseCompletions] = useState<any[]>([]);

  // Phase 2: Feature flag for unified completion system
  const USE_TIMESTAMP_COMPLETION = false;

  const queryClient = useQueryClient();

  const checkResumableSessionMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/workout-session/resumable/${userId}/${workoutId}`);
      if (response.ok) {
        return response.json();
      }
      return null;
    }
  });

  const loadExerciseCompletionsMutation = useMutation({
    mutationFn: async (sessionId: number) => {
      const response = await fetch(`/api/workout-session/${sessionId}/completions`);
      if (response.ok) {
        return response.json();
      }
      return [];
    },
    onSuccess: (completions) => {
      setExerciseCompletions(completions);
    }
  });

  const startSessionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/workout-sessions', {
        workoutId,
        userId,
        exercises: []
      });
      return response.json();
    },
    onSuccess: (session) => {
      setSessionId(session.id);
      setIsActive(true);
      setStartTime(new Date());
      queryClient.invalidateQueries({ queryKey: ['/api/workout-sessions', userId] });
    }
  });

  const updateSessionMutation = useMutation({
    mutationFn: async (data: { exercises: ExerciseLog[]; completedAt?: Date; duration?: number; notes?: string }) => {
      if (!sessionId) throw new Error('No active session');
      const response = await apiRequest('PUT', `/api/workout-session/${sessionId}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workout-sessions', userId] });
    }
  });

  const coachingTipMutation = useMutation({
    mutationFn: async (data: { exercise: string; userPerformance: any }) => {
      const response = await apiRequest('POST', '/api/coaching-tip', {
        ...data,
        userId
      });
      return response.json();
    }
  });

  const completeExerciseMutation = useMutation({
    mutationFn: async (data: { 
      exerciseId: number; 
      exerciseIndex: number; 
      completedSets: any[]; 
      completionNotes?: string;
      skipped?: boolean;
      autoCompleted?: boolean;
    }) => {
      if (!sessionId) throw new Error('No active session');
      const response = await apiRequest('POST', `/api/workout-session/${sessionId}/complete-exercise`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workout-sessions', userId] });
    }
  });

  // Phase 2: Unified completion system with synchronization
  
  const getCompletionStatus = useCallback((exerciseIndex: number) => {
    const exercise = exercises[exerciseIndex];
    const dbCompletion = exerciseCompletions.find(c => c.exerciseIndex === exerciseIndex);
    const hasTimestamp = !!exercise?.completedAt;
    const hasDbRecord = !!dbCompletion;
    
    return {
      isCompleted: USE_TIMESTAMP_COMPLETION ? hasTimestamp : (hasTimestamp || hasDbRecord),
      completionMethod: hasTimestamp && hasDbRecord ? 'both' : hasTimestamp ? 'timestamp' : hasDbRecord ? 'database' : 'none',
      completedAt: exercise?.completedAt || (dbCompletion ? new Date(dbCompletion.completedAt) : null),
      dbRecord: dbCompletion,
      needsSync: hasTimestamp !== hasDbRecord
    };
  }, [exercises, exerciseCompletions, USE_TIMESTAMP_COMPLETION]);

  const isExerciseCompleted = useCallback((exerciseIndex: number) => {
    return getCompletionStatus(exerciseIndex).isCompleted;
  }, [getCompletionStatus]);

  // Phase 2: Completion state synchronization
  const syncCompletionState = useCallback(async (exerciseIndex: number) => {
    const status = getCompletionStatus(exerciseIndex);
    
    if (status.needsSync) {
      console.log(`Phase 2: Syncing completion state for exercise ${exerciseIndex}`, status);
      
      if (status.completionMethod === 'timestamp' && !status.dbRecord) {
        // Exercise has timestamp but no database record - create DB record
        const exercise = exercises[exerciseIndex];
        if (exercise && sessionId) {
          try {
            await completeExerciseMutation.mutateAsync({
              exerciseId: exercise.exerciseId || 0,
              exerciseIndex,
              completedSets: exercise.sets || [],
              completionNotes: `Auto-synced from timestamp completion`,
              skipped: exercise.skipped || false,
              autoCompleted: true
            });
            console.log(`Phase 2: Created database record for timestamp completion`);
          } catch (error) {
            console.warn(`Phase 2: Failed to sync timestamp to database:`, error);
          }
        }
      } else if (status.completionMethod === 'database' && !status.completedAt) {
        // Exercise has database record but no timestamp - add timestamp
        setExercises(prev => {
          const updated = [...prev];
          if (updated[exerciseIndex] && status.dbRecord) {
            updated[exerciseIndex] = {
              ...updated[exerciseIndex],
              completedAt: new Date(status.dbRecord.completedAt),
              skipped: status.dbRecord.skipped
            };
          }
          return updated;
        });
        console.log(`Phase 2: Added timestamp from database completion`);
      }
    }
  }, [getCompletionStatus, exercises, sessionId, completeExerciseMutation, setExercises]);

  // Phase 1: Completion state validator (enhanced for Phase 2)
  const validateCompletionConsistency = useCallback(() => {
    const inconsistencies: any[] = [];
    const syncNeeded: number[] = [];
    
    exercises.forEach((exercise, index) => {
      const status = getCompletionStatus(index);
      
      if (status.needsSync) {
        inconsistencies.push({
          index,
          exerciseName: exercise.name,
          hasTimestamp: !!exercise.completedAt,
          inDatabase: !!status.dbRecord,
          timestampValue: exercise.completedAt,
          completionMethod: status.completionMethod
        });
        syncNeeded.push(index);
      }
    });
    
    if (inconsistencies.length > 0) {
      console.warn('Phase 2: Completion state inconsistencies detected:', inconsistencies);
      console.log('Phase 2: Exercises needing sync:', syncNeeded);
    }
    
    return { inconsistencies, syncNeeded };
  }, [exercises, getCompletionStatus]);

  const resumeSession = useCallback((session: any, completions: any[]) => {
    setSessionId(session.id);
    setIsActive(true);
    
    // Phase 1: Safe date handling for the toLocaleTimeString fix
    const startDate = session.startedAt ? new Date(session.startedAt) : new Date();
    if (isNaN(startDate.getTime())) {
      console.warn('Invalid session start date, using current time');
      setStartTime(new Date());
    } else {
      setStartTime(startDate);
    }
    
    setExerciseCompletions(completions);
    
    // Phase 2: Sync completion states when resuming session
    setExercises(prev => {
      const updated = [...prev];
      completions.forEach((completion: any) => {
        if (updated[completion.exerciseIndex]) {
          updated[completion.exerciseIndex] = {
            ...updated[completion.exerciseIndex],
            completedAt: new Date(completion.completedAt),
            skipped: completion.skipped
          };
        }
      });
      return updated;
    });
    
    // Find the next incomplete exercise
    const lastCompletedIndex = Math.max(...completions.map((c: any) => c.exerciseIndex), -1);
    setCurrentExerciseIndex(lastCompletedIndex + 1);
    
    queryClient.invalidateQueries({ queryKey: ['/api/workout-sessions', userId] });
  }, [queryClient, userId]);

  const startWorkout = useCallback(async (initialExercises: ExerciseLog[]) => {
    setExercises(initialExercises);
    
    // Check for resumable session first
    const existingSession = await checkResumableSessionMutation.mutateAsync();
    
    if (existingSession) {
      // Load completions and resume
      const completions = await loadExerciseCompletionsMutation.mutateAsync(existingSession.id);
      resumeSession(existingSession, completions);
    } else {
      // Start new session
      setCurrentExerciseIndex(0);
      startSessionMutation.mutate();
    }
  }, [startSessionMutation, checkResumableSessionMutation, loadExerciseCompletionsMutation, resumeSession]);

  const completeSet = useCallback((exerciseIndex: number, setIndex: number, setData: { reps: number; weight?: number; duration?: number; actualReps?: number; actualWeight?: number; actualDuration?: number }) => {
    const completionTime = new Date();
    
    setExercises(prev => {
      const updated = [...prev];
      if (updated[exerciseIndex]?.sets[setIndex]) {
        const currentSet = updated[exerciseIndex].sets[setIndex];
        updated[exerciseIndex].sets[setIndex] = {
          ...currentSet,
          // Update planned values if provided
          ...(setData.reps !== undefined && { reps: setData.reps }),
          ...(setData.weight !== undefined && { weight: setData.weight }),
          ...(setData.duration !== undefined && { duration: setData.duration }),
          // Track actual performance
          actualReps: setData.actualReps ?? setData.reps,
          actualWeight: setData.actualWeight ?? setData.weight,
          actualDuration: setData.actualDuration ?? setData.duration
        };
      }
      return updated;
    });

    // Auto-save progress with enhanced data
    const updatedExercises = [...exercises];
    if (updatedExercises[exerciseIndex]?.sets[setIndex]) {
      const currentSet = updatedExercises[exerciseIndex].sets[setIndex];
      updatedExercises[exerciseIndex].sets[setIndex] = {
        ...currentSet,
        // Update planned values if provided
        ...(setData.reps !== undefined && { reps: setData.reps }),
        ...(setData.weight !== undefined && { weight: setData.weight }),
        ...(setData.duration !== undefined && { duration: setData.duration }),
        // Track actual performance
        actualReps: setData.actualReps ?? setData.reps,
        actualWeight: setData.actualWeight ?? setData.weight,
        actualDuration: setData.actualDuration ?? setData.duration
      };
      
      updateSessionMutation.mutate({ exercises: updatedExercises });
    }
  }, [exercises, updateSessionMutation]);

  const nextExercise = useCallback(() => {
    if (currentExerciseIndex < exercises.length - 1) {
      setCurrentExerciseIndex(prev => prev + 1);
    }
  }, [currentExerciseIndex, exercises.length]);

  const previousExercise = useCallback(() => {
    if (currentExerciseIndex > 0) {
      setCurrentExerciseIndex(prev => prev - 1);
    }
  }, [currentExerciseIndex]);

  const goToExercise = useCallback((index: number) => {
    if (index >= 0 && index < exercises.length) {
      setCurrentExerciseIndex(index);
    }
  }, [exercises.length]);

  const addSet = useCallback((exerciseIndex: number) => {
    setExercises(prev => {
      const updated = [...prev];
      if (updated[exerciseIndex]) {
        const lastSet = updated[exerciseIndex].sets[updated[exerciseIndex].sets.length - 1];
        const newSet = {
          reps: lastSet?.reps || 0,
          weight: lastSet?.weight,
          repInfo: lastSet?.repInfo
        };
        updated[exerciseIndex].sets.push(newSet);
        
        updateSessionMutation.mutate({ exercises: updated });
      }
      return updated;
    });
  }, [updateSessionMutation]);

  const removeSet = useCallback((exerciseIndex: number, setIndex: number) => {
    setExercises(prev => {
      const updated = [...prev];
      if (updated[exerciseIndex] && updated[exerciseIndex].sets.length > 1) {
        updated[exerciseIndex].sets.splice(setIndex, 1);
        
        updateSessionMutation.mutate({ exercises: updated });
      }
      return updated;
    });
  }, [updateSessionMutation]);

  const completeExercise = useCallback((exerciseId: number, completedSets: any[], options?: { 
    skipped?: boolean; 
    autoCompleted?: boolean; 
    notes?: string 
  }) => {
    const completionTime = new Date();
    
    // Update local state for immediate UI feedback
    setExercises(prev => {
      const updated = [...prev];
      if (updated[currentExerciseIndex]) {
        updated[currentExerciseIndex] = {
          ...updated[currentExerciseIndex],
          completedAt: completionTime,
          skipped: options?.skipped || false
        };
      }
      return updated;
    });

    // Save to database via new API
    completeExerciseMutation.mutate({
      exerciseId: exerciseId,
      exerciseIndex: currentExerciseIndex,
      completedSets,
      completionNotes: options?.notes,
      skipped: options?.skipped || false,
      autoCompleted: options?.autoCompleted || false
    });
  }, [completeExerciseMutation, currentExerciseIndex]);

  const completeWorkout = useCallback(() => {
    if (startTime) {
      const endTime = new Date();
      const duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));
      
      updateSessionMutation.mutate({
        exercises,
        completedAt: endTime,
        duration
      });
    }
    
    setIsActive(false);
    setSessionId(null);
    setStartTime(null);
  }, [exercises, startTime, updateSessionMutation]);

  const getCoachingTip = useCallback((exerciseName: string, performance: any) => {
    coachingTipMutation.mutate({
      exercise: exerciseName,
      userPerformance: performance
    });
  }, [coachingTipMutation]);

  const currentExercise = exercises[currentExerciseIndex];
  const isLastExercise = currentExerciseIndex >= exercises.length - 1;
  const isFirstExercise = currentExerciseIndex === 0;

  return {
    // State
    currentExerciseIndex,
    currentExercise,
    exercises,
    isActive,
    sessionId,
    startTime,
    isLastExercise,
    isFirstExercise,
    exerciseCompletions,
    
    // Actions
    startWorkout,
    completeSet,
    completeExercise,
    nextExercise,
    previousExercise,
    goToExercise,
    completeWorkout,
    getCoachingTip,
    resumeSession,
    
    // Phase 2: Unified completion functions
    isExerciseCompleted,
    getCompletionStatus,
    syncCompletionState,
    validateCompletionConsistency,
    
    // Loading states
    isStarting: startSessionMutation.isPending,
    isUpdating: updateSessionMutation.isPending,
    isCompletingExercise: completeExerciseMutation.isPending,
    isGettingTip: coachingTipMutation.isPending,
    isCheckingResumable: checkResumableSessionMutation.isPending,
    
    // Data
    coachingTip: coachingTipMutation.data?.tip
  };
}
