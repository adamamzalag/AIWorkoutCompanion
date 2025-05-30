export interface WorkoutPlanRequest {
  userId: number;
  fitnessLevel: 'beginner' | 'intermediate' | 'advanced';
  equipment: string[];
  goals: string[];
  duration: number; // weeks
  workoutsPerWeek: number;
  timePerWorkout: number; // minutes
}

export interface ExerciseLog {
  exerciseId?: number;
  name: string;
  sets: Array<{
    reps: number;
    weight?: number;
    duration?: number; // for time-based exercises
    completed: boolean;
    notes?: string;
  }>;
  restTime: string;
  notes?: string;
}

export interface WorkoutSession {
  id?: number;
  workoutId: number;
  userId: number;
  startedAt: Date;
  completedAt?: Date;
  duration?: number;
  exercises: ExerciseLog[];
  notes?: string;
  aiCoachFeedback?: string;
}

export interface ChatMessage {
  id: number;
  userId: number;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface UserStats {
  weekStreak: number;
  weekWorkouts: number;
  totalMinutes: number;
}

export interface ProgressAnalysis {
  progressSummary: string;
  recommendations: string[];
  strengthImprovement: number;
}

export interface CoachingTip {
  tip: string;
}
