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
} from "./openai-improved";

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

  // Progress tracking endpoint
  app.get("/api/generation-progress/:operationId", async (req, res) => {
    const { getProgress } = await import("./progress-tracker.js");
    const progress = getProgress(req.params.operationId);
    res.json(progress || { progress: 0, status: 'not_found' });
  });

  // AI-powered routes
  app.post("/api/generate-plan", async (req, res) => {
    const operationId = `plan_${req.body.userId}_${Date.now()}`;
    
    try {
      const { updateProgress } = await import("./progress-tracker.js");
      
      console.log(`🎯 Generating ${req.body.duration}-week plan for user ${req.body.userId}`);

      // Return operation ID immediately for progress tracking
      res.json({ operationId, status: 'started' });

      // Continue processing in background
      const planRequest: WorkoutPlanRequest = req.body;
      
      updateProgress(req.body.userId, operationId, 1, 6, 'generating', 'Analyzing requirements...');
      
      // Generate framework using OpenAI (Batch 1)
      console.log("🤖 Generating workout framework...");
      updateProgress(req.body.userId, operationId, 2, 6, 'generating', 'Creating workout framework...');
      
      const { generateWorkoutFramework, generateWeeklyWorkouts } = await import("./openai.js");
      const framework = await generateWorkoutFramework(planRequest);
      console.log("✅ Framework generated:", {
        title: framework.title,
        weeks: framework.weeklyStructure.length,
        workoutsPerWeek: framework.weeklyStructure[0]?.workoutDays.length || 0
      });

      updateProgress(req.body.userId, operationId, 3, 6, 'generating', 'Generating detailed workouts...');

      // Generate weekly workouts using framework (Batch 2)
      const allWorkouts: any[] = [];
      const weeklyResults: any[] = [];
      
      for (let week = 1; week <= framework.duration; week++) {
        console.log(`🏋️ Generating Week ${week} workouts...`);
        updateProgress(req.body.userId, operationId, 3 + (week - 1) / framework.duration, 6, 'generating', `Generating Week ${week} workouts...`);
        
        const weekWorkouts = await generateWeeklyWorkouts(framework, week, weeklyResults);
        allWorkouts.push(...weekWorkouts);
        weeklyResults.push({ week, workouts: weekWorkouts });
        
        console.log(`✅ Week ${week} generated: ${weekWorkouts.length} workouts`);
      }

      const generatedPlan = {
        title: framework.title,
        description: framework.description,
        duration: framework.duration,
        totalWorkouts: framework.totalWorkouts,
        difficulty: framework.difficulty,
        equipment: framework.equipment,
        workouts: allWorkouts
      };

      console.log("✅ Complete plan generated:", {
        title: generatedPlan.title,
        totalWorkouts: generatedPlan.totalWorkouts,
        exerciseCount: generatedPlan.workouts.reduce((acc, w) => acc + w.exercises.length, 0)
      });
      
      updateProgress(req.body.userId, operationId, 3, 6, 'processing', 'Saving workout plan...');
      
      // Save the plan to storage
      console.log("💾 Saving workout plan to storage...");
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
      console.log("✅ Workout plan saved with ID:", workoutPlan.id);

      updateProgress(req.body.userId, operationId, 4, 6, 'processing', 'Processing exercises and workouts...');
      
      // Process and save individual workouts with normalized exercises
      console.log("🔄 Processing exercises and creating workout records...");
      for (let i = 0; i < generatedPlan.workouts.length; i++) {
        const workout = generatedPlan.workouts[i];
        console.log(`📝 Processing workout ${i + 1}/${generatedPlan.workouts.length}: ${workout.title}`);
        
        // Update progress for each workout processed
        const workoutProgress = 4 + (i / generatedPlan.workouts.length * 1); // Spread step 4-5 across workouts
        updateProgress(req.body.userId, operationId, workoutProgress, 6, 'processing', `Processing workout ${i + 1}/${generatedPlan.workouts.length}...`);
        
        // Process each exercise to normalize and create exercise records
        const processedExercises = [];
        for (let j = 0; j < workout.exercises.length; j++) {
          const aiExercise = workout.exercises[j];
          console.log(`🏋️ Processing exercise ${j + 1}/${workout.exercises.length}: ${aiExercise.name}`);
          
          // Get existing exercises for similarity matching
          const existingExercises = await storage.getExercises();
          console.log(`📊 Checking against ${existingExercises.length} existing exercises for duplicates`);
          
          // Map database fields to expected format
          const mappedExercises = existingExercises.map(ex => ({
            id: ex.id,
            name: ex.name,
            muscleGroups: ex.muscle_groups,
            equipment: ex.equipment
          }));
          
          let exerciseId: number;
          let exerciseName: string;
          
          // Simple name-based matching (avoiding AI calls due to JSON format issues)
          const existingExercise = mappedExercises.find(ex => 
            ex.name.toLowerCase() === aiExercise.name.toLowerCase()
          );
          
          if (existingExercise) {
            console.log(`✅ Found existing exercise: "${existingExercise.name}" (ID: ${existingExercise.id})`);
            exerciseId = existingExercise.id;
            exerciseName = existingExercise.name;
          } else {
            console.log(`➕ Creating new exercise: "${aiExercise.name}"`);
            // Create new exercise record
            const newExercise = await storage.createExercise({
              name: aiExercise.name,
              muscle_groups: aiExercise.muscleGroups,
              equipment: aiExercise.equipment,
              instructions: aiExercise.instructions,
              youtubeId: null,
              difficulty: "intermediate"
            });
            exerciseId = newExercise.id;
            exerciseName = newExercise.name;
            console.log(`✅ New exercise created with ID: ${exerciseId}`);
          }
          
          // Store processed exercise with reference to actual exercise record
          processedExercises.push({
            exerciseId,
            name: exerciseName,
            sets: aiExercise.sets,
            reps: aiExercise.reps,
            weight: aiExercise.weight,
            restTime: aiExercise.restTime,
            instructions: aiExercise.instructions,
            muscleGroups: aiExercise.muscleGroups,
            equipment: aiExercise.equipment
          });
        }
        
        const createdWorkout = await storage.createWorkout({
          planId: workoutPlan.id,
          userId: req.body.userId,
          title: workout.title,
          description: workout.description,
          estimatedDuration: workout.estimatedDuration,
          exercises: processedExercises,
          orderIndex: i
        });
        console.log(`✅ Workout created with ID: ${createdWorkout.id}`);
      }

      updateProgress(req.body.userId, operationId, 6, 6, 'completed', 'Workout plan generation complete!');
      
      // Update progress with final result
      const { completeProgress } = await import("./progress-tracker.js");
      completeProgress(operationId);
      
      console.log("🎉 Workout plan generation completed successfully!");
      
      // Process continues in background, client will get result via progress tracking
    } catch (error) {
      console.error("❌ Error generating workout plan:", error);
      
      // Update progress with error
      const { updateProgress } = await import("./progress-tracker.js");
      updateProgress(req.body.userId, operationId, 0, 6, 'failed', 'Generation failed - please try again');
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
