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
    mutationFn: async (sessionData: { exercises: ExerciseLog[]; notes?: string }) => {
      if (!sessionId) throw new Error('No active session');
      const response = await apiRequest('PATCH', `/api/workout-sessions/${sessionId}`, sessionData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workout-sessions', userId] });
    }
  });

  const completeExerciseMutation = useMutation({
    mutationFn: async (data: { 
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

  const resumeSession = useCallback((session: any, completions: any[]) => {
    setSessionId(session.id);
    setIsActive(true);
    setStartTime(new Date(session.startedAt));
    setExerciseCompletions(completions);
    
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
        ...(setData.reps !== undefined && { reps: setData.reps }),
        ...(setData.weight !== undefined && { weight: setData.weight }),
        ...(setData.duration !== undefined && { duration: setData.duration }),
        actualReps: setData.actualReps ?? setData.reps,
        actualWeight: setData.actualWeight ?? setData.weight,
        actualDuration: setData.actualDuration ?? setData.duration,
        completedAt: completionTime
      };
    }
    
    updateSessionMutation.mutate({
      exercises: updatedExercises,
      notes: `Set ${setIndex + 1} completed at ${completionTime.toLocaleTimeString()}`
    });
  }, [exercises, updateSessionMutation]);

  const completeExercise = useCallback((exerciseIndex: number, completedSets: any[], notes?: string) => {
    const completionTime = new Date();
    
    // Update local exercise state
    setExercises(prev => {
      const updated = [...prev];
      if (updated[exerciseIndex]) {
        updated[exerciseIndex] = {
          ...updated[exerciseIndex],
          completedAt: completionTime,
          notes
        };
      }
      return updated;
    });

    // Submit completion to database
    completeExerciseMutation.mutate({
      exerciseIndex,
      completedSets,
      completionNotes: notes
    });
  }, [completeExerciseMutation]);

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

  const completeWorkout = useCallback(async () => {
    if (!sessionId) return;
    
    try {
      await apiRequest('PATCH', `/api/workout-sessions/${sessionId}`, {
        completedAt: new Date(),
        notes: 'Workout completed successfully'
      });
      
      setIsActive(false);
      queryClient.invalidateQueries({ queryKey: ['/api/workout-sessions', userId] });
    } catch (error) {
      console.error('Failed to complete workout:', error);
    }
  }, [sessionId, queryClient, userId]);

  const coachingTipMutation = useMutation({
    mutationFn: async (exerciseName: string) => {
      const response = await apiRequest('POST', '/api/coaching-tip', {
        exerciseName,
        userId
      });
      return response.json();
    }
  });

  const getCoachingTip = useCallback((exerciseName: string) => {
    coachingTipMutation.mutate(exerciseName);
  }, [coachingTipMutation]);

  // Calculate derived state
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