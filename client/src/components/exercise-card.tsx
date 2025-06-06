import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from '@/components/ui/dialog';
import { Play, Pause, RotateCcw, MessageCircle } from 'lucide-react';
import { YouTubeVideo } from '@/components/youtube-video';
import type { Exercise } from '@shared/schema';
import type { ExerciseLog } from '@/lib/types';

interface ExerciseCardProps {
  exercise: Exercise;
  exerciseLog?: ExerciseLog;
  currentSetIndex: number;
  exerciseIndex?: number;
  totalExercises?: number;
  workoutTitle?: string;
  onCompleteSet: (setData: { reps: number; weight?: number; duration?: number; actualReps?: number; actualWeight?: number; actualDuration?: number }) => void;
  onShowTutorial: () => void;
  onGetCoachingTip: () => void;
  coachingTip?: string;
  isLoading?: boolean;
}

export function ExerciseCard({
  exercise,
  exerciseLog,
  currentSetIndex,
  exerciseIndex = 1,
  totalExercises = 1,
  workoutTitle = "Workout",
  onCompleteSet,
  onShowTutorial,
  onGetCoachingTip,
  coachingTip,
  isLoading = false
}: ExerciseCardProps) {
  // Initialize with planned values or user preferences from localStorage
  const getStoredValue = (key: string, defaultValue: number) => {
    const stored = localStorage.getItem(`workout_${key}`);
    return stored ? parseInt(stored) : defaultValue;
  };

  const [reps, setReps] = useState(() => 
    exerciseLog?.sets[currentSetIndex]?.reps || getStoredValue('reps', 12)
  );
  const [weight, setWeight] = useState(() => 
    exerciseLog?.sets[currentSetIndex]?.weight || getStoredValue('weight', 15)
  );
  const [duration, setDuration] = useState(30);
  const [showTutorial, setShowTutorial] = useState(false);
  
  // Timer state for time-based exercises
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [hasTimerStarted, setHasTimerStarted] = useState(false);
  
  // Rest timer state for strength exercises
  const [restTimeRemaining, setRestTimeRemaining] = useState(0);
  const [isRestTimerActive, setIsRestTimerActive] = useState(false);
  const [showRestTimer, setShowRestTimer] = useState(false);
  
  // Set editing state
  const [editingSetIndex, setEditingSetIndex] = useState<number | null>(null);
  const [editReps, setEditReps] = useState(0);
  const [editWeight, setEditWeight] = useState(0);

  const currentSet = exerciseLog?.sets[currentSetIndex];
  const totalSets = exerciseLog?.sets.length || 1;
  
  // Determine exercise type based on exerciseLog properties
  const isWarmup = exerciseLog?.isWarmup;
  const isCooldown = exerciseLog?.isCooldown;
  const isCardio = exerciseLog?.isCardio;
  
  // OpenAI data structure-based measurement type detection
  const getMeasurementType = () => {
    // Check for hybrid exercises first (both duration and reps)
    if (exerciseLog?.duration && exerciseLog.duration > 0 && currentSet?.reps && currentSet.reps > 0) {
      return 'hybrid';
    }
    
    // Check if exercise has duration from OpenAI (warmup/cardio/cooldown)
    if (exerciseLog?.duration && exerciseLog.duration > 0) {
      return 'time';
    }
    
    // Check if exercise has rep data from OpenAI (main exercises)
    if (currentSet?.reps && currentSet.reps > 0) {
      return 'reps';
    }
    
    return 'reps'; // Default fallback
  };
  
  const measurementType = getMeasurementType();
  const isTimeBased = measurementType === 'time' || measurementType === 'hybrid';
  
  // Initialize timer when exercise changes
  useEffect(() => {
    if (isTimeBased && exerciseLog?.duration) {
      setTimeRemaining(exerciseLog.duration);
      setIsTimerRunning(false);
      setHasTimerStarted(false);
    }
  }, [isTimeBased, exerciseLog?.duration]);

  // Get appropriate duration for different measurement types
  const getExerciseDuration = () => {
    if (exerciseLog?.duration) return exerciseLog.duration;
    
    switch (measurementType) {
      case 'time':
        return 60; // Default 60 seconds for time-based
      case 'hybrid':
        return exerciseLog?.duration || 60; // Use provided duration or default
      default:
        return 60;
    }
  };

  // Timer countdown logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isTimerRunning && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            setIsTimerRunning(false);
            setHasTimerStarted(false);
            // Auto-complete exercise when timer reaches zero
            setTimeout(() => {
              handleCompleteSet();
            }, 500);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, timeRemaining]);

  // Rest timer countdown logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isRestTimerActive && restTimeRemaining > 0) {
      interval = setInterval(() => {
        setRestTimeRemaining((prev) => {
          if (prev <= 1) {
            setIsRestTimerActive(false);
            setShowRestTimer(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRestTimerActive, restTimeRemaining]);

  const startTimer = () => {
    setIsTimerRunning(true);
    setHasTimerStarted(true);
  };

  const pauseTimer = () => {
    setIsTimerRunning(false);
  };

  const resetTimer = () => {
    const duration = getExerciseDuration();
    setTimeRemaining(duration);
    setIsTimerRunning(false);
    setHasTimerStarted(false);
  };

  const startRestTimer = () => {
    const restSeconds = parseInt(exerciseLog?.restTime?.match(/\d+/)?.[0] || '60');
    setRestTimeRemaining(restSeconds);
    setIsRestTimerActive(true);
    setShowRestTimer(true);
  };

  const stopRestTimer = () => {
    setIsRestTimerActive(false);
    setShowRestTimer(false);
    setRestTimeRemaining(0);
  };

  const handleEditSet = (setIndex: number) => {
    const set = exerciseLog?.sets[setIndex];
    if (set) {
      setEditingSetIndex(setIndex);
      setEditReps(set.actualReps || set.reps);
      setEditWeight(set.actualWeight || set.weight || 0);
    }
  };

  const saveEditedSet = () => {
    if (editingSetIndex !== null && exerciseLog?.sets[editingSetIndex]) {
      // This would need to be passed up to the parent to update the exercise log
      // For now, we'll just close the edit mode
      setEditingSetIndex(null);
    }
  };

  const cancelEdit = () => {
    setEditingSetIndex(null);
  };

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : secs.toString();
  };

  // Calculate progress percentage for visual ring
  const progressPercentage = exerciseLog?.duration ? 
    ((exerciseLog.duration - timeRemaining) / exerciseLog.duration) * 100 : 0;

  const handleCompleteSet = () => {
    if (isTimeBased) {
      // For time-based exercises, track actual duration vs planned
      const plannedDuration = getExerciseDuration();
      const actualDuration = plannedDuration - timeRemaining;
      
      onCompleteSet({ 
        reps: 0, 
        duration: plannedDuration,
        actualDuration 
      });
    } else {
      // For rep-based exercises, allow tracking actual vs planned values
      const plannedReps = currentSet?.reps || reps;
      const plannedWeight = currentSet?.weight || weight;
      
      // Save user preferences to localStorage
      localStorage.setItem('workout_reps', reps.toString());
      if (exercise.equipment && !exercise.equipment.includes('none')) {
        localStorage.setItem('workout_weight', weight.toString());
      }
      
      onCompleteSet({
        reps: plannedReps,
        weight: exercise.equipment && !exercise.equipment.includes('none') ? plannedWeight : undefined,
        actualReps: reps, // User's input becomes actual
        actualWeight: exercise.equipment && !exercise.equipment.includes('none') ? weight : undefined
      });

      // Start rest timer if there are more sets in this exercise
      const remainingSets = exerciseLog?.sets.slice(currentSetIndex + 1).filter(set => !set.completed);
      if (remainingSets && remainingSets.length > 0) {
        startRestTimer();
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Exercise Video/Image */}
      <div className="relative rounded-3xl overflow-hidden h-64">
        <YouTubeVideo
          videoId={exercise.youtubeId}
          exerciseName={exercise.name}
          exerciseIndex={exerciseIndex}
          totalExercises={totalExercises}
          workoutTitle={workoutTitle}
          className="w-full h-full"
        />
      </div>

      {/* Exercise Details */}
      <div className="text-center">        
        {/* Consolidated Exercise Info */}
        <Card className="glass-effect mb-6">
          <CardContent className="p-6 text-center">
            <h2 className="font-poppins font-bold text-xl mb-4 text-foreground">
              {exercise.name}
            </h2>
            {isTimeBased ? (
              <div className="relative">
                {/* Timer Circle with Progress Ring */}
                <div className="relative w-32 h-32 mx-auto mb-4">
                  <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
                    {/* Background circle */}
                    <circle
                      cx="60"
                      cy="60"
                      r="50"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      className="text-muted/20"
                    />
                    {/* Progress circle */}
                    <circle
                      cx="60"
                      cy="60"
                      r="50"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      strokeLinecap="round"
                      className={`text-accent transition-all duration-1000 ${
                        timeRemaining <= 5 ? 'text-red-500' : 'text-accent'
                      }`}
                      strokeDasharray={`${2 * Math.PI * 50}`}
                      strokeDashoffset={`${2 * Math.PI * 50 * (1 - progressPercentage / 100)}`}
                    />
                  </svg>
                  {/* Timer display */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-primary">
                        {formatTime(timeRemaining)}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        seconds
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Timer Controls */}
                <div className="flex justify-center space-x-2 mb-2">
                  {!hasTimerStarted ? (
                    <Button
                      onClick={startTimer}
                      size="sm"
                      className="glass-effect bg-accent hover:bg-accent/90 text-white"
                    >
                      <Play size={16} className="mr-1" />
                      Start Timer
                    </Button>
                  ) : (
                    <>
                      <Button
                        onClick={isTimerRunning ? pauseTimer : startTimer}
                        size="sm"
                        className="glass-effect bg-accent hover:bg-accent/90 text-white"
                      >
                        {isTimerRunning ? (
                          <>
                            <Pause size={16} className="mr-1" />
                            Pause
                          </>
                        ) : (
                          <>
                            <Play size={16} className="mr-1" />
                            Resume
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={resetTimer}
                        size="sm"
                        variant="outline"
                        className="glass-effect border-border/50"
                      >
                        <RotateCcw size={16} />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="text-4xl font-bold text-primary mb-2">{currentSet?.reps || reps}</div>
                <div className="text-muted-foreground mb-2">reps</div>
                <div className="text-sm mb-3">
                  <span className="text-accent font-medium">Set {currentSetIndex + 1}</span> of {totalSets}
                </div>
                
                {/* Set Progress Indicators - Clickable for editing */}
                <div className="flex justify-center space-x-2 mb-2">
                  {exerciseLog?.sets.map((set, index) => (
                    <button
                      key={index}
                      onClick={() => set.completed ? handleEditSet(index) : null}
                      className={`w-3 h-3 rounded-full border-2 transition-colors ${
                        set.completed
                          ? 'bg-accent border-accent hover:bg-accent/80 cursor-pointer'
                          : index === currentSetIndex
                          ? 'border-accent bg-accent/20'
                          : 'border-muted bg-transparent'
                      }`}
                      disabled={!set.completed}
                    />
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* AI Coach Tip */}
        {coachingTip && (
          <Card className="glass-effect border-accent/20 mb-6">
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-accent to-primary rounded-full flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="text-white" size={14} />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm text-foreground/90">{coachingTip}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Rest Timer */}
        {showRestTimer && !isTimeBased && (
          <Card className="glass-effect border-accent/20 mb-6">
            <CardContent className="p-4 text-center">
              <div className="text-sm text-muted-foreground mb-2">Rest Period</div>
              <div className="text-3xl font-bold text-accent mb-3">{formatTime(restTimeRemaining)}</div>
              <div className="flex justify-center space-x-2">
                <Button
                  onClick={stopRestTimer}
                  size="sm"
                  variant="outline"
                  className="glass-effect border-border/50"
                >
                  Skip Rest
                </Button>
                <Button
                  onClick={() => setIsRestTimerActive(!isRestTimerActive)}
                  size="sm"
                  className="glass-effect bg-accent hover:bg-accent/90 text-white"
                >
                  {isRestTimerActive ? (
                    <>
                      <Pause size={16} className="mr-1" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play size={16} className="mr-1" />
                      Resume
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Dynamic Input Fields */}
        {!isTimeBased && (
          <Card className="glass-effect mb-6">
            <CardContent className="p-4 space-y-4">
              {/* Reps Input */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground">Reps</span>
                <input
                  type="number"
                  value={reps}
                  onChange={(e) => setReps(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-20 px-3 py-2 text-center bg-background/50 border border-border/50 rounded-lg focus:border-accent focus:outline-none text-foreground"
                  min="1"
                />
              </div>

              {/* Weight Input (if equipment required) */}
              {exercise.equipment && !exercise.equipment.includes('none') && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground">Weight (lbs)</span>
                  <input
                    type="number"
                    value={weight}
                    onChange={(e) => setWeight(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-20 px-3 py-2 text-center bg-background/50 border border-border/50 rounded-lg focus:border-accent focus:outline-none text-foreground"
                    min="0"
                    step="5"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        )}



        {/* Set Editing Modal */}
        {editingSetIndex !== null && (
          <Card className="glass-effect border-accent/20 mb-6">
            <CardContent className="p-4">
              <div className="text-center mb-4">
                <h3 className="font-medium text-foreground">Edit Set {editingSetIndex + 1}</h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground">Reps</span>
                  <input
                    type="number"
                    value={editReps}
                    onChange={(e) => setEditReps(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-20 px-3 py-2 text-center bg-background/50 border border-border/50 rounded-lg focus:border-accent focus:outline-none text-foreground"
                    min="1"
                  />
                </div>
                {exercise.equipment && !exercise.equipment.includes('none') && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-foreground">Weight (lbs)</span>
                    <input
                      type="number"
                      value={editWeight}
                      onChange={(e) => setEditWeight(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-20 px-3 py-2 text-center bg-background/50 border border-border/50 rounded-lg focus:border-accent focus:outline-none text-foreground"
                      min="0"
                      step="5"
                    />
                  </div>
                )}
                <div className="flex space-x-2">
                  <Button
                    onClick={cancelEdit}
                    variant="outline"
                    className="flex-1 glass-effect border-border/50"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={saveEditedSet}
                    className="flex-1 glass-effect bg-accent hover:bg-accent/90 text-white"
                  >
                    Save
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Complete Set Button */}
        <Button 
          onClick={handleCompleteSet}
          className="w-full glass-effect bg-gradient-to-r from-accent to-primary hover:from-accent/90 hover:to-primary/90 text-white py-4 touch-target font-medium border-0"
          disabled={isLoading || showRestTimer}
        >
          {isLoading ? 'Completing...' : 
           showRestTimer ? 'Rest in Progress...' :
           isTimeBased ? 'Complete Exercise' : 'Complete Set'}
        </Button>

        {/* Get Coaching Tip Button */}
        <Button 
          onClick={onGetCoachingTip}
          variant="outline"
          className="w-full mt-3 glass-effect border-border/50 hover:bg-background/10 text-foreground touch-target"
          disabled={isLoading}
        >
          <MessageCircle size={16} className="mr-2" />
          Get AI Tip
        </Button>
      </div>
    </div>
  );
}
