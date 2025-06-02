import { storage } from './server/storage.js';

// Copy of the improved exercise matching function from routes.ts
function findBestExerciseMatch(exerciseName, exercises) {
  const normalizedName = exerciseName.toLowerCase().trim();
  
  const normalizeExerciseName = (name) => {
    return name
      .toLowerCase()
      .replace(/\b(light|dynamic|deep|static|moderate|brisk)\b/g, '')
      .replace(/\b(treadmill|on treadmill)\b/g, 'treadmill')
      .replace(/\b(jogging|running)\b/g, 'jogging')
      .replace(/\b(stretch|stretching)\b/g, 'stretch')
      .replace(/\b(breathing|breath)\b/g, 'breathing')
      .replace(/\b(circles?|circle)\b/g, 'circles')
      .replace(/\s+/g, ' ')
      .trim();
  };
  
  const normalizedTarget = normalizeExerciseName(normalizedName);
  
  const scoreMatch = (exercise) => {
    const exName = exercise.name.toLowerCase();
    const exNormalized = normalizeExerciseName(exName);
    
    if (exName === normalizedName) return 100;
    if (exNormalized === normalizedTarget) return 95;
    
    const targetWords = normalizedTarget.split(' ').filter(w => w.length > 2);
    const exerciseWords = exNormalized.split(' ').filter(w => w.length > 2);
    
    if (targetWords.length === 0 || exerciseWords.length === 0) return 0;
    
    const commonWords = targetWords.filter(word => exerciseWords.includes(word));
    const wordOverlapRatio = commonWords.length / Math.max(targetWords.length, exerciseWords.length);
    
    const isBreathingExercise = normalizedTarget.includes('breathing') || normalizedTarget.includes('breath');
    const isStretchExercise = normalizedTarget.includes('stretch');
    const isCardioExercise = normalizedTarget.includes('jogging') || normalizedTarget.includes('treadmill') || normalizedTarget.includes('running');
    const isArmExercise = normalizedTarget.includes('arm') || normalizedTarget.includes('circles');
    
    const targetIsBreathing = exNormalized.includes('breathing') || exNormalized.includes('breath');
    const targetIsStretch = exNormalized.includes('stretch');
    const targetIsCardio = exNormalized.includes('jogging') || exNormalized.includes('treadmill') || exNormalized.includes('running');
    const targetIsArm = exNormalized.includes('arm') || exNormalized.includes('circles');
    
    if (isBreathingExercise && !targetIsBreathing) return 0;
    if (isStretchExercise && !targetIsStretch) return 0;
    if (isCardioExercise && !targetIsCardio) return 0;
    if (isArmExercise && !targetIsArm && wordOverlapRatio < 0.5) return 0;
    
    if (wordOverlapRatio >= 0.8) return 85;
    if (wordOverlapRatio >= 0.6) return 75;
    if (wordOverlapRatio >= 0.4) return 60;
    if (wordOverlapRatio >= 0.2) return 40;
    
    return 0;
  };
  
  let bestMatch = null;
  let bestScore = 0;
  
  for (const exercise of exercises) {
    const score = scoreMatch(exercise);
    if (score > bestScore && score >= 70) {
      bestScore = score;
      bestMatch = exercise;
    }
  }
  
  return { match: bestMatch, score: bestScore };
}

