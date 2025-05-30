import OpenAI from "openai";

// Updated to use GPT-4.1 for improved reasoning and JSON structure adherence
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
});

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

export async function generateWorkoutPlan(request: WorkoutPlanRequest): Promise<GeneratedWorkoutPlan> {
  const prompt = `Generate a comprehensive ${request.duration}-week workout plan with the following specifications:

Fitness Level: ${request.fitnessLevel}
Available Equipment: ${request.equipment.join(", ") || "None (bodyweight only)"}
Goals: ${request.goals.join(", ")}
Workouts per week: ${request.workoutsPerWeek}
Time per workout: ${request.timePerWorkout} minutes

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
      model: "gpt-4.1",
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

Ensure exercises progress logically throughout the plan with appropriate volume and intensity increases.`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
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
      model: "gpt-4.1",
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
      model: "gpt-4.1",
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
    });

    return response.choices[0].message.content || "I'm here to help you reach your fitness goals! What would you like to know?";
  } catch (error) {
    console.error("Error generating chat response:", error);
    return "I'm here to help you reach your fitness goals! What would you like to know?";
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
      model: "gpt-4.1",
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
