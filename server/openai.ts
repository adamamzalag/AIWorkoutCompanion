import OpenAI from "openai";

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY
});

const UNIFIED_COACH_SYSTEM_PROMPT = "You are an expert personal trainer and exercise physiologist with 15+ years of experience designing effective fitness programs. You have deep knowledge of exercise physiology, biomechanics, periodization, and evidence-based training principles. Apply intelligent coaching decisions and maintain a supportive, knowledgeable approach in all fitness-related interactions.";

const WORKOUT_STRUCTURE_RULES = `
WORKOUT STRUCTURE PRINCIPLES:
• Each workout includes: Warm-up → Main Training → Cardio Component → Cool-down
• EQUIPMENT CONSTRAINT: Only use equipment from the user's available equipment list
• SINGLE-WORKOUT UNIQUENESS: Within each workout, no exercise should repeat across warmUp, main exercises, and coolDown

TIME-BASED ALLOCATION:
• Warm-up ≈ 10% of total workout time
• Main Training ≈ 60-80% of total workout time
• Cardio ≈ 15-20% of total workout time (optional)
• Cool-down ≥ 5% of total workout time

EXERCISE TIME ESTIMATION:
• Estimate each exercise's total time = sets × (repsOrSeconds + rest) and ensure section stays within its budget
• Prioritize movement quality and training effect over rigid exercise counts
• Consider fatigue management and exercise sequencing

REQUIRED JSON STRUCTURE:
{
  "workouts": [
    {
      "title": "Descriptive workout name",
      "description": "Brief workout overview",
      "estimatedDuration": 45,
      "warmUp": {
        "durationMinutes": 5,
        "activities": [
          {"exercise": "Dynamic stretching", "durationSeconds": 60}
        ]
      },
      "cardio": {
        "durationMinutes": 10,
        "activities": [
          {"exercise": "Jumping jacks", "durationSeconds": 60}
        ]
      },
      "coolDown": {
        "durationMinutes": 5,
        "activities": [
          {"exercise": "Static stretching", "durationSeconds": 60}
        ]
      },
      "exercises": [
        {
          "name": "Exercise name",
          "sets": 3,
          "reps": "8-12",
          "weight": "moderate weight",
          "restTime": "60 seconds",
          "instructions": ["Step 1", "Step 2", "Step 3"],
          "muscleGroups": ["chest", "triceps"],
          "equipment": ["dumbbells"],
          "tempo": "2-1-2-1",
          "modifications": ["easier variation"],
          "progressions": ["harder variation"]
        }
      ]
    }
  ]
}
`;

const JSON_RESPONSE_RULES = "Return only the JSON object. No text before or after. Follow the exact schema provided. Optional fields like tempo, modifications, progressions are allowed but not required.";

// Helper function for JSON parsing with retry logic
async function parseJSONWithRetry(content: string, openaiCall: () => Promise<any>): Promise<any> {
  try {
    return JSON.parse(content);
  } catch (error) {
    console.log("JSON parsing failed, attempting retry with correction prompt");
    try {
      const retryResponse = await openaiCall();
      return JSON.parse(retryResponse.choices[0].message.content || "{}");
    } catch (retryError) {
      console.error("Retry also failed:", retryError);
      throw new Error("Failed to parse valid JSON after retry");
    }
  }
}

const WEEKLY_SNAPSHOT_SCHEMA = `{
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
}`;



const PLAN_COMPLETION_SCHEMA = `{
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
}`;

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
- Fitness Level: ${request.fitnessLevel}
- Time Per Session: ${request.timePerWorkout} minutes  
- Weekly Frequency: ${request.workoutsPerWeek} workouts
- Training Goal: ${request.goals}
- Available Equipment: ${request.equipment.join(", ")}
- Plan Duration: ${request.duration} weeks

STRICT EQUIPMENT CONSTRAINT: 
You MUST design workout patterns that only use equipment from the user's available equipment list.
Do NOT suggest workout focuses or patterns that require unavailable equipment.

CREATIVITY REQUIREMENTS:
Across different plan generations, aim for variety in split style, exercise selection and sequencing while still meeting the goals.
Provide a unique, descriptive plan title each time that reflects your specific training approach.

Think through your coaching strategy:
1. What workout split maximizes results for this goal and schedule?
2. How should training intensity and volume progress over ${request.duration} weeks?
3. What equipment selection strategy best serves the training goals?
4. How will each workout complement others in the weekly structure?

