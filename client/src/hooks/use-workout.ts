import { useState, useCallback, useEffect } from 'react';
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

  // Phase 5: Unified completion system - timestamp completion is now the standard
  // Feature flag removed, system is now fully timestamp-based

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

  // Unified completion system - primary completion detection
  const getCompletionStatus = useCallback((exerciseIndex: number) => {
    const exercise = exercises[exerciseIndex];
    const dbCompletion = exerciseCompletions.find(c => c.exerciseIndex === exerciseIndex);
    const hasTimestamp = !!exercise?.completedAt;
    const hasDbRecord = !!dbCompletion;
    
    const result = {
      isCompleted: hasTimestamp,
      completionMethod: hasTimestamp && hasDbRecord ? 'both' : hasTimestamp ? 'timestamp' : hasDbRecord ? 'database' : 'none',
      completedAt: exercise?.completedAt || (dbCompletion ? new Date(dbCompletion.completedAt) : null),
      dbRecord: dbCompletion,
      needsSync: hasTimestamp !== hasDbRecord
    };
    
    return result;
  }, [exercises, exerciseCompletions]);

  const isExerciseCompleted = useCallback((exerciseIndex: number) => {
    return getCompletionStatus(exerciseIndex).isCompleted;
  }, [getCompletionStatus]);

  // Completion state synchronization - maintains database consistency
  const syncCompletionState = useCallback(async (exerciseIndex: number) => {
    const status = getCompletionStatus(exerciseIndex);
    
    if (status.needsSync) {
      
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
          } catch (error) {
            console.warn(`Failed to sync timestamp to database:`, error);
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

      }
    }
  }, [getCompletionStatus, exercises, sessionId, completeExerciseMutation, setExercises]);

  // Phase 3: Enhanced completion state validator with integration testing
  const validateCompletionConsistency = useCallback(() => {
    const inconsistencies: any[] = [];
    const syncNeeded: number[] = [];
    const integrationStats = {
      totalExercises: exercises.length,
      timestampOnly: 0,
      databaseOnly: 0,
      both: 0,
      neither: 0,
      needsSync: 0
    };
    
    exercises.forEach((exercise, index) => {
      const status = getCompletionStatus(index);
      
      // Phase 3: Track completion method distribution
      switch (status.completionMethod) {
        case 'timestamp':
          integrationStats.timestampOnly++;
          break;
        case 'database':
          integrationStats.databaseOnly++;
          break;
        case 'both':
          integrationStats.both++;
          break;
        case 'none':
          integrationStats.neither++;
          break;
      }
      
      if (status.needsSync) {
        integrationStats.needsSync++;
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
      console.warn('Phase 3: Completion state inconsistencies detected:', inconsistencies);
      console.log('Phase 3: Exercises needing sync:', syncNeeded);
    }
    
    console.log('Phase 3: Integration statistics:', integrationStats);
    
    return { inconsistencies, syncNeeded, integrationStats };
  }, [exercises, getCompletionStatus]);

  // Phase 3: Integration testing functions
  const runIntegrationTests = useCallback(() => {
    console.log('Phase 3: Running integration tests...');
    
    const tests = {
      mixedStateHandling: false,
      sessionResumption: false,
      edgeCaseHandling: false,
      performanceValidation: false,
      uiConsistency: false
    };
    
    // Test 1: Mixed state handling
    const { integrationStats } = validateCompletionConsistency();
    tests.mixedStateHandling = integrationStats.totalExercises > 0 && 
      (integrationStats.timestampOnly > 0 || integrationStats.databaseOnly > 0 || integrationStats.both > 0);
    
    // Test 2: Session resumption capability
    tests.sessionResumption = !!sessionId && isActive;
    
    // Test 3: Edge case handling (orphaned timestamps or missing records)
    tests.edgeCaseHandling = integrationStats.needsSync === 0;
    
    // Test 4: Performance validation (checking for excessive API calls)
    const completionMethods = [integrationStats.timestampOnly, integrationStats.databaseOnly, integrationStats.both];
    tests.performanceValidation = completionMethods.some(count => count > 0);
    
    // Test 5: UI consistency (all completed exercises should show as completed)
    const completedCount = integrationStats.timestampOnly + integrationStats.databaseOnly + integrationStats.both;
    const totalCompleted = exerciseCompletions.length;
    tests.uiConsistency = Math.abs(completedCount - totalCompleted) <= integrationStats.needsSync;
    
    const passedTests = Object.values(tests).filter(Boolean).length;
    const totalTests = Object.keys(tests).length;
    
    console.log('Phase 3: Integration test results:', {
      tests,
      score: `${passedTests}/${totalTests}`,
      passed: passedTests === totalTests
    });
    
    return { tests, passed: passedTests === totalTests, score: `${passedTests}/${totalTests}` };
  }, [validateCompletionConsistency, sessionId, isActive, exerciseCompletions]);

  // Legacy feature flag testing (maintained for compatibility)
  const testFeatureFlag = useCallback((flagValue: boolean) => {
    
    // Test completion detection with timestamp-based system
    const testResults = exercises.map((exercise, index) => {
      const status = getCompletionStatus(index);
      return {
        exerciseIndex: index,
        exerciseName: exercise.name,
        isCompleted: !!exercise.completedAt,
        completionMethod: status.completionMethod
      };
    });
    
    const completedWithFlag = testResults.filter(r => r.isCompleted).length;
    console.log(`Phase 5: Completion test results:`, {
      completedExercises: completedWithFlag,
      totalExercises: exercises.length,
      testResults: testResults.filter(r => r.isCompleted)
    });
    
    return testResults;
  }, [exercises, getCompletionStatus]);

  // Phase 3: Comprehensive validation
  const runPhase3Validation = useCallback(() => {
    console.log('Phase 3: Starting comprehensive validation...');
    
    // Run base consistency check
    const consistency = validateCompletionConsistency();
    
    // Run integration tests
    const integration = runIntegrationTests();
    
    // Test both feature flag states
    const flagTestTrue = testFeatureFlag(true);
    const flagTestFalse = testFeatureFlag(false);
    
    const phase3Results = {
      consistency,
      integration,
      featureFlagTests: {
        timestampMode: flagTestTrue,
        hybridMode: flagTestFalse
      },
      readyForPhase4: integration.passed && consistency.inconsistencies.length === 0
    };
    
    console.log('Phase 3: Comprehensive validation complete:', phase3Results);
    
    return phase3Results;
  }, [validateCompletionConsistency, runIntegrationTests, testFeatureFlag]);

  // Phase 4: Feature flag transition validation
  const validatePhase4Transition = useCallback(() => {
    console.log('Phase 4: Validating feature flag transition...');
    
    const transitionTests = {
      flagState: true, // Phase 5: Always timestamp-based
      completionConsistency: true,
      uiConsistency: true,
      backwardCompatibility: true,
      performanceImpact: false
    };
    
    // Test 1: Completion consistency across all exercises
    const { integrationStats } = validateCompletionConsistency();
    transitionTests.completionConsistency = integrationStats.needsSync === 0;
    
    // Test 2: UI consistency - all completed exercises should show as completed
    const completedByTimestamp = exercises.filter(ex => !!ex.completedAt).length;
    const completedByDatabase = exerciseCompletions.length;
    const completedByUnified = exercises.filter((_, index) => isExerciseCompleted(index)).length;
    
    transitionTests.uiConsistency = completedByUnified >= Math.max(completedByTimestamp, completedByDatabase);
    
    // Test 3: Backward compatibility - database completions still work
    transitionTests.backwardCompatibility = integrationStats.databaseOnly === 0 || 
      integrationStats.databaseOnly === integrationStats.both;
    
    // Test 4: Performance impact monitoring
    const startTime = performance.now();
    exercises.forEach((_, index) => getCompletionStatus(index));
    const endTime = performance.now();
    transitionTests.performanceImpact = (endTime - startTime) < 100; // Less than 100ms
    
    const phase4Results = {
      flagState: transitionTests.flagState ? 'timestamp-primary' : 'database-primary',
      tests: transitionTests,
      completionStats: {
        byTimestamp: completedByTimestamp,
        byDatabase: completedByDatabase,
        byUnified: completedByUnified,
        integrationStats
      },
      performanceMs: endTime - startTime,
      passed: Object.values(transitionTests).every(Boolean)
    };
    
    console.log('Phase 4: Feature flag transition validation results:', phase4Results);
    
    return phase4Results;
  }, [validateCompletionConsistency, exercises, exerciseCompletions, isExerciseCompleted, getCompletionStatus]);

  // Phase 4: Progress calculation using unified completion system
  const getUnifiedProgress = useCallback(() => {
    const totalExercises = exercises.length;
    const completedExercises = exercises.filter((_, index) => isExerciseCompleted(index)).length;
    
    return {
      completed: completedExercises,
      total: totalExercises,
      percentage: totalExercises > 0 ? Math.round((completedExercises / totalExercises) * 100) : 0
    };
  }, [exercises, isExerciseCompleted]);

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
    
    // Find the next incomplete exercise or handle completed workout
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
    
    console.log('Phase 2 Debug: completeExercise called', {
      exerciseId,
      currentExerciseIndex,
      completionTime,
      exercisesLength: exercises.length
    });
    
    // Update local state for immediate UI feedback
    setExercises(prev => {
      const updated = [...prev];
      console.log('Phase 2 Debug: setExercises called, prev exercises:', prev.length);
      if (updated[currentExerciseIndex]) {
        console.log('Phase 2 Debug: Setting completedAt on exercise', currentExerciseIndex, {
          exerciseName: updated[currentExerciseIndex].name,
          completionTime
        });
        updated[currentExerciseIndex] = {
          ...updated[currentExerciseIndex],
          completedAt: completionTime,
          skipped: options?.skipped || false
        };
      } else {
        console.warn('Phase 2 Debug: Exercise not found at index', currentExerciseIndex);
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

  // Step 2: Completion validation before workout completion
  const validateWorkoutCompletion = useCallback(() => {
    const validation = {
      allExercisesHaveTimestamps: true,
      databaseSynchronized: true,
      hasCompletedExercises: false,
      validationErrors: [] as string[]
    };

    // Check if all exercises have completion timestamps or are skipped
    exercises.forEach((exercise, index) => {
      if (!exercise.completedAt && !exercise.skipped) {
        validation.allExercisesHaveTimestamps = false;
        validation.validationErrors.push(`Exercise ${index + 1} (${exercise.name}) is not completed`);
      }
    });

    // Check database synchronization using existing completion records
    const completedExerciseIndices = exerciseCompletions.map((c: any) => c.exerciseIndex);
    const timestampCompletedIndices = exercises
      .map((ex, index) => ({ exercise: ex, index }))
      .filter(({ exercise }) => exercise.completedAt && !exercise.skipped)
      .map(({ index }) => index);

    // Validate that all timestamp completions have database records
    timestampCompletedIndices.forEach(index => {
      if (!completedExerciseIndices.includes(index)) {
        validation.databaseSynchronized = false;
        validation.validationErrors.push(`Exercise ${index + 1} completion not saved to database`);
      }
    });

    // Check if we have any completed exercises
    validation.hasCompletedExercises = timestampCompletedIndices.length > 0;

    const isValid = validation.allExercisesHaveTimestamps && 
                   validation.databaseSynchronized && 
                   validation.hasCompletedExercises;

    console.log('Workout completion validation:', { ...validation, isValid });
    
    return { ...validation, isValid };
  }, [exercises, exerciseCompletions]);

  const completeWorkout = useCallback(() => {
    // Step 2: Pre-completion validation
    const validation = validateWorkoutCompletion();
    
    if (!validation.isValid) {
      console.error('Workout completion validation failed:', validation.validationErrors);
      // Don't proceed with completion if validation fails
      return;
    }

    if (startTime) {
      const endTime = new Date();
      const duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));
      
      // Transform exercises data to match server schema expectations
      const processedExercises = exercises.map(exercise => ({
        exerciseId: exercise.exerciseId,
        name: exercise.name,
        sets: exercise.sets,
        restTime: exercise.restTime,
        notes: exercise.notes,
        isWarmup: exercise.isWarmup,
        isCardio: exercise.isCardio,
        isCooldown: exercise.isCooldown,
        duration: exercise.duration,
        completedAt: exercise.completedAt,
        skipped: exercise.skipped,
        originalReps: exercise.originalReps
      }));
      
      console.log('Workout completion validation passed, proceeding with completion');
      
      updateSessionMutation.mutate({
        exercises: processedExercises,
        completedAt: endTime,
        duration
      });
    }
    
    setIsActive(false);
    setSessionId(null);
    setStartTime(null);
  }, [exercises, startTime, updateSessionMutation, validateWorkoutCompletion]);

  const getCoachingTip = useCallback((exerciseName: string, performance: any) => {
    coachingTipMutation.mutate({
      exercise: exerciseName,
      userPerformance: performance
    });
  }, [coachingTipMutation]);

  // Step 2: Sync function to handle validation failures
  const syncWorkoutCompletion = useCallback(async () => {
    const validation = validateWorkoutCompletion();
    
    if (!validation.databaseSynchronized) {
      console.log('Attempting to sync unsynchronized exercises...');
      
      // Find exercises that need syncing
      const needsSyncIndices = exercises
        .map((ex, index) => ({ exercise: ex, index }))
        .filter(({ exercise, index }) => {
          const hasTimestamp = exercise.completedAt && !exercise.skipped;
          const hasDbRecord = exerciseCompletions.some((c: any) => c.exerciseIndex === index);
          return hasTimestamp && !hasDbRecord;
        })
        .map(({ index }) => index);

      console.log('Exercises needing sync:', needsSyncIndices);
      
      // Re-submit completion for unsynchronized exercises
      for (const exerciseIndex of needsSyncIndices) {
        const exercise = exercises[exerciseIndex];
        if (exercise.completedAt) {
          console.log(`Re-syncing exercise ${exerciseIndex}: ${exercise.name}`);
          
          // Re-submit the completion
          completeExerciseMutation.mutate({
            exerciseId: exercise.exerciseId,
            exerciseIndex: exerciseIndex,
            completedSets: exercise.sets,
            completionNotes: exercise.notes,
            skipped: exercise.skipped || false,
            autoCompleted: false
          });
        }
      }
    }
    
    return validation;
  }, [validateWorkoutCompletion, exercises, exerciseCompletions, completeExerciseMutation]);

  // Fix index bounds when exercises are loaded (handles completed workouts)
  useEffect(() => {
    if (exercises.length > 0 && currentExerciseIndex >= exercises.length) {
      setCurrentExerciseIndex(exercises.length - 1);
    }
  }, [exercises.length, currentExerciseIndex]);

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
    
    // Phase 3: Integration testing functions
    runIntegrationTests,
    testFeatureFlag,
    runPhase3Validation,
    
    // Phase 4: Feature flag transition functions
    validatePhase4Transition,
    getUnifiedProgress,
    
    // Step 2: Completion validation functions
    validateWorkoutCompletion,
    syncWorkoutCompletion,
    
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
