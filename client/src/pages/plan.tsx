import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ChevronLeft, Clock, Target, Play, Calendar, Dumbbell, X } from 'lucide-react';
import { Link, useRoute } from 'wouter';
import { apiRequest, queryClient } from '@/lib/queryClient';
import type { WorkoutPlan, Workout, User } from '@shared/schema';

export default function PlanDetailPage() {
  // Get plan ID from URL route parameters
  const [match, params] = useRoute('/plan/:id');
  const planId = parseInt(params?.id || '1');

  const { data: userProfile } = useQuery<User>({
    queryKey: ["/api/profile"],
  });

  const { data: plan } = useQuery<WorkoutPlan>({
    queryKey: ['/api/workout-plan', planId],
    queryFn: async () => {
      const response = await fetch(`/api/workout-plan/${planId}`);
      if (!response.ok) throw new Error('Failed to fetch workout plan');
      return response.json();
    },
    enabled: !!planId,
  });

  const { data: workouts, isLoading: workoutsLoading } = useQuery<Workout[]>({
    queryKey: ['/api/workouts', planId],
    queryFn: async () => {
      const response = await fetch(`/api/workouts/${planId}`);
      if (!response.ok) throw new Error('Failed to fetch workouts');
      return response.json();
    },
    enabled: !!planId
  });

  const updatePlanMutation = useMutation({
    mutationFn: async ({ planId, isActive }: { planId: number; isActive: boolean }) => {
      // If activating a plan, first deactivate all other plans for this user
      if (isActive && userProfile) {
        // Get all plans for the user
        const plansResponse = await fetch(`/api/workout-plans/${userProfile.id}`);
        if (plansResponse.ok) {
          const allPlans = await plansResponse.json();
          // Deactivate all currently active plans
          const activeDeactivations = allPlans
            .filter((p: any) => p.isActive && p.id !== planId)
            .map((p: any) => 
              fetch(`/api/workout-plan/${p.id}`, {
                method: 'PUT',
                body: JSON.stringify({ isActive: false }),
                headers: { 'Content-Type': 'application/json' }
              })
            );
          await Promise.all(activeDeactivations);
        }
      }

      // Now update the target plan
      const response = await fetch(`/api/workout-plan/${planId}`, {
        method: 'PUT',
        body: JSON.stringify({ isActive }),
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to update plan');
      return response.json();
    },
    onSuccess: () => {
      // Refresh both the current plan and the workout plans list
      window.location.reload();
    }
  });

  const togglePlanStatus = (planId: number, isActive: boolean) => {
    updatePlanMutation.mutate({ planId, isActive });
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-accent text-accent-foreground';
      case 'intermediate': return 'bg-primary text-primary-foreground';
      case 'advanced': return 'bg-secondary text-secondary-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (!plan) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <div className="px-4 pb-24 pt-20 space-y-6 fade-in">
      {/* Header */}
      <div className="flex items-center space-x-3 mb-6">
        <Link href="/workouts">
          <Button variant="outline" size="sm" className="w-10 h-10 rounded-full p-0 glass-effect border-border/50">
            <ChevronLeft size={16} />
          </Button>
        </Link>
        <div>
          <h1 className="font-poppins font-bold text-xl text-foreground">{plan.title}</h1>
          <p className="text-sm text-muted-foreground">Workout Plan Details</p>
        </div>
      </div>

      {/* Plan Overview */}
      <Card className="glass-effect">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <span className="px-3 py-1 bg-gradient-to-r from-purple-500/10 to-purple-600/10 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-700 rounded-full font-medium text-xs shadow-sm">
                  {plan.difficulty}
                </span>
                <span className={`px-3 py-1 rounded-full font-medium text-xs shadow-sm ${
                  plan.isActive 
                    ? 'bg-gradient-to-r from-green-500/10 to-green-600/10 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-700'
                    : 'bg-gradient-to-r from-gray-500/10 to-gray-600/10 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700'
                }`}>
                  {plan.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <h2 className="font-poppins font-semibold text-lg text-foreground mb-2">{plan.title}</h2>
            </div>
            <button
              onClick={() => togglePlanStatus(plan.id, !plan.isActive)}
              disabled={updatePlanMutation.isPending}
              className={`glass-effect px-4 py-2 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl text-sm font-medium disabled:opacity-50 border-2 text-white ${
                plan.isActive 
                  ? 'bg-red-600/90 hover:bg-red-500/90'
                  : 'bg-green-600/90 hover:bg-green-500/90'
              }`}
              style={{ borderColor: '#facc15' }}
            >
              {updatePlanMutation.isPending ? 'Updating...' : (plan.isActive ? 'Set Inactive' : 'Set Active')}
            </button>
          </div>
          
          {plan.description && (
            <p className="text-muted-foreground mb-4">{plan.description}</p>
          )}
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="flex items-center space-x-2">
              <Calendar size={16} className="text-primary" />
              <span className="text-sm text-foreground">{plan.duration} weeks</span>
            </div>
            <div className="flex items-center space-x-2">
              <Target size={16} className="text-primary" />
              <span className="text-sm text-foreground">{plan.totalWorkouts} workouts</span>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {plan.equipment.map((eq) => (
              <span key={eq} className="px-2 py-1 bg-gradient-to-r from-primary/10 to-accent/10 text-primary border border-primary/20 rounded-full font-medium text-xs shadow-sm hover:shadow-md transition-shadow">
                {eq.replace('_', ' ')}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Workouts List */}
      <Card className="glass-effect">
        <CardContent className="p-6">
          <h3 className="font-poppins font-semibold text-lg text-foreground mb-4">
            Workouts ({plan.totalWorkouts})
          </h3>
          
          <div className="space-y-3">
            {workoutsLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="glass-effect">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Skeleton className="w-12 h-12 rounded-xl" />
                        <div>
                          <Skeleton className="h-4 w-40 mb-2" />
                          <Skeleton className="h-3 w-32" />
                        </div>
                      </div>
                      <Skeleton className="h-9 w-20" />
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : workouts && workouts.length > 0 ? (
              workouts.map((workout, index) => {
                const exercises = workout.exercises ? 
                  (typeof workout.exercises === 'string' ? 
                    JSON.parse(workout.exercises) : 
                    workout.exercises) : [];
                
                const keyExercises = exercises.slice(0, 3).map((ex: any) => ex.name);
                const muscleGroups = [...new Set(exercises.flatMap((ex: any) => ex.muscleGroups || []))].slice(0, 3);
                
                return (
                  <Card key={workout.id} className="glass-effect hover:bg-card/50 transition-colors">
                    <CardContent className="p-4">
                      <div className="w-full space-y-3">
                        {/* Workout title with inline number */}
                        <div>
                          <h4 className="font-semibold text-foreground mb-1">
                            <span className="inline-flex items-center justify-center w-6 h-6 bg-gradient-to-r from-accent to-primary rounded-md text-white text-xs font-semibold mr-2">
                              {index + 1}
                            </span>
                            {workout.title}
                          </h4>
                          {workout.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {workout.description}
                            </p>
                          )}
                        </div>
                        
                        {/* Key exercises preview */}
                        {keyExercises.length > 0 && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Key Exercises:</p>
                            <p className="text-sm text-foreground">
                              {keyExercises.join(', ')}
                              {exercises.length > 3 && ` +${exercises.length - 3} more`}
                            </p>
                          </div>
                        )}
                        
                        {/* Muscle groups and workout info */}
                        <div className="flex items-center justify-between">
                          <div className="flex flex-wrap gap-2">
                            {muscleGroups.map((muscle) => (
                              <span key={muscle} className="px-3 py-1 bg-gradient-to-r from-primary/10 to-accent/10 text-primary border border-primary/20 rounded-full font-medium text-xs shadow-sm hover:shadow-md transition-shadow">
                                {muscle}
                              </span>
                            ))}
                          </div>
                          <div className="flex items-center space-x-3 text-xs text-muted-foreground">
                            <div className="flex items-center space-x-1">
                              <Clock size={12} />
                              <span>{workout.estimatedDuration}m</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Dumbbell size={12} />
                              <span>{exercises.length}</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Action buttons */}
                        <div className="flex space-x-2 pt-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                className={`${plan?.isActive ? 'flex-1' : 'w-full'} h-9 glass-effect bg-slate-800/90 hover:bg-slate-700/90 border-2 border-cyan-400 hover:border-cyan-300 text-slate-100 hover:text-white transition-all duration-200 shadow-lg hover:shadow-xl font-medium`}
                                style={{ borderColor: '#60a5fa' }}
                              >
                                Quick View
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto glass-effect border-border/50 dialog-fade">
                              <DialogHeader className="border-b border-border/20 pb-4">
                                <DialogTitle className="flex items-center space-x-3 text-xl">
                                  <span className="inline-flex items-center justify-center w-8 h-8 bg-gradient-to-r from-accent to-primary rounded-lg text-white text-sm font-bold shadow-lg">
                                    {index + 1}
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
                                {workout.warmUp && workout.warmUp.activities && workout.warmUp.activities.length > 0 && (
                                  <div className="glass-effect p-5 rounded-xl border border-border/20">
                                    <h4 className="font-poppins font-semibold text-foreground mb-4 text-lg flex items-center space-x-3">
                                      <span className="w-3 h-3 bg-gradient-to-r from-orange-400 to-orange-600 rounded-full shadow-sm"></span>
                                      <span>Warm-up ({workout.warmUp.durationMinutes} min)</span>
                                    </h4>
                                    <div className="space-y-3">
                                      {workout.warmUp.activities.map((activity: any, idx: number) => (
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

                                {/* Cardio Section */}
                                {workout.cardio && workout.cardio.length > 0 && (
                                  <div className="glass-effect p-5 rounded-xl border border-border/20">
                                    <h4 className="font-poppins font-semibold text-foreground mb-4 text-lg flex items-center space-x-3">
                                      <span className="w-3 h-3 bg-gradient-to-r from-red-400 to-red-600 rounded-full shadow-sm"></span>
                                      <span>Cardio</span>
                                    </h4>
                                    <div className="space-y-3">
                                      {workout.cardio.map((cardio: any, idx: number) => (
                                        <div key={idx} className="glass-effect gradient-border p-3 rounded-lg">
                                          <div className="flex items-center justify-between">
                                            <span className="font-medium text-foreground">{cardio.exercise}</span>
                                            <span className="text-sm text-primary font-medium">{cardio.duration}</span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Cooldown */}
                                {workout.coolDown && workout.coolDown.activities && workout.coolDown.activities.length > 0 && (
                                  <div className="glass-effect p-5 rounded-xl border border-border/20">
                                    <h4 className="font-poppins font-semibold text-foreground mb-4 text-lg flex items-center space-x-3">
                                      <span className="w-3 h-3 bg-gradient-to-r from-green-400 to-green-600 rounded-full shadow-sm"></span>
                                      <span>Cool-down ({workout.coolDown.durationMinutes} min)</span>
                                    </h4>
                                    <div className="space-y-3">
                                      {workout.coolDown.activities.map((activity: any, idx: number) => (
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
                                      <p className="text-muted-foreground leading-relaxed italic">{workout.notes}</p>
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
                          {plan?.isActive && (
                            <Link href={`/workout?id=${workout.id}`} className="flex-1">
                              <Button className="w-full h-9 glass-effect bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 border border-emerald-400/50 text-white shadow-lg hover:shadow-xl transition-all duration-200">
                                <Play size={14} className="mr-1" />
                                Start Workout
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <div className="text-center py-8">
                <Target className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h4 className="font-medium text-foreground mb-2">No Workouts</h4>
                <p className="text-muted-foreground">This plan doesn't have any workouts yet.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}