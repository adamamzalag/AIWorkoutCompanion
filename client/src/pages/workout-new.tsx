import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { YouTubeVideo } from '@/components/youtube-video';
import { ExerciseTimer } from '@/components/exercise-timer';
import { useWorkout } from '@/hooks/use-workout';
import { parseRepString, formatSetReps, getTargetRepsForSet } from '@/utils/rep-parser';
import { queryClient } from '@/lib/queryClient';
import { 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Play, 
  Pause, 
  ChevronDown, 
  ChevronUp,
  MessageCircle,
  FileText,
  SkipForward,
  Menu
} from 'lucide-react';
import type { Exercise, Workout, User, WorkoutPlan } from '@shared/schema';
import type { ExerciseLog } from '@/lib/types';

export default function WorkoutNewPage() {
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  const [exerciseNotes, setExerciseNotes] = useState('');
  const [forceRenderKey, setForceRenderKey] = useState(0);
  const [phase3TestsRun, setPhase3TestsRun] = useState(false);
  const [, setLocation] = useLocation();

  // Get workout ID from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const workoutId = parseInt(urlParams.get('id') || '42');

  const { data: userProfile } = useQuery<User>({
    queryKey: ["/api/auth/user"],
  });

  const { data: workout } = useQuery<Workout>({
    queryKey: [`/api/workout/${workoutId}`],
    enabled: !!workoutId,
  });

  const { data: exerciseDatabase } = useQuery<Exercise[]>({
    queryKey: ['/api/exercises'],
  });

  const { data: workoutPlans } = useQuery<WorkoutPlan[]>({
    queryKey: [`/api/workout-plans/${userProfile?.id}`],
    enabled: !!userProfile?.id,
  });

  const {
    currentExerciseIndex,
    currentExercise,
    isActive,
    isFirstExercise,
    isLastExercise,
    startWorkout,
    completeSet,
    completeExercise,
    nextExercise,
    previousExercise,
    goToExercise,
    completeWorkout,
    getCoachingTip,
    isStarting,
    isUpdating,
    isGettingTip,
    coachingTip,
    exerciseCompletions,
    isCheckingResumable,
    isExerciseCompleted,
    getCompletionStatus,
    syncCompletionState,
    validateCompletionConsistency,
    runIntegrationTests,
    testFeatureFlag,
    runPhase3Validation,
    validatePhase4Transition,
    getUnifiedProgress,
    validateWorkoutCompletion,
    syncWorkoutCompletion,
    exercises
  } = useWorkout(workoutId, userProfile?.id || 0);

  const [showCoachingTip, setShowCoachingTip] = useState(false);
  const [activeSetIndex, setActiveSetIndex] = useState<number | null>(null);
  const [showExerciseNavigation, setShowExerciseNavigation] = useState(false);
  // Removed currentSetData - using direct exercise state binding
  const [completedExercises, setCompletedExercises] = useState<number[]>([]);
  const [transitionCountdown, setTransitionCountdown] = useState<number | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  // Helper function to update set data directly in exercise state
  const updateSetData = (setIndex: number, updates: { reps?: number; weight?: number; actualReps?: number; actualWeight?: number }) => {
    if (!currentExercise) return;
    
    const updatedSets = [...currentExercise.sets];
    updatedSets[setIndex] = {
      ...updatedSets[setIndex],
      ...updates
    };
    
    // Update exercise state through the hook
    completeSet(currentExerciseIndex, setIndex, {
      reps: updatedSets[setIndex].reps || 0,
      weight: updatedSets[setIndex].weight,
      actualReps: updatedSets[setIndex].actualReps,
      actualWeight: updatedSets[setIndex].actualWeight
    });
  };

  const handleGetCoachingTip = () => {
    if (!isGettingTip && currentExerciseData) {
      const currentExerciseLog = workoutExerciseLogs[currentExerciseIndex];
      getCoachingTip(currentExerciseData.name, {
        sets: currentExerciseLog?.sets || [],
        exerciseType: currentExercise.isWarmup ? 'warmup' : currentExercise.isCooldown ? 'cooldown' : 'main'
      });
    }
  };

  // Auto-show coaching tip when it's received
  useEffect(() => {
    if (coachingTip && !isGettingTip) {
      setShowCoachingTip(true);
    }
  }, [coachingTip, isGettingTip]);

  // Create exercise logs from workout data
  const workoutExerciseLogs: ExerciseLog[] = useMemo(() => {
    const logs: ExerciseLog[] = [];
    
    if (!workout) return logs;
    // Parse warm-up activities
    const warmUp = workout.warmUp ? 
      (typeof workout.warmUp === 'string' ? JSON.parse(workout.warmUp) : workout.warmUp) : {};
    
    if (warmUp.activities) {
      warmUp.activities.forEach((activity: any) => {
        if (activity.exerciseId && typeof activity.exerciseId === 'number') {
          logs.push({
            exerciseId: activity.exerciseId,
            name: activity.exercise,
            sets: [{ reps: 0 }],
            restTime: '30 seconds',
            isWarmup: true,
            duration: activity.durationSeconds
          });
        }
      });
    }
    
    // Add main exercises
    const mainExercises = workout.exercises ? 
      (typeof workout.exercises === 'string' ? JSON.parse(workout.exercises) : workout.exercises) : [];
    
    mainExercises.forEach((exercise: any) => {
      if (exercise.exerciseId && typeof exercise.exerciseId === 'number') {
        const repInfo = parseRepString(exercise.reps || '12');
        
        logs.push({
          exerciseId: exercise.exerciseId,
          name: exercise.name,
          sets: Array.from({ length: exercise.sets }, (_, index) => ({
            reps: getTargetRepsForSet(repInfo, index, exercise.sets),
            weight: exercise.weight ? 0 : undefined,
            repInfo: repInfo // Store rep info for display
          })),
          restTime: exercise.restTime || '60 seconds',
          originalReps: exercise.reps // Store original reps string
        });
      }
    });
    
    // Add cardio exercises
    const cardio = workout.cardio ? 
      (typeof workout.cardio === 'string' ? JSON.parse(workout.cardio) : workout.cardio) : {};
    
    if (cardio.activities) {
      cardio.activities.forEach((activity: any) => {
        if (activity.exerciseId && typeof activity.exerciseId === 'number') {
          logs.push({
            exerciseId: activity.exerciseId,
            name: activity.exercise,
            sets: [{ reps: 0 }],
            restTime: '30 seconds',
            isCardio: true,
            duration: activity.durationSeconds
          });
        }
      });
    }
    
    // Add cool-down exercises
    const coolDown = workout.coolDown ? 
      (typeof workout.coolDown === 'string' ? JSON.parse(workout.coolDown) : workout.coolDown) : {};
    
    if (coolDown.activities) {
      coolDown.activities.forEach((activity: any) => {
        if (activity.exerciseId && typeof activity.exerciseId === 'number') {
          logs.push({
            exerciseId: activity.exerciseId,
            name: activity.exercise,
            sets: [{ reps: 0 }],
            restTime: '30 seconds',
            isCooldown: true,
            duration: activity.durationSeconds
          });
        }
      });
    }
    
    return logs;
  }, [workout]);

  // Auto-start workout
  const [hasStarted, setHasStarted] = useState(false);
  
  useEffect(() => {
    if (workoutExerciseLogs.length > 0 && !isActive && !isStarting && !hasStarted) {
      setHasStarted(true);
      startWorkout(workoutExerciseLogs);
    }
  }, [workoutExerciseLogs.length, isActive, isStarting, hasStarted]);

  // Clear tip and guide when switching exercises
  useEffect(() => {
    setShowCoachingTip(false);
    setInstructionsOpen(false);
  }, [currentExerciseIndex]);

  // Get current exercise data
  const currentExerciseData = (() => {
    if (!currentExercise || !exerciseDatabase) return null;
    
    if (typeof currentExercise.exerciseId === 'number') {
      const foundExercise = exerciseDatabase.find((ex: any) => ex.id === currentExercise.exerciseId);
      if (foundExercise) {
        return foundExercise;
      }
    }
    return null;
  })();

  // Determine current phase and position
  const getCurrentPhase = () => {
    if (!workout || !currentExercise) return { phase: 'LOADING', position: '0 of 0' };
    
    const warmUpData = workout.warmUp ? 
      (typeof workout.warmUp === 'string' ? JSON.parse(workout.warmUp) : workout.warmUp) : {};
    const mainData = workout.exercises ? 
      (typeof workout.exercises === 'string' ? JSON.parse(workout.exercises) : workout.exercises) : [];
    const cardioData = workout.cardio ? 
      (typeof workout.cardio === 'string' ? JSON.parse(workout.cardio) : workout.cardio) : {};
    
    const warmUpCount = warmUpData.activities?.length || 0;
    const mainCount = mainData.length || 0;
    const cardioCount = cardioData.activities?.length || 0;
    
    if (currentExerciseIndex < warmUpCount) {
      return { phase: 'WARMUP', position: `${currentExerciseIndex + 1} of ${warmUpCount}` };
    } else if (currentExerciseIndex < warmUpCount + mainCount) {
      return { phase: 'MAIN', position: `${currentExerciseIndex - warmUpCount + 1} of ${mainCount}` };
    } else if (currentExerciseIndex < warmUpCount + mainCount + cardioCount) {
      return { phase: 'CARDIO', position: `${currentExerciseIndex - warmUpCount - mainCount + 1} of ${cardioCount}` };
    } else {
      const coolDownCount = workoutExerciseLogs.length - warmUpCount - mainCount - cardioCount;
      return { phase: 'COOLDOWN', position: `${currentExerciseIndex - warmUpCount - mainCount - cardioCount + 1} of ${coolDownCount}` };
    }
  };

  const { phase, position } = getCurrentPhase();

  // Get plan name
  const planName = workoutPlans?.find(plan => plan.id === workout?.planId)?.title || 'Workout Plan';

  const handleCompleteSet = (setIndex: number) => {
    if (currentExercise) {
      const set = currentExercise.sets[setIndex];
      completeSet(currentExerciseIndex, setIndex, {
        reps: set.reps || 0,
        weight: set.weight,
        actualReps: set.actualReps || set.reps || 0,
        actualWeight: set.actualWeight || set.weight
      });
      
      // Auto-open next set if available
      const nextSetIndex = setIndex + 1;
      if (nextSetIndex < currentExercise.sets.length) {
        setActiveSetIndex(nextSetIndex);
      } else {
        setActiveSetIndex(null);
      }
    }
  };

  const handleCompleteExercise = () => {
    if (currentExercise && currentExerciseData) {
      // Get current exercise log for completion data
      const currentExerciseLog = workoutExerciseLogs[currentExerciseIndex];
      
      // Call the enhanced completeExercise function with database persistence
      completeExercise(currentExerciseData.id, currentExerciseLog?.sets || [], {
        skipped: false,
        autoCompleted: false,
        notes: exerciseNotes
      });
      
      // Mark exercise as completed locally
      setCompletedExercises(prev => [...prev, currentExerciseIndex]);
      
      console.log('Phase 2: Exercise completed with database save:', {
        exerciseIndex: currentExerciseIndex,
        exercise: currentExercise
      });
      
      // Phase 4: Enhanced validation with feature flag transition testing
      setTimeout(async () => {
        console.log('Phase 4: Starting enhanced completion validation for exercise', currentExerciseIndex);
        
        // Force a small delay to ensure state updates have propagated
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Check the current completion status
        const status = getCompletionStatus(currentExerciseIndex);
        console.log('Phase 4: Exercise completion status after delay:', status);
        
        const { inconsistencies, syncNeeded, integrationStats } = validateCompletionConsistency();
        console.log('Phase 4: Validation results:', { 
          inconsistenciesCount: inconsistencies.length, 
          syncNeededCount: syncNeeded.length,
          integrationStats
        });
        
        // Run Phase 4 transition validation
        const phase4Results = validatePhase4Transition();
        console.log('Phase 4: Feature flag transition validation completed');
        
        if (inconsistencies.length > 0) {
          console.warn('Phase 4: Completion state inconsistencies detected after exercise completion', inconsistencies);
          
          // Auto-sync any inconsistencies
          for (const exerciseIndex of syncNeeded) {
            console.log('Phase 4: Auto-syncing exercise', exerciseIndex);
            await syncCompletionState(exerciseIndex);
          }
          
          // Re-run Phase 4 validation after sync
          console.log('Phase 4: Re-running validation after sync...');
          validatePhase4Transition();
        } else {
          console.log('Phase 4: Completion state consistent after exercise completion');
        }
        
        // Test unified progress calculation
        const progress = getUnifiedProgress();
        console.log('Phase 4: Unified progress calculation:', progress);
      }, 2000);
      
      // Force component re-render to show completion state immediately
      setForceRenderKey(prev => prev + 1);
      
      // Start countdown for next exercise transition
      setTransitionCountdown(3);
      const countdownInterval = setInterval(() => {
        setTransitionCountdown(prev => {
          if (prev === null || prev <= 1) {
            clearInterval(countdownInterval);
            setIsTransitioning(true);
            setTimeout(() => {
              handleNextExercise();
              setTransitionCountdown(null);
              setIsTransitioning(false);
            }, 500); // Brief transition animation
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  const handleNextExercise = async () => {
    if (isLastExercise) {
      // Step 4: Enhanced completion flow with comprehensive error handling
      console.log('Step 4: Starting enhanced workout completion sequence...');
      
      try {
        // Wait for any pending exercise completion
        if (isUpdating) {
          console.log('Step 4: Waiting for exercise completion to finish...');
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // Validate workout is ready for completion
        if (validateWorkoutCompletion) {
          const validation = validateWorkoutCompletion();
          console.log('Step 4: Final validation before completion:', validation);
          
          if (validation.isValid) {
            console.log('Step 4: Validation passed, completing workout...');
            
            // Enhanced completion with error handling
            try {
              completeWorkout();
              
              // Wait for completion to process before navigation
              await new Promise(resolve => setTimeout(resolve, 500));
              console.log('Step 4: Workout completed successfully, invalidating caches...');
              
              // Invalidate workout-related caches to ensure fresh data on home page
              queryClient.invalidateQueries({ queryKey: ['/api/workouts'] });
              queryClient.invalidateQueries({ queryKey: ['/api/workout-completion-status'] });
              queryClient.invalidateQueries({ queryKey: ['/api/recent-sessions'] });
              queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
              
              console.log('Step 4: Caches invalidated, navigating to home...');
              setLocation('/');
            } catch (completionError) {
              console.error('Step 4: Error during workout completion:', completionError);
              
              // Retry once after short delay
              console.log('Step 4: Retrying completion after error...');
              await new Promise(resolve => setTimeout(resolve, 1000));
              
              try {
                completeWorkout();
                // Invalidate caches before navigation
                queryClient.invalidateQueries({ queryKey: ['/api/workouts'] });
                queryClient.invalidateQueries({ queryKey: ['/api/recent-sessions'] });
                setLocation('/');
              } catch (retryError) {
                console.error('Step 4: Retry failed, forcing navigation:', retryError);
                // Force navigation even if completion fails
                queryClient.invalidateQueries({ queryKey: ['/api/workouts'] });
                setLocation('/');
              }
            }
          } else {
            console.error('Step 4: Workout completion validation failed:', validation.validationErrors);
            
            // Enhanced retry logic with sync
            if (!validation.databaseSynchronized && syncWorkoutCompletion) {
              console.log('Step 4: Attempting sync before retry...');
              
              try {
                await syncWorkoutCompletion();
                
                // Retry after sync with timeout protection
                setTimeout(async () => {
                  console.log('Step 4: Retrying completion after sync...');
                  try {
                    completeWorkout();
                    queryClient.invalidateQueries({ queryKey: ['/api/workouts'] });
                    setLocation('/');
                  } catch (syncRetryError) {
                    console.error('Step 4: Sync retry failed:', syncRetryError);
                    queryClient.invalidateQueries({ queryKey: ['/api/workouts'] });
                    setLocation('/'); // Force navigation
                  }
                }, 2000);
              } catch (syncError) {
                console.error('Step 4: Sync failed:', syncError);
                // Fallback completion
                completeWorkout();
                setLocation('/');
              }
            } else {
              // Fallback completion with error handling
              console.log('Step 4: Fallback completion without validation');
              try {
                completeWorkout();
                setLocation('/');
              } catch (fallbackError) {
                console.error('Step 4: Fallback completion failed:', fallbackError);
                queryClient.invalidateQueries({ queryKey: ['/api/workouts'] });
                setLocation('/'); // Force navigation even if completion fails
              }
            }
          }
        } else {
          // Enhanced fallback if validation isn't available
          console.log('Step 4: Direct completion (validation not available)');
          try {
            completeWorkout();
            await new Promise(resolve => setTimeout(resolve, 500));
            queryClient.invalidateQueries({ queryKey: ['/api/workouts'] });
            setLocation('/');
          } catch (directError) {
            console.error('Step 4: Direct completion failed:', directError);
            queryClient.invalidateQueries({ queryKey: ['/api/workouts'] });
            setLocation('/'); // Always navigate home
          }
        }
      } catch (overallError) {
        console.error('Step 4: Overall completion process failed:', overallError);
        // Ultimate fallback - always navigate to home with cache invalidation
        queryClient.invalidateQueries({ queryKey: ['/api/workouts'] });
        setLocation('/');
      }
    } else {
      nextExercise();
    }
  };

  const handleExitWorkout = () => {
    setShowExitDialog(true);
  };

  const confirmExit = () => {
    setLocation('/');
  };

  // Group exercises by phase for navigation
  const exercisesByPhase = {
    warmup: workoutExerciseLogs.filter((ex: any) => ex.isWarmup),
    main: workoutExerciseLogs.filter((ex: any) => !ex.isWarmup && !ex.isCooldown && !ex.isCardio),
    cardio: workoutExerciseLogs.filter((ex: any) => ex.isCardio),
    cooldown: workoutExerciseLogs.filter((ex: any) => ex.isCooldown)
  };

  const navigateToExercise = (targetIndex: number) => {
    if (targetIndex >= 0 && targetIndex < workoutExerciseLogs.length && goToExercise) {
      goToExercise(targetIndex);
      setShowExerciseNavigation(false);
    }
  };

  // Phase 4: Auto-run feature flag transition validation when workout loads
  useEffect(() => {
    if (isActive && !phase3TestsRun && exercises && exercises.length > 0) {
      console.log('Phase 4: Auto-running feature flag transition validation on workout load...');
      setTimeout(() => {
        validatePhase4Transition();
        // Also run Phase 3 for comprehensive testing
        runPhase3Validation();
        setPhase3TestsRun(true);
      }, 3000);
    }
  }, [isActive, phase3TestsRun, exercises, validatePhase4Transition, runPhase3Validation]);

  // Phase 3: Manual comprehensive testing trigger
  const handleRunPhase3Tests = () => {
    console.log('Phase 3: Manual comprehensive testing triggered...');
    runPhase3Validation();
  };

  // Show loading state
  if (!workout || workoutExerciseLogs.length === 0 || isStarting || isCheckingResumable || !isActive || !currentExercise || !currentExerciseData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4">
          <div className="loading-spinner" />
          <p className="text-muted-foreground">
            {isCheckingResumable ? 'Checking for previous session...' : 
             isStarting ? 'Starting workout...' : 
             'Loading workout...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border/20 h-16 flex items-center px-4">
        <div className="flex items-center justify-between w-full">
          <div className="flex-1 truncate">
            <span className="text-sm font-medium text-muted-foreground truncate">{planName}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-xs">
              {phase}
            </Badge>
            <span className="text-sm text-muted-foreground">{position}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExitWorkout}
            className="ml-2"
          >
            <X size={20} />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className={`flex-1 overflow-y-auto pt-16 pb-24 transition-all duration-500 ${isTransitioning ? 'opacity-20 translate-x-4' : 'opacity-100 translate-x-0'}`}>
        {/* Video Section - 30% of screen */}
        <div className="relative h-[30vh] px-4 pt-4">
          <div className="relative h-full rounded-xl overflow-hidden">
            <YouTubeVideo
              videoId={currentExerciseData.youtubeId}
              exerciseName={currentExerciseData.name}
              exerciseIndex={currentExerciseIndex + 1}
              totalExercises={workoutExerciseLogs.length}
              workoutTitle={workout.title}
              className="w-full h-full"
            />
            
            {/* Video Overlay */}
            <div className="absolute bottom-2 right-2 flex space-x-2">
              {currentExerciseData.equipment && currentExerciseData.equipment.length > 0 && 
               !currentExerciseData.equipment.includes('none') && (
                <Badge variant="secondary" className="text-xs">
                  {currentExerciseData.equipment[0]}
                </Badge>
              )}
              <Badge variant="outline" className="text-xs">
                {currentExerciseData.difficulty}
              </Badge>
            </div>
          </div>
        </div>

        {/* Exercise Information Panel - 55% of screen */}
        <div className="flex-1 p-4 space-y-4">

          {/* Primary Exercise Data */}
          <Card className="glass-effect">
            <CardContent className="p-4">
              {currentExercise.isWarmup || currentExercise.isCooldown || currentExercise.isCardio ? (
                /* Time-based exercise */
                <ExerciseTimer
                  duration={currentExercise.duration || 60}
                  onComplete={() => {
                    // Auto-advance to next exercise when timer completes
                    setTimeout(() => {
                      if (!isLastExercise) {
                        nextExercise();
                      }
                    }, 1000);
                  }}
                  isActive={isActive}
                />
              ) : (
                /* Rep-based exercise - Accordion */
                <div className="space-y-3">
                  <div className="text-center">
                    <div className="text-lg font-medium text-foreground">
                      {currentExercise.sets.length} Sets
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    {currentExercise.sets.map((set, index) => {
                      const isExerciseCompleted = currentExercise.completedAt || 
                        completedExercises.includes(currentExerciseIndex) ||
                        exerciseCompletions.some(comp => comp.exerciseIndex === currentExerciseIndex);
                      const isActive = activeSetIndex === index;
                      const canInteract = !isExerciseCompleted;
                      
                      // Get rep info from current exercise log
                      const currentExerciseLog = workoutExerciseLogs[currentExerciseIndex];
                      const repInfo = currentExerciseLog?.sets[index]?.repInfo;
                      const displayReps = repInfo ? 
                        repInfo.displayText : 
                        `${set.reps} reps`;
                      
                      return (
                        <Collapsible key={index} open={isActive} onOpenChange={(open) => setActiveSetIndex(open ? index : null)}>
                          <CollapsibleTrigger asChild>
                            <Button
                              variant={!!isExerciseCompleted ? "default" : isActive ? "outline" : "ghost"}
                              className="w-full justify-between h-12"
                              disabled={!!isExerciseCompleted}
                            >
                              <span>Set {index + 1}: {displayReps}</span>
                              <div className="flex items-center space-x-2">
                                {isExerciseCompleted && <span className="text-green-500">✓</span>}
                                {canInteract && <ChevronDown size={16} />}
                              </div>
                            </Button>
                          </CollapsibleTrigger>
                          
                          {isActive && canInteract && (
                            <CollapsibleContent className="pt-3">
                              <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                                <div className="space-y-3">
                                  <div className="grid grid-cols-2 gap-3">
                                    <div>
                                      <label className="text-sm font-medium block">
                                        Reps
                                      </label>
                                      <Input
                                        type="number"
                                        value={set.actualReps || ''}
                                        onChange={(e) => updateSetData(index, { 
                                          actualReps: parseInt(e.target.value) || 0 
                                        })}
                                        placeholder={`Target: ${set.reps}`}
                                        className="mt-1"
                                      />
                                    </div>
                                    {set.weight !== undefined && (
                                      <div>
                                        <label className="text-sm font-medium block">
                                          Weight
                                        </label>
                                        <Input
                                          type="number"
                                          value={set.actualWeight || ''}
                                          onChange={(e) => updateSetData(index, { 
                                            actualWeight: parseInt(e.target.value) || 0 
                                          })}
                                          placeholder={set.weight ? `Target: ${set.weight} lbs` : "Enter weight"}
                                          className="mt-1"
                                        />
                                      </div>
                                    )}
                                  </div>
                                  {repInfo && (
                                    <div className="text-center text-xs text-muted-foreground">
                                      Target: {repInfo.displayText}
                                    </div>
                                  )}
                                </div>
                                <Button 
                                  onClick={() => handleCompleteSet(index)}
                                  className="w-full"
                                  disabled={isUpdating}
                                >
                                  Complete Set {index + 1}
                                </Button>
                              </div>
                            </CollapsibleContent>
                          )}
                        </Collapsible>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Action Controls */}
              <div className="flex justify-center space-x-4 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGetCoachingTip}
                  disabled={isGettingTip}
                >
                  <MessageCircle size={16} className="mr-1" />
                  {isGettingTip ? 'Loading...' : 'Tip'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setInstructionsOpen(!instructionsOpen)}
                >
                  <FileText size={16} className="mr-1" />
                  Guide
                </Button>
                {/* Manual completion button for completed workouts */}
                {getUnifiedProgress().percentage === 100 && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleNextExercise}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    Complete Workout
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Coaching Tip Display */}
          {coachingTip && showCoachingTip && (
            <Card className="glass-effect border-primary/20 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <MessageCircle size={20} className="text-primary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-primary mb-2">AI Coach Tip</h4>
                    <p className="text-sm text-foreground">{coachingTip}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCoachingTip(false)}
                    className="flex-shrink-0"
                  >
                    <X size={16} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Collapsible Instruction Panel */}
          <Collapsible open={instructionsOpen} onOpenChange={setInstructionsOpen}>
            <CollapsibleContent>
              <Card className="glass-effect border-accent/20">
                <CardContent className="p-4 space-y-4">
                  {/* Instructions */}
                  <div>
                    <h4 className="font-medium mb-2">Instructions</h4>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      {currentExerciseData.instructions.map((instruction, index) => (
                        <li key={index} className="flex items-start space-x-2">
                          <span className="text-accent">•</span>
                          <span>{instruction}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Tempo */}
                  {currentExerciseData.tempo && (
                    <div>
                      <h4 className="font-medium mb-2">Tempo</h4>
                      <Badge variant="outline">{currentExerciseData.tempo}</Badge>
                    </div>
                  )}

                  {/* Modifications */}
                  {currentExerciseData.modifications && currentExerciseData.modifications.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Need easier?</h4>
                      <p className="text-sm text-muted-foreground">
                        Try: {currentExerciseData.modifications[0]}
                      </p>
                    </div>
                  )}

                  {/* Personal Notes */}
                  <div>
                    <h4 className="font-medium mb-2">Personal Notes</h4>
                    <Textarea
                      placeholder="Add notes for this exercise..."
                      value={exerciseNotes}
                      onChange={(e) => setExerciseNotes(e.target.value)}
                      className="min-h-20"
                    />
                  </div>


                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>

          {/* Exercise Completion Button - Always Visible */}
          <div className="px-4 pb-4">
            {!isExerciseCompleted(currentExerciseIndex) ? (
              <Button
                onClick={handleCompleteExercise}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
                size="lg"
                disabled={isUpdating}
              >
                {isUpdating ? 'Saving...' : 'Mark Exercise as Complete'}
              </Button>
            ) : (
              <div className={`w-full bg-green-100 dark:bg-green-900 border border-green-300 dark:border-green-700 rounded-lg p-4 transition-all duration-500 ${isTransitioning ? 'opacity-50 scale-95' : 'animate-pulse'}`}>
                <div className="flex items-center justify-center space-x-2 text-green-700 dark:text-green-300">
                  <span className="text-2xl">✓</span>
                  <span className="font-bold text-lg">Exercise Completed!</span>
                </div>
                
                {transitionCountdown !== null ? (
                  <div className="text-center mt-3">
                    <div className="flex items-center justify-center space-x-2">
                      <span className="text-sm text-green-600 dark:text-green-400">
                        Next exercise in
                      </span>
                      <div className="flex items-center justify-center w-8 h-8 bg-green-200 dark:bg-green-800 rounded-full">
                        <span className="font-bold text-green-800 dark:text-green-200 text-lg">
                          {transitionCountdown}
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-green-200 dark:bg-green-800 rounded-full h-1 mt-2">
                      <div 
                        className="bg-green-600 dark:bg-green-400 h-1 rounded-full transition-all duration-1000" 
                        style={{ width: `${((3 - transitionCountdown) / 3) * 100}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-green-600 dark:text-green-400 text-center mt-2">
                    {isTransitioning ? 'Transitioning...' : 'Great job!'}
                  </p>
                )}
                
                {currentExercise.completedAt && (
                  <p className="text-xs text-green-600 dark:text-green-400 text-center mt-1">
                    Completed at {currentExercise.completedAt.toLocaleTimeString()}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t border-border/20 h-20 flex items-center px-4">
        <div className="flex items-center justify-between w-full">
          <Button
            variant="outline"
            size="sm"
            onClick={previousExercise}
            disabled={isFirstExercise || isUpdating}
          >
            <ChevronLeft size={16} />
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowExerciseNavigation(true)}
            className="flex-1 max-w-xs mx-2"
          >
            <div className="flex items-center space-x-2">
              <span className="truncate text-xs">
                {currentExercise?.name || 'Select Exercise'}
              </span>
              <ChevronDown size={12} />
            </div>
          </Button>
          
          <Button
            variant="default"
            size="sm"
            onClick={handleNextExercise}
            disabled={isUpdating}
          >
            {isLastExercise ? 'Finish' : <ChevronRight size={16} />}
          </Button>
        </div>
      </nav>

      {/* Exit Dialog */}
      {showExitDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-sm">
            <CardContent className="p-6 text-center space-y-4">
              <h3 className="text-lg font-semibold">Exit Workout?</h3>
              <p className="text-muted-foreground">Your progress will be saved.</p>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowExitDialog(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={confirmExit}
                  className="flex-1"
                >
                  Exit
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Exercise Navigation Modal */}
      {showExerciseNavigation && (
        <div className="fixed inset-0 bg-black/50 flex flex-col z-50">
          <div className="bg-background h-full flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-border/20">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold">Exercise Navigation</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowExerciseNavigation(false)}
                >
                  <X size={20} />
                </Button>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Progress</span>
                  <span>{getUnifiedProgress().completed} of {getUnifiedProgress().total} completed</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${getUnifiedProgress().percentage}%` }}
                  ></div>
                </div>
              </div>
            </div>
            
            {/* Exercise List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Warm-up Section */}
              {exercisesByPhase.warmup.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
                    Warm-up ({exercisesByPhase.warmup.length})
                  </h3>
                  <div className="space-y-2">
                    {exercisesByPhase.warmup.map((exercise: any, index: number) => {
                      const globalIndex = workoutExerciseLogs.findIndex((ex: any) => ex === exercise);
                      const isCurrentExercise = globalIndex === currentExerciseIndex;
                      const isCompleted = isExerciseCompleted(globalIndex);
                      
                      return (
                        <Button
                          key={globalIndex}
                          variant={isCurrentExercise ? "default" : "outline"}
                          className={`w-full justify-between h-14 p-4 ${isCompleted ? 'bg-green-100/20 dark:bg-green-900/20 border-green-400 dark:border-green-500' : ''}`}
                          onClick={() => navigateToExercise(globalIndex)}
                        >
                          <div className="flex items-center space-x-3">
                            <div className="text-sm">
                              {isCompleted ? <span className="text-green-600 dark:text-green-400 font-bold text-lg">✓</span> : <span className="text-muted-foreground">{globalIndex + 1}</span>}
                            </div>
                            <div className="text-left">
                              <div className={`font-medium ${isCompleted ? 'text-foreground' : ''}`}>{exercise.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {exercise.duration ? `${Math.floor(exercise.duration / 60)}:${(exercise.duration % 60).toString().padStart(2, '0')}` : 'Duration based'}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {isCompleted ? (
                              <Badge variant="outline" className="text-xs bg-green-600 text-white border-green-600 dark:bg-green-700 dark:text-white dark:border-green-700">
                                Completed
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">
                                Pending
                              </Badge>
                            )}
                            {isCurrentExercise && <Badge variant="secondary" className="text-xs">Current</Badge>}
                          </div>
                        </Button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Main Exercises Section */}
              {exercisesByPhase.main.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
                    Main Exercises ({exercisesByPhase.main.length})
                  </h3>
                  <div className="space-y-2">
                    {exercisesByPhase.main.map((exercise: any, index: number) => {
                      const globalIndex = workoutExerciseLogs.findIndex((ex: any) => ex === exercise);
                      const isCurrentExercise = globalIndex === currentExerciseIndex;
                      const isCompleted = isExerciseCompleted(globalIndex);
                      
                      return (
                        <Button
                          key={globalIndex}
                          variant={isCurrentExercise ? "default" : "outline"}
                          className={`w-full justify-between h-14 p-4 ${isCompleted ? 'bg-green-100/20 dark:bg-green-900/20 border-green-400 dark:border-green-500' : ''}`}
                          onClick={() => navigateToExercise(globalIndex)}
                        >
                          <div className="flex items-center space-x-3">
                            <div className="text-sm">
                              {isCompleted ? <span className="text-green-600 dark:text-green-400 font-bold text-lg">✓</span> : <span className="text-muted-foreground">{globalIndex + 1}</span>}
                            </div>
                            <div className="text-left">
                              <div className={`font-medium ${isCompleted ? 'text-foreground' : ''}`}>{exercise.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {exercise.sets.length} sets
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {isCompleted ? (
                              <Badge variant="outline" className="text-xs bg-green-600 text-white border-green-600 dark:bg-green-700 dark:text-white dark:border-green-700">
                                Completed
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">
                                Pending
                              </Badge>
                            )}
                            {isCurrentExercise && <Badge variant="secondary" className="text-xs">Current</Badge>}
                          </div>
                        </Button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Cardio Section */}
              {exercisesByPhase.cardio.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
                    Cardio ({exercisesByPhase.cardio.length})
                  </h3>
                  <div className="space-y-2">
                    {exercisesByPhase.cardio.map((exercise: any, index: number) => {
                      const globalIndex = workoutExerciseLogs.findIndex((ex: any) => ex === exercise);
                      const isCurrentExercise = globalIndex === currentExerciseIndex;
                      const isCompleted = isExerciseCompleted(globalIndex);
                      
                      return (
                        <Button
                          key={globalIndex}
                          variant={isCurrentExercise ? "default" : "outline"}
                          className={`w-full justify-between h-14 p-4 ${isCompleted ? 'bg-green-100/20 dark:bg-green-900/20 border-green-400 dark:border-green-500' : ''}`}
                          onClick={() => navigateToExercise(globalIndex)}
                        >
                          <div className="flex items-center space-x-3">
                            <div className="text-sm">
                              {isCompleted ? <span className="text-green-600 dark:text-green-400 font-bold text-lg">✓</span> : <span className="text-muted-foreground">{globalIndex + 1}</span>}
                            </div>
                            <div className="text-left">
                              <div className={`font-medium ${isCompleted ? 'text-foreground' : ''}`}>{exercise.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {exercise.duration ? `${Math.floor(exercise.duration / 60)}:${(exercise.duration % 60).toString().padStart(2, '0')}` : 'Duration based'}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {isCompleted ? (
                              <Badge variant="outline" className="text-xs bg-green-600 text-white border-green-600 dark:bg-green-700 dark:text-white dark:border-green-700">
                                Completed
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">
                                Pending
                              </Badge>
                            )}
                            {isCurrentExercise && <Badge variant="secondary" className="text-xs">Current</Badge>}
                          </div>
                        </Button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Cool-down Section */}
              {exercisesByPhase.cooldown.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
                    Cool-down ({exercisesByPhase.cooldown.length})
                  </h3>
                  <div className="space-y-2">
                    {exercisesByPhase.cooldown.map((exercise: any, index: number) => {
                      const globalIndex = workoutExerciseLogs.findIndex((ex: any) => ex === exercise);
                      const isCurrentExercise = globalIndex === currentExerciseIndex;
                      const isCompleted = isExerciseCompleted(globalIndex);
                      
                      return (
                        <Button
                          key={globalIndex}
                          variant={isCurrentExercise ? "default" : "outline"}
                          className={`w-full justify-between h-14 p-4 ${isCompleted ? 'bg-green-100/20 dark:bg-green-900/20 border-green-400 dark:border-green-500' : ''}`}
                          onClick={() => navigateToExercise(globalIndex)}
                        >
                          <div className="flex items-center space-x-3">
                            <div className="text-sm">
                              {isCompleted ? <span className="text-green-600 dark:text-green-400 font-bold text-lg">✓</span> : <span className="text-muted-foreground">{globalIndex + 1}</span>}
                            </div>
                            <div className="text-left">
                              <div className={`font-medium ${isCompleted ? 'text-foreground' : ''}`}>{exercise.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {exercise.duration ? `${Math.floor(exercise.duration / 60)}:${(exercise.duration % 60).toString().padStart(2, '0')}` : 'Duration based'}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {isCompleted ? (
                              <Badge variant="outline" className="text-xs bg-green-600 text-white border-green-600 dark:bg-green-700 dark:text-white dark:border-green-700">
                                Completed
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">
                                Pending
                              </Badge>
                            )}
                            {isCurrentExercise && <Badge variant="secondary" className="text-xs">Current</Badge>}
                          </div>
                        </Button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}