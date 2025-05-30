import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Eye, Clock, Target } from 'lucide-react';
import { ProgressRing } from './progress-ring';
import type { WorkoutPlan, Workout } from '@shared/schema';

interface WorkoutCardProps {
  plan: WorkoutPlan;
  todaysWorkout?: Workout;
  progress?: number;
  onStartWorkout: () => void;
  onPreviewWorkout: () => void;
}

export function WorkoutCard({ 
  plan, 
  todaysWorkout, 
  progress = 0, 
  onStartWorkout, 
  onPreviewWorkout 
}: WorkoutCardProps) {
  return (
    <Card className="glass-effect gradient-border">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-poppins font-semibold text-xl text-foreground">
            Today's Workout
          </h2>
          <ProgressRing progress={progress} />
        </div>
        
        {todaysWorkout && (
          <>
            {/* Workout Image */}
            <div className="relative rounded-2xl overflow-hidden mb-4 h-32">
              <img 
                src="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400" 
                alt="Upper body workout with dumbbells" 
                className="w-full h-full object-cover" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
              <div className="absolute bottom-3 left-3">
                <h3 className="font-poppins font-semibold text-lg text-white">
                  {todaysWorkout.title}
                </h3>
                <div className="flex items-center space-x-3 text-white/80 text-sm">
                  <div className="flex items-center space-x-1">
                    <Clock size={14} />
                    <span>{todaysWorkout.estimatedDuration} min</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Target size={14} />
                    <span>{Array.isArray(todaysWorkout.exercises) ? todaysWorkout.exercises.length : 0} exercises</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={onPreviewWorkout}
                className="absolute top-3 right-3 w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center touch-target hover:bg-white/30 transition-colors"
              >
                <Play className="text-white ml-0.5" size={16} />
              </button>
            </div>
            
            {/* Action Buttons */}
            <div className="flex space-x-3">
              <Button 
                onClick={onStartWorkout}
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground py-3 touch-target"
              >
                Start Workout
              </Button>
              <Button 
                onClick={onPreviewWorkout}
                variant="outline" 
                className="px-4 py-3 glass-effect border-border/50 touch-target"
              >
                <Eye size={16} />
              </Button>
            </div>
          </>
        )}
        
        {!todaysWorkout && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gradient-to-r from-muted to-muted-foreground/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Target className="text-muted-foreground" size={24} />
            </div>
            <p className="text-muted-foreground mb-4">No workout scheduled for today</p>
            <Button variant="outline" className="glass-effect border-border/50">
              Browse Workouts
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
