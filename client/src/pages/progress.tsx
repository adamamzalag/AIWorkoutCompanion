import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProgressRing } from '@/components/progress-ring';
import { 
  TrendingUp, 
  Calendar, 
  Trophy, 
  Target, 
  Clock, 
  Flame,
  BarChart3,
  Activity,
  Zap
} from 'lucide-react';
import type { UserStats, WorkoutSession, ProgressAnalysis, User } from '@shared/schema';

export default function ProgressPage() {
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('month');

  const { data: userProfile } = useQuery<User>({
    queryKey: ["/api/auth/user"],
  });

  const { data: stats, isLoading: statsLoading } = useQuery<UserStats>({
    queryKey: ['/api/stats', userProfile?.id],
    enabled: !!userProfile?.id,
  });

  const { data: workoutSessions, isLoading: sessionsLoading } = useQuery<WorkoutSession[]>({
    queryKey: ['/api/workout-sessions', userProfile?.id],
    enabled: !!userProfile?.id,
  });

  const { data: progressAnalysis, isLoading: analysisLoading } = useQuery<ProgressAnalysis>({
    queryKey: ['/api/progress-analysis', userProfile?.id],
    enabled: !!userProfile?.id,
  });

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const getWorkoutTypeIcon = (title: string) => {
    if (title.toLowerCase().includes('cardio') || title.toLowerCase().includes('hiit')) {
      return <Zap className="text-secondary" size={16} />;
    }
    if (title.toLowerCase().includes('strength') || title.toLowerCase().includes('weight')) {
      return <Target className="text-primary" size={16} />;
    }
    return <Activity className="text-accent" size={16} />;
  };

  const completedSessions = workoutSessions?.filter(session => session.completedAt) || [];
  const recentSessions = completedSessions.slice(0, 10);

  // Calculate weekly progress
  const weeklyGoal = 4; // 4 workouts per week
  const currentWeekWorkouts = stats?.weekWorkouts || 0;
  const weeklyProgress = Math.min((currentWeekWorkouts / weeklyGoal) * 100, 100);

  // Mock data for charts (in a real app, this would be calculated from actual data)
  const weeklyData = [
    { day: 'Mon', workouts: 1, calories: 450 },
    { day: 'Tue', workouts: 0, calories: 0 },
    { day: 'Wed', workouts: 1, calories: 380 },
    { day: 'Thu', workouts: 1, calories: 520 },
    { day: 'Fri', workouts: 0, calories: 0 },
    { day: 'Sat', workouts: 1, calories: 600 },
    { day: 'Sun', workouts: 0, calories: 0 },
  ];

  const achievements = [
    { title: '7-Day Streak', description: 'Completed workouts for 7 consecutive days', icon: Flame, achieved: true },
    { title: 'First Mile', description: 'Completed your first full workout', icon: Trophy, achieved: true },
    { title: 'Consistency King', description: 'Complete 20 workouts', icon: Target, achieved: false },
    { title: 'Strength Builder', description: 'Increase weight by 25%', icon: TrendingUp, achieved: false },
  ];

  return (
    <div className="px-4 pb-24 pt-20 space-y-6 fade-in">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="font-poppins font-bold text-2xl text-foreground">Your Progress</h1>
        <p className="text-muted-foreground">Track your fitness journey and achievements</p>
      </div>

      {/* Period Selector */}
      <div className="flex justify-center">
        <div className="glass-effect rounded-xl p-1 flex">
          {(['week', 'month', 'year'] as const).map((period) => (
            <Button
              key={period}
              variant={selectedPeriod === period ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSelectedPeriod(period)}
              className={`capitalize ${
                selectedPeriod === period 
                  ? 'bg-primary text-primary-foreground' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {period}
            </Button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-4">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="glass-effect">
              <CardContent className="p-4 text-center">
                <Skeleton className="h-8 w-12 mx-auto mb-2" />
                <Skeleton className="h-4 w-16 mx-auto" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card className="glass-effect">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-accent mb-1">{stats?.weekStreak || 0}</div>
                <div className="text-xs text-muted-foreground">Day Streak</div>
              </CardContent>
            </Card>
            
            <Card className="glass-effect">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-primary mb-1">{stats?.weekWorkouts || 0}</div>
                <div className="text-xs text-muted-foreground">This Week</div>
              </CardContent>
            </Card>
            
            <Card className="glass-effect">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-secondary mb-1">{completedSessions.length}</div>
                <div className="text-xs text-muted-foreground">Total Workouts</div>
              </CardContent>
            </Card>
            
            <Card className="glass-effect">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-foreground mb-1">{stats?.totalMinutes || 0}</div>
                <div className="text-xs text-muted-foreground">Minutes</div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Weekly Goal Progress */}
      <Card className="glass-effect gradient-border">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-poppins font-semibold text-lg text-foreground">Weekly Goal</h3>
              <p className="text-sm text-muted-foreground">{currentWeekWorkouts} of {weeklyGoal} workouts</p>
            </div>
            <ProgressRing progress={weeklyProgress} size={60} />
          </div>
          
          <div className="grid grid-cols-7 gap-2">
            {weeklyData.map((day, index) => (
              <div key={day.day} className="text-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium mb-1 ${
                  day.workouts > 0 
                    ? 'bg-accent text-accent-foreground' 
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {day.workouts > 0 ? '✓' : ''}
                </div>
                <div className="text-xs text-muted-foreground">{day.day}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 glass-effect">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="achievements">Awards</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* AI Progress Analysis */}
          {analysisLoading ? (
            <Card className="glass-effect">
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <Skeleton className="w-8 h-8 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : progressAnalysis ? (
            <Card className="glass-effect border-accent/20">
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-accent to-primary rounded-full flex items-center justify-center flex-shrink-0">
                    <BarChart3 className="text-white" size={14} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-foreground mb-1">AI Progress Analysis</h4>
                    <p className="text-sm text-foreground/90 mb-3">{progressAnalysis.progressSummary}</p>
                    
                    {progressAnalysis.strengthImprovement > 0 && (
                      <div className="flex items-center space-x-2 mb-3">
                        <TrendingUp className="text-accent" size={16} />
                        <span className="text-sm font-medium text-accent">
                          {progressAnalysis.strengthImprovement}% strength improvement
                        </span>
                      </div>
                    )}
                    
                    <div className="space-y-1">
                      {progressAnalysis.recommendations.slice(0, 2).map((rec, index) => (
                        <div key={index} className="text-xs text-muted-foreground flex items-start space-x-1">
                          <span className="text-accent">•</span>
                          <span>{rec}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {/* Weekly Activity Chart */}
          <Card className="glass-effect">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center space-x-2">
                <Activity size={20} />
                <span>Weekly Activity</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {weeklyData.map((day, index) => (
                  <div key={day.day} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 text-sm text-muted-foreground">{day.day}</div>
                      <div className="flex-1 bg-muted rounded-full h-2 w-32">
                        <div 
                          className="bg-gradient-to-r from-primary to-accent h-2 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min((day.calories / 600) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-sm text-foreground">{day.calories} cal</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <div className="space-y-3">
            {sessionsLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Card key={i} className="glass-effect">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <Skeleton className="w-12 h-12 rounded-xl" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-32 mb-1" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                      <Skeleton className="h-8 w-16" />
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : recentSessions.length > 0 ? (
              recentSessions.map((session, index) => (
                <Card key={session.id} className="glass-effect">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-gradient-to-r from-primary to-secondary rounded-xl flex items-center justify-center">
                          {getWorkoutTypeIcon('workout')}
                        </div>
                        <div>
                          <h4 className="font-medium text-foreground">
                            Workout Session #{completedSessions.length - index}
                          </h4>
                          <div className="flex items-center space-x-3 text-sm text-muted-foreground">
                            <div className="flex items-center space-x-1">
                              <Calendar size={12} />
                              <span>{formatDate(session.startedAt)}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Clock size={12} />
                              <span>{session.duration || 0} min</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <Badge className="bg-accent text-accent-foreground">
                        Completed
                      </Badge>
                    </div>
                    
                    {session.aiCoachFeedback && (
                      <div className="mt-3 p-3 glass-effect rounded-xl border border-accent/20">
                        <div className="flex items-start space-x-2">
                          <BarChart3 className="text-accent flex-shrink-0 mt-0.5" size={14} />
                          <p className="text-xs text-foreground/90">{session.aiCoachFeedback}</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="glass-effect">
                <CardContent className="p-8 text-center">
                  <Clock className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-poppins font-semibold text-lg text-foreground mb-2">
                    No Workout History
                  </h3>
                  <p className="text-muted-foreground">
                    Complete your first workout to see your progress here
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="achievements" className="space-y-4">
          <div className="grid gap-3">
            {achievements.map((achievement, index) => (
              <Card key={index} className={`glass-effect ${
                achievement.achieved ? 'border-accent/20' : 'opacity-60'
              }`}>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      achievement.achieved 
                        ? 'bg-gradient-to-r from-accent to-primary' 
                        : 'bg-muted'
                    }`}>
                      <achievement.icon 
                        className={achievement.achieved ? 'text-white' : 'text-muted-foreground'} 
                        size={20} 
                      />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-foreground">{achievement.title}</h4>
                      <p className="text-sm text-muted-foreground">{achievement.description}</p>
                    </div>
                    {achievement.achieved && (
                      <Badge className="bg-accent text-accent-foreground">
                        ✓ Unlocked
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
