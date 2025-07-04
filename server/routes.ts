import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { slugify } from "./utils";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { 
  insertUserSchema, 
  insertWorkoutPlanSchema, 
  insertWorkoutSessionSchema, 
  insertExerciseCompletionSchema,
  insertChatMessageSchema,
  insertChatSessionSchema 
} from "@shared/schema";
import { 
  generateWorkoutFramework,
  generateWeeklyWorkouts,
  generateCoachingTip, 
  generateChatResponse, 
  analyzeWorkoutProgress,
  createWeeklySnapshot,
  createPlanCompletionSnapshot,
  type WorkoutPlanRequest 
} from "./openai";
import { searchExerciseVideo } from "./youtube";
import { auditAndFixExerciseVideos, generateDataIntegrityReport } from "./data-integrity";

// Search for videos for exercises that don't have them yet
async function searchVideosForNewExercises(workoutPlanId: number): Promise<void> {
  try {
    console.log(`🎥 Starting video search for workout plan ${workoutPlanId}`);
    
    // Get all exercises from workouts in this plan that don't have videos
    const workouts = await storage.getWorkouts(workoutPlanId);
    const exercisesNeedingVideos: any[] = [];
    
    for (const workout of workouts) {
      // Process main exercises
      if (workout.exercises && Array.isArray(workout.exercises)) {
        for (const exercise of workout.exercises as any[]) {
          const exerciseRecord = await storage.getExercise(exercise.exerciseId);
          console.log(`🔍 Checking exercise ID ${exercise.exerciseId}: ${exerciseRecord?.name}`);
          console.log(`   YouTube ID: "${exerciseRecord?.youtubeId}" (type: ${typeof exerciseRecord?.youtubeId})`);
          console.log(`   Has youtube_id field: ${exerciseRecord && 'youtube_id' in exerciseRecord}`);
          console.log(`   Has youtubeId field: ${exerciseRecord && 'youtubeId' in exerciseRecord}`);
          
          if (exerciseRecord && !exerciseRecord.youtubeId) {
            console.log(`   ➕ Adding to search list (no video)`);
            exercisesNeedingVideos.push({
              id: exerciseRecord.id,
              name: exerciseRecord.name,
              type: exerciseRecord.type
            });
          } else {
            console.log(`   ✅ Skipping (has video or not found)`);
          }
        }
      }
      
      // Process warm-up, cardio, and cool-down activities (now with exerciseId references)
      const sections = ['warmUp', 'cardio', 'coolDown'];
      
      for (const sectionName of sections) {
        const section = (workout as any)[sectionName];
        if (section?.activities && Array.isArray(section.activities)) {
          for (const activity of section.activities) {
            if (activity.exerciseId) {
              // Get exercise record by ID
              const exerciseRecord = await storage.getExercise(activity.exerciseId);
              if (exerciseRecord && !exerciseRecord.youtubeId) {
                exercisesNeedingVideos.push({
                  id: exerciseRecord.id,
                  name: exerciseRecord.name,
                  type: exerciseRecord.type
                });
              }
            }
          }
        }
      }
    }
    
    // Remove duplicates
    const uniqueExercises = exercisesNeedingVideos.filter((exercise, index, self) => 
      index === self.findIndex(e => e.id === exercise.id)
    );
    
    console.log(`📝 Found ${uniqueExercises.length} exercises needing videos`);
    
    if (uniqueExercises.length === 0) {
      console.log("✅ All exercises already have videos");
      return;
    }
    
    // Search for videos with rate limiting and improved error handling
    let successCount = 0;
    for (let i = 0; i < uniqueExercises.length; i++) {
      const exercise = uniqueExercises[i];
      
      try {
        console.log(`🔍 Searching video for: ${exercise.name} (${i + 1}/${uniqueExercises.length})`);
        
        const video = await searchExerciseVideo(exercise.name, exercise.type);
        
        if (video) {
          await storage.updateExercise(exercise.id, {
            youtubeId: video.id
          });
          successCount++;
          console.log(`✅ Found video for ${exercise.name}`);
        } else {
          console.log(`❌ No video found for ${exercise.name}`);
        }
        
        // Rate limiting: wait 1 second between searches (reduced from 2 seconds)
        if (i < uniqueExercises.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
      } catch (error) {
        console.error(`❌ Error searching video for ${exercise.name}:`, error);
        
        // Continue with next exercise instead of stopping on errors
        // The key rotation is handled automatically in the YouTube search function
        console.log(`⚠️ Continuing with next exercise despite error for ${exercise.name}`);
      }
    }
    
    console.log(`🎥 Video search complete: ${successCount}/${uniqueExercises.length} videos found`);
    
  } catch (error) {
    console.error("❌ Error in video search process:", error);
  }
}

// Improved exercise matching utility function
function findBestExerciseMatch(exerciseName: string, exercises: any[]) {
  const normalizedName = exerciseName.toLowerCase().trim();
  const targetSlug = slugify(exerciseName);
  
  // Create exercise name normalization map
  const normalizeExerciseName = (name: string) => {
    return name
      .toLowerCase()
      .replace(/\b(light|dynamic|deep|static|moderate|brisk)\b/g, '') // Remove intensity modifiers
      .replace(/\b(treadmill|on treadmill)\b/g, 'treadmill') // Standardize treadmill references
      .replace(/\b(jogging|running)\b/g, 'jogging') // Treat jogging/running as same
      .replace(/\b(stretch|stretching)\b/g, 'stretch') // Standardize stretch
      .replace(/\b(breathing|breath)\b/g, 'breathing') // Standardize breathing
      .replace(/\b(circles?|circle)\b/g, 'circles') // Standardize circles
      .replace(/\b(air bike|assault bike)\b/g, 'air bike') // Standardize air bike references
      .replace(/\([^)]*\)/g, '') // Remove parenthetical details like "(40s sprint / 20s easy pedaling)"
      .replace(/\b(sprint|intervals?|interval training)\b/g, 'sprint intervals') // Normalize interval training
      .replace(/\s+/g, ' ') // Clean up spaces
      .trim();
  };
  
  const normalizedTarget = normalizeExerciseName(normalizedName);
  
  // Scoring function for exercise matches
  const scoreMatch = (exercise: any) => {
    const exName = exercise.name.toLowerCase();
    const exNormalized = normalizeExerciseName(exName);
    
    // Exact match (highest priority)
    if (exName === normalizedName || exercise.slug === targetSlug) {
      return 100;
    }
    
    // Normalized exact match
    if (exNormalized === normalizedTarget) {
      return 95;
    }
    
    // Key word matching with context validation
    const targetWords = normalizedTarget.split(' ').filter(w => w.length > 2);
    const exerciseWords = exNormalized.split(' ').filter(w => w.length > 2);
    
    if (targetWords.length === 0 || exerciseWords.length === 0) return 0;
    
    // Calculate word overlap
    const commonWords = targetWords.filter(word => exerciseWords.includes(word));
    const wordOverlapRatio = commonWords.length / Math.max(targetWords.length, exerciseWords.length);
    
    // Context validation - ensure movement types match
    const isBreathingExercise = normalizedTarget.includes('breathing') || normalizedTarget.includes('breath');
    const isStretchExercise = normalizedTarget.includes('stretch');
    const isCardioExercise = normalizedTarget.includes('jogging') || normalizedTarget.includes('treadmill') || normalizedTarget.includes('running');
    const isArmExercise = normalizedTarget.includes('arm') || normalizedTarget.includes('circles');
    
    const targetIsBreathing = exNormalized.includes('breathing') || exNormalized.includes('breath');
    const targetIsStretch = exNormalized.includes('stretch');
    const targetIsCardio = exNormalized.includes('jogging') || exNormalized.includes('treadmill') || exNormalized.includes('running');
    const targetIsArm = exNormalized.includes('arm') || exNormalized.includes('circles');
    
    // Penalize mismatched exercise types
    if (isBreathingExercise && !targetIsBreathing) return 0;
    if (isStretchExercise && !targetIsStretch) return 0;
    if (isCardioExercise && !targetIsCardio) return 0;
    if (isArmExercise && !targetIsArm && wordOverlapRatio < 0.5) return 0;
    
    // Enhanced scoring for cardio equipment exercises
    const isCardioEquipmentExercise = normalizedTarget.includes('air bike') || normalizedTarget.includes('treadmill') || normalizedTarget.includes('rowing');
    const exerciseIsCardioEquipment = exNormalized.includes('air bike') || exNormalized.includes('treadmill') || exNormalized.includes('rowing');
    
    // Boost score for cardio equipment matches
    if (isCardioEquipmentExercise && exerciseIsCardioEquipment) {
      if (wordOverlapRatio >= 0.6) return 90; // Higher score for equipment matches
      if (wordOverlapRatio >= 0.4) return 80;
    }
    
    // Score based on word overlap
    if (wordOverlapRatio >= 0.8) return 85;
    if (wordOverlapRatio >= 0.6) return 75;
    if (wordOverlapRatio >= 0.4) return 60;
    if (wordOverlapRatio >= 0.2) return 40;
    
    return 0;
  };
  
  // Find best match
  let bestMatch = null;
  let bestScore = 0;
  
  for (const exercise of exercises) {
    const score = scoreMatch(exercise);
    if (score > bestScore && score >= 70) { // Minimum confidence threshold
      bestScore = score;
      bestMatch = exercise;
    }
  }
  
  return { match: bestMatch, score: bestScore };
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const replitId = req.user.claims.sub;
      const user = await storage.getUserByReplitId(replitId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

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

  // Profile routes for authenticated user
  app.get("/api/profile", isAuthenticated, async (req: any, res) => {
    try {
      const replitId = req.user.claims.sub;
      const user = await storage.getUserByReplitId(replitId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to get profile" });
    }
  });

  app.put("/api/profile", isAuthenticated, async (req: any, res) => {
    try {
      const replitId = req.user.claims.sub;
      const user = await storage.getUserByReplitId(replitId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const updates = insertUserSchema.partial().parse(req.body);
      const updatedUser = await storage.updateUser(user.id, updates);
      res.json(updatedUser);
    } catch (error) {
      res.status(400).json({ error: "Invalid profile data" });
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

  app.put("/api/workout-plan/:id", async (req, res) => {
    try {
      const planId = parseInt(req.params.id);
      const updates = insertWorkoutPlanSchema.partial().parse(req.body);
      const plan = await storage.updateWorkoutPlan(planId, updates);
      if (!plan) {
        return res.status(404).json({ error: "Workout plan not found" });
      }
      res.json(plan);
    } catch (error) {
      res.status(400).json({ error: "Invalid update data" });
    }
  });

  // Workout completion status endpoint
  app.get("/api/workout-completion-status/:planId", async (req, res) => {
    try {
      const planId = parseInt(req.params.planId);
      
      // Get all workouts for the plan
      const workouts = await storage.getWorkouts(planId);
      
      // Get completion status for each workout
      const completionStatuses = await Promise.all(
        workouts.map(async (workout) => {
          // Check if this workout has any completed sessions
          const completedSessions = await storage.getCompletedWorkoutSessions(workout.id);
          const isCompleted = completedSessions.length > 0;
          const lastCompletedAt = isCompleted ? 
            Math.max(...completedSessions.map(s => s.completedAt?.getTime() || 0)) : null;
          
          return {
            workoutId: workout.id,
            title: workout.title,
            orderIndex: workout.orderIndex,
            isCompleted,
            completedAt: lastCompletedAt ? new Date(lastCompletedAt) : null,
            completionCount: completedSessions.length
          };
        })
      );
      
      // Sort by order index
      completionStatuses.sort((a, b) => a.orderIndex - b.orderIndex);
      
      res.json(completionStatuses);
    } catch (error) {
      console.error(`Error fetching workout completion status for plan ${req.params.planId}:`, error);
      res.status(400).json({ error: "Invalid plan ID" });
    }
  });

  // Workouts routes
  app.get("/api/workouts/:planId", async (req, res) => {
    try {
      const planId = parseInt(req.params.planId);
      console.log(`🔍 DEBUG: Fetching workouts for plan ID: ${planId}`);
      
      const workouts = await storage.getWorkouts(planId);
      console.log(`🔍 DEBUG: Retrieved ${workouts.length} workouts from storage`);
      console.log(`🔍 DEBUG: Workout IDs: ${workouts.map(w => w.id).join(', ')}`);
      
      // Add cache-busting headers to prevent stale data
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'ETag': `"workouts-${planId}-${Date.now()}"`
      });
      
      res.json(workouts);
    } catch (error) {
      console.error(`🔍 DEBUG: Error fetching workouts for plan ${req.params.planId}:`, error);
      res.status(400).json({ error: "Invalid plan ID" });
    }
  });

  app.get("/api/workout/:id", async (req, res) => {
    try {
      const workoutId = parseInt(req.params.id);
      let workout = await storage.getWorkout(workoutId);
      if (!workout) {
        return res.status(404).json({ error: "Workout not found" });
      }

      // Migrate warmup/cooldown data on-the-fly if needed
      let needsUpdate = false;
      let updatedWarmUp = workout.warmUp;
      let updatedCoolDown = workout.coolDown;

      // Process warmup activities
      if (workout.warmUp && typeof workout.warmUp === 'object' && workout.warmUp.activities) {
        const processedWarmUpActivities = [];
        for (const activity of workout.warmUp.activities) {
          if (!activity.exerciseId || typeof activity.exerciseId === 'string') {
            // Find or create exercise for this activity using improved matching
            const exercises = await storage.getExercises();
            const { match: matchedExercise, score } = findBestExerciseMatch(activity.exercise, exercises);
            
            let finalExercise = matchedExercise;

            if (!finalExercise || score < 70) {
              // Create new exercise if no good match found
              finalExercise = await storage.createExercise({
                slug: slugify(activity.exercise),
                name: activity.exercise,
                difficulty: "beginner",
                muscle_groups: ["general"],
                instructions: [`Perform ${activity.exercise.toLowerCase()} as instructed`],
                equipment: ["none"],
                youtubeId: null,
                type: "warmup"
              });
              console.log(`➕ Created new warmup exercise: "${activity.exercise}" (ID: ${finalExercise.id})`);
            } else {
              console.log(`✅ Matched warmup exercise: "${activity.exercise}" → "${finalExercise.name}" (ID: ${finalExercise.id}) [confidence: ${score}%]`);
            }

            processedWarmUpActivities.push({
              ...activity,
              exerciseId: finalExercise.id,
              exercise: finalExercise.name
            });
            needsUpdate = true;
          } else {
            processedWarmUpActivities.push(activity);
          }
        }
        updatedWarmUp = { ...workout.warmUp, activities: processedWarmUpActivities };
      }

      // Process cooldown activities
      if (workout.coolDown && typeof workout.coolDown === 'object' && workout.coolDown.activities) {
        const processedCoolDownActivities = [];
        for (const activity of workout.coolDown.activities) {
          if (!activity.exerciseId || typeof activity.exerciseId === 'string') {
            // Find or create exercise for this activity using improved matching
            const exercises = await storage.getExercises();
            const { match: matchedExercise, score } = findBestExerciseMatch(activity.exercise, exercises);
            
            let finalExercise = matchedExercise;

            if (!finalExercise || score < 70) {
              // Create new exercise if no good match found
              finalExercise = await storage.createExercise({
                slug: slugify(activity.exercise),
                name: activity.exercise,
                difficulty: "beginner",
                muscle_groups: ["general"],
                instructions: [`Perform ${activity.exercise.toLowerCase()} as instructed`],
                equipment: ["none"],
                youtubeId: null,
                type: "cooldown"
              });
              console.log(`➕ Created new cooldown exercise: "${activity.exercise}" (ID: ${finalExercise.id})`);
            } else {
              console.log(`✅ Matched cooldown exercise: "${activity.exercise}" → "${finalExercise.name}" (ID: ${finalExercise.id}) [confidence: ${score}%]`);
            }

            processedCoolDownActivities.push({
              ...activity,
              exerciseId: finalExercise.id,
              exercise: finalExercise.name
            });
            needsUpdate = true;
          } else {
            processedCoolDownActivities.push(activity);
          }
        }
        updatedCoolDown = { ...workout.coolDown, activities: processedCoolDownActivities };
      }

      // Update workout if migration was needed
      if (needsUpdate) {
        await storage.updateWorkout(workoutId, {
          warmUp: updatedWarmUp,
          coolDown: updatedCoolDown
        });

        // Return updated workout data
        workout = {
          ...workout,
          warmUp: updatedWarmUp,
          coolDown: updatedCoolDown
        };
      }

      res.json(workout);
    } catch (error) {
      console.error("Error fetching workout:", error);
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

  // Exercise Completion routes
  app.post("/api/workout-session/:sessionId/complete-exercise", async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      const completionData = insertExerciseCompletionSchema.parse({
        ...req.body,
        sessionId
      });
      
      // Create the exercise completion record
      const completion = await storage.createExerciseCompletion(completionData);
      
      // Update session's last active timestamp and exercise counts
      await storage.updateWorkoutSession(sessionId, {
        lastActiveAt: new Date(),
        exercisesCompleted: completion.skipped ? undefined : 
          (await storage.getExerciseCompletions(sessionId)).filter(c => !c.skipped).length,
        exercisesSkipped: completion.skipped ? 
          (await storage.getExerciseCompletions(sessionId)).filter(c => c.skipped).length : undefined
      });
      
      res.json(completion);
    } catch (error) {
      console.error("Error completing exercise:", error);
      res.status(400).json({ error: "Invalid exercise completion data" });
    }
  });

  app.get("/api/workout-session/:sessionId/completions", async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      const completions = await storage.getExerciseCompletions(sessionId);
      res.json(completions);
    } catch (error) {
      res.status(400).json({ error: "Invalid session ID" });
    }
  });

  // New endpoint to check workout completion status
  app.get("/api/workout/:workoutId/completion-status/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const workoutId = parseInt(req.params.workoutId);
      
      // Check if this workout has been completed by this user
      const completedSessions = await storage.getCompletedWorkoutSessions(workoutId);
      const userCompletedSession = completedSessions.find(session => session.userId === userId);
      
      if (userCompletedSession) {
        res.json({
          isCompleted: true,
          completedAt: userCompletedSession.completedAt,
          sessionId: userCompletedSession.id
        });
      } else {
        res.json({
          isCompleted: false,
          completedAt: null,
          sessionId: null
        });
      }
    } catch (error) {
      console.error("Error checking workout completion status:", error);
      res.status(400).json({ error: "Invalid parameters" });
    }
  });

  app.get("/api/workout-session/resumable/:userId/:workoutId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const workoutId = parseInt(req.params.workoutId);
      
      // First check if workout is already completed
      const completedSessions = await storage.getCompletedWorkoutSessions(workoutId);
      const userCompletedSession = completedSessions.find(session => session.userId === userId);
      
      if (userCompletedSession) {
        return res.json({
          status: 'completed',
          sessionId: userCompletedSession.id,
          completedAt: userCompletedSession.completedAt
        });
      }
      
      // If not completed, check for resumable session
      const session = await storage.findResumableWorkoutSession(userId, workoutId);
      if (session) {
        res.json({
          status: 'resumable',
          sessionId: session.id,
          ...session
        });
      } else {
        res.json({
          status: 'new',
          sessionId: null
        });
      }
    } catch (error) {
      console.error("Error finding resumable session:", error);
      res.status(400).json({ error: "Invalid parameters" });
    }
  });

  app.get("/api/workout-session/:sessionId/resume", async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      const session = await storage.getWorkoutSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      
      const completions = await storage.getExerciseCompletions(sessionId);
      res.json({ session, completions });
    } catch (error) {
      res.status(400).json({ error: "Invalid session ID" });
    }
  });

  // Read-only completed workout view
  app.get("/api/workout-session/:sessionId/completed", async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      const session = await storage.getWorkoutSession(sessionId);
      
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      
      if (!session.completedAt) {
        return res.status(400).json({ error: "Session is not completed" });
      }
      
      const completions = await storage.getExerciseCompletions(sessionId);
      const workout = await storage.getWorkout(session.workoutId);
      
      res.json({ 
        session, 
        completions, 
        workout,
        readOnly: true 
      });
    } catch (error) {
      console.error("Error fetching completed workout:", error);
      res.status(400).json({ error: "Invalid session ID" });
    }
  });

  app.get("/api/exercise-history/:userId/:exerciseId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const exerciseId = parseInt(req.params.exerciseId);
      const limit = parseInt(req.query.limit as string) || 10;
      
      const completions = await storage.getExerciseCompletionsByExercise(userId, exerciseId, limit);
      res.json(completions);
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

  // Dynamic video fetching - get or fetch YouTube video for an exercise
  app.get("/api/exercise/:exerciseId/video", async (req, res) => {
    try {
      const exerciseId = parseInt(req.params.exerciseId);
      const exercise = await storage.getExercise(exerciseId);
      
      if (!exercise) {
        return res.status(404).json({ error: "Exercise not found" });
      }

      // If exercise already has a video, return it
      if (exercise.youtubeId) {
        return res.json({
          youtubeId: exercise.youtubeId,
          cached: true
        });
      }

      // Otherwise, try to fetch a video dynamically
      const video = await searchExerciseVideo(exercise.name, exercise.type);
      
      if (video) {
        // Save the video to the database for future use
        await storage.updateExercise(exerciseId, {
          youtubeId: video.id
        });

        res.json({
          youtubeId: video.id,
          cached: false
        });
      } else {
        res.json({
          youtubeId: null,
          thumbnailUrl: null,
          cached: false
        });
      }
    } catch (error) {
      console.error("Error fetching exercise video:", error);
      res.status(500).json({ error: "Internal server error" });
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

  // Chat routes - removed duplicate, using the sessionId-aware version below

  app.post("/api/chat", async (req, res) => {
    try {
      console.log('Chat API received body:', req.body);
      console.log('Body keys:', Object.keys(req.body));
      console.log('userId type:', typeof req.body.userId, 'value:', req.body.userId);
      
      const messageData = insertChatMessageSchema.parse(req.body);
      console.log('Parsed messageData:', messageData);
      
      // Save user message
      const userMessage = await storage.createChatMessage(messageData);
      
      // Check if this is the first message in the session and generate title
      const existingMessages = await storage.getChatMessages(messageData.userId, messageData.sessionId);
      const isFirstMessage = existingMessages.length === 1; // Only the message we just saved
      
      if (isFirstMessage && messageData.sessionId) {
        // Generate AI title asynchronously (don't block response)
        const { generateChatTitle } = await import('./openai');
        generateChatTitle(messageData.content)
          .then(async (generatedTitle) => {
            try {
              await storage.updateChatSession(messageData.sessionId!, messageData.userId, {
                title: generatedTitle,
                titleGenerated: true,
                originalAiTitle: generatedTitle
              });
              console.log(`📝 Generated title for session ${messageData.sessionId}: "${generatedTitle}"`);
            } catch (error) {
              console.error('Failed to update session title:', error);
            }
          })
          .catch(error => console.error('Failed to generate chat title:', error));
      }
      
      // Get user context for AI response - ONLY from current session to maintain isolation
      const user = await storage.getUser(messageData.userId);
      const recentSessions = await storage.getRecentWorkoutSessions(messageData.userId, 5);
      const chatHistory = await storage.getChatMessages(messageData.userId, messageData.sessionId);
      
      const userContext = {
        fitnessLevel: user?.fitnessLevel,
        goals: user?.goals,
        equipment: user?.equipment,
        recentWorkouts: recentSessions.length
      };

      // Log session isolation details for verification
      console.log(`🔍 AI Context for Session ${messageData.sessionId}:`);
      console.log(`   - Chat history messages: ${chatHistory.length}`);
      console.log(`   - Previous messages in this session: ${chatHistory.filter(m => m.role === 'user').length} user, ${chatHistory.filter(m => m.role === 'assistant').length} assistant`);
      if (chatHistory.length > 0) {
        console.log(`   - Last message: "${chatHistory[chatHistory.length - 1]?.content?.substring(0, 50)}..."`);
      }

      // Generate AI response
      const aiResponse = await generateChatResponse(
        messageData.content,
        userContext,
        chatHistory
      );

      // Save AI response to the same session for proper isolation
      const aiMessage = await storage.createChatMessage({
        userId: messageData.userId,
        sessionId: messageData.sessionId,
        role: "assistant",
        content: aiResponse
      });

      res.json({ userMessage, aiMessage });
    } catch (error) {
      console.error("Chat API error:", error);
      res.status(400).json({ error: "Failed to process chat message" });
    }
  });

  // Progress tracking endpoint
  app.get("/api/generation-progress/:operationId", async (req, res) => {
    const { getProgress } = await import("./progress-tracker.js");
    const progress = getProgress(req.params.operationId);
    if (!progress) {
      return res.status(404).json({ error: 'Operation not found' });
    }
    res.json(progress);
  });

  // Coaching tip endpoint
  app.get("/api/coaching-tip/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const user = await storage.getUser(userId);
      const recentSessions = await storage.getRecentWorkoutSessions(userId, 3);
      const workoutPlans = await storage.getWorkoutPlans(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const userContext = {
        fitnessLevel: user.fitnessLevel,
        goals: user.goals,
        equipment: user.equipment,
        recentWorkouts: recentSessions.length,
        hasActivePlan: workoutPlans.some(plan => plan.isActive),
        totalPlans: workoutPlans.length
      };

      const { generateDailyCoachingTip } = await import("./openai.js");
      const tip = await generateDailyCoachingTip(userId, userContext, recentSessions);
      
      res.json({ tip });
    } catch (error) {
      console.error('Error generating coaching tip:', error);
      res.json({ tip: 'Welcome to your AI fitness coach! Ready to start your fitness journey?' });
    }
  });

  // AI-powered routes
  app.post("/api/generate-plan", async (req, res) => {
    const operationId = `plan_${req.body.userId}_${Date.now()}`;
    
    try {
      const { updateProgress } = await import("./progress-tracker.js");
      
      console.log(`🎯 Generating ${req.body.duration}-week plan for user ${req.body.userId}`);

      // Return operation ID immediately for progress tracking
      res.json({ operationId, status: 'started' });

      // Get user profile data to combine with form inputs
      const user = await storage.getUser(req.body.userId);
      if (!user || !user.fitnessLevel || !user.equipment || !user.goals) {
        updateProgress(req.body.userId, operationId, 0, 'failed', 'User profile incomplete - please complete onboarding');
        return;
      }

      // Normalize equipment array to remove quotes and standardize format
      const normalizedEquipment = user.equipment.map(item => 
        item.replace(/^"|"$/g, '').toLowerCase().trim()
      );

      // Combine user profile data with form inputs
      const planRequest: WorkoutPlanRequest = {
        ...req.body,
        fitnessLevel: user.fitnessLevel,
        equipment: normalizedEquipment,
        goals: user.goals,
      };
      
      updateProgress(req.body.userId, operationId, 1, 'generating', 'Analyzing requirements...');
      
      // Generate framework using OpenAI (Batch 1)
      console.log("🤖 Generating workout framework...");
      updateProgress(req.body.userId, operationId, 2, 'generating', 'Creating workout framework...');
      
      const { generateWorkoutFramework, generateWeeklyWorkouts } = await import("./openai.js");
      const framework = await generateWorkoutFramework(planRequest);
      console.log("✅ Framework generated:", {
        title: framework.title,
        weeks: framework.weeklyStructure.length,
        workoutsPerWeek: framework.weeklyStructure[0]?.workoutDays.length || 0
      });

      updateProgress(req.body.userId, operationId, 3, 'generating', 'Generating detailed workouts...');

      // Generate weekly workouts using framework (Batch 2)
      const allWorkouts: any[] = [];
      const weeklyResults: any[] = [];
      
      for (let week = 1; week <= framework.duration; week++) {
        console.log(`🏋️ Generating Week ${week} workouts...`);
        updateProgress(req.body.userId, operationId, 3 + (week - 1) / framework.duration, 'generating', `Generating Week ${week} workouts...`);
        
        const weekWorkouts = await generateWeeklyWorkouts(framework, week, weeklyResults, planRequest.timePerWorkout);
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
        exerciseCount: generatedPlan.workouts.reduce((acc, w) => acc + (w.exercises?.length || 0), 0)
      });
      
      updateProgress(req.body.userId, operationId, 3, 'processing', 'Saving workout plan...');
      
      // Save the plan to storage
      console.log("💾 Saving workout plan to storage...");
      
      // First, deactivate any existing active plans for this user
      console.log("🔄 Deactivating existing active plans...");
      const existingPlans = await storage.getWorkoutPlans(req.body.userId);
      const activePlans = existingPlans.filter(p => p.isActive);
      
      for (const activePlan of activePlans) {
        await storage.updateWorkoutPlan(activePlan.id, { isActive: false });
        console.log(`⏸️ Deactivated plan: "${activePlan.title}" (ID: ${activePlan.id})`);
      }
      
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

      updateProgress(req.body.userId, operationId, 4, 'processing', 'Processing exercises and workouts...');
      
      // Process and save individual workouts with normalized exercises
      console.log("🔄 Processing exercises and creating workout records...");
      for (let i = 0; i < generatedPlan.workouts.length; i++) {
        const workout = generatedPlan.workouts[i];
        console.log(`📝 Processing workout ${i + 1}/${generatedPlan.workouts.length}: ${workout.title}`);
        
        // Update progress for each workout processed
        const workoutProgress = 4 + (i / generatedPlan.workouts.length * 1); // Spread step 4-5 across workouts
        updateProgress(req.body.userId, operationId, workoutProgress, 'processing', `Processing workout ${i + 1}/${generatedPlan.workouts.length}...`);
        
        // Validate workout structure and extract exercises
        let exercises = [];
        if (workout.exercises && Array.isArray(workout.exercises)) {
          exercises = workout.exercises;
        } else if (workout.mainTraining && workout.mainTraining.exercises && Array.isArray(workout.mainTraining.exercises)) {
          exercises = workout.mainTraining.exercises;
        } else {
          console.log(`⚠️ Workout ${i + 1} has no valid exercises array, skipping exercise processing`);
          exercises = [];
        }

        // Helper function to process and create exercise records with intelligent matching
        const processExercise = async (exerciseName: string, exerciseType: "main" | "warmup" | "cardio" | "cooldown" = "main") => {
          console.log(`🏋️ Processing exercise: ${exerciseName} (type: ${exerciseType})`);
          
          // Get existing exercises for similarity matching
          const existingExercises = await storage.getExercises();
          
          // Smart exercise matching function
          const findBestMatch = (name: string, exercises: any[]) => {
            const normalizedName = name.toLowerCase().trim();
            const targetSlug = slugify(name);
            
            // Create exercise name normalization map
            const normalizeExerciseName = (exerciseName: string) => {
              return exerciseName
                .toLowerCase()
                .replace(/\b(light|dynamic|deep|static|moderate|brisk)\b/g, '') // Remove intensity modifiers
                .replace(/\b(treadmill|on treadmill)\b/g, 'treadmill') // Standardize treadmill references
                .replace(/\b(jogging|running)\b/g, 'jogging') // Treat jogging/running as same
                .replace(/\b(stretch|stretching)\b/g, 'stretch') // Standardize stretch
                .replace(/\b(breathing|breath)\b/g, 'breathing') // Standardize breathing
                .replace(/\b(circles?|circle)\b/g, 'circles') // Standardize circles
                .replace(/\s+/g, ' ') // Clean up spaces
                .trim();
            };
            
            const normalizedTarget = normalizeExerciseName(normalizedName);
            
            // Scoring function for exercise matches
            const scoreMatch = (exercise: any) => {
              const exName = exercise.name.toLowerCase();
              const exNormalized = normalizeExerciseName(exName);
              
              // Exact match (highest priority)
              if (exName === normalizedName || exercise.slug === targetSlug) {
                return 100;
              }
              
              // Normalized exact match
              if (exNormalized === normalizedTarget) {
                return 95;
              }
              
              // Key word matching with context validation
              const targetWords = normalizedTarget.split(' ').filter(w => w.length > 2);
              const exerciseWords = exNormalized.split(' ').filter(w => w.length > 2);
              
              if (targetWords.length === 0 || exerciseWords.length === 0) return 0;
              
              // Calculate word overlap
              const commonWords = targetWords.filter(word => exerciseWords.includes(word));
              const wordOverlapRatio = commonWords.length / Math.max(targetWords.length, exerciseWords.length);
              
              // Context validation - ensure movement types match
              const isBreathingExercise = normalizedTarget.includes('breathing') || normalizedTarget.includes('breath');
              const isStretchExercise = normalizedTarget.includes('stretch');
              const isCardioExercise = normalizedTarget.includes('jogging') || normalizedTarget.includes('treadmill') || normalizedTarget.includes('running');
              const isArmExercise = normalizedTarget.includes('arm') || normalizedTarget.includes('circles');
              
              const targetIsBreathing = exNormalized.includes('breathing') || exNormalized.includes('breath');
              const targetIsStretch = exNormalized.includes('stretch');
              const targetIsCardio = exNormalized.includes('jogging') || exNormalized.includes('treadmill') || exNormalized.includes('running');
              const targetIsArm = exNormalized.includes('arm') || exNormalized.includes('circles');
              
              // Penalize mismatched exercise types
              if (isBreathingExercise && !targetIsBreathing) return 0;
              if (isStretchExercise && !targetIsStretch) return 0;
              if (isCardioExercise && !targetIsCardio) return 0;
              if (isArmExercise && !targetIsArm && wordOverlapRatio < 0.5) return 0;
              
              // Score based on word overlap
              if (wordOverlapRatio >= 0.8) return 85;
              if (wordOverlapRatio >= 0.6) return 75;
              if (wordOverlapRatio >= 0.4) return 60;
              if (wordOverlapRatio >= 0.2) return 40;
              
              return 0;
            };
            
            // Find best match
            let bestMatch = null;
            let bestScore = 0;
            
            for (const exercise of exercises) {
              const score = scoreMatch(exercise);
              if (score > bestScore && score >= 70) { // Minimum confidence threshold
                bestScore = score;
                bestMatch = exercise;
              }
            }
            
            return { match: bestMatch, score: bestScore };
          };
          
          const { match: existingExercise, score } = findBestMatch(exerciseName, existingExercises);
          
          let exerciseId: number;
          let finalExerciseName: string;
          
          if (existingExercise && score >= 70) {
            console.log(`✅ Found existing exercise: "${existingExercise.name}" (ID: ${existingExercise.id}) [confidence: ${score}%]`);
            exerciseId = existingExercise.id;
            finalExerciseName = existingExercise.name;
          } else {
            if (existingExercise) {
              console.log(`⚠️ Low confidence match "${existingExercise.name}" (${score}%) - creating new exercise instead`);
            }
            console.log(`➕ Creating new exercise: "${exerciseName}"`);
            // Create new exercise record
            const newExercise = await storage.createExercise({
              slug: slugify(exerciseName),
              name: exerciseName,
              difficulty: "beginner", // Default for warmup/cooldown exercises
              muscle_groups: ["general"],
              instructions: [`Perform ${exerciseName.toLowerCase()} as instructed`],
              equipment: ["none"],
              youtubeId: null,
              type: exerciseType
            });
            exerciseId = newExercise.id;
            finalExerciseName = newExercise.name;
            console.log(`✅ New exercise created with ID: ${exerciseId}`);
          }
          
          return { exerciseId, name: finalExerciseName };
        };

        // Process warmup activities to create exercise records
        let processedWarmUp = workout.warmUp;
        if (workout.warmUp && workout.warmUp.activities) {
          console.log(`🔥 Processing ${workout.warmUp.activities.length} warmup activities...`);
          const processedActivities = [];
          for (const activity of workout.warmUp.activities) {
            const { exerciseId, name } = await processExercise(activity.exercise, "warmup");
            processedActivities.push({
              ...activity,
              exerciseId,
              exercise: name // Use the final exercise name
            });
          }
          processedWarmUp = {
            ...workout.warmUp,
            activities: processedActivities
          };
        }

        // Process cooldown activities to create exercise records
        let processedCoolDown = workout.coolDown;
        if (workout.coolDown && workout.coolDown.activities) {
          console.log(`❄️ Processing ${workout.coolDown.activities.length} cooldown activities...`);
          const processedActivities = [];
          for (const activity of workout.coolDown.activities) {
            const { exerciseId, name } = await processExercise(activity.exercise, "cooldown");
            processedActivities.push({
              ...activity,
              exerciseId,
              exercise: name // Use the final exercise name
            });
          }
          processedCoolDown = {
            ...workout.coolDown,
            activities: processedActivities
          };
        }

        // Process cardio activities to create exercise records
        let processedCardio = workout.cardio;
        if (workout.cardio && workout.cardio.activities) {
          console.log(`🏃 Processing ${workout.cardio.activities.length} cardio activities...`);
          const processedActivities = [];
          for (const activity of workout.cardio.activities) {
            const { exerciseId, name } = await processExercise(activity.exercise, "cardio");
            processedActivities.push({
              ...activity,
              exerciseId,
              exercise: name // Use the final exercise name
            });
          }
          processedCardio = {
            ...workout.cardio,
            activities: processedActivities
          };
        }

        // Process main exercises
        const processedExercises = [];
        for (let j = 0; j < exercises.length; j++) {
          const aiExercise = exercises[j];
          console.log(`🏋️ Processing main exercise ${j + 1}/${exercises.length}: ${aiExercise.name}`);
          
          // Get existing exercises for similarity matching
          const existingExercises = await storage.getExercises();
          console.log(`📊 Checking against ${existingExercises.length} existing exercises for duplicates`);
          
          let exerciseId: number;
          let exerciseName: string;
          
          // Check for existing exercise by both name and slug to avoid constraint violations
          const targetSlug = slugify(aiExercise.name);
          const existingExercise = existingExercises.find(ex => 
            ex.name.toLowerCase() === aiExercise.name.toLowerCase() ||
            ex.slug === targetSlug
          );
          
          if (existingExercise) {
            console.log(`✅ Found existing exercise: "${existingExercise.name}" (ID: ${existingExercise.id})`);
            exerciseId = existingExercise.id;
            exerciseName = existingExercise.name;
          } else {
            console.log(`➕ Creating new exercise: "${aiExercise.name}"`);
            // Create new exercise record
            const newExercise = await storage.createExercise({
              slug: slugify(aiExercise.name),
              name: aiExercise.name,
              difficulty: "intermediate",
              muscle_groups: aiExercise.muscleGroups,
              instructions: aiExercise.instructions,
              equipment: aiExercise.equipment,
              tempo: aiExercise.tempo,
              modifications: aiExercise.modifications || [],
              progressions: aiExercise.progressions || [],
              youtubeId: null,
              type: "main"
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
          title: workout.title || workout.goal || `Workout ${i + 1}`,
          description: workout.description || workout.goal || `Training session ${i + 1}`,
          estimatedDuration: workout.estimatedDuration || req.body.timePerWorkout,
          exercises: processedExercises,
          warmUp: processedWarmUp, // Use processed warmup with exercise IDs
          cardio: processedCardio, // Use processed cardio with exercise IDs
          coolDown: processedCoolDown, // Use processed cooldown with exercise IDs
          orderIndex: i
        });
        console.log(`✅ Workout created with ID: ${createdWorkout.id}`);
      }

      updateProgress(req.body.userId, operationId, 6, 'completed', 'Workout plan generation complete!');
      
      // Update progress with final result
      const { completeProgress } = await import("./progress-tracker.js");
      completeProgress(operationId);
      
      console.log("🎉 Workout plan generation completed successfully!");
      
      // Trigger automatic video search in background after plan completion
      console.log("🎥 Triggering automatic video search for new exercises...");
      setImmediate(async () => {
        try {
          await searchVideosForNewExercises(workoutPlan.id);
          console.log("✅ Background video search completed");
        } catch (error) {
          console.error("❌ Background video search failed:", error);
        }
      });
      
      // Process continues in background, client will get result via progress tracking
    } catch (error) {
      console.error("❌ Error generating workout plan:", error);
      
      // Update progress with error
      const { updateProgress } = await import("./progress-tracker.js");
      updateProgress(req.body.userId, operationId, 0, 'failed', 'Generation failed - please try again');
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

      const analysis = await analyzeWorkoutProgress(workoutSessions, typeof user.goals === 'string' ? user.goals : user.goals?.[0] || 'general_fitness');
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

  // Progress Snapshots API routes
  app.post("/api/progress-snapshots/weekly", isAuthenticated, async (req, res) => {
    try {
      const { planId, planWeekId, weekNumber } = req.body;
      const userId = req.user?.claims?.sub;
      
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const workoutSessions = await storage.getWorkoutSessions(parseInt(userId));
      const user = await storage.getUser(parseInt(userId));
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const snapshotData = await createWeeklySnapshot(
        parseInt(userId),
        planId,
        planWeekId,
        weekNumber,
        workoutSessions,
        user.goals
      );

      const snapshot = await storage.createProgressSnapshot({
        userId: parseInt(userId),
        planId,
        planWeekId,
        dateRange: `Week ${weekNumber}`,
        adherencePercent: snapshotData.adherencePercent,
        subjectiveFatigue: snapshotData.subjectiveFatigue,
        strengthPRs: snapshotData.strengthPRs,
        volumePerMuscle: snapshotData.volumePerMuscle,
        flags: snapshotData.flags,
        coachNotes: snapshotData.coachNotes,
        jsonSnapshot: snapshotData.jsonSnapshot
      });

      res.json(snapshot);
    } catch (error) {
      console.error("Error creating weekly snapshot:", error);
      res.status(500).json({ error: "Failed to create weekly snapshot" });
    }
  });

  app.post("/api/progress-snapshots/plan-completion", isAuthenticated, async (req, res) => {
    try {
      const { planId } = req.body;
      const userId = req.user?.claims?.sub;
      
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const weeklySnapshots = await storage.getWeeklySnapshots(planId, parseInt(userId));
      const user = await storage.getUser(parseInt(userId));
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const snapshotData = await createPlanCompletionSnapshot(
        parseInt(userId),
        planId,
        weeklySnapshots,
        user.goals
      );

      const snapshot = await storage.createProgressSnapshot({
        userId: parseInt(userId),
        planId,
        planWeekId: null,
        dateRange: `Plan Completion`,
        adherencePercent: snapshotData.adherencePercent,
        subjectiveFatigue: snapshotData.subjectiveFatigue,
        strengthPRs: snapshotData.strengthPRs,
        volumePerMuscle: snapshotData.volumePerMuscle,
        flags: snapshotData.flags,
        coachNotes: snapshotData.coachNotes,
        jsonSnapshot: snapshotData.jsonSnapshot
      });

      res.json(snapshot);
    } catch (error) {
      console.error("Error creating plan completion snapshot:", error);
      res.status(500).json({ error: "Failed to create plan completion snapshot" });
    }
  });

  app.get("/api/progress-snapshots/plan-completions/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const snapshots = await storage.getPlanCompletionSnapshots(userId);
      res.json(snapshots);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch plan completion snapshots" });
    }
  });

  // Chat Session Routes
  app.get("/api/chat-sessions/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }
      const sessions = await storage.getChatSessions(userId);
      res.json(sessions);
    } catch (error) {
      console.error('Chat sessions retrieval error:', error);
      res.status(400).json({ error: "Failed to fetch chat sessions" });
    }
  });

  app.post("/api/chat-sessions", async (req, res) => {
    try {
      const sessionData = insertChatSessionSchema.parse(req.body);
      const session = await storage.createChatSession(sessionData);
      res.json(session);
    } catch (error) {
      console.error('Chat session creation error:', error);
      res.status(400).json({ error: "Failed to create chat session" });
    }
  });

  app.put("/api/chat-sessions/:id/:userId", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = parseInt(req.params.userId);
      const updates = req.body;
      
      const session = await storage.updateChatSession(id, userId, updates);
      if (!session) {
        return res.status(404).json({ error: "Chat session not found" });
      }
      res.json(session);
    } catch (error) {
      console.error('Chat session update error:', error);
      res.status(400).json({ error: "Failed to update chat session" });
    }
  });

  app.delete("/api/chat-sessions/:id/:userId", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = parseInt(req.params.userId);
      
      const deleted = await storage.deleteChatSession(id, userId);
      if (!deleted) {
        return res.status(404).json({ error: "Chat session not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error('Chat session deletion error:', error);
      res.status(400).json({ error: "Failed to delete chat session" });
    }
  });

  app.put("/api/chat-sessions/:id/:userId/title", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = parseInt(req.params.userId);
      const { title } = req.body;
      
      if (!title || typeof title !== 'string') {
        return res.status(400).json({ error: "Title is required" });
      }
      
      if (title.length > 20) {
        return res.status(400).json({ error: "Title must be 20 characters or less" });
      }
      
      const session = await storage.updateChatSession(id, userId, {
        title: title.trim(),
        titleEditedManually: true
      });
      
      if (!session) {
        return res.status(404).json({ error: "Chat session not found" });
      }
      
      console.log(`✏️ User edited title for session ${id}: "${title}"`);
      res.json(session);
    } catch (error) {
      console.error('Chat session title update error:', error);
      res.status(400).json({ error: "Failed to update chat session title" });
    }
  });

  // Update existing chat routes to support sessionId
  app.get("/api/chat", async (req, res) => {
    try {
      const userId = parseInt(req.query.userId as string);
      const sessionId = req.query.sessionId ? parseInt(req.query.sessionId as string) : undefined;
      
      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }
      
      console.log('Getting chat messages for userId:', userId, 'sessionId:', sessionId);
      const messages = await storage.getChatMessages(userId, sessionId);
      console.log('Retrieved messages:', messages?.length || 0);
      res.json(messages);
    } catch (error) {
      console.error('Chat retrieval error:', error);
      res.status(400).json({ error: "Failed to fetch chat messages" });
    }
  });

  // Data Integrity Routes
  app.post("/api/admin/audit-exercise-videos", async (req, res) => {
    try {
      console.log('🔍 Starting comprehensive exercise video audit...');
      const { runComprehensiveVideoAudit } = await import('./video-audit');
      const auditResults = await runComprehensiveVideoAudit();
      res.json({
        success: true,
        results: auditResults
      });
    } catch (error) {
      console.error("Error during exercise video audit:", error);
      res.status(500).json({ error: "Failed to complete video audit" });
    }
  });

  app.get("/api/admin/data-integrity-report", async (req, res) => {
    try {
      const report = await generateDataIntegrityReport();
      res.json(report);
    } catch (error) {
      console.error("Error generating data integrity report:", error);
      res.status(500).json({ error: "Failed to generate integrity report" });
    }
  });

  app.get("/api/admin/youtube-api-status", async (req, res) => {
    try {
      const { getApiKeyStatus } = await import('./youtube');
      const status = getApiKeyStatus();
      res.json(status);
    } catch (error) {
      console.error("Error getting YouTube API status:", error);
      res.status(500).json({ error: "Failed to get API status" });
    }
  });

  app.post("/api/test-video-search", async (req, res) => {
    try {
      const { exerciseName, exerciseType } = req.body;
      const { searchExerciseVideo } = await import('./youtube');
      
      console.log(`Testing video search for: ${exerciseName} (${exerciseType})`);
      const result = await searchExerciseVideo(exerciseName, exerciseType);
      
      res.json({
        success: !!result,
        exerciseName,
        exerciseType,
        videoId: result?.id || null,
        thumbnailUrl: result?.thumbnailUrl || null
      });
    } catch (error) {
      console.error("Error testing video search:", error);
      res.status(500).json({ error: "Failed to test video search" });
    }
  });

  app.post("/api/search-videos-for-plan/:planId", async (req, res) => {
    try {
      const planId = parseInt(req.params.planId);
      console.log(`🎥 Starting video search for workout plan ${planId}`);
      
      // Set response headers to prevent timeout
      res.setHeader('Content-Type', 'application/json');
      
      // Start the search process
      const searchPromise = searchVideosForNewExercises(planId);
      
      // Send immediate response to prevent timeout, search continues in background
      res.json({
        success: true,
        message: "Video search started for workout plan",
        planId: planId
      });
      
      // Continue search in background
      await searchPromise;
      
    } catch (error) {
      console.error("Error searching videos for plan:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to search videos for plan" });
      }
    }
  });



  const httpServer = createServer(app);
  return httpServer;
}
