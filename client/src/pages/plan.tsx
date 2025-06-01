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
              <Badge key={eq} variant="outline" className="text-xs border-border/50">
                {eq.replace('_', ' ')}
              </Badge>
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
              workouts.map((workout, index) => (
                <Card key={workout.id} className="glass-effect hover:bg-card/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gradient-to-r from-accent to-primary rounded-xl flex items-center justify-center text-white font-semibold">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-foreground mb-1">{workout.title}</h4>
                          {workout.description && (
                            <p className="text-sm text-muted-foreground mb-2 line-clamp-1">
                              {workout.description}
                            </p>
                          )}
                          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                            <div className="flex items-center space-x-1">
                              <Clock size={12} />
                              <span>{workout.estimatedDuration} min</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Dumbbell size={12} />
                              <span>
                                {workout.exercises ? 
                                  (typeof workout.exercises === 'string' ? 
                                    JSON.parse(workout.exercises).length : 
                                    workout.exercises.length) : 0} exercises
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <Link href={`/workout?id=${workout.id}`}>
                        <Button size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground touch-target">
                          <Play size={14} className="mr-1" />
                          Start
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))
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