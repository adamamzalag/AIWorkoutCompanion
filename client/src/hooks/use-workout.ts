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

  const queryClient = useQueryClient();

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

  const startWorkout = useCallback((initialExercises: ExerciseLog[]) => {
    setExercises(initialExercises);
    setCurrentExerciseIndex(0);
    startSessionMutation.mutate();
  }, [startSessionMutation]);

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

  const completeExercise = useCallback((exerciseIndex: number, skipped: boolean = false) => {
    const completionTime = new Date();
    
    setExercises(prev => {
      const updated = [...prev];
      if (updated[exerciseIndex]) {
        updated[exerciseIndex] = {
          ...updated[exerciseIndex],
          completedAt: completionTime,
          skipped
        };
        
        updateSessionMutation.mutate({ exercises: updated });
      }
      return updated;
    });
  }, [updateSessionMutation]);

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
    
    // Actions
    startWorkout,
    completeSet,
    completeExercise,
    nextExercise,
    previousExercise,
    goToExercise,
    completeWorkout,
    getCoachingTip,
    
    // Loading states
    isStarting: startSessionMutation.isPending,
    isUpdating: updateSessionMutation.isPending,
    isGettingTip: coachingTipMutation.isPending,
    
    // Data
    coachingTip: coachingTipMutation.data?.tip
  };
}