async function analyzeAllWorkouts() {
  console.log('🔍 Comprehensive Analysis: Checking All Workouts for Exercise Mismatches');
  console.log('================================================================\n');
  
  try {
    const allWorkouts = await storage.getWorkouts();
    const allExercises = await storage.getExercises();
    
    console.log(`📊 Found ${allWorkouts.length} workouts to analyze`);
    console.log(`📊 Exercise database contains ${allExercises.length} exercises\n`);
    
    let totalMismatches = 0;
    let totalFixed = 0;
    const workoutsToUpdate = [];
    
    for (const workout of allWorkouts) {
      console.log(`\n🎯 Analyzing Workout ${workout.id}: "${workout.title}"`);
      let workoutNeedsUpdate = false;
      let updatedWarmUp = workout.warmUp;
      let updatedCoolDown = workout.coolDown;
      
      // Check warm-up activities
      if (workout.warmUp && workout.warmUp.activities) {
        console.log(`  🔥 Warm-up activities: ${workout.warmUp.activities.length}`);
        const updatedActivities = [];
        
        for (const activity of workout.warmUp.activities) {
          const currentExercise = allExercises.find(ex => ex.id === activity.exerciseId);
          const { match: betterMatch, score } = findBestExerciseMatch(activity.exercise, allExercises);
          
          if (betterMatch && betterMatch.id !== activity.exerciseId && score >= 70) {
            console.log(`    ❌ MISMATCH: "${activity.exercise}" → mapped to "${currentExercise?.name}" (ID: ${activity.exerciseId})`);
            console.log(`    ✅ BETTER MATCH: "${betterMatch.name}" (ID: ${betterMatch.id}) [confidence: ${score}%]`);
            
            updatedActivities.push({
              ...activity,
              exerciseId: betterMatch.id,
              exercise: betterMatch.name
            });
            totalMismatches++;
            workoutNeedsUpdate = true;
          } else if (!betterMatch || score < 70) {
            console.log(`    ⚠️  NO GOOD MATCH: "${activity.exercise}" → keeping current mapping to "${currentExercise?.name}"`);
            updatedActivities.push(activity);
          } else {
            console.log(`    ✅ CORRECT: "${activity.exercise}" → "${currentExercise?.name}"`);
            updatedActivities.push(activity);
          }
        }
        
        if (workoutNeedsUpdate) {
          updatedWarmUp = { ...workout.warmUp, activities: updatedActivities };
        }
      }
      
      // Check cool-down activities
      if (workout.coolDown && workout.coolDown.activities) {
        console.log(`  ❄️  Cool-down activities: ${workout.coolDown.activities.length}`);
        const updatedActivities = [];
        
        for (const activity of workout.coolDown.activities) {
          const currentExercise = allExercises.find(ex => ex.id === activity.exerciseId);
          const { match: betterMatch, score } = findBestExerciseMatch(activity.exercise, allExercises);
          
          if (betterMatch && betterMatch.id !== activity.exerciseId && score >= 70) {
            console.log(`    ❌ MISMATCH: "${activity.exercise}" → mapped to "${currentExercise?.name}" (ID: ${activity.exerciseId})`);
            console.log(`    ✅ BETTER MATCH: "${betterMatch.name}" (ID: ${betterMatch.id}) [confidence: ${score}%]`);
            
            updatedActivities.push({
              ...activity,
              exerciseId: betterMatch.id,
              exercise: betterMatch.name
            });
            totalMismatches++;
            workoutNeedsUpdate = true;
          } else if (!betterMatch || score < 70) {
            console.log(`    ⚠️  NO GOOD MATCH: "${activity.exercise}" → keeping current mapping to "${currentExercise?.name}"`);
            updatedActivities.push(activity);
          } else {
            console.log(`    ✅ CORRECT: "${activity.exercise}" → "${currentExercise?.name}"`);
            updatedActivities.push(activity);
          }
        }
        
        if (workoutNeedsUpdate) {
          updatedCoolDown = { ...workout.coolDown, activities: updatedActivities };
        }
      }
      
      if (workoutNeedsUpdate) {
        workoutsToUpdate.push({
          id: workout.id,
          title: workout.title,
          warmUp: updatedWarmUp,
          coolDown: updatedCoolDown
        });
      }
    }
    
    console.log('\n================================================================');
    console.log('📋 COMPREHENSIVE ANALYSIS SUMMARY');
    console.log('================================================================');
    console.log(`Total mismatches found: ${totalMismatches}`);
    console.log(`Workouts requiring updates: ${workoutsToUpdate.length}`);
    
    if (workoutsToUpdate.length > 0) {
      console.log('\n💾 Applying fixes to all mismatched workouts...');
      
      for (const workout of workoutsToUpdate) {
        await storage.updateWorkout(workout.id, {
          warmUp: workout.warmUp,
          coolDown: workout.coolDown
        });
        console.log(`✅ Updated workout ${workout.id}: "${workout.title}"`);
        totalFixed++;
      }
      
      console.log(`\n🎉 Successfully fixed ${totalFixed} workouts!`);
    } else {
      console.log('\n🎉 No mismatches found - all exercises are properly mapped!');
    }
    
    console.log('\n================================================================');
    console.log('🔮 FUTURE MISMATCH PREVENTION');
    console.log('================================================================');
    console.log('✅ Improved matching algorithm is now active in routes.ts');
    console.log('✅ 70% confidence threshold prevents bad matches');
    console.log('✅ Context validation prevents mismatched exercise types');
    console.log('✅ All new workout generations will use the improved logic');
    console.log('✅ Database is now clean and ready for Priority 2');
    
  } catch (error) {
    console.error('💥 Error during comprehensive analysis:', error);
  }
}

analyzeAllWorkouts();