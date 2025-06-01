import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation, useRoute } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ExerciseCard } from '@/components/exercise-card';
import { useWorkout } from '@/hooks/use-workout';
import { ChevronLeft, ChevronRight, X, Pause } from 'lucide-react';
import type { Exercise, Workout, User } from '@shared/schema';
import type { ExerciseLog } from '@/lib/types';

export default function WorkoutPage() {
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [, setLocation] = useLocation();

  // Get workout ID from URL parameters using Wouter
  const urlParams = new URLSearchParams(window.location.search);
  const workoutId = parseInt(urlParams.get('id') || '51'); // Use a default workout ID

  const { data: userProfile } = useQuery<User>({
    queryKey: ["/api/auth/user"],
  });

  const { data: workout } = useQuery<Workout>({
    queryKey: [`/api/workout/${workoutId}`],
    enabled: !!workoutId,
  });

  const { data: exercises } = useQuery<Exercise[]>({
    queryKey: ['/api/exercises'],
  });

  const {
    currentExerciseIndex,
    currentExercise,
    isActive,
    isFirstExercise,
    isLastExercise,
    startWorkout,
    completeSet,
    nextExercise,
    previousExercise,
    completeWorkout,
    getCoachingTip,
    isStarting,
    isUpdating,
    isGettingTip,
    coachingTip
  } = useWorkout(workoutId, userProfile?.id || 0);

  // Create exercise logs from the complete workout flow (warm-up + main + cool-down)
  const exerciseLogs: ExerciseLog[] = [];
  
  if (workout) {
    // Parse warm-up activities
    const warmUp = workout.warmUp ? 
      (typeof workout.warmUp === 'string' ? JSON.parse(workout.warmUp) : workout.warmUp) : {};
    
    // Add warm-up exercises
    if (warmUp.activities) {
      warmUp.activities.forEach((activity: any, index: number) => {
        exerciseLogs.push({
          exerciseId: `warmup-${index}`,
          name: activity.exercise,
          sets: [{ reps: 0, completed: false }], // Time-based exercise
          restTime: '30 seconds',
          isWarmup: true,
          duration: activity.durationSeconds
        });
      });
    }
    
    // Add main exercises
    const mainExercises = workout.exercises ? 
      (typeof workout.exercises === 'string' ? JSON.parse(workout.exercises) : workout.exercises) : [];
    
    mainExercises.forEach((exercise: any) => {
      exerciseLogs.push({
        exerciseId: exercise.exerciseId || exercise.name, // Use exerciseId if available, fallback to name
        name: exercise.name,
        sets: Array.from({ length: exercise.sets }, () => ({
          reps: parseInt(exercise.reps.split('-')[0]) || 12,
          weight: exercise.weight ? 0 : undefined,
          completed: false
        })),
        restTime: exercise.restTime || '60 seconds'
      });
    });
    
    // TODO: Add cardio exercises if available (will implement after testing warm-up flow)
    
    // Parse cool-down activities
    const coolDown = workout.coolDown ? 
      (typeof workout.coolDown === 'string' ? JSON.parse(workout.coolDown) : workout.coolDown) : {};
    
    // Add cool-down exercises
    if (coolDown.activities) {
      coolDown.activities.forEach((activity: any, index: number) => {
        exerciseLogs.push({
          exerciseId: `cooldown-${index}`,
          name: activity.exercise,
          sets: [{ reps: 0, completed: false }], // Time-based exercise
          restTime: '30 seconds',
          isCooldown: true,
          duration: activity.durationSeconds
        });
      });
    }
  }

  const handleStartWorkout = () => {
    startWorkout(exerciseLogs);
  };

  // Auto-start workout if we have exercise logs and aren't already active
  useEffect(() => {
    if (exerciseLogs.length > 0 && !isActive && !isStarting) {
      console.log('Starting workout with exercises:', exerciseLogs);
      startWorkout(exerciseLogs);
    }
  }, [exerciseLogs.length, isActive, isStarting, startWorkout, exerciseLogs]);



  console.log('Workout state:', { 
    exerciseLogsCount: exerciseLogs.length, 
    isActive, 
    isStarting, 
    currentExercise: currentExercise?.name,
    currentExerciseIndex 
  });

  const handleCompleteSet = (setData: { reps: number; weight?: number; duration?: number }) => {
    if (currentExercise) {
      // Find the next incomplete set
      const currentExerciseLog = exerciseLogs[currentExerciseIndex];
      const nextSetIndex = currentExerciseLog?.sets.findIndex(set => !set.completed) || 0;
      completeSet(currentExerciseIndex, nextSetIndex, setData);
    }
  };

  const handleNextExercise = () => {
    if (isLastExercise) {
      completeWorkout();
      // Navigate back to home using smooth routing
      setLocation('/');
    } else {
      nextExercise();
    }
  };

  const handleExitWorkout = () => {
    setShowExitDialog(true);
  };

  const confirmExit = () => {
    // Save partial progress and exit using smooth routing
    setLocation('/');
  };

  // Get current exercise details from the workout's exercise data
  const currentExerciseDetails = workout?.exercises && currentExercise ? 
    (typeof workout.exercises === 'string' ? JSON.parse(workout.exercises) : workout.exercises)[currentExerciseIndex] : null;
  
  // For warm-up, cardio, and cool-down exercises, create a fake exercise object
  // For main exercises, look up in the exercise database
  const currentExerciseData = currentExercise?.isWarmup || currentExercise?.isCardio || currentExercise?.isCooldown ? 
    {
      id: typeof currentExercise.exerciseId === 'string' ? 0 : currentExercise.exerciseId,
      name: currentExercise.name,
      slug: currentExercise.name.toLowerCase().replace(/\s+/g, '-'),
      description: currentExercise.isWarmup ? 'Warm-up exercise' : 
                   currentExercise.isCardio ? 'Cardio exercise' : 'Cool-down exercise',
      muscle_groups: [],
      equipment: [],
      difficulty: 'beginner',
      instructions: currentExercise.isWarmup ? 
        [`Perform ${currentExercise.name} for ${currentExercise.duration} seconds`] :
        currentExercise.isCardio ?
        [`Perform ${currentExercise.name} for ${currentExercise.duration} seconds`] :
        [`Hold ${currentExercise.name} for ${currentExercise.duration} seconds`],
      createdAt: new Date(),
      tempo: null,
      modifications: null,
      progressions: null,
      youtubeId: null,
      imageUrl: null
    } : exercises?.find(ex => ex.id === currentExercise?.exerciseId);
  
  const currentSet = currentExercise?.sets.findIndex(set => !set.completed) || 0;

  // Update bottom navigation button text when exercise changes
  useEffect(() => {
    if (currentExercise) {
      const isTimeBased = currentExercise.isWarmup || currentExercise.isCooldown || currentExercise.isCardio;
      const buttonText = isTimeBased ? 'Complete Exercise' : 'Complete Set';
      
      window.dispatchEvent(new CustomEvent('workout-button-text-update', {
        detail: { text: buttonText }
      }));
    }
  }, [currentExercise]);

  // Listen for bottom navigation events
  useEffect(() => {
    const handleWorkoutPrevious = () => {
      if (!isFirstExercise && !isUpdating) {
        previousExercise();
      }
    };

    const handleWorkoutNext = () => {
      if (!isUpdating) {
        handleNextExercise();
      }
    };

    const handleWorkoutCompleteSet = () => {
      if (currentExercise && !isUpdating) {
        // For time-based exercises (warm-up, cool-down), just complete the exercise
        if (currentExercise.isWarmup || currentExercise.isCooldown) {
          handleNextExercise();
        } else {
          // For regular exercises, complete the current set
          handleCompleteSet({ reps: currentExercise.sets[currentSet]?.reps || 0, weight: 0 });
        }
      }
    };

    const handleWorkoutMenu = () => {
      handleExitWorkout();
    };

    window.addEventListener('workout-previous', handleWorkoutPrevious);
    window.addEventListener('workout-next', handleWorkoutNext);
    window.addEventListener('workout-complete-set', handleWorkoutCompleteSet);
    window.addEventListener('workout-menu', handleWorkoutMenu);

    return () => {
      window.removeEventListener('workout-previous', handleWorkoutPrevious);
      window.removeEventListener('workout-next', handleWorkoutNext);
      window.removeEventListener('workout-complete-set', handleWorkoutCompleteSet);
      window.removeEventListener('workout-menu', handleWorkoutMenu);
    };
  }, [isFirstExercise, isUpdating, previousExercise, handleNextExercise, currentExercise, currentSet, handleCompleteSet, handleExitWorkout]);

  // Show loading state while workout data is being fetched or starting
  if (!workout || exerciseLogs.length === 0 || isStarting) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading-spinner" />
      </div>
    );
  }

  if (!isActive || !currentExercise || !currentExerciseData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-4">
      {/* Simplified Workout Header - single exit button */}
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="w-10 h-10"></div> {/* Spacer */}
        
        <div className="text-center">
          <div className="font-medium text-foreground">
            Exercise {currentExerciseIndex + 1} of {exerciseLogs.length}
          </div>
          <div className="text-sm text-muted-foreground">
            {workout?.title || 'Upper Body Strength'}
          </div>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          className="w-10 h-10 rounded-full p-0 glass-effect border-border/50"
          onClick={handleExitWorkout}
        >
          <X size={16} />
        </Button>
      </div>

      {/* Exercise Content */}
      <div className="px-4 py-6">
        <ExerciseCard
          exercise={currentExerciseData}
          exerciseLog={currentExercise}
          currentSetIndex={currentSet}
          onCompleteSet={handleCompleteSet}
          onShowTutorial={() => console.log('Show tutorial')}
          onGetCoachingTip={() => getCoachingTip(currentExerciseData.name, { currentSet, reps: 12 })}
          coachingTip={coachingTip}
          isLoading={isUpdating || isGettingTip}
        />
      </div>

      {/* Progress Indicator - moved to main content area */}
      <div className="px-4 pb-20">
        <div className="flex justify-center space-x-2">
          {exerciseLogs.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === currentExerciseIndex
                  ? 'bg-primary w-6'
                  : index < currentExerciseIndex
                  ? 'bg-accent'
                  : 'bg-muted'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Exit Confirmation Dialog */}
      {showExitDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="glass-effect w-full max-w-sm">
            <CardContent className="p-6">
              <h3 className="font-poppins font-semibold text-lg text-foreground mb-2">
                Exit Workout?
              </h3>
              <p className="text-muted-foreground mb-6">
                Your progress will be saved, but you won't complete this workout.
              </p>
              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  className="flex-1 glass-effect border-border/50"
                  onClick={() => setShowExitDialog(false)}
                >
                  Continue
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={confirmExit}
                >
                  Exit
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
