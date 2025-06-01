import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { WorkoutCard } from '@/components/workout-card';
import { ProgressRing } from '@/components/progress-ring';
import { Clock, Target, TrendingUp, Sparkles, MessageCircle } from 'lucide-react';
import type { UserStats, ProgressAnalysis, WorkoutPlan, Workout, WorkoutSession, User } from '@shared/schema';
import { useAuth } from '@/hooks/useAuth';

export default function Home() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  
  const { data: userProfile } = useQuery<User>({
    queryKey: ["/api/profile"],
  });

  const userName = userProfile?.name || userProfile?.email?.split('@')[0] || 'User';

  const { data: stats, isLoading: statsLoading } = useQuery<UserStats>({
    queryKey: ['/api/stats', (userProfile as any)?.id],
    enabled: !!(userProfile as any)?.id,
  });

  const { data: workoutPlans, isLoading: plansLoading } = useQuery<WorkoutPlan[]>({
    queryKey: ['/api/workout-plans', (userProfile as any)?.id],
    enabled: !!(userProfile as any)?.id,
  });

  const { data: recentSessions, isLoading: sessionsLoading } = useQuery<WorkoutSession[]>({
    queryKey: ['/api/recent-sessions', (userProfile as any)?.id, 5],
    enabled: !!(userProfile as any)?.id,
  });

  const { data: coachingTip, isLoading: tipLoading } = useQuery<{ tip: string }>({
    queryKey: [`/api/coaching-tip/${(userProfile as any)?.id}`],
    enabled: !!(userProfile as any)?.id,
  });

  // Get active plan and its workouts
  const activePlan = workoutPlans?.find(plan => plan.isActive);
  
  const { data: workouts } = useQuery<Workout[]>({
    queryKey: ['/api/workouts', activePlan?.id],
    queryFn: async () => {
      if (!activePlan?.id) throw new Error('No active plan');
      const response = await fetch(`/api/workouts/${activePlan.id}`);
      if (!response.ok) throw new Error('Failed to fetch workouts');
      return response.json();
    },
    enabled: !!activePlan?.id && !plansLoading,
  });

  // Get the first workout as today's workout
  const todaysWorkout = workouts && workouts.length > 0 ? workouts[0] : undefined;

  const handleStartWorkout = () => {
    // Navigate to workout screen
    window.location.href = '/workout';
  };

  const handlePreviewWorkout = () => {
    // Show workout preview modal
    console.log('Preview workout');
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    return `${diffInDays} days ago`;
  };

  return (
    <div className="px-4 pb-24 pt-20 space-y-6 fade-in">
      {/* Welcome Section */}
      <div className="space-y-4">
        <div className="text-center">
          <h1 className="font-poppins font-bold text-2xl text-foreground mb-2">
            Good morning, {userName}! 🔥
          </h1>
          <p className="text-muted-foreground">Ready to crush your fitness goals today?</p>
        </div>
        
        {/* AI Coach Quick Message */}
        <Card className="glass-effect border-primary/20 w-full">
          <CardContent className="p-4">
            <div className="flex items-start space-x-3 min-h-[72px] w-full">
              <div className="w-8 h-8 bg-gradient-to-r from-accent to-primary rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <MessageCircle className="text-white" size={14} />
              </div>
              <div className="flex-1 min-w-0 w-0">
                {tipLoading ? (
                  <div className="space-y-2">
                    <div className="h-4 bg-muted rounded animate-pulse w-full"></div>
                    <div className="h-4 bg-muted rounded animate-pulse w-3/4"></div>
                  </div>
                ) : (
                  <p className="text-sm text-foreground/90 mb-2 leading-relaxed break-words hyphens-auto">
                    {coachingTip?.tip || 'Welcome to your AI fitness coach! Ready to start your fitness journey?'}
                  </p>
                )}
                <Link href="/ai-chat">
                  <Button variant="link" className="text-primary text-sm font-medium p-0 h-auto">
                    Reply to coach →
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Today's Workout Card */}
      {activePlan && (
        <WorkoutCard
          plan={activePlan}
          todaysWorkout={todaysWorkout}
          progress={75}
          onStartWorkout={handleStartWorkout}
          onPreviewWorkout={handlePreviewWorkout}
        />
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        {statsLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="glass-effect">
              <CardContent className="p-4 text-center">
                <Skeleton className="h-8 w-12 mx-auto mb-2" />
                <Skeleton className="h-3 w-16 mx-auto" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card className="glass-effect">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-accent">{stats?.weekStreak || 0}</div>
                <div className="text-xs text-muted-foreground mt-1">Day Streak</div>
              </CardContent>
            </Card>
            <Card className="glass-effect">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-primary">{stats?.weekWorkouts || 0}</div>
                <div className="text-xs text-muted-foreground mt-1">This Week</div>
              </CardContent>
            </Card>
            <Card className="glass-effect">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-secondary">{stats?.totalMinutes || 0}</div>
                <div className="text-xs text-muted-foreground mt-1">Minutes</div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Workout Plans Section */}
      <div>
        <div className="flex items-center justify-center mb-4 relative">
          <h2 className="font-poppins font-semibold text-xl text-foreground">Your Plans</h2>
          <Link href="/workouts" className="absolute right-0">
            <Button variant="link" className="text-primary font-medium text-sm p-0 h-auto">
              View All
            </Button>
          </Link>
        </div>
        
        <div className="space-y-3">
          {plansLoading ? (
            Array.from({ length: 2 }).map((_, i) => (
              <Card key={i} className="glass-effect">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Skeleton className="w-12 h-12 rounded-xl" />
                      <div>
                        <Skeleton className="h-4 w-32 mb-1" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                    <div className="text-right">
                      <Skeleton className="h-4 w-8 mb-1" />
                      <Skeleton className="h-1 w-16" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : workoutPlans && workoutPlans.length > 0 ? (
            workoutPlans.slice(0, 2).map((plan, index) => (
              <Card key={plan.id} className="glass-effect">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-12 h-12 bg-gradient-to-r ${
                        index === 0 ? 'from-primary to-secondary' : 'from-secondary to-primary'
                      } rounded-xl flex items-center justify-center`}>
                        {index === 0 ? (
                          <Target className="text-white" size={20} />
                        ) : (
                          <TrendingUp className="text-white" size={20} />
                        )}
                      </div>
                      <div>
                        <h3 className="font-medium text-foreground">{plan.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {plan.duration} weeks • {plan.totalWorkouts} workouts
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-accent">
                        {Math.floor(plan.totalWorkouts * 0.6)}/{plan.totalWorkouts}
                      </div>
                      <div className="w-16 h-1 bg-muted rounded-full mt-1">
                        <div 
                          className="h-full bg-accent rounded-full transition-all duration-500"
                          style={{ width: '60%' }}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="glass-effect">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-muted to-muted-foreground/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Target className="text-muted-foreground" size={24} />
                </div>
                <p className="text-muted-foreground mb-4">No workout plans yet</p>
                <Button 
                  className="bg-primary hover:bg-primary/90"
                  onClick={() => setLocation('/workouts?generate=true')}
                >
                  Create Your First Plan
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="font-poppins font-semibold text-xl text-foreground mb-4 text-center">Recent Activity</h2>
        
        <div className="space-y-3">
          {sessionsLoading ? (
            Array.from({ length: 2 }).map((_, i) => (
              <Card key={i} className="glass-effect">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <Skeleton className="w-12 h-12 rounded-xl" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-32 mb-1" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <div className="text-right">
                      <Skeleton className="h-4 w-4 mb-1" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : recentSessions && recentSessions.length > 0 ? (
            recentSessions.slice(0, 2).map((session, index) => (
              <Card key={session.id} className="glass-effect">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <img 
                      src={index === 0 
                        ? "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100"
                        : "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100"
                      } 
                      alt="Workout session" 
                      className="w-12 h-12 rounded-xl object-cover" 
                    />
                    <div className="flex-1">
                      <h3 className="font-medium text-foreground">
                        {index === 0 ? 'Full Body Strength' : 'HIIT Cardio'}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(session.startedAt)} • {session.duration || 45} min
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-accent font-medium">✓</div>
                      <div className="text-xs text-muted-foreground">Completed</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="glass-effect">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-muted to-muted-foreground/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="text-muted-foreground" size={24} />
                </div>
                <p className="text-muted-foreground">No recent workouts</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Generate New Plan CTA */}
      <Card className="glass-effect border-border/20">
        <CardContent className="p-6 text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-accent to-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <Sparkles className="text-white" size={24} />
          </div>
          <h3 className="font-poppins font-semibold text-xl text-foreground mb-2">
            Generate New Plan
          </h3>
          <p className="text-muted-foreground mb-4">
            Let AI create a personalized workout plan based on your goals and progress
          </p>
          <Button 
            className="w-full bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white py-3 touch-target font-medium"
            onClick={() => {
              console.log('Create with AI button clicked');
              setLocation('/workouts?generate=true');
            }}
          >
            Create with AI
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
