import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Clock, Dumbbell } from 'lucide-react';
import type { Workout } from '@shared/schema';

interface WorkoutPreviewModalProps {
  workout: Workout;
  workoutIndex?: number;
  children: React.ReactNode; // The trigger element
}

export function WorkoutPreviewModal({ workout, workoutIndex = 1, children }: WorkoutPreviewModalProps) {
  // Parse exercises
  const exercises = workout.exercises ? 
    (typeof workout.exercises === 'string' ? 
      JSON.parse(workout.exercises) : 
      workout.exercises) : [];

  // Extract muscle groups
  const muscleGroups = Array.from(new Set(
    exercises.flatMap((ex: any) => ex.muscleGroups || [])
  ));

  // Parse warm-up and cool-down
  const warmUp = workout.warmUp ? 
    (typeof workout.warmUp === 'string' ? 
      JSON.parse(workout.warmUp) : 
      workout.warmUp) : {};

  const coolDown = workout.coolDown ? 
    (typeof workout.coolDown === 'string' ? 
      JSON.parse(workout.coolDown) : 
      workout.coolDown) : {};

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
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

          {/* Warm-up */}
          {warmUp && warmUp.activities && warmUp.activities.length > 0 && (
            <div className="glass-effect p-5 rounded-xl border border-border/20">
              <h4 className="font-poppins font-semibold text-foreground mb-4 text-lg">Warm-up</h4>
              <div className="space-y-3">
                {warmUp.activities.map((activity: any, idx: number) => (
                  <div key={idx} className="p-3 bg-muted/10 rounded-lg border border-border/10">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-foreground">{activity.name}</span>
                      <span className="text-sm text-muted-foreground">{warmUp.durationMinutes} min</span>
                    </div>
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
                    <div className="flex justify-between items-start mb-2">
                      <h5 className="font-medium text-foreground">{exercise.name}</h5>
                      {exercise.cardio && (
                        <span className="text-xs bg-accent/20 text-accent px-2 py-1 rounded-full">
                          Cardio
                        </span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground mb-2">
                      <div>Sets: {exercise.sets}</div>
                      <div>Reps: {exercise.reps}</div>
                      {exercise.weight && <div>Weight: {exercise.weight}</div>}
                      {exercise.restTime && <div>Rest: {exercise.restTime}</div>}
                    </div>
                    
                    {exercise.instructions && exercise.instructions.length > 0 && (
                      <div className="text-sm text-muted-foreground">
                        <div className="font-medium mb-1">Instructions:</div>
                        <ul className="list-disc list-inside space-y-1">
                          {exercise.instructions.map((instruction: string, instIdx: number) => (
                            <li key={instIdx}>{instruction}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cool-down */}
          {coolDown && coolDown.activities && coolDown.activities.length > 0 && (
            <div className="glass-effect p-5 rounded-xl border border-border/20">
              <h4 className="font-poppins font-semibold text-foreground mb-4 text-lg">Cool-down</h4>
              <div className="space-y-3">
                {coolDown.activities.map((activity: any, idx: number) => (
                  <div key={idx} className="p-3 bg-muted/10 rounded-lg border border-border/10">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-foreground">{activity.name}</span>
                      <span className="text-sm text-muted-foreground">{coolDown.durationMinutes} min</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Additional Notes */}
          {workout.notes && (
            <div className="glass-effect p-5 rounded-xl border border-border/20">
              <h4 className="font-poppins font-semibold text-foreground mb-4 text-lg">Notes</h4>
              <p className="text-muted-foreground">{workout.notes}</p>
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