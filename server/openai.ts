import OpenAI from "openai";

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY
});

export interface WorkoutPlanRequest {
  fitnessLevel: string;
  equipment: string[];
  goals: string;
  duration: number; // weeks
  workoutsPerWeek: number;
  timePerWorkout: number; // minutes
  planType: "independent" | "progressive";
  userId: number;
}

export interface GeneratedWorkout {
  title: string;
  description: string;
  estimatedDuration: number;
  exercises: Array<{
    name: string;
    sets: number;
    reps: string; // can be range like "8-12" or time like "30 seconds"
    weight?: string;
    restTime: string;
    instructions: string[];
    muscleGroups: string[];
    equipment: string[];
  }>;
}

export interface GeneratedWorkoutPlan {
  title: string;
  description: string;
  duration: number;
  totalWorkouts: number;
  difficulty: string;
  equipment: string[];
  workouts: GeneratedWorkout[];
}

// Generate workout framework first
export async function generateWorkoutFramework(request: WorkoutPlanRequest): Promise<{
  title: string;
  description: string;
  duration: number;
  totalWorkouts: number;
  difficulty: string;
  equipment: string[];
  weeklyStructure: Array<{
    week: number;
    focus: string;
    intensityLevel: string;
    workoutDays: Array<{
      dayNumber: number;
      goal: string;
      targetMuscles: string[];
      workoutType: string;
      estimatedDuration: number;
    }>;
  }>;
  progressionRules: {
    weightProgression: string;
    volumeProgression: string;
    intensityProgression: string;
  };
}> {
  console.log("🔍 FRAMEWORK GENERATION - Input Data:", JSON.stringify(request, null, 2));
  
  const prompt = `Create a strategic ${request.duration}-week workout framework for ${request.fitnessLevel} level.

Requirements:
- ${request.workoutsPerWeek} workouts per week
- ${request.timePerWorkout} minutes per workout  
- Available equipment: ${request.equipment.join(', ')}
- Primary Goal: ${request.goals}

Create a framework with:
1. Weekly progression structure (focus and intensity for each week)
2. Individual workout day goals and target muscles for ${request.workoutsPerWeek} workouts per week
3. Progression rules for advancing between weeks

Each workout should include: Warm-up → Main Exercises → Cardio → Cool-down

Respond with JSON: {
  "title": "Plan name",
  "description": "Plan overview",
  "duration": ${request.duration},
  "totalWorkouts": ${request.workoutsPerWeek * request.duration},
  "difficulty": "${request.fitnessLevel}",
  "equipment": ${JSON.stringify(request.equipment)},
  "weeklyStructure": [
    {
      "week": 1,
      "focus": "Foundation Building",
      "intensityLevel": "moderate",
      "workoutDays": [
        {
          "dayNumber": 1,
          "goal": "Upper Body Strength",
          "targetMuscles": ["chest", "shoulders", "triceps"],
          "workoutType": "strength",
          "estimatedDuration": ${request.timePerWorkout}
        },
        {
          "dayNumber": 2,
          "goal": "Lower Body Power",
          "targetMuscles": ["quadriceps", "glutes", "hamstrings"],
          "workoutType": "strength",
          "estimatedDuration": ${request.timePerWorkout}
        },
        {
          "dayNumber": 3,
          "goal": "Core & Flexibility",
          "targetMuscles": ["core", "back"],
          "workoutType": "flexibility",
          "estimatedDuration": ${request.timePerWorkout}
        }
      ]
    }
  ],
  "progressionRules": {
    "weightProgression": "Increase by 5-10% when completing all sets",
    "volumeProgression": "Add 1 set after 2 weeks of same weight",
    "intensityProgression": "Week 1: 60-70%, Week 2: 70-75%, Week 3: 75-80%, Week 4: 70-75%"
  }
}`;

  console.log("🔍 FRAMEWORK GENERATION - Prompt:", prompt);

  const response = await openai.chat.completions.create({
    model: "gpt-4.1-nano",
    messages: [
      { role: "system", content: "You are a workout program architect. Create strategic fitness frameworks in JSON format." },
      { role: "user", content: prompt }
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
  });

  return JSON.parse(response.choices[0].message.content || "{}");
}

// Generate detailed workouts for a specific week
export async function generateWeeklyWorkouts(
  framework: any,
  weekNumber: number,
  previousWeeks?: any[],
  timePerWorkout?: number
): Promise<GeneratedWorkout[]> {
  console.log("🔍 WEEKLY WORKOUT GENERATION - Input Data:");
  console.log("Framework:", JSON.stringify(framework, null, 2));
  console.log("Week Number:", weekNumber);
  console.log("Previous Weeks:", JSON.stringify(previousWeeks, null, 2));
  
  const currentWeek = framework.weeklyStructure.find((w: any) => w.week === weekNumber);
  if (!currentWeek) throw new Error(`Week ${weekNumber} not found in framework`);

  const progressionContext = previousWeeks ? 
    `Previous weeks completed: ${JSON.stringify(previousWeeks)}. Apply progression rules: ${JSON.stringify(framework.progressionRules)}` : 
    'This is the first week, start with foundation movements.';

  const prompt = `Generate detailed workouts for Week ${weekNumber} of this fitness plan.

Framework: ${JSON.stringify(currentWeek)}
Available Equipment (use what's appropriate for each workout): ${framework.equipment.join(', ')}
${progressionContext}

Create ${currentWeek.workoutDays.length} detailed workouts following this structure:
- Warm-up: 5-10 minutes of dynamic movements
- Main exercises: Specific to the day's goal and target muscles
- Cool-down: 5-10 minutes of static stretching

Respond with JSON array of workouts: [
  {
    "title": "Workout day title",
    "description": "Workout focus",
    "estimatedDuration": ${timePerWorkout || 45},
    "exercises": [
      {
        "section": "warm-up",
        "name": "Dynamic exercise name",
        "sets": 1,
        "reps": "10 each direction",
        "weight": null,
        "restTime": "30 seconds",
        "instructions": ["Clear instruction"],
        "muscleGroups": ["target muscles"],
        "equipment": ["required equipment"]
      }
    ]
  }
]`;

  console.log("🔍 WEEKLY WORKOUT GENERATION - Prompt:", prompt);

  const response = await openai.chat.completions.create({
    model: "gpt-4.1-nano",
    messages: [
      { role: "system", content: "You are a fitness trainer creating detailed workout sessions in JSON format." },
      { role: "user", content: prompt }
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
  });

  const result = JSON.parse(response.choices[0].message.content || "{}");
  return result.workouts || [];
}

export async function generateWorkoutPlan(request: WorkoutPlanRequest): Promise<GeneratedWorkoutPlan> {
  // Get progress context for progressive plans
  let progressContext = "";
  if (request.planType === "progressive") {
    console.log("📊 Fetching progress history for progressive plan...");
    
    try {
      const { storage } = require("./storage");
      const planCompletionSnapshots = await storage.getPlanCompletionSnapshots(request.userId);
      
      if (planCompletionSnapshots.length > 0) {
        // Use the 2 most recent plan completion snapshots for context
        const recentSnapshots = planCompletionSnapshots.slice(0, 2);
        progressContext = `

WORKOUT HISTORY INSIGHTS:
${recentSnapshots.map((snapshot, index) => `
Previous Plan ${index + 1}:
- Overall Performance: ${snapshot.coachNotes}
- Success Rate: ${snapshot.adherencePercent}%
- Key Learnings: ${JSON.stringify(snapshot.jsonSnapshot)}
`).join('\n')}

BUILD ON THESE INSIGHTS: Create a progressive plan that addresses past challenges and leverages proven strengths.`;
      }
    } catch (error) {
      console.warn("Could not fetch progress snapshots:", error);
    }
  }

  const prompt = `Generate a comprehensive ${request.duration}-week workout plan with the following specifications:

Fitness Level: ${request.fitnessLevel}
Available Equipment: ${request.equipment.join(", ") || "None (bodyweight only)"}
Goals: ${request.goals.join(", ")}
Workouts per week: ${request.workoutsPerWeek}
Time per workout: ${request.timePerWorkout} minutes
Plan Type: ${request.planType === "progressive" ? "Progressive (build on user history)" : "Independent (fresh start)"}${progressContext}

Create a progressive plan that includes:
1. A descriptive title and overview
2. ${request.workoutsPerWeek * request.duration} total workouts
3. Each workout should have 6-10 exercises
4. Include sets, reps, rest times, and detailed instructions
5. Progressive overload throughout the weeks
6. Variety in muscle groups and exercise types

Return the response as a JSON object with this exact structure:
{
  "title": "Plan name",
  "description": "Plan overview", 
  "duration": ${request.duration},
  "totalWorkouts": ${request.workoutsPerWeek * request.duration},
  "difficulty": "${request.fitnessLevel}",
  "equipment": ${JSON.stringify(request.equipment)},
  "workouts": [
    {
      "title": "Workout name (e.g., 'Upper Body Strength')",
      "description": "Workout focus and goals",
      "estimatedDuration": ${request.timePerWorkout},
      "exercises": [
        {
          "name": "Standard exercise name (e.g., 'Push-ups', 'Squats')",
          "sets": 3,
          "reps": "8-12 or time-based like '30 seconds'",
          "weight": null for bodyweight or "15 lbs" for weighted,
          "restTime": "60 seconds",
          "instructions": ["Clear step 1", "Clear step 2", "Clear step 3"],
          "muscleGroups": ["primary", "secondary"],
          "equipment": ["none"] or ["dumbbells"]
        }
      ]
    }
  ]
}

IMPORTANT: 
- Use exactly ${request.workoutsPerWeek * request.duration} workouts total
- Match difficulty to user's fitness level: "${request.fitnessLevel}"
- Only use equipment from this list: ${JSON.stringify(request.equipment)}
- Ensure progressive difficulty across workouts`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4.1-nano",
      messages: [
        {
          role: "system",
          content: `You are an expert fitness trainer and workout program designer. Create detailed, safe, and effective workout plans based on the user's specifications.

CRITICAL: Follow this exact JSON structure for exercises:
- Each exercise must have: name, sets (number), reps (string like "8-12" or "30 seconds"), weight (string or null), restTime (string like "60 seconds"), instructions (array of strings), muscleGroups (array), equipment (array)
- Use standard exercise names (Push-ups, Squats, Plank, etc.)
- For bodyweight exercises, set weight to null
- Rest times should be realistic (30-120 seconds)
- Instructions should be 3-5 clear, actionable steps
- Muscle groups: use lowercase (chest, shoulders, triceps, quadriceps, glutes, etc.)
- Equipment: use lowercase, match available options (none, dumbbells, barbell, etc.)

Ensure exercises progress logically throughout the plan with appropriate volume and intensity increases. Respond with JSON format.`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result as GeneratedWorkoutPlan;
  } catch (error) {
    console.error("Error generating workout plan:", error);
    throw new Error("Failed to generate workout plan");
  }
}

export async function generateCoachingTip(
  exercise: string,
  userPerformance: any,
  workoutHistory: any[]
): Promise<string> {
  const prompt = `As an AI fitness coach, provide a helpful tip for the user who is performing "${exercise}".

Recent performance: ${JSON.stringify(userPerformance)}
Workout history: ${JSON.stringify(workoutHistory.slice(-5))}

Give a personalized, encouraging tip that helps improve form, motivation, or performance. Keep it concise (1-2 sentences) and positive.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4.1-nano",
      messages: [
        {
          role: "system",
          content: "You are a supportive AI fitness coach. Provide helpful, encouraging tips that improve performance and maintain motivation."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
    });

    return response.choices[0].message.content || "Great work! Keep focusing on proper form and controlled movements.";
  } catch (error) {
    console.error("Error generating coaching tip:", error);
    return "Great work! Keep focusing on proper form and controlled movements.";
  }
}

export async function generateChatResponse(
  message: string,
  userContext: any,
  chatHistory: any[]
): Promise<string> {
  const contextPrompt = `User context:
- Fitness level: ${userContext.fitnessLevel}
- Goals: ${userContext.goals?.join(", ") || "General fitness"}
- Available equipment: ${userContext.equipment?.join(", ") || "None"}
- Recent workouts: ${userContext.recentWorkouts || "None"}

Chat history: ${JSON.stringify(chatHistory.slice(-10))}

User message: "${message}"

Respond as a knowledgeable, supportive AI fitness coach. Provide helpful advice, motivation, and answer fitness-related questions. Keep responses conversational and encouraging.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4.1-nano",
      messages: [
        {
          role: "system",
          content: "You are an expert AI fitness coach. You're knowledgeable about exercise science, nutrition, and motivation. Always be supportive, encouraging, and provide actionable advice."
        },
        {
          role: "user",
          content: contextPrompt
        }
      ],
      temperature: 0.3,
    });

    return response.choices[0].message.content || "I'm here to help you reach your fitness goals! What would you like to know?";
  } catch (error) {
    console.error("Error generating chat response:", error);
    return "I'm here to help you reach your fitness goals! What would you like to know?";
  }
}

