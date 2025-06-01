import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Clock, Dumbbell } from 'lucide-react';
import type { Workout } from '@shared/schema';

interface WorkoutPreviewModalProps {
  workout: Workout;
  workoutIndex?: number;
  trigger: React.ReactNode;
}

export function WorkoutPreviewModal({ workout, workoutIndex = 1, trigger }: WorkoutPreviewModalProps) {
  // Parse exercises
  const exercises = workout.exercises ? 
    (typeof workout.exercises === 'string' ? 
      JSON.parse(workout.exercises) : 
      workout.exercises) : [];

  // Extract muscle groups
  const muscleGroups = Array.from(new Set(
    exercises.flatMap((ex: any) => ex.muscleGroups || [])
  ));

  // Parse warm-up
  const warmUp = workout.warmUp ? 
    (typeof workout.warmUp === 'string' ? 
      JSON.parse(workout.warmUp) : 
      workout.warmUp) : {};

  // Parse cool-down  
  const coolDown = workout.coolDown ? 
    (typeof workout.coolDown === 'string' ? 
      JSON.parse(workout.coolDown) : 
      workout.coolDown) : {};

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto glass-effect border-border/50 dialog-fade">
        <DialogHeader className="border-b border-border/20 pb-4">
          <DialogTitle className="flex items-center space-x-3 text-xl">
            <span className="inline-flex items-center justify-center w-8 h-8 bg-gradient-to-r from-accent to-primary rounded-lg text-white text-sm font-bold shadow-lg">
              {workoutIndex}
            </span>
            <span className="font-poppins font-semibold">{workout.title}</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 pt-6">
          {/* Workout Overview */}
          <div className="glass-effect p-6 rounded-xl border border-border/30">
            <div className="flex items-center justify-center space-x-8 text-sm">
              <div className="flex items-center space-x-2 text-foreground">
                <Clock size={18} className="text-primary" />
                <span className="font-medium">{workout.estimatedDuration} minutes</span>
              </div>
              <div className="flex items-center space-x-2 text-foreground">
                <Dumbbell size={18} className="text-primary" />
                <span className="font-medium">{exercises.length} exercises</span>
              </div>
            </div>
          </div>

          {/* Warm-Up */}
          {warmUp.activities && warmUp.activities.length > 0 && (
            <div className="glass-effect p-5 rounded-xl border border-border/20">
              <h4 className="font-poppins font-semibold text-foreground mb-4 text-lg">Warm-Up</h4>
              <div className="space-y-3">
                {warmUp.activities.map((activity: any, idx: number) => (
                  <div key={idx} className="p-3 bg-muted/10 rounded-lg border border-border/10">
                    <div className="flex justify-between items-start">
                      <span className="font-medium text-foreground">{activity.name}</span>
                      <span className="text-sm text-muted-foreground">{warmUp.durationMinutes} min</span>
                    </div>
                    {warmUp.activities.length > 1 && (
                      <div className="text-sm text-muted-foreground mt-1">
                        Part of {warmUp.activities.length}-exercise warm-up sequence
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Main Exercises */}
          {exercises.length > 0 && (
            <div className="glass-effect p-5 rounded-xl border border-border/20">
              <h4 className="font-poppins font-semibold text-foreground mb-4 text-lg">Main Exercises</h4>
              <div className="space-y-4">
                {exercises.map((exercise: any, idx: number) => (
                  <div key={idx} className="p-4 bg-muted/10 rounded-lg border border-border/10">
                    <div className="flex justify-between items-start mb-3">
                      <h5 className="font-medium text-foreground">{exercise.name}</h5>
                      {exercise.cardio && (
                        <span className="px-2 py-1 bg-accent/10 text-accent text-xs font-medium rounded-full border border-accent/20">
                          Cardio
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground mb-3">
                      <div>Sets: {exercise.sets}</div>
                      <div>Reps: {exercise.reps}</div>
                      {exercise.weight && <div>Weight: {exercise.weight}</div>}
                      {exercise.restTime && <div>Rest: {exercise.restTime}</div>}
                    </div>
                    {exercise.instructions && exercise.instructions.length > 0 && (
                      <div className="text-sm text-muted-foreground">
                        <span className="font-medium">Instructions:</span> {exercise.instructions[0]}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cool-Down */}
          {coolDown.activities && coolDown.activities.length > 0 && (
            <div className="glass-effect p-5 rounded-xl border border-border/20">
              <h4 className="font-poppins font-semibold text-foreground mb-4 text-lg">Cool-Down</h4>
              <div className="space-y-3">
                {coolDown.activities.map((activity: any, idx: number) => (
                  <div key={idx} className="p-3 bg-muted/10 rounded-lg border border-border/10">
                    <div className="flex justify-between items-start">
                      <span className="font-medium text-foreground">{activity.name}</span>
                      <span className="text-sm text-muted-foreground">{coolDown.durationMinutes} min</span>
                    </div>
                    {coolDown.activities.length > 1 && (
                      <div className="text-sm text-muted-foreground mt-1">
                        Part of {coolDown.activities.length}-exercise cool-down sequence
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Workout Notes */}
          {workout.notes && (
            <div className="glass-effect p-5 rounded-xl border border-border/20">
              <h4 className="font-poppins font-semibold text-foreground mb-3 text-lg">Workout Notes</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {typeof workout.notes === 'string' ? workout.notes : JSON.stringify(workout.notes)}
              </p>
            </div>
          )}

          {/* Muscle Groups */}
          {muscleGroups.length > 0 && (
            <div className="glass-effect p-5 rounded-xl border border-border/20">
              <h4 className="font-poppins font-semibold text-foreground mb-4 text-lg">Target Muscle Groups</h4>
              <div className="flex flex-wrap gap-3">
                {muscleGroups.map((muscle, idx) => (
                  <span key={idx} className="px-4 py-2 bg-gradient-to-r from-primary/10 to-accent/10 text-primary border border-primary/20 rounded-full font-medium text-sm shadow-sm hover:shadow-md transition-shadow">
                    {String(muscle)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}