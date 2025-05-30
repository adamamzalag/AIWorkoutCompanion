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
  // Workout plan generation with clean, efficient approach
  app.post("/api/generate-plan", async (req, res) => {
    const operationId = `plan_${req.body.userId}_${Date.now()}`;
    
    try {
      const { updateProgress } = await import("./progress-tracker.js");
      
      console.log(`🎯 Generating ${req.body.duration}-week plan for user ${req.body.userId}`);
      res.json({ operationId, status: 'started' });

      const planRequest: WorkoutPlanRequest = req.body;
      
      updateProgress(req.body.userId, operationId, 20, 'generating', 'Creating workout plan...');
      
      // Generate complete plan using improved batched approach (all weeks in parallel)
      const generatedPlan = await generateWorkoutPlan(planRequest);
      
      updateProgress(req.body.userId, operationId, 70, 'processing', 'Processing exercises...');
      
      // Create workout plan record
      const workoutPlan = await storage.createWorkoutPlan({
        userId: req.body.userId,
        title: generatedPlan.title,
        description: generatedPlan.description,
        difficulty: generatedPlan.difficulty,
        duration: generatedPlan.duration,
        workoutsPerWeek: req.body.workoutsPerWeek,
        equipment: generatedPlan.equipment,
        goals: req.body.goals
      });

      updateProgress(req.body.userId, operationId, 80, 'processing', 'Creating workouts...');

      // Process exercises efficiently with minimal logging
      const mappedExercises = await storage.getExercises();
      let newExerciseCount = 0;
      let existingExerciseCount = 0;

      for (const [workoutIndex, workout] of generatedPlan.workouts.entries()) {
        const processedExercises: any[] = [];

        for (const aiExercise of workout.exercises) {
          let exerciseId: number;
          let exerciseName: string;
          
          const existingExercise = mappedExercises.find(ex => 
            ex.name.toLowerCase() === aiExercise.name.toLowerCase()
          );
          
          if (existingExercise) {
            exerciseId = existingExercise.id;
            exerciseName = existingExercise.name;
            existingExerciseCount++;
          } else {
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
            mappedExercises.push(newExercise);
            newExerciseCount++;
          }

          processedExercises.push({
            exerciseId,
            name: exerciseName,
            sets: Array.from({ length: aiExercise.sets }, () => ({
              reps: typeof aiExercise.reps === 'string' ? parseInt(aiExercise.reps.split('-')[0]) || 10 : aiExercise.reps,
              weight: null,
              duration: null,
              completed: false,
              notes: null
            })),
            restTime: aiExercise.restTime,
            notes: null
          });
        }

        await storage.createWorkout({
          planId: workoutPlan.id,
          title: workout.title,
          description: workout.description,
          exercises: processedExercises,
          estimatedDuration: workout.estimatedDuration,
          weekNumber: Math.floor(workoutIndex / req.body.workoutsPerWeek) + 1,
          dayOfWeek: workoutIndex % req.body.workoutsPerWeek + 1
        });

        if (workoutIndex % 3 === 0) {
          updateProgress(req.body.userId, operationId, 80 + Math.floor((workoutIndex / generatedPlan.workouts.length) * 15), 'processing', `Created ${workoutIndex + 1}/${generatedPlan.workouts.length} workouts...`);
        }
      }

      updateProgress(req.body.userId, operationId, 100, 'completed', 'Plan generation complete!');
      
      console.log(`✅ Plan complete: ${generatedPlan.workouts.length} workouts, ${newExerciseCount} new exercises, ${existingExerciseCount} existing`);

    } catch (error) {
      console.error("Plan generation error:", error);
      updateProgress(req.body.userId, operationId, 0, 'error', 'Generation failed');
    }
  });

  // All other routes remain the same...
  // [Include all other existing routes here]

  const httpServer = createServer(app);
  return httpServer;
}