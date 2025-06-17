import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Eye, CheckCircle } from 'lucide-react';

interface WorkoutCompletionButtonProps {
  workoutId: number;
  userId: number;
  className?: string;
}

interface CompletionStatus {
  isCompleted: boolean;
  completedAt: string | null;
  sessionId: number | null;
}

export function WorkoutCompletionButton({ workoutId, userId, className }: WorkoutCompletionButtonProps) {
  const { data: completionStatus, isLoading } = useQuery<CompletionStatus>({
    queryKey: ['/api/workout', workoutId, 'completion-status', userId],
    queryFn: async () => {
      const response = await fetch(`/api/workout/${workoutId}/completion-status/${userId}`);
      if (!response.ok) throw new Error('Failed to fetch completion status');
      return response.json();
    }
  });

  if (isLoading) {
    return (
      <Button disabled className={className}>
        <Play size={14} className="mr-1" />
        Loading...
      </Button>
    );
  }

  if (completionStatus?.isCompleted) {
    return (
      <div className="flex-1 space-y-2">
        <Link href={`/workout-completed?sessionId=${completionStatus.sessionId}`} className="block">
          <Button variant="outline" className={`w-full h-9 glass-effect bg-green-800/20 hover:bg-green-700/30 border-2 border-green-500/50 hover:border-green-400/60 text-green-100 hover:text-white transition-all duration-200 shadow-lg hover:shadow-xl font-medium ${className}`}>
            <Eye size={14} className="mr-1" />
            View Completed
          </Button>
        </Link>
        <div className="flex items-center justify-center">
          <Badge variant="outline" className="bg-green-900/30 border-green-500/50 text-green-200 text-xs">
            <CheckCircle size={12} className="mr-1" />
            Completed {new Date(completionStatus.completedAt!).toLocaleDateString()}
          </Badge>
        </div>
      </div>
    );
  }

  return (
    <Link href={`/workout-new?id=${workoutId}`} className="flex-1">
      <Button className={`w-full h-9 glass-effect bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 border border-emerald-400/50 text-white shadow-lg hover:shadow-xl transition-all duration-200 ${className}`}>
        <Play size={14} className="mr-1" />
        Start Workout
      </Button>
    </Link>
  );
}