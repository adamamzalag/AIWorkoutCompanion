import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertUserSchema, 
  insertWorkoutPlanSchema, 
  insertWorkoutSessionSchema, 
  insertChatMessageSchema 
} from "@shared/schema";
import { 
  generateWorkoutPlan, 
  generateCoachingTip, 
  generateChatResponse, 
  analyzeWorkoutProgress,
  type WorkoutPlanRequest 
} from "./openai";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth/User routes
  app.post("/api/users", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      res.json(user);
    } catch (error) {
      res.status(400).json({ error: "Invalid user data" });
    }
  });

  app.get("/api/user/:id", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(400).json({ error: "Invalid user ID" });
    }
  });

  app.put("/api/user/:id", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const updates = insertUserSchema.partial().parse(req.body);
      const user = await storage.updateUser(userId, updates);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(400).json({ error: "Invalid update data" });
    }
  });

  // Workout Plans routes
  app.get("/api/workout-plans/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const plans = await storage.getWorkoutPlans(userId);
      res.json(plans);
    } catch (error) {
      res.status(400).json({ error: "Invalid user ID" });
    }
  });

  app.post("/api/workout-plans", async (req, res) => {
    try {
      const planData = insertWorkoutPlanSchema.parse(req.body);
      const plan = await storage.createWorkoutPlan(planData);
      res.json(plan);
    } catch (error) {
      res.status(400).json({ error: "Invalid workout plan data" });
    }
  });

  app.get("/api/workout-plan/:id", async (req, res) => {
    try {
      const planId = parseInt(req.params.id);
      const plan = await storage.getWorkoutPlan(planId);
      if (!plan) {
        return res.status(404).json({ error: "Workout plan not found" });
      }
      res.json(plan);
    } catch (error) {
      res.status(400).json({ error: "Invalid plan ID" });
    }
  });

  // Workouts routes
  app.get("/api/workouts/:planId", async (req, res) => {
    try {
      const planId = parseInt(req.params.planId);
      const workouts = await storage.getWorkouts(planId);
      res.json(workouts);
    } catch (error) {
      res.status(400).json({ error: "Invalid plan ID" });
    }
  });

  app.get("/api/workout/:id", async (req, res) => {
    try {
      const workoutId = parseInt(req.params.id);
      const workout = await storage.getWorkout(workoutId);
      if (!workout) {
        return res.status(404).json({ error: "Workout not found" });
      }
      res.json(workout);
    } catch (error) {
      res.status(400).json({ error: "Invalid workout ID" });
    }
  });

  // Workout Sessions routes
  app.get("/api/workout-sessions/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const sessions = await storage.getWorkoutSessions(userId);
      res.json(sessions);
    } catch (error) {
      res.status(400).json({ error: "Invalid user ID" });
    }
  });

  app.post("/api/workout-sessions", async (req, res) => {
    try {
      const sessionData = insertWorkoutSessionSchema.parse(req.body);
      const session = await storage.createWorkoutSession(sessionData);
      res.json(session);
    } catch (error) {
      res.status(400).json({ error: "Invalid workout session data" });
    }
  });

  app.put("/api/workout-session/:id", async (req, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      const updates = insertWorkoutSessionSchema.partial().parse(req.body);
      const session = await storage.updateWorkoutSession(sessionId, updates);
      if (!session) {
        return res.status(404).json({ error: "Workout session not found" });
      }
      res.json(session);
    } catch (error) {
      res.status(400).json({ error: "Invalid update data" });
    }
  });

  app.get("/api/recent-sessions/:userId/:limit", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const limit = parseInt(req.params.limit);
      const sessions = await storage.getRecentWorkoutSessions(userId, limit);
      res.json(sessions);
    } catch (error) {
      res.status(400).json({ error: "Invalid parameters" });
    }
  });

  // Exercises routes
  app.get("/api/exercises", async (req, res) => {
    try {
      const exercises = await storage.getExercises();
      res.json(exercises);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch exercises" });
    }
  });

  app.get("/api/exercise/:id", async (req, res) => {
    try {
      const exerciseId = parseInt(req.params.id);
      const exercise = await storage.getExercise(exerciseId);
      if (!exercise) {
        return res.status(404).json({ error: "Exercise not found" });
      }
      res.json(exercise);
    } catch (error) {
      res.status(400).json({ error: "Invalid exercise ID" });
    }
  });

  app.get("/api/exercises/search/:query", async (req, res) => {
    try {
      const query = req.params.query;
      const exercises = await storage.searchExercises(query);
      res.json(exercises);
    } catch (error) {
      res.status(400).json({ error: "Search failed" });
    }
  });

  // Chat routes
  app.get("/api/chat/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const messages = await storage.getChatMessages(userId);
      res.json(messages);
    } catch (error) {
      res.status(400).json({ error: "Invalid user ID" });
    }
  });

  app.post("/api/chat", async (req, res) => {
    try {
      const messageData = insertChatMessageSchema.parse(req.body);
      
      // Save user message
      const userMessage = await storage.createChatMessage(messageData);
      
      // Get user context for AI response
      const user = await storage.getUser(messageData.userId);
      const recentSessions = await storage.getRecentWorkoutSessions(messageData.userId, 5);
      const chatHistory = await storage.getChatMessages(messageData.userId);
      
      const userContext = {
        fitnessLevel: user?.fitnessLevel,
        goals: user?.goals,
        equipment: user?.equipment,
        recentWorkouts: recentSessions.length
      };

      // Generate AI response
      const aiResponse = await generateChatResponse(
        messageData.content,
        userContext,
        chatHistory
      );

      // Save AI response
      const aiMessage = await storage.createChatMessage({
        userId: messageData.userId,
        role: "assistant",
        content: aiResponse
      });

      res.json({ userMessage, aiMessage });
    } catch (error) {
      res.status(400).json({ error: "Failed to process chat message" });
    }
  });

  // AI-powered routes
  app.post("/api/generate-plan", async (req, res) => {
    try {
      const planRequest: WorkoutPlanRequest = req.body;
      
      // Generate plan using OpenAI
      const generatedPlan = await generateWorkoutPlan(planRequest);
      
      // Save the plan to storage
      const workoutPlan = await storage.createWorkoutPlan({
        userId: req.body.userId,
        title: generatedPlan.title,
        description: generatedPlan.description,
        duration: generatedPlan.duration,
        totalWorkouts: generatedPlan.totalWorkouts,
        difficulty: generatedPlan.difficulty,
        equipment: generatedPlan.equipment,
        isActive: true
      });

      // Save individual workouts
      for (let i = 0; i < generatedPlan.workouts.length; i++) {
        const workout = generatedPlan.workouts[i];
        await storage.createWorkout({
          planId: workoutPlan.id,
          userId: req.body.userId,
          title: workout.title,
          description: workout.description,
          estimatedDuration: workout.estimatedDuration,
          exercises: workout.exercises,
          orderIndex: i
        });
      }

      res.json(workoutPlan);
    } catch (error) {
      console.error("Error generating workout plan:", error);
      res.status(500).json({ error: "Failed to generate workout plan" });
    }
  });

  app.post("/api/coaching-tip", async (req, res) => {
    try {
      const { exercise, userPerformance, userId } = req.body;
      const workoutHistory = await storage.getRecentWorkoutSessions(userId, 10);
      
      const tip = await generateCoachingTip(exercise, userPerformance, workoutHistory);
      res.json({ tip });
    } catch (error) {
      res.status(500).json({ error: "Failed to generate coaching tip" });
    }
  });

  app.get("/api/progress-analysis/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const user = await storage.getUser(userId);
      const workoutSessions = await storage.getWorkoutSessions(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const analysis = await analyzeWorkoutProgress(workoutSessions, user.goals);
      res.json(analysis);
    } catch (error) {
      res.status(500).json({ error: "Failed to analyze progress" });
    }
  });

  // User stats
  app.get("/api/stats/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const sessions = await storage.getWorkoutSessions(userId);
      
      const completedSessions = sessions.filter(s => s.completedAt);
      const thisWeekSessions = completedSessions.filter(s => {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return s.startedAt > weekAgo;
      });

      const totalMinutes = completedSessions.reduce((sum, session) => {
        return sum + (session.duration || 0);
      }, 0);

      // Calculate streak
      let streak = 0;
      const sortedSessions = completedSessions.sort((a, b) => 
        b.startedAt.getTime() - a.startedAt.getTime()
      );

      let currentDate = new Date();
      currentDate.setHours(0, 0, 0, 0);

      for (const session of sortedSessions) {
        const sessionDate = new Date(session.startedAt);
        sessionDate.setHours(0, 0, 0, 0);
        
        const daysDiff = Math.floor(
          (currentDate.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysDiff === streak || (streak === 0 && daysDiff <= 1)) {
          streak++;
          currentDate = sessionDate;
        } else {
          break;
        }
      }

      res.json({
        weekStreak: streak,
        weekWorkouts: thisWeekSessions.length,
        totalMinutes
      });
    } catch (error) {
      res.status(400).json({ error: "Failed to calculate stats" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
