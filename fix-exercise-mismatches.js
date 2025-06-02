import { storage } from './server/storage.js';

// Copy of the improved exercise matching function from routes.ts
function findBestExerciseMatch(exerciseName, exercises) {
  const normalizedName = exerciseName.toLowerCase().trim();
  
  // Create exercise name normalization map
  const normalizeExerciseName = (name) => {
    return name
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
  const scoreMatch = (exercise) => {
    const exName = exercise.name.toLowerCase();
    const exNormalized = normalizeExerciseName(exName);
    
    // Exact match (highest priority)
    if (exName === normalizedName) {
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
}

async function fixWorkoutMismatches() {
  console.log('🔧 Analyzing and fixing exercise mismatches in workout ID 51...');
  
  try {
    // Get workout 51 data
    const workout = await storage.getWorkout(51);
    const allExercises = await storage.getExercises();
    
    console.log('\n📊 Current Workout 51 Analysis:');
    console.log(`Title: ${workout.title}`);
    console.log(`Description: ${workout.description}`);
    
    let needsUpdate = false;
    let updatedWarmUp = workout.warmUp;
    let updatedCoolDown = workout.coolDown;
    
    // Analyze warm-up activities
    if (workout.warmUp && workout.warmUp.activities) {
      console.log('\n🔥 Warm-up Activities Analysis:');
      const updatedActivities = [];
      
      for (const activity of workout.warmUp.activities) {
        const currentExercise = allExercises.find(ex => ex.id === activity.exerciseId);
        console.log(`\n• AI Generated: "${activity.exercise}"`);
        console.log(`  Currently mapped to: "${currentExercise?.name}" (ID: ${activity.exerciseId})`);
        
        // Test our improved matching
        const { match: betterMatch, score } = findBestExerciseMatch(activity.exercise, allExercises);
        
        if (betterMatch && score >= 70) {
          console.log(`  ✅ Better match found: "${betterMatch.name}" (ID: ${betterMatch.id}) [confidence: ${score}%]`);
          
          if (betterMatch.id !== activity.exerciseId) {
            console.log(`  🔄 Updating exercise ID: ${activity.exerciseId} → ${betterMatch.id}`);
            updatedActivities.push({
              ...activity,
              exerciseId: betterMatch.id,
              exercise: betterMatch.name
            });
            needsUpdate = true;
          } else {
            console.log(`  ➡️ Current mapping is already correct`);
            updatedActivities.push(activity);
          }
        } else {
          console.log(`  ⚠️ No good match found (current match may be acceptable)`);
          updatedActivities.push(activity);
        }
      }
      
      if (needsUpdate) {
        updatedWarmUp = { ...workout.warmUp, activities: updatedActivities };
      }
    }
    
    // Analyze cool-down activities
    if (workout.coolDown && workout.coolDown.activities) {
      console.log('\n❄️ Cool-down Activities Analysis:');
      const updatedActivities = [];
      
      for (const activity of workout.coolDown.activities) {
        const currentExercise = allExercises.find(ex => ex.id === activity.exerciseId);
        console.log(`\n• AI Generated: "${activity.exercise}"`);
        console.log(`  Currently mapped to: "${currentExercise?.name}" (ID: ${activity.exerciseId})`);
        
        // Test our improved matching
        const { match: betterMatch, score } = findBestExerciseMatch(activity.exercise, allExercises);
        
        if (betterMatch && score >= 70) {
          console.log(`  ✅ Better match found: "${betterMatch.name}" (ID: ${betterMatch.id}) [confidence: ${score}%]`);
          
          if (betterMatch.id !== activity.exerciseId) {
            console.log(`  🔄 Updating exercise ID: ${activity.exerciseId} → ${betterMatch.id}`);
            updatedActivities.push({
              ...activity,
              exerciseId: betterMatch.id,
              exercise: betterMatch.name
            });
            needsUpdate = true;
          } else {
            console.log(`  ➡️ Current mapping is already correct`);
            updatedActivities.push(activity);
          }
        } else {
          console.log(`  ⚠️ No good match found (current match may be acceptable)`);
          updatedActivities.push(activity);
        }
      }
      
      if (needsUpdate) {
        updatedCoolDown = { ...workout.coolDown, activities: updatedActivities };
      }
    }
    
    // Apply updates if needed
    if (needsUpdate) {
      console.log('\n💾 Applying fixes to workout 51...');
      await storage.updateWorkout(51, {
        warmUp: updatedWarmUp,
        coolDown: updatedCoolDown
      });
      console.log('✅ Workout 51 updated successfully!');
    } else {
      console.log('\n✅ No updates needed - all exercises already properly matched');
    }
    
    console.log('\n🎉 Analysis complete!');
    
  } catch (error) {
    console.error('💥 Error during mismatch analysis:', error);
  }
}

fixWorkoutMismatches();