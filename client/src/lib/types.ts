import type { RepInfo } from '@/utils/rep-parser';

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
  exerciseId: number; // Database exercise ID - all exercises must have valid database records
  name: string;
  sets: Array<{
    reps: number;
    weight?: number;
    duration?: number; // for time-based exercises
    completed: boolean;
    completedAt?: Date; // when this set was completed
    actualReps?: number; // what the user actually performed vs planned
    actualWeight?: number; // actual weight used vs planned
    actualDuration?: number; // actual time vs planned
    notes?: string;
    repInfo?: RepInfo; // Rep parsing information for display
  }>;
  restTime: string;
  notes?: string;
  isWarmup?: boolean; // Identifies warm-up exercises
  isCardio?: boolean; // Identifies cardio exercises
  isCooldown?: boolean; // Identifies cool-down exercises
  duration?: number; // Duration in seconds for time-based exercises
  completedAt?: Date; // when the entire exercise was completed
  skipped?: boolean; // if the exercise was skipped entirely
  originalReps?: string; // Original rep string from database
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
