// Test the new YouTube search improvements
import pkg from 'pg';
const { Pool } = pkg;

// Classification function (copied from youtube.ts)
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
      name.includes('weight') || name.includes('lift') ||
      name.includes('pull-up') || name.includes('pullup') ||
      name.includes('pull-apart') || name.includes('band') ||
      name.includes('pushup') || name.includes('push-up')) {
    return 'strength';
  }
  
  // Default fallback
  return 'general';
}

// Generate search terms for each category
function generateSearchTerms(exerciseName, category) {
  const baseName = exerciseName.toLowerCase().replace(/[^\w\s]/g, '');
  
  switch (category) {
    case 'flexibility':
      return [
        `${exerciseName} stretch tutorial`,
        `${exerciseName} flexibility exercise`,
        `how to ${baseName} stretch properly`,
        `${exerciseName} stretching technique`,
        `${baseName} stretch form`
      ];
    case 'warmup':
      return [
        `${exerciseName} warm up exercise`,
        `how to do ${baseName} warmup`,
        `${exerciseName} mobility drill`,
        `${baseName} activation exercise`,
        `${exerciseName} dynamic warmup`
      ];
    case 'cardio':
      return [
        `${exerciseName} cardio exercise`,
        `how to ${baseName} properly`,
        `${exerciseName} technique tutorial`,
        `${baseName} form demonstration`,
        `${exerciseName} workout guide`
      ];
    case 'strength':
      return [
        `${exerciseName} form tutorial`,
        `how to ${baseName} proper form`,
        `${exerciseName} technique guide`,
        `${baseName} exercise demonstration`,
        `${exerciseName} strength training`
      ];
    default:
      return [
        `${exerciseName} exercise tutorial`,
        `how to do ${baseName}`,
        `${exerciseName} proper form`,
        `${baseName} technique`,
        `${exerciseName} demonstration`
      ];
  }
}

async function testClassificationAndSearchTerms() {
  console.log('Testing Exercise Classification and Search Term Generation');
  console.log('=========================================================');
  
  // Get some real exercises from the database
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    const result = await pool.query(`
      SELECT DISTINCT name 
      FROM exercises 
      WHERE youtube_id IS NULL 
      LIMIT 10
    `);
    
    console.log('\nTesting with real exercises from database:');
    console.log('------------------------------------------');
    
    result.rows.forEach(row => {
      const exerciseName = row.name;
      const category = classifyExercise(exerciseName);
      const searchTerms = generateSearchTerms(exerciseName, category);
      
      console.log(`\nExercise: "${exerciseName}"`);
      console.log(`Category: ${category}`);
      console.log('Search terms:');
      searchTerms.forEach((term, index) => {
        console.log(`  ${index + 1}. ${term}`);
      });
    });
    
  } catch (error) {
    console.error('Database error:', error);
  } finally {
    await pool.end();
  }
}

// Run the test
testClassificationAndSearchTerms().catch(console.error);