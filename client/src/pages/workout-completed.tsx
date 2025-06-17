import { useQuery } from '@tanstack/react-query';
import { useRoute, Link } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, Clock, CheckCircle, Calendar, Trophy, Eye } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface CompletedWorkoutData {
  session: {
    id: number;
    workoutId: number;
    userId: number;
    completedAt: string;
    notes?: string;
    exercisesCompleted?: number;
    exercisesSkipped?: number;
  };
  completions: Array<{
    id: number;
    sessionId: number;
    exerciseIndex: number;
    completedAt: string;
    skipped: boolean;
    notes?: string;
  }>;
  workout: {
    id: number;
    title: string;
    description?: string;
    estimatedDuration: number;
    exercises: any[];
    planId: number;
  };
  readOnly: boolean;
}

export default function WorkoutCompletedPage() {
  const [match, params] = useRoute('/workout-completed');
  const sessionId = new URLSearchParams(window.location.search).get('sessionId');

  const { data: completedWorkout, isLoading, error } = useQuery<CompletedWorkoutData>({
    queryKey: ['/api/workout-session', sessionId, 'completed'],
    queryFn: async () => {
      const response = await fetch(`/api/workout-session/${sessionId}/completed`);
      if (!response.ok) throw new Error('Failed to fetch completed workout');
      return response.json();
    },
    enabled: !!sessionId
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-2xl mx-auto space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (error || !completedWorkout) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-2xl mx-auto">
          <Card className="glass-effect">
            <CardContent className="p-6 text-center">
              <h2 className="text-xl font-semibold text-foreground mb-2">Workout Not Found</h2>
              <p className="text-muted-foreground mb-4">The completed workout could not be loaded.</p>
              <Link href="/workouts">
                <Button>Back to Workouts</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const { session, completions, workout } = completedWorkout;
  const exercises = workout.exercises || [];
  const completedAt = new Date(session.completedAt);
  const completedExercises = completions.filter(c => !c.skipped);
  const skippedExercises = completions.filter(c => c.skipped);

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Link href={`/plan/${workout.planId}`}>
            <Button variant="ghost" size="sm" className="glass-effect">
              <ChevronLeft size={16} className="mr-1" />
              Back to Plan
            </Button>
          </Link>
          <Badge variant="outline" className="bg-green-900/30 border-green-500/50 text-green-200">
            <Trophy size={12} className="mr-1" />
            Completed
          </Badge>
        </div>

        {/* Workout Summary */}
        <Card className="glass-effect">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div>
                <h1 className="text-2xl font-bold text-foreground mb-2">{workout.title}</h1>
                {workout.description && (
                  <p className="text-muted-foreground">{workout.description}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="glass-effect p-4 rounded-lg">
                  <div className="flex items-center space-x-2 text-green-400 mb-2">
                    <Calendar size={16} />
                    <span className="text-sm font-medium">Completed</span>
                  </div>
                  <p className="text-foreground font-semibold">
                    {completedAt.toLocaleDateString()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(completedAt, { addSuffix: true })}
                  </p>
                </div>

                <div className="glass-effect p-4 rounded-lg">
                  <div className="flex items-center space-x-2 text-blue-400 mb-2">
                    <CheckCircle size={16} />
                    <span className="text-sm font-medium">Progress</span>
                  </div>
                  <p className="text-foreground font-semibold">
                    {completedExercises.length} / {exercises.length} exercises
                  </p>
                  {skippedExercises.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {skippedExercises.length} skipped
                    </p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Exercise Completions */}
        <Card className="glass-effect">
          <CardContent className="p-6">
            <h3 className="font-semibold text-lg text-foreground mb-4">Exercise Summary</h3>
            <div className="space-y-3">
              {exercises.map((exercise: any, index: number) => {
                const completion = completions.find(c => c.exerciseIndex === index);
                const isCompleted = completion && !completion.skipped;
                const isSkipped = completion && completion.skipped;
                
                return (
                  <div key={index} className="glass-effect p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <span className="inline-flex items-center justify-center w-6 h-6 bg-gradient-to-r from-accent to-primary rounded-md text-white text-xs font-semibold">
                            {index + 1}
                          </span>
                          <div>
                            <h4 className="font-medium text-foreground">{exercise.name}</h4>
                            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                              {exercise.sets && <span>{exercise.sets} sets</span>}
                              {exercise.reps && <span>{exercise.reps} reps</span>}
                              {exercise.duration && <span>{exercise.duration}</span>}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {isCompleted && (
                          <Badge variant="outline" className="bg-green-900/30 border-green-500/50 text-green-200 text-xs">
                            <CheckCircle size={10} className="mr-1" />
                            Done
                          </Badge>
                        )}
                        {isSkipped && (
                          <Badge variant="outline" className="bg-orange-900/30 border-orange-500/50 text-orange-200 text-xs">
                            Skipped
                          </Badge>
                        )}
                        {!completion && (
                          <Badge variant="outline" className="bg-gray-900/30 border-gray-500/50 text-gray-200 text-xs">
                            Not Started
                          </Badge>
                        )}
                      </div>
                    </div>
                    {completion?.notes && (
                      <div className="mt-3 p-3 bg-muted/20 rounded-lg">
                        <p className="text-sm text-muted-foreground italic">{completion.notes}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Session Notes */}
        {session.notes && (
          <Card className="glass-effect">
            <CardContent className="p-6">
              <h3 className="font-semibold text-lg text-foreground mb-4">Workout Notes</h3>
              <div className="glass-effect p-4 rounded-lg bg-muted/10">
                <p className="text-muted-foreground italic">{session.notes}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Read-Only Notice */}
        <Card className="glass-effect">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 text-muted-foreground text-sm">
              <Eye size={16} />
              <span>This is a read-only view of your completed workout. You cannot make changes to this session.</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}