Return only valid JSON with this schema structure:
{
  "title": "Unique descriptive plan name",
  "description": "Plan overview", 
  "duration": ${request.duration},
  "totalWorkouts": ${request.workoutsPerWeek * request.duration},
  "difficulty": "${request.fitnessLevel}",
  "equipment": ${JSON.stringify(request.equipment)},
  "weeklyStructure": [
    // Generate ${request.duration} weeks with your chosen training split and progression
  ],
  "progressionRules": {
    "weightProgression": "Your progression strategy",
    "volumeProgression": "Your volume strategy", 
    "intensityProgression": "Your intensity strategy"
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
    temperature: 0.8,
    top_p: 0.9,
    presence_penalty: 0.8,
    seed: Date.now() + Math.floor(Math.random() * 10000),
    max_tokens: 2000,
  });

  return await parseJSONWithRetry(response.choices[0].message.content || "{}", async () => {
    return await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: UNIFIED_COACH_SYSTEM_PROMPT + " " + JSON_RESPONSE_RULES + " Please return valid JSON only." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.8,
      top_p: 0.9,
      presence_penalty: 0.8,
      seed: Date.now() + Math.floor(Math.random() * 10000),
      max_tokens: 2000,
    });
  });
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

PLAN CONTEXT:
- Overall Plan: ${framework.title} (${framework.difficulty})
- Total Duration: ${framework.duration} weeks
- Plan Goals: ${framework.description}

PROGRESSION STRATEGY:
${JSON.stringify(framework.progressionRules)}

CURRENT WEEK FOCUS:
${JSON.stringify(currentWeek)}

Available Equipment: ${framework.equipment.join(", ")}
${progressionContext}

STRICT EQUIPMENT CONSTRAINT: 
You MUST ONLY use equipment from the user's available equipment list. 
Do NOT use any equipment not explicitly available to the user.
You do not need to use ALL available equipment - select the most appropriate equipment for each exercise from what's available.
If an exercise typically requires unavailable equipment, substitute with alternatives using only the available equipment or bodyweight movements.

CREATIVITY REQUIREMENTS:
Across different plan generations, aim for variety in exercise selection, workout structure, and training methods while meeting the week's focus.
Be creative with workout titles and descriptions that reflect your specific training approach.

IMPORTANT REQUIREMENTS:
1. Within each individual workout: No exercise should appear more than once across warmUp, main exercises, and coolDown sections
2. Each workout should have unique exercises in its warmUp and coolDown (no repeats within that single workout)
3. Different workouts in the plan CAN share the same exercises - this constraint only applies within each individual workout

Design ${currentWeek.workoutDays.length} intelligent workouts for ${timePerWorkout || 45} minutes each that maximize training effectiveness within the time constraints.

Return JSON with this schema structure:
{
  "workouts": [
    {
      "title": "Creative workout name",
      "description": "Specific focus description",
      "estimatedDuration": ${timePerWorkout || 45},
      "warmUp": {
        "durationMinutes": 5,
        "activities": [
          // Generate appropriate warm-up activities
        ]
      },
      "cardio": {
        "durationMinutes": 10,
        "activities": [
          // Generate cardio activities using available equipment
        ]
      },
      "coolDown": {
        "durationMinutes": 5,
        "activities": [
          // Generate cool-down activities
        ]
      },
      "exercises": [
        // Generate main exercises with all required fields
      ]
    }
  ]
}

Each workout must have: title, description, estimatedDuration, exercises array.
Each exercise must have: name, sets, reps, weight, restTime, instructions, muscleGroups, equipment.
Use null for weight on bodyweight exercises, specific weights for loaded exercises.`;

  console.log("🔍 WEEKLY WORKOUT GENERATION - Prompt:", prompt);

  const response = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [
      { role: "system", content: UNIFIED_COACH_SYSTEM_PROMPT + " " + WORKOUT_STRUCTURE_RULES + " " + JSON_RESPONSE_RULES },
      { role: "user", content: prompt }
    ],
    response_format: { type: "json_object" },
    temperature: 0.8,
    top_p: 0.9,
    presence_penalty: 0.8,
    seed: Date.now() + Math.floor(Math.random() * 10000),
    max_tokens: 3000,
  });

  const result = await parseJSONWithRetry(response.choices[0].message.content || "{}", async () => {
    return await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: UNIFIED_COACH_SYSTEM_PROMPT + " " + WORKOUT_STRUCTURE_RULES + " " + JSON_RESPONSE_RULES + " Please return valid JSON only." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.8,
      top_p: 0.9,
      presence_penalty: 0.8,
      seed: Date.now() + Math.floor(Math.random() * 10000),
      max_tokens: 3000,
    });
  });
  return result.workouts || [];
}



export async function generateChatTitle(firstMessage: string): Promise<string> {
  try {
    const prompt = `Generate a concise, descriptive title for a fitness coaching chat based on this first message: "${firstMessage}"

Rules:
- Maximum 25 characters
- Focus on core topic, be specific
- Use title case
- No special characters or punctuation
- Examples: "Dad Workout Tips", "Bicep Building", "Form Check", "Meal Planning"

