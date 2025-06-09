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
  const [completedExercises, setCompletedExercises] = useState<Set<number>>(new Set());

  const queryClient = useQueryClient();

  const findOrCreateSessionMutation = useMutation({
    mutationFn: async () => {
      // First, check for resumable session
      const resumableResponse = await apiRequest('GET', `/api/workout-sessions/find-resumable/${workoutId}/${userId}`);
      const { session: resumableSession } = await resumableResponse.json();
      
      if (resumableSession) {
        // Resume existing session
        const resumeResponse = await apiRequest('GET', `/api/workout-sessions/${resumableSession.id}/resume`);
        const resumedSession = await resumeResponse.json();
        return { session: resumedSession, isResume: true };
      } else {
        // Create new session
        const response = await apiRequest('POST', '/api/workout-sessions', {
          workoutId,
          userId,
          exercises: []
        });
        const session = await response.json();
        return { session, isResume: false };
      }
    },
    onSuccess: ({ session, isResume }) => {
      setSessionId(session.id);
      setIsActive(true);
      
      if (isResume) {
        // Restore session state
        const sessionExercises = session.exercises || [];
        setExercises(sessionExercises);
        
        // Find current exercise index based on completion status
        const lastIncompleteIndex = sessionExercises.findIndex((ex: any) => 
          !ex.completed && !ex.skipped
        );
        setCurrentExerciseIndex(lastIncompleteIndex >= 0 ? lastIncompleteIndex : 0);
        
        // Restore completed exercises set
        const completed = new Set<number>();
        sessionExercises.forEach((ex: any, index: number) => {
          if (ex.completed) completed.add(index);
        });
        setCompletedExercises(completed);
        
        setStartTime(new Date(session.startedAt));
      } else {
        setStartTime(new Date());
      }
      
      queryClient.invalidateQueries({ queryKey: ['/api/workout-sessions', userId] });
    }
  });

  const updateExerciseProgressMutation = useMutation({
    mutationFn: async (data: { exerciseIndex: number; exerciseData: any }) => {
      if (!sessionId) throw new Error('No active session');
      const response = await apiRequest('PATCH', `/api/workout-sessions/${sessionId}/exercise-progress`, data);
      return response.json();
    },
    onSuccess: (updatedSession) => {
      // Update local state with server response
      setExercises(updatedSession.exercises || []);
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

  const completeExercise = useCallback((exerciseIndex: number, completed: boolean = true, skipped: boolean = false) => {
    const exerciseData = {
      completed,
      skipped,
      completedAt: completed ? new Date().toISOString() : null
    };
    
    updateExerciseProgressMutation.mutate({ exerciseIndex, exerciseData });
    
    if (completed) {
      setCompletedExercises(prev => new Set(prev).add(exerciseIndex));
    }
  }, [updateExerciseProgressMutation]);

  const skipExercise = useCallback((exerciseIndex: number) => {
    completeExercise(exerciseIndex, false, true);
  }, [completeExercise]);

  const startWorkout = useCallback((initialExercises: ExerciseLog[]) => {
    setExercises(initialExercises);
    setCurrentExerciseIndex(0);
    findOrCreateSessionMutation.mutate();
  }, [findOrCreateSessionMutation]);

  const completeSet = useCallback((exerciseIndex: number, setIndex: number, setData: { reps: number; weight?: number; duration?: number; actualReps?: number; actualWeight?: number; actualDuration?: number }) => {
    const completionTime = new Date();
    
    setExercises(prev => {
      const updated = [...prev];
      if (updated[exerciseIndex]?.sets[setIndex]) {
        const currentSet = updated[exerciseIndex].sets[setIndex];
        const updatedSet = {
          ...currentSet,
          // Update planned values if provided
          ...(setData.reps !== undefined && { reps: setData.reps }),
          ...(setData.weight !== undefined && { weight: setData.weight }),
          ...(setData.duration !== undefined && { duration: setData.duration }),
          // Track actual performance
          actualReps: setData.actualReps ?? setData.reps,
          actualWeight: setData.actualWeight ?? setData.weight,
          actualDuration: setData.actualDuration ?? setData.duration,
          completedAt: completionTime
        };
        updated[exerciseIndex].sets[setIndex] = updatedSet;
        
        // Auto-save to database using new session-based tracking
        updateExerciseProgressMutation.mutate({ 
          exerciseIndex, 
          exerciseData: updated[exerciseIndex] 
        });
      }
      return updated;
    });
  }, [updateExerciseProgressMutation]);

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
          duration: lastSet?.duration
        };
        updated[exerciseIndex].sets.push(newSet);
        
        // Auto-save to database
        updateExerciseProgressMutation.mutate({ 
          exerciseIndex, 
          exerciseData: updated[exerciseIndex] 
        });
      }
      return updated;
    });
  }, [updateExerciseProgressMutation]);

  const removeSet = useCallback((exerciseIndex: number, setIndex: number) => {
    setExercises(prev => {
      const updated = [...prev];
      if (updated[exerciseIndex] && updated[exerciseIndex].sets.length > 1) {
        updated[exerciseIndex].sets.splice(setIndex, 1);
        
        // Auto-save to database
        updateExerciseProgressMutation.mutate({ 
          exerciseIndex, 
          exerciseData: updated[exerciseIndex] 
        });
      }
      return updated;
    });
  }, [updateExerciseProgressMutation]);

  const completeWorkout = useCallback(() => {
    if (startTime) {
      const endTime = new Date();
      const duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));
      
      updateSessionMutation.mutate({
        exercises,
        completedAt: endTime,
        duration
      });
      
      setIsActive(false);
    }
  }, [exercises, startTime, updateSessionMutation]);

  const pauseWorkout = useCallback(() => {
    setIsActive(false);
    if (sessionId) {
      // Save current state when pausing
      updateExerciseProgressMutation.mutate({ 
        exerciseIndex: currentExerciseIndex, 
        exerciseData: exercises[currentExerciseIndex] 
      });
    }
  }, [sessionId, currentExerciseIndex, exercises, updateExerciseProgressMutation]);

  const resumeWorkout = useCallback(() => {
    setIsActive(true);
  }, []);

  const getCoachingTip = useCallback((exercise: string, userPerformance: any) => {
    coachingTipMutation.mutate({ exercise, userPerformance });
  }, [coachingTipMutation]);

  const workoutProgress = {
    completedCount: completedExercises.size,
    totalCount: exercises.length,
    percentage: exercises.length > 0 ? Math.round((completedExercises.size / exercises.length) * 100) : 0
  };

  return {
    // State
    exercises,
    currentExerciseIndex,
    sessionId,
    isActive,
    startTime,
    completedExercises,
    workoutProgress,
    
    // Actions
    startWorkout,
    completeSet,
    completeExercise,
    skipExercise,
    nextExercise,
    previousExercise,
    goToExercise,
    addSet,
    removeSet,
    completeWorkout,
    pauseWorkout,
    resumeWorkout,
    getCoachingTip,
    
    // Mutation states
    isStarting: findOrCreateSessionMutation.isPending,
    isUpdating: updateExerciseProgressMutation.isPending || updateSessionMutation.isPending,
    coachingTip: coachingTipMutation.data?.tip,
    isLoadingTip: coachingTipMutation.isPending
  };
}