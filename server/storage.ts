import { 
  users, workoutPlans, exercises, workouts, workoutSessions, chatMessages, userProgress,
  type User, type InsertUser,
  type WorkoutPlan, type InsertWorkoutPlan,
  type Exercise, type InsertExercise,
  type Workout, type InsertWorkout,
  type WorkoutSession, type InsertWorkoutSession,
  type ChatMessage, type InsertChatMessage,
  type UserProgress, type InsertUserProgress
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, like, and } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined>;

  // Workout Plans
  getWorkoutPlans(userId: number): Promise<WorkoutPlan[]>;
  getWorkoutPlan(id: number): Promise<WorkoutPlan | undefined>;
  createWorkoutPlan(plan: InsertWorkoutPlan): Promise<WorkoutPlan>;
  updateWorkoutPlan(id: number, updates: Partial<InsertWorkoutPlan>): Promise<WorkoutPlan | undefined>;
  deleteWorkoutPlan(id: number): Promise<boolean>;

  // Exercises
  getExercises(): Promise<Exercise[]>;
  getExercise(id: number): Promise<Exercise | undefined>;
  createExercise(exercise: InsertExercise): Promise<Exercise>;
  searchExercises(query: string): Promise<Exercise[]>;

  // Workouts
  getWorkouts(planId: number): Promise<Workout[]>;
  getWorkout(id: number): Promise<Workout | undefined>;
  createWorkout(workout: InsertWorkout): Promise<Workout>;
  updateWorkout(id: number, updates: Partial<InsertWorkout>): Promise<Workout | undefined>;

  // Workout Sessions
  getWorkoutSessions(userId: number): Promise<WorkoutSession[]>;
  getWorkoutSession(id: number): Promise<WorkoutSession | undefined>;
  createWorkoutSession(session: InsertWorkoutSession): Promise<WorkoutSession>;
  updateWorkoutSession(id: number, updates: Partial<InsertWorkoutSession>): Promise<WorkoutSession | undefined>;
  getRecentWorkoutSessions(userId: number, limit: number): Promise<WorkoutSession[]>;

  // Chat Messages
  getChatMessages(userId: number): Promise<ChatMessage[]>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;

  // User Progress
  getUserProgress(userId: number): Promise<UserProgress[]>;
  createUserProgress(progress: InsertUserProgress): Promise<UserProgress>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async getWorkoutPlans(userId: number): Promise<WorkoutPlan[]> {
    return await db.select().from(workoutPlans).where(eq(workoutPlans.userId, userId));
  }

  async getWorkoutPlan(id: number): Promise<WorkoutPlan | undefined> {
    const [plan] = await db.select().from(workoutPlans).where(eq(workoutPlans.id, id));
    return plan || undefined;
  }

  async createWorkoutPlan(insertPlan: InsertWorkoutPlan): Promise<WorkoutPlan> {
    const [plan] = await db
      .insert(workoutPlans)
      .values(insertPlan)
      .returning();
    return plan;
  }

  async updateWorkoutPlan(id: number, updates: Partial<InsertWorkoutPlan>): Promise<WorkoutPlan | undefined> {
    const [plan] = await db
      .update(workoutPlans)
      .set(updates)
      .where(eq(workoutPlans.id, id))
      .returning();
    return plan || undefined;
  }

  async deleteWorkoutPlan(id: number): Promise<boolean> {
    const result = await db.delete(workoutPlans).where(eq(workoutPlans.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getExercises(): Promise<Exercise[]> {
    return await db.select().from(exercises);
  }

  async getExercise(id: number): Promise<Exercise | undefined> {
    const [exercise] = await db.select().from(exercises).where(eq(exercises.id, id));
    return exercise || undefined;
  }

  async createExercise(insertExercise: InsertExercise): Promise<Exercise> {
    const [exercise] = await db
      .insert(exercises)
      .values(insertExercise)
      .returning();
    return exercise;
  }

  async searchExercises(query: string): Promise<Exercise[]> {
    return await db.select().from(exercises).where(like(exercises.name, `%${query}%`));
  }

  async getWorkouts(planId: number): Promise<Workout[]> {
    return await db.select().from(workouts).where(eq(workouts.planId, planId));
  }

  async getWorkout(id: number): Promise<Workout | undefined> {
    const [workout] = await db.select().from(workouts).where(eq(workouts.id, id));
    return workout || undefined;
  }

  async createWorkout(insertWorkout: InsertWorkout): Promise<Workout> {
    const [workout] = await db
      .insert(workouts)
      .values(insertWorkout)
      .returning();
    return workout;
  }

  async updateWorkout(id: number, updates: Partial<InsertWorkout>): Promise<Workout | undefined> {
    const [workout] = await db
      .update(workouts)
      .set(updates)
      .where(eq(workouts.id, id))
      .returning();
    return workout || undefined;
  }

  async getWorkoutSessions(userId: number): Promise<WorkoutSession[]> {
    return await db.select().from(workoutSessions).where(eq(workoutSessions.userId, userId)).orderBy(desc(workoutSessions.startedAt));
  }

  async getWorkoutSession(id: number): Promise<WorkoutSession | undefined> {
    const [session] = await db.select().from(workoutSessions).where(eq(workoutSessions.id, id));
    return session || undefined;
  }

  async createWorkoutSession(insertSession: InsertWorkoutSession): Promise<WorkoutSession> {
    const [session] = await db
      .insert(workoutSessions)
      .values(insertSession)
      .returning();
    return session;
  }

  async updateWorkoutSession(id: number, updates: Partial<InsertWorkoutSession>): Promise<WorkoutSession | undefined> {
    const [session] = await db
      .update(workoutSessions)
      .set(updates)
      .where(eq(workoutSessions.id, id))
      .returning();
    return session || undefined;
  }

  async getRecentWorkoutSessions(userId: number, limit: number): Promise<WorkoutSession[]> {
    return await db.select().from(workoutSessions)
      .where(eq(workoutSessions.userId, userId))
      .orderBy(desc(workoutSessions.startedAt))
      .limit(limit);
  }

  async getChatMessages(userId: number): Promise<ChatMessage[]> {
    return await db.select().from(chatMessages).where(eq(chatMessages.userId, userId)).orderBy(desc(chatMessages.timestamp));
  }

  async createChatMessage(insertMessage: InsertChatMessage): Promise<ChatMessage> {
    const [message] = await db
      .insert(chatMessages)
      .values(insertMessage)
      .returning();
    return message;
  }

  async getUserProgress(userId: number): Promise<UserProgress[]> {
    return await db.select().from(userProgress).where(eq(userProgress.userId, userId)).orderBy(desc(userProgress.recordedAt));
  }

  async createUserProgress(insertProgress: InsertUserProgress): Promise<UserProgress> {
    const [progress] = await db
      .insert(userProgress)
      .values(insertProgress)
      .returning();
    return progress;
  }
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private workoutPlans: Map<number, WorkoutPlan>;
  private exercises: Map<number, Exercise>;
  private workouts: Map<number, Workout>;
  private workoutSessions: Map<number, WorkoutSession>;
  private chatMessages: Map<number, ChatMessage>;
  private userProgress: Map<number, UserProgress>;
  
  private currentUserId: number;
  private currentWorkoutPlanId: number;
  private currentExerciseId: number;
  private currentWorkoutId: number;
  private currentWorkoutSessionId: number;
  private currentChatMessageId: number;
  private currentUserProgressId: number;

  constructor() {
    this.users = new Map();
    this.workoutPlans = new Map();
    this.exercises = new Map();
    this.workouts = new Map();
    this.workoutSessions = new Map();
    this.chatMessages = new Map();
    this.userProgress = new Map();
    
    this.currentUserId = 1;
    this.currentWorkoutPlanId = 1;
    this.currentExerciseId = 1;
    this.currentWorkoutId = 1;
    this.currentWorkoutSessionId = 1;
    this.currentChatMessageId = 1;
    this.currentUserProgressId = 1;

    // Initialize with sample exercises and default user
    this.initializeExercises();
    this.initializeDefaultUser();
  }

  private initializeExercises() {
    const sampleExercises: InsertExercise[] = [
      {
        name: "Push-ups",
        description: "Classic bodyweight chest exercise",
        muscle_groups: ["chest", "shoulders", "triceps"],
        equipment: ["none"],
        difficulty: "beginner",
        instructions: [
          "Start in plank position with hands shoulder-width apart",
          "Lower your body until chest nearly touches the floor",
          "Push back up to starting position",
          "Keep your core tight throughout the movement"
        ],
        youtubeId: "IODxDxX7oi4",
        imageUrl: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600"
      },
      {
        name: "Squats",
        description: "Fundamental lower body exercise",
        muscle_groups: ["quadriceps", "glutes", "hamstrings"],
        equipment: ["none"],
        difficulty: "beginner",
        instructions: [
          "Stand with feet shoulder-width apart",
          "Lower your body by bending knees and hips",
          "Keep chest up and knees in line with toes",
          "Return to starting position"
        ],
        youtubeId: "aclHkVaku9U",
        imageUrl: "https://images.unsplash.com/photo-1566241142559-40e1dab266c6?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600"
      },
      {
        name: "Plank",
        description: "Core strengthening exercise",
        muscle_groups: ["core", "shoulders"],
        equipment: ["none"],
        difficulty: "beginner",
        instructions: [
          "Start in push-up position",
          "Lower to your forearms",
          "Keep body straight from head to heels",
          "Hold the position"
        ],
        youtubeId: "pSHjTRCQxIw",
        imageUrl: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600"
      }
    ];

    sampleExercises.forEach(exercise => {
      this.createExercise(exercise);
    });
  }

  // Users
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { 
      ...insertUser,
      equipment: insertUser.equipment || [],
      goals: insertUser.goals || [],
      id, 
      createdAt: new Date()
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Workout Plans
  async getWorkoutPlans(userId: number): Promise<WorkoutPlan[]> {
    return Array.from(this.workoutPlans.values()).filter(plan => plan.userId === userId);
  }

  async getWorkoutPlan(id: number): Promise<WorkoutPlan | undefined> {
    return this.workoutPlans.get(id);
  }

  async createWorkoutPlan(insertPlan: InsertWorkoutPlan): Promise<WorkoutPlan> {
    const id = this.currentWorkoutPlanId++;
    const plan: WorkoutPlan = { 
      ...insertPlan,
      equipment: insertPlan.equipment || [],
      description: insertPlan.description || null,
      isActive: insertPlan.isActive || false,
      id, 
      createdAt: new Date()
    };
    this.workoutPlans.set(id, plan);
    return plan;
  }

  async updateWorkoutPlan(id: number, updates: Partial<InsertWorkoutPlan>): Promise<WorkoutPlan | undefined> {
    const plan = this.workoutPlans.get(id);
    if (!plan) return undefined;
    
    const updatedPlan = { ...plan, ...updates };
    this.workoutPlans.set(id, updatedPlan);
    return updatedPlan;
  }

  async deleteWorkoutPlan(id: number): Promise<boolean> {
    return this.workoutPlans.delete(id);
  }

  // Exercises
  async getExercises(): Promise<Exercise[]> {
    return Array.from(this.exercises.values());
  }

  async getExercise(id: number): Promise<Exercise | undefined> {
    return this.exercises.get(id);
  }

  async createExercise(insertExercise: InsertExercise): Promise<Exercise> {
    const id = this.currentExerciseId++;
    const exercise: Exercise = { 
      ...insertExercise,
      equipment: insertExercise.equipment || [],
      description: insertExercise.description || null,
      youtubeId: insertExercise.youtubeId || null,
      imageUrl: insertExercise.imageUrl || null,
      id, 
      createdAt: new Date()
    };
    this.exercises.set(id, exercise);
    return exercise;
  }

  async searchExercises(query: string): Promise<Exercise[]> {
    const exercises = Array.from(this.exercises.values());
    return exercises.filter(exercise => 
      exercise.name.toLowerCase().includes(query.toLowerCase()) ||
      exercise.muscle_groups.some(group => group.toLowerCase().includes(query.toLowerCase()))
    );
  }

  // Workouts
  async getWorkouts(planId: number): Promise<Workout[]> {
    return Array.from(this.workouts.values())
      .filter(workout => workout.planId === planId)
      .sort((a, b) => a.orderIndex - b.orderIndex);
  }

  async getWorkout(id: number): Promise<Workout | undefined> {
    return this.workouts.get(id);
  }

  async createWorkout(insertWorkout: InsertWorkout): Promise<Workout> {
    const id = this.currentWorkoutId++;
    const workout: Workout = { 
      ...insertWorkout,
      description: insertWorkout.description || null,
      id, 
      createdAt: new Date()
    };
    this.workouts.set(id, workout);
    return workout;
  }

  async updateWorkout(id: number, updates: Partial<InsertWorkout>): Promise<Workout | undefined> {
    const workout = this.workouts.get(id);
    if (!workout) return undefined;
    
    const updatedWorkout = { ...workout, ...updates };
    this.workouts.set(id, updatedWorkout);
    return updatedWorkout;
  }

  // Workout Sessions
  async getWorkoutSessions(userId: number): Promise<WorkoutSession[]> {
    return Array.from(this.workoutSessions.values())
      .filter(session => session.userId === userId)
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
  }

  async getWorkoutSession(id: number): Promise<WorkoutSession | undefined> {
    return this.workoutSessions.get(id);
  }

  async createWorkoutSession(insertSession: InsertWorkoutSession): Promise<WorkoutSession> {
    const id = this.currentWorkoutSessionId++;
    const session: WorkoutSession = { 
      ...insertSession,
      duration: insertSession.duration || null,
      completedAt: insertSession.completedAt || null,
      notes: insertSession.notes || null,
      aiCoachFeedback: insertSession.aiCoachFeedback || null,
      id, 
      startedAt: new Date()
    };
    this.workoutSessions.set(id, session);
    return session;
  }

  async updateWorkoutSession(id: number, updates: Partial<InsertWorkoutSession>): Promise<WorkoutSession | undefined> {
    const session = this.workoutSessions.get(id);
    if (!session) return undefined;
    
    const updatedSession = { ...session, ...updates };
    this.workoutSessions.set(id, updatedSession);
    return updatedSession;
  }

  async getRecentWorkoutSessions(userId: number, limit: number): Promise<WorkoutSession[]> {
    const sessions = await this.getWorkoutSessions(userId);
    return sessions.slice(0, limit);
  }

  // Chat Messages
  async getChatMessages(userId: number): Promise<ChatMessage[]> {
    return Array.from(this.chatMessages.values())
      .filter(message => message.userId === userId)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  async createChatMessage(insertMessage: InsertChatMessage): Promise<ChatMessage> {
    const id = this.currentChatMessageId++;
    const message: ChatMessage = { 
      ...insertMessage, 
      id, 
      timestamp: new Date()
    };
    this.chatMessages.set(id, message);
    return message;
  }

  // User Progress
  async getUserProgress(userId: number): Promise<UserProgress[]> {
    return Array.from(this.userProgress.values())
      .filter(progress => progress.userId === userId)
      .sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime());
  }

  async createUserProgress(insertProgress: InsertUserProgress): Promise<UserProgress> {
    const id = this.currentUserProgressId++;
    const progress: UserProgress = { 
      ...insertProgress, 
      id, 
      recordedAt: new Date()
    };
    this.userProgress.set(id, progress);
    return progress;
  }

  private initializeDefaultUser() {
    // Create a default user without onboarding completed
    const defaultUser: User = {
      id: 1,
      username: "user",
      name: "User",
      fitnessLevel: null,
      equipment: [],
      goals: [],
      notes: null,
      onboardingCompleted: false,
      createdAt: new Date(),
    };
    this.users.set(1, defaultUser);
  }
}

export const storage = new DatabaseStorage();
