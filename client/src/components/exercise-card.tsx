import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
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
  const [showTutorial, setShowTutorial] = useState(false);

  const currentSet = exerciseLog?.sets[currentSetIndex];
  const totalSets = exerciseLog?.sets.length || 3;

  const handleCompleteSet = () => {
    onCompleteSet({
      reps,
      weight: exercise.equipment.includes('none') ? undefined : weight
    });
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
        <h2 className="font-poppins font-bold text-2xl mb-2 text-foreground">
          {exercise.name}
        </h2>
        <p className="text-muted-foreground mb-4">{exercise.description}</p>
        
        {/* Set Counter */}
        <Card className="glass-effect mb-6">
          <CardContent className="p-6 text-center">
            <div className="text-4xl font-bold text-primary mb-2">{reps}</div>
            <div className="text-muted-foreground mb-2">reps</div>
            <div className="text-sm">
              <span className="text-accent font-medium">Set {currentSetIndex + 1}</span> of {totalSets}
            </div>
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

        {/* Weight/Reps Adjustment */}
        <Card className="glass-effect mb-6">
          <CardContent className="p-4 space-y-4">
            {/* Reps */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">Reps</span>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-8 h-8 rounded-full p-0 glass-effect border-border/50"
                  onClick={() => setReps(Math.max(1, reps - 1))}
                >
                  <Minus size={14} />
                </Button>
                <span className="w-12 text-center font-medium">{reps}</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-8 h-8 rounded-full p-0 glass-effect border-border/50"
                  onClick={() => setReps(reps + 1)}
                >
                  <Plus size={14} />
                </Button>
              </div>
            </div>

            {/* Weight (if equipment required) */}
            {!exercise.equipment.includes('none') && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground">Weight (lbs)</span>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-8 h-8 rounded-full p-0 glass-effect border-border/50"
                    onClick={() => setWeight(Math.max(0, weight - 5))}
                  >
                    <Minus size={14} />
                  </Button>
                  <span className="w-12 text-center font-medium">{weight}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-8 h-8 rounded-full p-0 glass-effect border-border/50"
                    onClick={() => setWeight(weight + 5)}
                  >
                    <Plus size={14} />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Complete Set Button */}
        <Button 
          onClick={handleCompleteSet}
          className="w-full bg-accent hover:bg-accent/90 text-accent-foreground py-4 touch-target font-medium"
          disabled={isLoading}
        >
          {isLoading ? 'Completing...' : 'Complete Set'}
        </Button>

        {/* Get Coaching Tip Button */}
        <Button 
          onClick={onGetCoachingTip}
          variant="outline"
          className="w-full mt-3 glass-effect border-border/50 touch-target"
          disabled={isLoading}
        >
          <MessageCircle size={16} className="mr-2" />
          Get AI Tip
        </Button>
      </div>
    </div>
  );
}
