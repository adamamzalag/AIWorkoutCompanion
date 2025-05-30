import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  name: text("name").notNull(),
  fitnessLevel: text("fitness_level").notNull(), // beginner, intermediate, advanced
  equipment: text("equipment").array().notNull().default([]), // available equipment
  goals: text("goals").array().notNull().default([]), // fitness goals
  createdAt: timestamp("created_at").notNull().defaultNow(),
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
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const exercises = pgTable("exercises", {
  id: serial("id").primaryKey(),
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
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  estimatedDuration: integer("estimated_duration").notNull(), // in minutes
  exercises: jsonb("exercises").notNull(), // array of exercise objects with sets/reps
  orderIndex: integer("order_index").notNull(),
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

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

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
