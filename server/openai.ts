import OpenAI from "openai";

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY
});

const UNIFIED_COACH_SYSTEM_PROMPT = "You are an expert personal trainer and exercise physiologist with 15+ years of experience designing effective fitness programs. You have deep knowledge of exercise physiology, biomechanics, periodization, and evidence-based training principles. Apply intelligent coaching decisions and maintain a supportive, knowledgeable approach in all fitness-related interactions.";

const WORKOUT_STRUCTURE_RULES = `
WORKOUT STRUCTURE PRINCIPLES:
• Each workout includes: Warm-up → Main Training → Cardio Component → Cool-down
• Warm-up (5-8 minutes): Dynamic preparation specific to the session's focus
• Main Training: Intelligently selected exercises (typically 3-5) based on workout duration and complexity
• For shorter sessions (30 min): Focus on fewer, high-impact compound movements
• For longer sessions (45-60 min): Include comprehensive training with accessory work
• Cardio Component: Appropriate cardiovascular work for the day's goals
• Cool-down (5-8 minutes): Targeted recovery addressing muscles worked
• Prioritize movement quality and training effect over rigid exercise counts
• Consider fatigue management and exercise sequencing
`;

const JSON_RESPONSE_RULES = "Return only valid JSON. No commentary, whitespace, or additional text. Follow the exact schema provided. No keys outside the specified structure.";

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
  
  const prompt = `Create a strategic workout framework for this client:

Client Data:
- Fitness Level: ${JSON.stringify(request.fitnessLevel)}
- Time Per Session: ${request.timePerWorkout} minutes  
- Weekly Frequency: ${request.workoutsPerWeek} workouts
- Training Goal: ${JSON.stringify(request.goals)}
- Available Equipment: ${JSON.stringify(request.equipment.join(', '))}
- Plan Duration: ${request.duration} weeks

Think through your coaching strategy:
1. What workout split maximizes results for this goal and schedule?
2. How should training intensity and volume progress over ${request.duration} weeks?
3. What equipment selection strategy best serves the training goals?
4. How will each workout complement others in the weekly structure?

Return only valid JSON with this exact structure: {
  "title": "Plan name",
  "description": "Plan overview", 
  "duration": ${request.duration},
  "totalWorkouts": ${request.workoutsPerWeek * request.duration},
  "difficulty": ${JSON.stringify(request.fitnessLevel)},
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
    model: "gpt-4.1-mini",
    messages: [
      { role: "system", content: UNIFIED_COACH_SYSTEM_PROMPT + " " + JSON_RESPONSE_RULES },
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

  const prompt = `Generate detailed workouts for Week ${weekNumber}:

Framework: ${JSON.stringify(currentWeek)}
Available Equipment: ${JSON.stringify(framework.equipment.join(', '))}
${progressionContext}

Design ${currentWeek.workoutDays.length} intelligent workouts for ${timePerWorkout || 45} minutes each that maximize training effectiveness within the time constraints.

Return only valid JSON with this exact structure: {
  "workouts": [
  {
    "title": "Workout day title",
    "description": "Workout focus",
    "estimatedDuration": ${timePerWorkout || 45},
    "exercises": [
      {
        "section": "warm-up",
        "name": "Specific warm-up movement name",
        "sets": 1,
        "reps": "10-15 each side",
        "weight": null,
        "restTime": "30 seconds",
        "instructions": ["Detailed movement instructions"],
        "muscleGroups": ["muscles being warmed up"],
        "equipment": ["equipment needed or none"]
      },
      {
        "section": "main",
        "name": "Main exercise name",
        "sets": 3,
        "reps": "8-12",
        "weight": "moderate weight",
        "restTime": "60-90 seconds",
        "instructions": ["Proper form instructions"],
        "muscleGroups": ["primary muscles worked"],
        "equipment": ["required equipment"]
      },
      {
        "section": "cardio",
        "name": "Specific cardio exercise",
        "sets": 1,
        "reps": "10-15 minutes or intervals",
        "weight": null,
        "restTime": "none",
        "instructions": ["Cardio exercise instructions"],
        "muscleGroups": ["cardiovascular"],
        "equipment": ["cardio equipment needed"]
      },
      {
        "section": "cool-down",
        "name": "Specific stretch name",
        "sets": 1,
        "reps": "hold 20-30 seconds",
        "weight": null,
        "restTime": "none",
        "instructions": ["Stretching instructions"],
        "muscleGroups": ["muscles being stretched"],
        "equipment": ["none or equipment needed"]
      }
    ]
  }
  ]
}`;

  console.log("🔍 WEEKLY WORKOUT GENERATION - Prompt:", prompt);

  const response = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [
      { role: "system", content: UNIFIED_COACH_SYSTEM_PROMPT + " " + WORKOUT_STRUCTURE_RULES + " " + JSON_RESPONSE_RULES },
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
${recentSnapshots.map((snapshot: any, index: number) => `
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
Goals: ${request.goals}
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
      model: "gpt-4.1-mini",
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
  const prompt = `As an AI fitness coach, provide a helpful tip for the user who is performing ${JSON.stringify(exercise)}.

Recent performance: ${JSON.stringify(userPerformance)}
Workout history: ${JSON.stringify(workoutHistory.slice(-5))}

Give a personalized, encouraging tip that helps improve form, motivation, or performance. Keep it concise (1-2 sentences) and positive.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: UNIFIED_COACH_SYSTEM_PROMPT + " Do NOT exceed two sentences."
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
  const contextPrompt = `User Data:
- Fitness level: ${JSON.stringify(userContext.fitnessLevel)}
- Goals: ${JSON.stringify(userContext.goals?.join(", ") || "General fitness")}
- Equipment: ${JSON.stringify(userContext.equipment?.join(", ") || "None")}
- Recent workouts: ${JSON.stringify(userContext.recentWorkouts || "None")}

Chat history: ${JSON.stringify(chatHistory.slice(-10))}

User message: ${JSON.stringify(message)}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: UNIFIED_COACH_SYSTEM_PROMPT
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
      model: "gpt-4.1-mini",
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
  const prompt = `Analyze Week ${weekNumber} performance and create weekly progress snapshot:

Workout sessions: ${JSON.stringify(workoutSessions)}
User goals: ${JSON.stringify(userGoals.join(", "))}

Focus on insights useful for future plan generation.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: UNIFIED_COACH_SYSTEM_PROMPT
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
User goals: ${JSON.stringify(userGoals.join(", "))}

Return only valid JSON with this exact structure:

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

No keys outside this schema. Only include insights that would help generate better future workout plans.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: UNIFIED_COACH_SYSTEM_PROMPT
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
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: UNIFIED_COACH_SYSTEM_PROMPT
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
