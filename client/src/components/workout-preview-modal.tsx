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

          {/* Description */}
          {workout.description && (
            <div className="glass-effect p-4 rounded-xl border border-border/20">
              <h4 className="font-poppins font-semibold text-foreground mb-3 text-lg">Overview</h4>
              <p className="text-muted-foreground leading-relaxed">{workout.description}</p>
            </div>
          )}

          {/* Warmup */}
          {warmUp && warmUp.activities && warmUp.activities.length > 0 && (
            <div className="glass-effect p-5 rounded-xl border border-border/20">
              <h4 className="font-poppins font-semibold text-foreground mb-4 text-lg flex items-center space-x-3">
                <span className="w-3 h-3 bg-gradient-to-r from-orange-400 to-orange-600 rounded-full shadow-sm"></span>
                <span>Warm-up ({warmUp.durationMinutes} min)</span>
              </h4>
              <div className="space-y-3">
                {warmUp.activities.map((activity: any, idx: number) => (
                  <div key={idx} className="glass-effect gradient-border p-3 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-foreground">{activity.exercise}</span>
                      <span className="text-sm text-primary font-medium">{activity.durationSeconds}s</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Main Exercises */}
          {exercises.length > 0 && (
            <div className="glass-effect p-5 rounded-xl border border-border/20">
              <h4 className="font-poppins font-semibold text-foreground mb-4 text-lg flex items-center space-x-3">
                <span className="w-3 h-3 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full shadow-sm"></span>
                <span>Main Workout ({exercises.length} exercises)</span>
              </h4>
              <div className="space-y-4">
                {exercises.map((exercise: any, idx: number) => (
                  <div key={idx} className="glass-effect gradient-border p-4 rounded-lg hover:bg-card/50 transition-colors">
                    <div className="space-y-3">
                      <h5 className="font-poppins font-semibold text-foreground text-base">{exercise.name}</h5>
                      {exercise.instructions && exercise.instructions.length > 0 && (
                        <p className="text-sm text-muted-foreground leading-relaxed">{exercise.instructions[0]}</p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {exercise.sets && (
                          <span className="px-3 py-1 bg-gradient-to-r from-blue-500/10 to-blue-600/10 text-blue-600 dark:text-blue-400 rounded-full text-xs font-medium border border-blue-200 dark:border-blue-700">
                            {exercise.sets} sets
                          </span>
                        )}
                        {exercise.reps && (
                          <span className="px-3 py-1 bg-gradient-to-r from-green-500/10 to-green-600/10 text-green-600 dark:text-green-400 rounded-full text-xs font-medium border border-green-200 dark:border-green-700">
                            {exercise.reps} reps
                          </span>
                        )}
                        {exercise.restTime && (
                          <span className="px-3 py-1 bg-gradient-to-r from-purple-500/10 to-purple-600/10 text-purple-600 dark:text-purple-400 rounded-full text-xs font-medium border border-purple-200 dark:border-purple-700">
                            {exercise.restTime} rest
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cooldown */}
          {coolDown && coolDown.activities && coolDown.activities.length > 0 && (
            <div className="glass-effect p-5 rounded-xl border border-border/20">
              <h4 className="font-poppins font-semibold text-foreground mb-4 text-lg flex items-center space-x-3">
                <span className="w-3 h-3 bg-gradient-to-r from-green-400 to-green-600 rounded-full shadow-sm"></span>
                <span>Cool-down ({coolDown.durationMinutes} min)</span>
              </h4>
              <div className="space-y-3">
                {coolDown.activities.map((activity: any, idx: number) => (
                  <div key={idx} className="glass-effect gradient-border p-3 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-foreground">{activity.exercise}</span>
                      <span className="text-sm text-primary font-medium">{activity.durationSeconds}s</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Coach Notes */}
          {workout.notes && (
            <div className="glass-effect p-5 rounded-xl border border-border/20">
              <h4 className="font-poppins font-semibold text-foreground mb-4 text-lg flex items-center space-x-3">
                <span className="w-3 h-3 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full shadow-sm"></span>
                <span>Coach Notes</span>
              </h4>
              <div className="glass-effect gradient-border p-4 rounded-lg bg-gradient-to-r from-yellow-50/50 to-amber-50/50 dark:from-yellow-900/10 dark:to-amber-900/10">
                <p className="text-muted-foreground leading-relaxed italic">
                  {typeof workout.notes === 'string' ? workout.notes : JSON.stringify(workout.notes)}
                </p>
              </div>
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