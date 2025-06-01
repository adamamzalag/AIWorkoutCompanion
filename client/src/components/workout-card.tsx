import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Eye, Clock, Target } from 'lucide-react';
import { ProgressRing } from './progress-ring';
import { WorkoutPreviewModal } from './workout-preview-modal';
import type { WorkoutPlan, Workout } from '@shared/schema';

interface WorkoutCardProps {
  plan: WorkoutPlan;
  todaysWorkout?: Workout;
  progress?: number;
  onStartWorkout: () => void;
}

export function WorkoutCard({ 
  plan, 
  todaysWorkout, 
  progress = 0, 
  onStartWorkout
}: WorkoutCardProps) {
  // Parse exercises for display
  const exercises = todaysWorkout?.exercises ? 
    (typeof todaysWorkout.exercises === 'string' ? 
      JSON.parse(todaysWorkout.exercises) : 
      todaysWorkout.exercises) : [];

  return (
    <Card className="glass-effect border-border/20">
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
                    <span>{exercises.length} exercises</span>
                  </div>
                </div>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <button className="absolute top-3 right-3 w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center touch-target hover:bg-white/30 transition-colors">
                    <Play className="text-white ml-0.5" size={16} />
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto glass-effect border-border/50 dialog-fade">
                  <DialogHeader className="border-b border-border/20 pb-4">
                    <DialogTitle className="flex items-center space-x-3 text-xl">
                      <span className="inline-flex items-center justify-center w-8 h-8 bg-gradient-to-r from-accent to-primary rounded-lg text-white text-sm font-bold shadow-lg">
                        1
                      </span>
                      <span className="font-poppins font-semibold">{todaysWorkout.title}</span>
                    </DialogTitle>
                  </DialogHeader>
                  
                  <div className="space-y-6 pt-6">
                    {/* Workout Overview */}
                    <div className="glass-effect p-6 rounded-xl border border-border/30">
                      <div className="flex items-center justify-center space-x-8 text-sm">
                        <div className="flex items-center space-x-2 text-foreground">
                          <Clock size={18} className="text-primary" />
                          <span className="font-medium">{todaysWorkout.estimatedDuration} minutes</span>
                        </div>
                        <div className="flex items-center space-x-2 text-foreground">
                          <Dumbbell size={18} className="text-primary" />
                          <span className="font-medium">{exercises.length} exercises</span>
                        </div>
                      </div>
                    </div>

                    {/* Exercises */}
                    {exercises.length > 0 && (
                      <div className="glass-effect p-5 rounded-xl border border-border/20">
                        <h4 className="font-poppins font-semibold text-foreground mb-4 text-lg">Exercises</h4>
                        <div className="space-y-4">
                          {exercises.map((exercise: any, idx: number) => (
                            <div key={idx} className="p-4 bg-muted/10 rounded-lg border border-border/10">
                              <h5 className="font-medium text-foreground mb-2">{exercise.name}</h5>
                              <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                                <div>Sets: {exercise.sets}</div>
                                <div>Reps: {exercise.reps}</div>
                                {exercise.weight && <div>Weight: {exercise.weight}</div>}
                                {exercise.restTime && <div>Rest: {exercise.restTime}</div>}
                              </div>
                              {exercise.instructions && exercise.instructions.length > 0 && (
                                <div className="mt-2">
                                  <div className="text-sm text-muted-foreground">
                                    {exercise.instructions[0]}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Muscle Groups */}
                    {muscleGroups.length > 0 && (
                      <div className="glass-effect p-5 rounded-xl border border-border/20">
                        <h4 className="font-poppins font-semibold text-foreground mb-4 text-lg">Target Muscle Groups</h4>
                        <div className="flex flex-wrap gap-3">
                          {muscleGroups.map((muscle) => (
                            <span key={muscle} className="px-4 py-2 bg-gradient-to-r from-primary/10 to-accent/10 text-primary border border-primary/20 rounded-full font-medium text-sm shadow-sm hover:shadow-md transition-shadow">
                              {muscle}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            
            {/* Action Buttons */}
            <div className="flex space-x-3">
              <Button 
                onClick={onStartWorkout}
                className="flex-1 bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white py-3 touch-target font-medium"
              >
                Start Workout
              </Button>
              <Dialog>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="px-4 py-3 glass-effect border-border/50 touch-target"
                  >
                    <Eye size={16} />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto glass-effect border-border/50 dialog-fade">
                  <DialogHeader className="border-b border-border/20 pb-4">
                    <DialogTitle className="flex items-center space-x-3 text-xl">
                      <span className="inline-flex items-center justify-center w-8 h-8 bg-gradient-to-r from-accent to-primary rounded-lg text-white text-sm font-bold shadow-lg">
                        1
                      </span>
                      <span className="font-poppins font-semibold">{todaysWorkout.title}</span>
                    </DialogTitle>
                  </DialogHeader>
                  
                  <div className="space-y-6 pt-6">
                    {/* Workout Overview */}
                    <div className="glass-effect p-6 rounded-xl border border-border/30">
                      <div className="flex items-center justify-center space-x-8 text-sm">
                        <div className="flex items-center space-x-2 text-foreground">
                          <Clock size={18} className="text-primary" />
                          <span className="font-medium">{todaysWorkout.estimatedDuration} minutes</span>
                        </div>
                        <div className="flex items-center space-x-2 text-foreground">
                          <Dumbbell size={18} className="text-primary" />
                          <span className="font-medium">{exercises.length} exercises</span>
                        </div>
                      </div>
                    </div>

                    {/* Exercises */}
                    {exercises.length > 0 && (
                      <div className="glass-effect p-5 rounded-xl border border-border/20">
                        <h4 className="font-poppins font-semibold text-foreground mb-4 text-lg">Exercises</h4>
                        <div className="space-y-4">
                          {exercises.map((exercise: any, idx: number) => (
                            <div key={idx} className="p-4 bg-muted/10 rounded-lg border border-border/10">
                              <h5 className="font-medium text-foreground mb-2">{exercise.name}</h5>
                              <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                                <div>Sets: {exercise.sets}</div>
                                <div>Reps: {exercise.reps}</div>
                                {exercise.weight && <div>Weight: {exercise.weight}</div>}
                                {exercise.restTime && <div>Rest: {exercise.restTime}</div>}
                              </div>
                              {exercise.instructions && exercise.instructions.length > 0 && (
                                <div className="mt-2">
                                  <div className="text-sm text-muted-foreground">
                                    {exercise.instructions[0]}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Muscle Groups */}
                    {muscleGroups.length > 0 && (
                      <div className="glass-effect p-5 rounded-xl border border-border/20">
                        <h4 className="font-poppins font-semibold text-foreground mb-4 text-lg">Target Muscle Groups</h4>
                        <div className="flex flex-wrap gap-3">
                          {muscleGroups.map((muscle) => (
                            <span key={muscle} className="px-4 py-2 bg-gradient-to-r from-primary/10 to-accent/10 text-primary border border-primary/20 rounded-full font-medium text-sm shadow-sm hover:shadow-md transition-shadow">
                              {muscle}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
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
