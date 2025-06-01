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

  // Create exercise logs from the workout's exercises
  const exerciseLogs: ExerciseLog[] = workout?.exercises ? 
    (typeof workout.exercises === 'string' ? JSON.parse(workout.exercises) : workout.exercises).map((exercise: any) => ({
      exerciseId: exercise.exerciseId,
      name: exercise.name,
      sets: Array.from({ length: exercise.sets }, () => ({
        reps: parseInt(exercise.reps.split('-')[0]) || 12, // Use lower bound of rep range
        weight: exercise.weight ? 0 : undefined, // User will input actual weight
        completed: false
      })),
      restTime: exercise.restTime || '60 seconds'
    })) : [];

  const handleStartWorkout = () => {
    startWorkout(exerciseLogs);
  };

  // Auto-start workout if we have exercise logs and aren't already active
  useEffect(() => {
    if (exerciseLogs.length > 0 && !isActive && !isStarting) {
      startWorkout(exerciseLogs);
    }
  }, [exerciseLogs.length, isActive, isStarting, startWorkout, exerciseLogs]);

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
  
  const currentExerciseData = exercises?.find(ex => ex.id === currentExercise?.exerciseId);
  const currentSet = currentExercise?.sets.findIndex(set => !set.completed) || 0;

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
    <div className="min-h-screen bg-background">
      {/* Workout Header */}
      <div className="glass-effect px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <Button
          variant="outline"
          size="sm"
          className="w-10 h-10 rounded-full p-0 glass-effect border-border/50"
          onClick={() => {}} // Pause functionality
        >
          <Pause size={16} />
        </Button>
        
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

      {/* Workout Controls */}
      <div className="fixed bottom-0 left-0 right-0 px-4 pb-6 bg-gradient-to-t from-background to-transparent pt-6">
        <div className="max-w-sm mx-auto space-y-4">
          <div className="flex space-x-3">
            <Button
              variant="outline"
              className="flex-1 glass-effect border-border/50 py-4 touch-target"
              onClick={previousExercise}
              disabled={isFirstExercise || isUpdating}
            >
              <ChevronLeft size={16} className="mr-2" />
              Previous
            </Button>
            
            <Button
              className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground py-4 touch-target"
              onClick={handleNextExercise}
              disabled={isUpdating}
            >
              {isLastExercise ? 'Complete Workout' : 'Next Exercise'}
              {!isLastExercise && <ChevronRight size={16} className="ml-2" />}
            </Button>
          </div>

          {/* Progress Indicator */}
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
