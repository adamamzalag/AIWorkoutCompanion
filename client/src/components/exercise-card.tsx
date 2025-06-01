import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from '@/components/ui/dialog';
import { Play, Minus, Plus, MessageCircle } from 'lucide-react';
import type { Exercise } from '@shared/schema';
import type { ExerciseLog } from '@/lib/types';

interface ExerciseCardProps {
  exercise: Exercise;
  exerciseLog?: ExerciseLog;
  currentSetIndex: number;
  onCompleteSet: (setData: { reps: number; weight?: number; duration?: number }) => void;
  onShowTutorial: () => void;
  onGetCoachingTip: () => void;
  coachingTip?: string;
  isLoading?: boolean;
}

export function ExerciseCard({
  exercise,
  exerciseLog,
  currentSetIndex,
  onCompleteSet,
  onShowTutorial,
  onGetCoachingTip,
  coachingTip,
  isLoading = false
}: ExerciseCardProps) {
  const [reps, setReps] = useState(12);
  const [weight, setWeight] = useState(15);
  const [duration, setDuration] = useState(30);
  const [showTutorial, setShowTutorial] = useState(false);

  const currentSet = exerciseLog?.sets[currentSetIndex];
  const totalSets = exerciseLog?.sets.length || 1;
  
  // Determine exercise type based on exerciseLog properties
  const isWarmup = exerciseLog?.isWarmup;
  const isCooldown = exerciseLog?.isCooldown;
  const isCardio = exerciseLog?.isCardio;
  const isTimeBased = isWarmup || isCooldown || isCardio;

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

  return (
    <div className="space-y-6">
      {/* Exercise Video/Image */}
      <div className="relative rounded-3xl overflow-hidden h-64">
        <img 
          src={exercise.imageUrl || "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600"} 
          alt={`${exercise.name} demonstration`} 
          className="w-full h-full object-cover" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
        
        <Dialog open={showTutorial} onOpenChange={setShowTutorial}>
          <DialogTrigger asChild>
            <button 
              onClick={onShowTutorial}
              className="absolute top-4 right-4 w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center touch-target hover:bg-white/30 transition-colors"
            >
              <Play className="text-white ml-0.5" size={16} />
            </button>
          </DialogTrigger>
          <DialogContent className="youtube-modal">
            <DialogTitle className="sr-only">{exercise.name} Tutorial Video</DialogTitle>
            {exercise.youtubeId && (
              <iframe
                className="youtube-iframe"
                src={`https://www.youtube.com/embed/${exercise.youtubeId}?autoplay=1`}
                title={`${exercise.name} tutorial`}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Exercise Details */}
      <div className="text-center">        
        {/* Consolidated Exercise Info */}
        <Card className="glass-effect mb-6">
          <CardContent className="p-6 text-center">
            <h2 className="font-poppins font-bold text-xl mb-3 text-foreground">
              {exercise.name}
            </h2>
            {isTimeBased ? (
              <>
                <div className="text-4xl font-bold text-primary mb-2">{exerciseLog?.duration || 30}</div>
                <div className="text-muted-foreground">seconds</div>
              </>
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
