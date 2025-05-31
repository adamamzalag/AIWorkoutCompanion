import { pgTable, text, serial, integer, boolean, timestamp, jsonb, varchar, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth  
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  // Replit Auth fields
  replitId: varchar("replit_id").unique(), // Replit user ID for auth
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),  
  profileImageUrl: varchar("profile_image_url"),
  // Existing fitness app fields
  username: text("username").notNull().unique(),
  name: text("name").notNull(),
  fitnessLevel: text("fitness_level"), // beginner, intermediate, advanced
  equipment: text("equipment").array().notNull().default([]), // available equipment
  goals: text("goals"), // primary fitness goal
  notes: text("notes"), // additional notes for workout generation
  onboardingCompleted: boolean("onboarding_completed").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const workoutPlans = pgTable("workout_plans", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  duration: integer("duration").notNull(), // in weeks
  totalWorkouts: integer("total_workouts").notNull(),
  difficulty: text("difficulty").notNull(), // beginner, intermediate, advanced
  equipment: text("equipment").array().notNull().default([]),
  isActive: boolean("is_active").notNull().default(false),
  jsonMeta: jsonb("json_meta"), // flexible storage for AI-generated metadata
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const planWeeks = pgTable("plan_weeks", {
  id: serial("id").primaryKey(),
  planId: integer("plan_id").notNull(),
  userId: integer("user_id").notNull(),
  weekIndex: integer("week_index").notNull(), // 1, 2, 3, etc.
  focusSummary: text("focus_summary").notNull(), // "Foundation Building", "Strength Focus", etc.
  isCompleted: boolean("is_completed").notNull().default(false),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const exercises = pgTable("exercises", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(), // URL-friendly unique identifier for deduplication
  name: text("name").notNull(),
  description: text("description"),
  muscle_groups: text("muscle_groups").array().notNull(),
  equipment: text("equipment").array().notNull().default([]),
  difficulty: text("difficulty").notNull(),
  instructions: text("instructions").array().notNull(),
  youtubeId: text("youtube_id"), // YouTube video ID for tutorial
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const workouts = pgTable("workouts", {
  id: serial("id").primaryKey(),
  planId: integer("plan_id").notNull(),
  planWeekId: integer("plan_week_id"), // nullable for backward compatibility
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  estimatedDuration: integer("estimated_duration").notNull(), // in minutes
  exercises: jsonb("exercises").notNull(), // array of exercise objects with sets/reps
  orderIndex: integer("order_index").notNull(),
  dayIndex: integer("day_index"), // which day of the week (1-7)
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const workoutSessions = pgTable("workout_sessions", {
  id: serial("id").primaryKey(),
  workoutId: integer("workout_id").notNull(),
  userId: integer("user_id").notNull(),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  duration: integer("duration"), // actual duration in minutes
  exercises: jsonb("exercises").notNull(), // logged exercise data with actual reps/weights
  notes: text("notes"),
  aiCoachFeedback: text("ai_coach_feedback"),
});

export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  role: text("role").notNull(), // 'user' or 'assistant'
  content: text("content").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const userProgress = pgTable("user_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  metric: text("metric").notNull(), // 'weight', 'body_fat', 'muscle_mass', etc.
  value: text("value").notNull(),
  unit: text("unit").notNull(),
  recordedAt: timestamp("recorded_at").notNull().defaultNow(),
});

export const progressSnapshots = pgTable("progress_snapshots", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  planId: integer("plan_id"),
  planWeekId: integer("plan_week_id"), // if this snapshot is for a specific week
  dateRange: text("date_range").notNull(), // "Week 1", "Month 1", "Jan 2025", etc.
  adherencePercent: integer("adherence_percent"), // 0-100
  subjectiveFatigue: text("subjective_fatigue"), // "low", "moderate", "high"
  strengthPRs: jsonb("strength_prs"), // personal records achieved
  volumePerMuscle: jsonb("volume_per_muscle"), // training volume by muscle group
  flags: jsonb("flags"), // warning flags like "missed 3 days", "weight not progressing"
  coachNotes: text("coach_notes").notNull(), // AI-generated summary of the period
  jsonSnapshot: jsonb("json_snapshot").notNull(), // compressed data for AI context
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertWorkoutPlanSchema = createInsertSchema(workoutPlans).omit({
  id: true,
  createdAt: true,
});

export const insertExerciseSchema = createInsertSchema(exercises).omit({
  id: true,
  createdAt: true,
});

export const insertWorkoutSchema = createInsertSchema(workouts).omit({
  id: true,
  createdAt: true,
});

export const insertWorkoutSessionSchema = createInsertSchema(workoutSessions).omit({
  id: true,
  startedAt: true,
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  timestamp: true,
});

export const insertUserProgressSchema = createInsertSchema(userProgress).omit({
  id: true,
  recordedAt: true,
});

export const insertPlanWeekSchema = createInsertSchema(planWeeks).omit({
  id: true,
  createdAt: true,
});

export const insertProgressSnapshotSchema = createInsertSchema(progressSnapshots).omit({
  id: true,
  createdAt: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Replit Auth specific types
export type UpsertUser = typeof users.$inferInsert;

export type InsertWorkoutPlan = z.infer<typeof insertWorkoutPlanSchema>;
export type WorkoutPlan = typeof workoutPlans.$inferSelect;

export type InsertExercise = z.infer<typeof insertExerciseSchema>;
export type Exercise = typeof exercises.$inferSelect;

export type InsertWorkout = z.infer<typeof insertWorkoutSchema>;
export type Workout = typeof workouts.$inferSelect;

export type InsertWorkoutSession = z.infer<typeof insertWorkoutSessionSchema>;
export type WorkoutSession = typeof workoutSessions.$inferSelect;

export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;

export type InsertUserProgress = z.infer<typeof insertUserProgressSchema>;
export type UserProgress = typeof userProgress.$inferSelect;

export type InsertPlanWeek = z.infer<typeof insertPlanWeekSchema>;
export type PlanWeek = typeof planWeeks.$inferSelect;

export type InsertProgressSnapshot = z.infer<typeof insertProgressSnapshotSchema>;
export type ProgressSnapshot = typeof progressSnapshots.$inferSelect;

// Additional types used by the frontend
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
