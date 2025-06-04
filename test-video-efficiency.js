// Test script to analyze video search efficiency issues
const { DatabaseStorage } = require('./server/storage.ts');
const { searchExerciseVideo } = require('./server/youtube.ts');

async function testVideoEfficiency() {
  console.log('🔍 Testing video search efficiency...');
  
  const storage = new DatabaseStorage();
  
  try {
    // Get all exercises
    const allExercises = await storage.getExercises();
    console.log(`📊 Total exercises: ${allExercises.length}`);
    
    // Check how many have videos
    const exercisesWithVideos = allExercises.filter(ex => ex.youtubeId);
    const exercisesWithoutVideos = allExercises.filter(ex => !ex.youtubeId);
    
    console.log(`✅ Exercises with videos: ${exercisesWithVideos.length}`);
    console.log(`❌ Exercises without videos: ${exercisesWithoutVideos.length}`);
    
    // Show first few exercises without videos
    console.log('\n📝 Exercises missing videos:');
    exercisesWithoutVideos.slice(0, 5).forEach(ex => {
      console.log(`  - ${ex.name} (${ex.type})`);
    });
    
    // Test the getExercisesWithoutVideos method
    const methodResult = await storage.getExercisesWithoutVideos();
    console.log(`\n🔍 getExercisesWithoutVideos() returns: ${methodResult.length} exercises`);
    
    if (methodResult.length !== exercisesWithoutVideos.length) {
      console.log('⚠️ MISMATCH: Method result differs from manual filter!');
      console.log(`   Manual filter: ${exercisesWithoutVideos.length}`);
      console.log(`   Method result: ${methodResult.length}`);
    }
    
  } catch (error) {
    console.error('❌ Error testing video efficiency:', error);
  }
}

testVideoEfficiency();