import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, Clock, Target, Play, Calendar, Dumbbell } from 'lucide-react';
import { Link, useRoute } from 'wouter';
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
                <Badge className={`text-xs ${getDifficultyColor(plan.difficulty)}`}>
                  {plan.difficulty}
                </Badge>
                {plan.isActive && (
                  <Badge className="bg-accent text-accent-foreground text-xs">Active</Badge>
                )}
              </div>
              <h2 className="font-poppins font-semibold text-lg text-foreground mb-2">{plan.title}</h2>
            </div>
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
              <span key={eq} className="px-2 py-1 text-xs bg-muted text-muted-foreground rounded border border-border">
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
                          <div className="flex flex-wrap gap-1">
                            {muscleGroups.map((muscle) => (
                              <span key={muscle} className="px-2 py-1 text-xs bg-muted text-muted-foreground rounded border border-border">
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
                          <Button
                            variant="outline"
                            size="sm"
                            className={`${plan?.isActive ? 'flex-1' : 'w-full'} border-2 border-border hover:border-primary hover:bg-primary/5`}
                            onClick={() => {/* TODO: Open quick view modal */}}
                          >
                            Quick View
                          </Button>
                          {plan?.isActive && (
                            <Link href={`/workout?id=${workout.id}`} className="flex-1">
                              <Button size="sm" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
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