If the message isn't fitness-related, create a general but concise title.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a helpful assistant that creates concise, descriptive titles for fitness coaching conversations." },
        { role: "user", content: prompt }
      ],
      max_tokens: 50,
      temperature: 0.3,
    });

    let title = response.choices[0].message.content?.trim() || "New Chat";
    
    // Ensure 25 character limit
    if (title.length > 25) {
      title = title.substring(0, 25).trim();
    }
    
    // Remove quotes if present
    title = title.replace(/['"]/g, '');
    
    return title;
  } catch (error) {
    console.error("Error generating chat title:", error);
    return "New Chat";
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
      temperature: 0.5,
    });

    return response.choices[0].message.content || "Great work! Keep focusing on proper form and controlled movements.";
  } catch (error) {
    console.error("Error generating coaching tip:", error);
    return "Great work! Keep focusing on proper form and controlled movements.";
  }
}

export async function generateDailyCoachingTip(
  userId: number,
  userContext: any,
  recentSessions: any[]
): Promise<string> {
  const timeOfDay = new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening';
  const daysSinceLastWorkout = recentSessions.length > 0 ? 
    Math.floor((Date.now() - new Date(recentSessions[0].startTime).getTime()) / (1000 * 60 * 60 * 24)) : null;
  
  const prompt = `Create a practical fitness tip for this ${timeOfDay}.

Context:
- Fitness level: ${userContext.fitnessLevel || 'beginner'}
- Goals: ${userContext.goals || 'general fitness'}
- Days since last workout: ${daysSinceLastWorkout || 'no recent workouts'}
- Has active plan: ${userContext.hasActivePlan}

Give ONE practical tip related to today's potential workout. Focus on form, technique, or motivation. Maximum 2 sentences.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: "You are a fitness coach. Give exactly ONE practical tip in 1-2 short sentences only. No explanations or motivational speech."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 60,
      temperature: 0.3,
    });

    return response.choices[0].message.content || "Focus on controlled movements and proper breathing during your workout today.";
  } catch (error) {
    console.error("Error generating daily coaching tip:", error);
    return "Focus on controlled movements and proper breathing during your workout today.";
  }
}

export async function generateChatResponse(
  message: string,
  userContext: any,
  chatHistory: any[]
): Promise<string> {
  // Build enhanced system prompt with user context
  const systemPromptWithContext = `${UNIFIED_COACH_SYSTEM_PROMPT}

User Context:
- Fitness level: ${JSON.stringify(userContext.fitnessLevel)}
- Goals: ${JSON.stringify(userContext.goals || "General fitness")}
- Equipment: ${JSON.stringify(userContext.equipment?.join(", ") || "None")}
- Recent workouts: ${JSON.stringify(userContext.recentWorkouts || "None")}

Provide helpful advice, motivation, and answer fitness-related questions. Keep responses conversational and encouraging.

IMPORTANT: Be concise and to-the-point. Aim for 2-3 sentences maximum unless the user specifically asks for detailed information. Focus on actionable advice rather than lengthy explanations.`;

  // Build conversation history as proper message format
  const messages: Array<{role: 'system' | 'user' | 'assistant', content: string}> = [
    {
      role: "system",
      content: systemPromptWithContext
    }
  ];

  // Add recent conversation history (last 10 exchanges = 20 messages max)
  const recentHistory = chatHistory.slice(-20);
  for (const historyItem of recentHistory) {
    if (historyItem.role && historyItem.content) {
      messages.push({
        role: historyItem.role === 'user' ? 'user' : 'assistant',
        content: historyItem.content
      });
    }
  }

  // Add current user message
  messages.push({
    role: "user",
    content: message
  });

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: messages,
      temperature: 0.5,
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
      temperature: 0.5,
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
  const prompt = `Analyze Week ${weekNumber} performance:

Workout sessions: ${JSON.stringify(workoutSessions)}
User goals: ${JSON.stringify(userGoals.join(", "))}

Use the weekly snapshot schema provided in the system message.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: UNIFIED_COACH_SYSTEM_PROMPT + " " + JSON_RESPONSE_RULES + "\n\n###REFERENCE SCHEMA###\n" + WEEKLY_SNAPSHOT_SCHEMA
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.5,
    });

    const result = await parseJSONWithRetry(response.choices[0].message.content || "{}", async () => {
      return await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content: UNIFIED_COACH_SYSTEM_PROMPT + " " + JSON_RESPONSE_RULES + "\n\n###REFERENCE SCHEMA###\n" + WEEKLY_SNAPSHOT_SCHEMA + " Please return valid JSON only."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.5,
      });
    });
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
      temperature: 0.5,
    });

    const result = await parseJSONWithRetry(response.choices[0].message.content || "{}", async () => {
      return await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content: UNIFIED_COACH_SYSTEM_PROMPT + " Please return valid JSON only."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.5,
      });
    });
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
      temperature: 0.5,
    });

    const result = await parseJSONWithRetry(response.choices[0].message.content || "{}", async () => {
      return await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content: UNIFIED_COACH_SYSTEM_PROMPT + " Please return valid JSON only."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.5,
      });
    });
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