export async function findSimilarExercise(
  exerciseName: string,
  existingExercises: Array<{ id: number; name: string; muscleGroups: string[]; equipment: string[] }>
): Promise<{ id: number; name: string } | null> {
  if (existingExercises.length === 0) {
    return null;
  }

  const prompt = `You are an exercise database expert. Determine if "${exerciseName}" is the same exercise as any in this list:

${existingExercises.map((ex, i) => `${i + 1}. "${ex.name}" (targets: ${ex.muscleGroups.join(', ')}, equipment: ${ex.equipment.join(', ')})`).join('\n')}

Consider these factors:
- Same primary muscle groups
- Same movement pattern
- Equipment variations are acceptable (barbell vs dumbbell bench press = same exercise)
- Form variations are acceptable (regular vs wide grip = same exercise)
- Different exercises targeting same muscles are NOT the same (bench press vs push-ups = different)

If "${exerciseName}" matches an existing exercise, respond with JSON format: {"match": true, "exerciseId": [ID], "canonicalName": "[existing name]"}
If no match, respond with JSON format: {"match": false}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4.1-nano",
      messages: [
        {
          role: "system",
          content: "You are an exercise matching expert. Compare exercises based on movement patterns and muscle targeting, not just names. Respond in JSON format."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    if (result.match && result.exerciseId) {
      const matchedExercise = existingExercises.find(ex => ex.id === result.exerciseId);
      return matchedExercise ? { id: matchedExercise.id, name: matchedExercise.name } : null;
    }
    
    return null;
  } catch (error) {
    console.error("Error finding similar exercise:", error);
    return null;
  }
}

// Create weekly progress snapshot
export async function createWeeklySnapshot(
  userId: number,
  planId: number,
  planWeekId: number,
  weekNumber: number,
  workoutSessions: any[],
  userGoals: string[]
): Promise<{
  coachNotes: string;
  jsonSnapshot: any;
  adherencePercent: number;
  subjectiveFatigue: string;
  strengthPRs: any[];
  volumePerMuscle: any;
  flags: any[];
}> {
  const prompt = `Analyze this user's Week ${weekNumber} workout performance:

Workout sessions: ${JSON.stringify(workoutSessions)}
User goals: ${userGoals.join(", ")}

Create a weekly progress snapshot in JSON format:
{
  "coachNotes": "Brief summary of week performance (max 100 words)",
  "adherencePercent": 85,
  "subjectiveFatigue": "moderate",
  "strengthPRs": [{"exercise": "Bench Press", "weight": "135 lbs", "reps": 8}],
  "volumePerMuscle": {"chest": 12, "legs": 16, "back": 10},
  "flags": ["missed_friday_workout", "weight_not_progressing_squats"],
  "jsonSnapshot": {
    "weekSummary": "Key insights for future plan generation",
    "avgWeight": {"bench": "125 lbs", "squat": "155 lbs"},
    "completionRate": 85,
    "userPreferences": ["shorter_rest_periods", "prefers_morning_workouts"]
  }
}

Focus on data that would be useful for generating future workout plans.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4.1-nano",
      messages: [
        {
          role: "system",
          content: "You are a fitness data analyst. Create concise weekly progress snapshots focusing on actionable insights."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return {
      coachNotes: result.coachNotes || "Good progress this week!",
      jsonSnapshot: result.jsonSnapshot || {},
      adherencePercent: result.adherencePercent || 80,
      subjectiveFatigue: result.subjectiveFatigue || "moderate",
      strengthPRs: result.strengthPRs || [],
      volumePerMuscle: result.volumePerMuscle || {},
      flags: result.flags || []
    };
  } catch (error) {
    console.error("Error creating weekly snapshot:", error);
    return {
      coachNotes: "Week completed successfully",
      jsonSnapshot: {},
      adherencePercent: 80,
      subjectiveFatigue: "moderate",
      strengthPRs: [],
      volumePerMuscle: {},
      flags: []
    };
  }
}

// Create plan completion snapshot (distilled from all weekly snapshots)
export async function createPlanCompletionSnapshot(
  userId: number,
  planId: number,
  weeklySnapshots: any[],
  userGoals: string[]
): Promise<{
  coachNotes: string;
  jsonSnapshot: any;
  adherencePercent: number;
  subjectiveFatigue: string;
  strengthPRs: any[];
  volumePerMuscle: any;
  flags: any[];
}> {
  const prompt = `Analyze this user's complete workout plan performance based on weekly snapshots:

Weekly snapshots: ${JSON.stringify(weeklySnapshots)}
User goals: ${userGoals.join(", ")}

Create a DISTILLED plan completion summary focusing ONLY on insights useful for future plan generation:

{
  "coachNotes": "Overall plan assessment and key learnings (max 150 words)",
  "adherencePercent": 85,
  "subjectiveFatigue": "moderate",
  "strengthPRs": [{"exercise": "Bench Press", "improvement": "20 lbs gained"}],
  "volumePerMuscle": {"chest": "responded well to high volume", "legs": "needs more frequency"},
  "flags": ["tends_to_skip_leg_days", "excels_at_upper_body"],
  "jsonSnapshot": {
    "planOutcome": "successful",
    "keyStrengths": ["consistency", "progressive_overload"],
    "areasForImprovement": ["leg_training", "cardio"],
    "preferredExercises": ["bench_press", "pull_ups"],
    "optimal_training_frequency": 4,
    "progression_response": "responds_well_to_linear_progression",
    "equipment_effectiveness": {"dumbbells": "highly_effective", "machines": "less_preferred"}
  }
}

CRITICAL: Only include insights that would help generate better future workout plans. This summary will be used as context for AI plan generation.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4.1-nano",
      messages: [
        {
          role: "system",
          content: "You are a fitness program architect. Distill workout data into insights for future plan generation. Be concise and focus on actionable patterns."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return {
      coachNotes: result.coachNotes || "Plan completed successfully with good progress!",
      jsonSnapshot: result.jsonSnapshot || {},
      adherencePercent: result.adherencePercent || 80,
      subjectiveFatigue: result.subjectiveFatigue || "moderate",
      strengthPRs: result.strengthPRs || [],
      volumePerMuscle: result.volumePerMuscle || {},
      flags: result.flags || []
    };
  } catch (error) {
    console.error("Error creating plan completion snapshot:", error);
    return {
      coachNotes: "Plan completed successfully",
      jsonSnapshot: {},
      adherencePercent: 80,
      subjectiveFatigue: "moderate",
      strengthPRs: [],
      volumePerMuscle: {},
      flags: []
    };
  }
}

export async function analyzeWorkoutProgress(
  workoutSessions: any[],
  userGoals: string[]
): Promise<{
  progressSummary: string;
  recommendations: string[];
  strengthImprovement: number;
}> {
  const prompt = `Analyze this user's workout progress:

Workout sessions: ${JSON.stringify(workoutSessions)}
User goals: ${userGoals.join(", ")}

Provide analysis in JSON format:
{
  "progressSummary": "Overall progress summary",
  "recommendations": ["recommendation 1", "recommendation 2", "recommendation 3"],
  "strengthImprovement": 15
}

Calculate strength improvement as a percentage and provide actionable recommendations for continued progress.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4.1-nano",
      messages: [
        {
          role: "system",
          content: "You are a fitness data analyst and coach. Analyze workout data to provide insights and recommendations."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return {
      progressSummary: result.progressSummary || "Making good progress!",
      recommendations: result.recommendations || ["Keep up the great work!", "Stay consistent with your routine"],
      strengthImprovement: result.strengthImprovement || 0
    };
  } catch (error) {
    console.error("Error analyzing workout progress:", error);
    return {
      progressSummary: "Making good progress!",
      recommendations: ["Keep up the great work!", "Stay consistent with your routine"],
      strengthImprovement: 0
    };
  }
}
