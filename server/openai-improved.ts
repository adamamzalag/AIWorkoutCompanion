import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface WorkoutPlanRequest {
  fitnessLevel: string;
  equipment: string[];
  goals: string[];
  duration: number; // weeks
  workoutsPerWeek: number;
  timePerWorkout: number; // minutes
}

export interface GeneratedWorkout {
  title: string;
  description: string;
  estimatedDuration: number;
  exercises: Array<{
    name: string;
    sets: number;
    reps: string;
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

export async function generateWorkoutFramework(request: WorkoutPlanRequest): Promise<any> {
  console.log(`🎯 Generating ${request.duration}-week framework`);
  
  const prompt = `Create a ${request.duration}-week workout plan framework.

User Profile:
- Fitness Level: ${request.fitnessLevel}
- Goals: ${request.goals.join(', ')}
- Equipment: ${request.equipment.join(', ')}
- Schedule: ${request.workoutsPerWeek} workouts/week, ${request.timePerWorkout} minutes each

Return JSON with weekly focus areas and progression:
{
  "title": "Plan Name",
  "description": "Plan overview",
  "weeklyStructure": [
    {
      "week": 1,
      "focus": "Foundation Building",
      "workoutDays": ["Push", "Pull", "Legs"]
    }
  ]
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        { role: "system", content: "Expert fitness trainer creating progressive workout frameworks in JSON format." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    console.log(`✅ Framework generated (${response.usage?.total_tokens || 0} tokens)`);
    return JSON.parse(response.choices[0].message.content || '{}');
  } catch (error) {
    console.error("Framework generation error:", error);
    throw error;
  }
}

export async function generateWeeklyWorkouts(
  request: WorkoutPlanRequest,
  framework: any,
  weekNumber: number,
  planSummary: string
): Promise<any> {
  
  const weekFocus = framework.weeklyStructure?.[weekNumber - 1]?.focus || 'Progressive training';
  const workoutDays = framework.weeklyStructure?.[weekNumber - 1]?.workoutDays || [];
  
  const prompt = `Generate Week ${weekNumber} workouts.

Plan: ${planSummary}
Week Focus: ${weekFocus}
Workout Days: ${workoutDays.join(', ')}

Progressive Intensity:
${weekNumber === 1 ? '- Foundation level, conservative approach' : 
  weekNumber === 2 ? '- Moderate progression' :
  weekNumber === 3 ? '- Increased challenge' :
  '- Peak intensity'}

Create ${request.workoutsPerWeek} workouts with structure:
Warm-up (5-10 min) → Main exercises (${request.timePerWorkout - 15} min) → Cool-down (5-10 min)

Return JSON:
{
  "workouts": [
    {
      "title": "Day 1: [Focus]",
      "description": "Workout description",
      "estimatedDuration": ${request.timePerWorkout},
      "exercises": [
        {
          "name": "Exercise Name",
          "sets": 3,
          "reps": "8-12",
          "weight": "bodyweight",
          "restTime": "60 seconds",
          "instructions": ["Step 1", "Step 2"],
          "muscleGroups": ["chest"],
          "equipment": ["dumbbells"]
        }
      ]
    }
  ]
}

Equipment: ${JSON.stringify(request.equipment)}
Level: ${request.fitnessLevel}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        { role: "system", content: "Fitness trainer creating progressive workouts in JSON format." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return result.workouts || [];
  } catch (error) {
    console.error(`Week ${weekNumber} generation error:`, error);
    throw error;
  }
}

export async function generateWorkoutPlan(request: WorkoutPlanRequest): Promise<GeneratedWorkoutPlan> {
  // Generate framework
  const framework = await generateWorkoutFramework(request);
  
  // Create lightweight summary for efficient parallel generation
  const planSummary = `${framework.title}: ${request.duration} weeks, ${request.workoutsPerWeek}x/week, ${request.timePerWorkout}min. Goals: ${request.goals.join(', ')}. Equipment: ${request.equipment.join(', ')}.`;
  
  // Generate all weeks simultaneously - no sequential dependencies
  const weekPromises = Array.from({ length: request.duration }, (_, i) => 
    generateWeeklyWorkouts(request, framework, i + 1, planSummary)
  );
  
  const weeklyResults = await Promise.all(weekPromises);
  const allWorkouts = weeklyResults.flat();

  console.log(`✅ Generated ${allWorkouts.length} workouts across ${request.duration} weeks`);

  return {
    title: framework.title,
    description: framework.description,
    duration: request.duration,
    totalWorkouts: allWorkouts.length,
    difficulty: request.fitnessLevel,
    equipment: request.equipment,
    workouts: allWorkouts
  };
}

// Keep other functions for compatibility
export async function generateCoachingTip(exerciseName: string, userLevel: string): Promise<{ tip: string }> {
  const response = await openai.chat.completions.create({
    model: "gpt-4.1",
    messages: [
      { role: "system", content: "Provide helpful coaching tips in JSON format." },
      { role: "user", content: `Give a coaching tip for ${exerciseName} for a ${userLevel} level person. Respond with JSON: {"tip": "your tip"}` }
    ],
    response_format: { type: "json_object" },
  });

  return JSON.parse(response.choices[0].message.content || '{"tip": "Focus on proper form"}');
}

export async function generateChatResponse(messages: any[], userContext: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: "gpt-4.1",
    messages: [
      { role: "system", content: "You are a supportive AI fitness coach. Provide encouraging, helpful responses." },
      ...messages
    ],
  });

  return response.choices[0].message.content || "I'm here to help with your fitness journey!";
}

export async function analyzeWorkoutProgress(sessions: any[]): Promise<any> {
  const response = await openai.chat.completions.create({
    model: "gpt-4.1",
    messages: [
      { role: "system", content: "Analyze workout progress and provide insights in JSON format." },
      { role: "user", content: `Analyze this workout data and provide insights: ${JSON.stringify(sessions)}. Respond with JSON: {"progressSummary": "summary", "recommendations": ["tip1", "tip2"], "strengthImprovement": 0.15}` }
    ],
    response_format: { type: "json_object" },
  });

  return JSON.parse(response.choices[0].message.content || '{"progressSummary": "Good progress", "recommendations": [], "strengthImprovement": 0}');
}