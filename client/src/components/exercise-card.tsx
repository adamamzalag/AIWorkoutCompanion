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
  onCompleteSet: (setData: { reps: number; weight?: number; duration?: number }) => void;
  onShowTutorial: () => void;
  onGetCoachingTip: () => void;
  coachingTip?: string;
  isLoading?: boolean;
  isConsolidated?: boolean;
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
  isLoading = false,
  isConsolidated = false
}: ExerciseCardProps) {
  const [reps, setReps] = useState(12);
  const [weight, setWeight] = useState(15);
  const [duration, setDuration] = useState(30);
  const [showTutorial, setShowTutorial] = useState(false);
  
  // Timer state for time-based exercises
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [hasTimerStarted, setHasTimerStarted] = useState(false);

  const currentSet = exerciseLog?.sets[currentSetIndex];
  const totalSets = exerciseLog?.sets.length || 1;
  
  // Determine exercise type based on exerciseLog properties
  const isWarmup = exerciseLog?.isWarmup;
  const isCooldown = exerciseLog?.isCooldown;
  const isCardio = exerciseLog?.isCardio;
  const isTimeBased = isWarmup || isCooldown || isCardio;
  
  // Initialize timer when exercise changes
  useEffect(() => {
    if (isTimeBased && exerciseLog?.duration) {
      setTimeRemaining(exerciseLog.duration);
      setIsTimerRunning(false);
      setHasTimerStarted(false);
    }
  }, [isTimeBased, exerciseLog?.duration]);

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

  const startTimer = () => {
    setIsTimerRunning(true);
    setHasTimerStarted(true);
  };

  const pauseTimer = () => {
    setIsTimerRunning(false);
  };

  const resetTimer = () => {
    setTimeRemaining(exerciseLog?.duration || 30);
    setIsTimerRunning(false);
    setHasTimerStarted(false);
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
      onCompleteSet({ reps: 0, duration });
    } else {
      onCompleteSet({
        reps,
        weight: exercise.equipment && !exercise.equipment.includes('none') ? weight : undefined
      });
    }
  };

  if (isConsolidated) {
    return (
      <div className="space-y-6">
        {/* Consolidated Hero Card */}
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            {/* Video Section with Overlay Info */}
            <div className="relative h-80">
              <YouTubeVideo
                videoId={exercise.youtubeId}
                exerciseName={exercise.name}
                exerciseIndex={exerciseIndex}
                totalExercises={totalExercises}
                workoutTitle={workoutTitle}
                className="w-full h-full"
              />
              
              {/* Exercise Info Overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-6">
                <div className="text-white">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm bg-white/20 px-2 py-1 rounded-full">
                      Exercise {exerciseIndex} of {totalExercises}
                    </span>
                    <span className="text-sm opacity-80">{workoutTitle}</span>
                  </div>
                  
                  <h1 className="text-2xl font-bold mb-2">{exercise.name}</h1>
                  
                  {/* Muscle Groups */}
                  {exercise.muscle_groups && exercise.muscle_groups.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {exercise.muscle_groups.slice(0, 3).map((group, index) => (
                        <span key={index} className="text-sm bg-white/20 px-2 py-1 rounded-full capitalize">
                          {group}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  {/* Key Instruction */}
                  {exercise.instructions && exercise.instructions.length > 0 && (
                    <p className="text-sm opacity-90 line-clamp-2">
                      {exercise.instructions[0]}
                    </p>
                  )}
                </div>
              </div>
            </div>
            
            {/* Action Section */}
            <div className="p-6">
              {isTimeBased ? (
                <div className="text-center mb-6">
                  <div className="text-4xl font-bold text-primary mb-2">{timeLeft}</div>
                  <div className="text-muted-foreground mb-4">seconds</div>
                  
                  <Button
                    onClick={isTimerActive ? pauseTimer : startTimer}
                    className="w-full mb-4"
                    disabled={isLoading}
                  >
                    {isTimerActive ? (
                      <>
                        <Pause className="w-4 h-4 mr-2" />
                        Pause Timer
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Start Timer
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="mb-6">
                  <div className="text-center mb-4">
                    <div className="text-lg font-semibold">
                      Set {currentSetIndex + 1} of {currentExercise?.sets.length || 1}
                    </div>
                    <div className="text-muted-foreground">
                      {currentExercise?.sets[currentSetIndex]?.reps || reps} reps
                    </div>
                  </div>
                  
                  <Button
                    onClick={handleCompleteSet}
                    className="w-full mb-4"
                    disabled={isLoading}
                  >
                    Complete Set
                  </Button>
                </div>
              )}
              
              {/* Secondary Actions */}
              <div className="flex justify-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onGetCoachingTip}
                  disabled={isLoading}
                  className="text-muted-foreground"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Get AI Tip
                </Button>
              </div>
              
              {/* Coaching Tip */}
              {coachingTip && (
                <Card className="mt-4 bg-primary/5 border-primary/20">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <MessageCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-foreground">{coachingTip}</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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
                <div className="text-sm">
                  <span className="text-accent font-medium">Set {currentSetIndex + 1}</span> of {totalSets}
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



        {/* Complete Set Button */}
        <Button 
          onClick={handleCompleteSet}
          className="w-full glass-effect bg-gradient-to-r from-accent to-primary hover:from-accent/90 hover:to-primary/90 text-white py-4 touch-target font-medium border-0"
          disabled={isLoading}
        >
          {isLoading ? 'Completing...' : isTimeBased ? 'Complete Exercise' : 'Complete Set'}
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
