import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { YouTubeVideo } from '@/components/youtube-video';
import { useWorkout } from '@/hooks/use-workout';
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

  const { data: exercises } = useQuery<Exercise[]>({
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
    nextExercise,
    previousExercise,
    completeWorkout,
    getCoachingTip,
    isStarting,
    isUpdating,
    isGettingTip,
    coachingTip
  } = useWorkout(workoutId, userProfile?.id || 0);

  // Create exercise logs from workout data
  const exerciseLogs: ExerciseLog[] = [];
  
  if (workout) {
    // Parse warm-up activities
    const warmUp = workout.warmUp ? 
      (typeof workout.warmUp === 'string' ? JSON.parse(workout.warmUp) : workout.warmUp) : {};
    
    if (warmUp.activities) {
      warmUp.activities.forEach((activity: any) => {
        if (activity.exerciseId && typeof activity.exerciseId === 'number') {
          exerciseLogs.push({
            exerciseId: activity.exerciseId,
            name: activity.exercise,
            sets: [{ reps: 0, completed: false }],
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
        exerciseLogs.push({
          exerciseId: exercise.exerciseId,
          name: exercise.name,
          sets: Array.from({ length: exercise.sets }, () => ({
            reps: parseInt(exercise.reps.split('-')[0]) || 12,
            weight: exercise.weight ? 0 : undefined,
            completed: false
          })),
          restTime: exercise.restTime || '60 seconds'
        });
      }
    });
    
    // Add cardio exercises
    const cardio = workout.cardio ? 
      (typeof workout.cardio === 'string' ? JSON.parse(workout.cardio) : workout.cardio) : {};
    
    if (cardio.activities) {
      cardio.activities.forEach((activity: any) => {
        if (activity.exerciseId && typeof activity.exerciseId === 'number') {
          exerciseLogs.push({
            exerciseId: activity.exerciseId,
            name: activity.exercise,
            sets: [{ reps: 0, completed: false }],
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
          exerciseLogs.push({
            exerciseId: activity.exerciseId,
            name: activity.exercise,
            sets: [{ reps: 0, completed: false }],
            restTime: '30 seconds',
            isCooldown: true,
            duration: activity.durationSeconds
          });
        }
      });
    }
  }

  // Auto-start workout
  useEffect(() => {
    if (exerciseLogs.length > 0 && !isActive && !isStarting) {
      startWorkout(exerciseLogs);
    }
  }, [exerciseLogs.length, isActive, isStarting, startWorkout, exerciseLogs]);

  // Get current exercise data
  const currentExerciseData = (() => {
    if (!currentExercise || !exercises) return null;
    
    if (typeof currentExercise.exerciseId === 'number') {
      const foundExercise = exercises.find(ex => ex.id === currentExercise.exerciseId);
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
      const coolDownCount = exerciseLogs.length - warmUpCount - mainCount - cardioCount;
      return { phase: 'COOLDOWN', position: `${currentExerciseIndex - warmUpCount - mainCount - cardioCount + 1} of ${coolDownCount}` };
    }
  };

  const { phase, position } = getCurrentPhase();

  // Get plan name
  const planName = workoutPlans?.find(plan => plan.id === workout?.planId)?.title || 'Workout Plan';

  const handleCompleteSet = (setData: { reps: number; weight?: number; duration?: number; actualReps?: number; actualWeight?: number; actualDuration?: number }) => {
    if (currentExercise) {
      const currentExerciseLog = exerciseLogs[currentExerciseIndex];
      const nextSetIndex = currentExerciseLog?.sets.findIndex(set => !set.completed) || 0;
      completeSet(currentExerciseIndex, nextSetIndex, setData);
    }
  };

  const handleNextExercise = () => {
    if (isLastExercise) {
      completeWorkout();
      setLocation('/');
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

  // Show loading state
  if (!workout || exerciseLogs.length === 0 || isStarting || !isActive || !currentExercise || !currentExerciseData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="loading-spinner" />
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
      <main className="flex-1 pt-16 pb-24">
        {/* Video Section - 30% of screen */}
        <div className="relative h-[30vh] px-4 pt-4">
          <div className="relative h-full rounded-xl overflow-hidden">
            <YouTubeVideo
              videoId={currentExerciseData.youtubeId}
              exerciseName={currentExerciseData.name}
              exerciseIndex={currentExerciseIndex + 1}
              totalExercises={exerciseLogs.length}
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
          {/* Exercise Identity */}
          <div className="text-center">
            <h2 className="text-xl font-semibold text-foreground">
              {currentExerciseData.name}
            </h2>
          </div>

          {/* Primary Exercise Data */}
          <Card className="glass-effect">
            <CardContent className="p-4">
              {currentExercise.isWarmup || currentExercise.isCooldown || currentExercise.isCardio ? (
                /* Time-based exercise */
                <div className="text-center space-y-4">
                  <div className="text-4xl font-bold text-primary">
                    {Math.floor((currentExercise.duration || 0) / 60)}:{((currentExercise.duration || 0) % 60).toString().padStart(2, '0')}
                  </div>
                  <div className="text-sm text-muted-foreground">Duration</div>
                  <Button className="w-full">
                    <Play size={16} className="mr-2" />
                    Start Timer
                  </Button>
                </div>
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
                      const isCompleted = set.completed;
                      const isCurrent = !isCompleted && currentExercise.sets.slice(0, index).every(s => s.completed);
                      
                      return (
                        <Collapsible key={index} open={isCurrent} onOpenChange={() => {}}>
                          <CollapsibleTrigger asChild>
                            <Button
                              variant={isCompleted ? "default" : isCurrent ? "outline" : "ghost"}
                              className="w-full justify-between h-12"
                              disabled={isCompleted}
                            >
                              <span>Set {index + 1}: {set.reps} reps</span>
                              <div className="flex items-center space-x-2">
                                {isCompleted && <span className="text-green-500">✓</span>}
                                {isCurrent && <ChevronDown size={16} />}
                              </div>
                            </Button>
                          </CollapsibleTrigger>
                          
                          {isCurrent && (
                            <CollapsibleContent className="pt-3">
                              <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="text-sm font-medium">Reps</label>
                                    <Input
                                      type="number"
                                      defaultValue={set.reps}
                                      className="mt-1"
                                    />
                                  </div>
                                  {set.weight !== undefined && (
                                    <div>
                                      <label className="text-sm font-medium">Weight</label>
                                      <Input
                                        type="number"
                                        defaultValue={set.weight || 0}
                                        className="mt-1"
                                      />
                                    </div>
                                  )}
                                </div>
                                <Button 
                                  onClick={() => handleCompleteSet({ 
                                    reps: set.reps, 
                                    weight: set.weight 
                                  })}
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
              <div className="flex justify-center space-x-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => getCoachingTip(currentExerciseData.name, {})}
                  disabled={isGettingTip}
                >
                  <MessageCircle size={16} className="mr-1" />
                  Tip
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setInstructionsOpen(!instructionsOpen)}
                >
                  <FileText size={16} className="mr-1" />
                  Guide
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextExercise}
                >
                  <SkipForward size={16} className="mr-1" />
                  Skip
                </Button>
              </div>
            </CardContent>
          </Card>

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

                  {/* AI Coaching Tip */}
                  {coachingTip && (
                    <div className="bg-accent/10 p-3 rounded-lg border border-accent/20">
                      <div className="flex items-start space-x-2">
                        <MessageCircle className="text-accent mt-0.5" size={16} />
                        <p className="text-sm">{coachingTip}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border/20 h-20 flex items-center px-4">
        <div className="flex items-center justify-between w-full">
          <Button
            variant="outline"
            size="sm"
            onClick={previousExercise}
            disabled={isFirstExercise || isUpdating}
          >
            <ChevronLeft size={16} />
          </Button>
          
          <Button variant="outline" size="sm">
            <Menu size={16} />
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
    </div>
  );
}