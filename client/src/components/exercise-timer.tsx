import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, Square } from 'lucide-react';

interface ExerciseTimerProps {
  duration: number; // Duration in seconds
  onComplete?: () => void;
  isActive?: boolean;
}

export function ExerciseTimer({ duration, onComplete, isActive = false }: ExerciseTimerProps) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [isRunning, setIsRunning] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Reset timer when duration changes or component becomes active
  useEffect(() => {
    setTimeLeft(duration);
    setIsRunning(false);
    setIsCompleted(false);
  }, [duration, isActive]);

  // Timer countdown logic
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setIsRunning(false);
            setIsCompleted(true);
            onComplete?.();
            // Play completion sound
            try {
              const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+3wtmMcBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+3wtmMcBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+3wtmMcBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+3wtmMcBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+3wtmMcBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+3wtmMcBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+3w');
              audio.play().catch(() => {
                // Ignore audio play errors (browser policy)
              });
            } catch (error) {
              // Ignore audio creation errors
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, timeLeft, onComplete]);

  const handleStart = () => {
    if (isCompleted) {
      // Reset timer
      setTimeLeft(duration);
      setIsCompleted(false);
    }
    setIsRunning(true);
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleReset = () => {
    setIsRunning(false);
    setTimeLeft(duration);
    setIsCompleted(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercentage = ((duration - timeLeft) / duration) * 100;

  return (
    <div className="space-y-4">
      {/* Timer Display */}
      <div className="text-center">
        <div className="relative inline-block">
          <div className="text-4xl font-bold text-primary mb-2">
            {formatTime(timeLeft)}
          </div>
          <div className="text-sm text-muted-foreground">
            {isCompleted ? 'Complete!' : isRunning ? 'Running' : 'Duration'}
          </div>
          
          {/* Progress Ring */}
          <div className="absolute -inset-4 opacity-20">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-muted"
              />
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray={`${2 * Math.PI * 45}`}
                strokeDashoffset={`${2 * Math.PI * 45 * (1 - progressPercentage / 100)}`}
                className="text-primary transition-all duration-1000 ease-linear"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Timer Controls */}
      <div className="flex justify-center space-x-2">
        {!isRunning ? (
          <Button onClick={handleStart} className="flex-1">
            <Play size={16} className="mr-2" />
            {isCompleted ? 'Restart Timer' : 'Start Timer'}
          </Button>
        ) : (
          <Button onClick={handlePause} variant="outline" className="flex-1">
            <Pause size={16} className="mr-2" />
            Pause Timer
          </Button>
        )}
        
        <Button onClick={handleReset} variant="outline" size="sm">
          <Square size={16} />
        </Button>
      </div>
    </div>
  );
}