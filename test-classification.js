// Test the exercise classification function
function classifyExercise(exerciseName) {
  const name = exerciseName.toLowerCase().trim();
  
  // Flexibility/Stretching exercises
  if (name.includes('stretch') || name.includes('stretching') || 
      name.includes('breathing') || name.includes('breath') ||
      name.includes('flexibility') || name.includes('cool down') ||
      name.includes('cooldown')) {
    return 'flexibility';
  }
  
  // Warm-up exercises
  if (name.includes('circles') || name.includes('circle') ||
      name.includes('swings') || name.includes('swing') ||
      name.includes('activation') || name.includes('warm') ||
      name.includes('mobility') || name.includes('dynamic')) {
    return 'warmup';
  }
  
  // Cardio exercises
  if (name.includes('treadmill') || name.includes('jogging') ||
      name.includes('running') || name.includes('bike') ||
      name.includes('cycling') || name.includes('cardio') ||
      name.includes('walking') || name.includes('jog')) {
    return 'cardio';
  }
  
  // Strength exercises
  if (name.includes('press') || name.includes('squat') ||
      name.includes('curl') || name.includes('row') ||
      name.includes('deadlift') || name.includes('bench') ||
      name.includes('barbell') || name.includes('dumbbell') ||
      name.includes('weight') || name.includes('lift')) {
    return 'strength';
  }
  
  // Default fallback
  return 'general';
}

// Test cases from our database
const testExercises = [
  'Arm circles',
  'Light treadmill jogging', 
  'Deep breathing',
  'Chest stretch',
  'Barbell Bench Press',
  'Dumbbell Shoulder Press',
  'Triceps stretch',
  'Bodyweight squats',
  'Band pull-aparts',
  'Scapular pull-ups'
];

console.log('Exercise Classification Test Results:');
console.log('====================================');

testExercises.forEach(exercise => {
  const category = classifyExercise(exercise);
  console.log(`"${exercise}" → ${category}`);
});