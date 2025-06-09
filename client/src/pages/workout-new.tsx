import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Timer, Play, Pause, CheckCircle, SkipForward, ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { useWorkout } from '@/hooks/use-workout';
import type { ExerciseLog } from '@/lib/types';

export default function WorkoutNewPage() {
  const [location] = useLocation();
  const workoutId = new URLSearchParams(location.split('?')[1] || '').get('id');
  const [, setLocation] = useLocation();
  const [forceRenderKey, setForceRenderKey] = useState(0);
  
  // Get user profile
  const { data: userProfile } = useQuery({
    queryKey: ['/api/auth/user'],
  });

  // Get workout details
  const { data: workout, isLoading: isWorkoutLoading } = useQuery({
    queryKey: [`/api/workouts/${workoutId}`],
    enabled: !!workoutId,
  });

  const {
    exercises,
    currentExerciseIndex,
    sessionId,
    isActive,
    startTime,
    completedExercises,
    workoutProgress,
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
    isStarting,
    isUpdating,
    coachingTip,
    isLoadingTip
  } = useWorkout(parseInt(workoutId || '0'), userProfile?.id || 0);

  const [showCoachingTip, setShowCoachingTip] = useState(false);
  const [activeSetIndex, setActiveSetIndex] = useState<number | null>(null);

  // Create exercise logs from workout data
  const workoutExerciseLogs: ExerciseLog[] = useMemo(() => {
    const logs: ExerciseLog[] = [];
    
    if (!workout) return logs;

    const workoutExercises = workout.exercises as any[] || [];
    
    workoutExercises.forEach((exerciseData: any) => {
      const sets = exerciseData.sets?.map((set: any) => ({
        reps: set.reps || 0,
        weight: set.weight,
        duration: set.duration,
        actualReps: set.actualReps,
        actualWeight: set.actualWeight,
        actualDuration: set.actualDuration,
        notes: set.notes,
        repInfo: set.repInfo
      })) || [{ reps: exerciseData.reps || 0 }];

      logs.push({
        id: exerciseData.id || Math.random(),
        name: exerciseData.name || 'Unknown Exercise',
        exerciseId: exerciseData.id,
        sets: sets,
        type: exerciseData.type || 'main',
        targetMuscles: exerciseData.targetMuscles || [],
        equipment: exerciseData.equipment || [],
        instructions: exerciseData.instructions || [],
        videoUrl: exerciseData.videoUrl,
        imageUrl: exerciseData.imageUrl
      });
    });

    return logs;
  }, [workout]);

  // Current exercise data
  const currentExerciseData = workoutExerciseLogs[currentExerciseIndex];
  const currentExerciseLog = exercises[currentExerciseIndex] || currentExerciseData;

  // Auto-show coaching tip when it's received
  useEffect(() => {
    if (coachingTip && !isLoadingTip) {
      setShowCoachingTip(true);
    }
  }, [coachingTip, isLoadingTip]);

  const handleStartWorkout = () => {
    if (workoutExerciseLogs.length > 0) {
      startWorkout(workoutExerciseLogs);
    }
  };

  const handleCompleteSet = (setIndex: number) => {
    if (!currentExerciseLog?.sets[setIndex]) return;

    const setData = currentExerciseLog.sets[setIndex];
    completeSet(currentExerciseIndex, setIndex, setData);
  };

  const handleCompleteExercise = () => {
    completeExercise(currentExerciseIndex, true, false);
    
    // Show completion feedback for 2 seconds before moving to next exercise
    setTimeout(() => {
      if (currentExerciseIndex < exercises.length - 1) {
        nextExercise();
      }
    }, 2000);
  };

  const handleSkipExercise = () => {
    skipExercise(currentExerciseIndex);
    if (currentExerciseIndex < exercises.length - 1) {
      nextExercise();
    }
  };

  const handleNextExercise = () => {
    if (currentExerciseIndex < exercises.length - 1) {
      nextExercise();
    }
  };

  const handlePreviousExercise = () => {
    if (currentExerciseIndex > 0) {
      previousExercise();
    }
  };

  const isCurrentExerciseCompleted = completedExercises.has(currentExerciseIndex);
  const isFirstExercise = currentExerciseIndex === 0;
  const isLastExercise = currentExerciseIndex === exercises.length - 1;

  if (isWorkoutLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading workout...</p>
        </div>
      </div>
    );
  }

  if (!workout) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">Workout not found</p>
          <Button onClick={() => setLocation('/home')} className="mt-4">
            Go Back Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Workout Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {workout.title}
            </h1>
            {sessionId && (
              <Badge variant="secondary">
                Session #{sessionId}
              </Badge>
            )}
          </div>
          
          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
              <span>Progress</span>
              <span>{workoutProgress.completedCount}/{workoutProgress.totalCount} exercises</span>
            </div>
            <Progress value={workoutProgress.percentage} className="h-2" />
          </div>

          {/* Timer */}
          {isActive && startTime && (
            <div className="flex items-center gap-2 text-lg font-mono">
              <Timer className="h-5 w-5" />
              <span>
                {Math.floor((Date.now() - startTime.getTime()) / 60000)}:
                {String(Math.floor(((Date.now() - startTime.getTime()) % 60000) / 1000)).padStart(2, '0')}
              </span>
            </div>
          )}
        </div>

        {/* Start Workout Button */}
        {!isActive && (
          <Card className="mb-6">
            <CardContent className="p-6 text-center">
              <h2 className="text-xl font-semibold mb-4">Ready to start your workout?</h2>
              <Button 
                onClick={handleStartWorkout}
                disabled={isStarting}
                size="lg"
                className="w-full"
              >
                <Play className="h-5 w-5 mr-2" />
                {isStarting ? 'Starting...' : 'Start Workout'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Current Exercise */}
        {isActive && currentExerciseData && (
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">
                  {currentExerciseData.name}
                </CardTitle>
                <Badge variant={currentExerciseData.type === 'warmup' ? 'secondary' : 'default'}>
                  {currentExerciseData.type}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {/* Exercise Navigation */}
              <div className="flex items-center justify-between mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreviousExercise}
                  disabled={isFirstExercise}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Exercise {currentExerciseIndex + 1} of {exercises.length}
                </span>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextExercise}
                  disabled={isLastExercise}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Sets */}
              <div className="space-y-3 mb-4">
                {currentExerciseLog?.sets?.map((set: any, index: number) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <span className="text-sm font-medium">Set {index + 1}</span>
                    <div className="flex-1 text-sm">
                      {set.reps && <span>{set.reps} reps</span>}
                      {set.weight && <span> @ {set.weight}lbs</span>}
                      {set.duration && <span>{set.duration}s</span>}
                    </div>
                    <Button
                      size="sm"
                      variant={set.completedAt ? "default" : "outline"}
                      onClick={() => handleCompleteSet(index)}
                      disabled={!!set.completedAt}
                    >
                      {set.completedAt ? <CheckCircle className="h-4 w-4" /> : 'Complete'}
                    </Button>
                  </div>
                ))}
              </div>

              {/* Exercise Actions */}
              <div className="flex gap-3">
                <Button
                  onClick={handleCompleteExercise}
                  disabled={isCurrentExerciseCompleted}
                  className="flex-1"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {isCurrentExerciseCompleted ? 'Completed' : 'Complete Exercise'}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={handleSkipExercise}
                  disabled={isCurrentExerciseCompleted}
                >
                  <SkipForward className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Workout Controls */}
        {isActive && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex gap-3">
                <Button
                  onClick={pauseWorkout}
                  variant="outline"
                  className="flex-1"
                >
                  <Pause className="h-4 w-4 mr-2" />
                  Pause
                </Button>
                
                <Button
                  onClick={completeWorkout}
                  variant="default"
                  className="flex-1"
                >
                  Finish Workout
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Coaching Tip */}
        {coachingTip && showCoachingTip && (
          <Card className="mb-6 border-yellow-200 dark:border-yellow-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                <Star className="h-5 w-5" />
                Coaching Tip
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 dark:text-gray-300 mb-4">{coachingTip}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCoachingTip(false)}
              >
                Got it
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}