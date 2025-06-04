// Test script for YouTube video algorithm improvements
import { searchExerciseVideo } from './server/youtube.js';
import { storage } from './server/storage.js';

// First batch: Focus on problematic exercises
const testBatch1 = [
  { name: "Arm circles and leg swings", type: "warmup" },
  { name: "Air bike sprint intervals", type: "cardio" },
  { name: "Air bike sprint intervals (40s sprint / 20s easy pedaling)", type: "cardio" },
  { name: "Treadmill sprint intervals (45s sprint / 30s walk)", type: "cardio" },
  { name: "Deep breathing and walking", type: "cooldown" },
  { name: "Rest", type: "cardio" },
  { name: "Air bike recovery slow pedal", type: "cardio" },
  { name: "Barbell Back Squat", type: "main" }, // Known good case for comparison
  { name: "Push-ups", type: "main" }, // Known good case for comparison
  { name: "Plank hold", type: "main" } // Known good case for comparison
];

async function testVideoAlgorithm() {
  console.log('🧪 Testing YouTube Video Algorithm with Updated Thresholds');
  console.log('📊 Quality threshold: 50+ points');
  console.log('🔍 Search method: Removed intitle: restriction\n');
  
  const results = [];
  
  for (let i = 0; i < testBatch1.length; i++) {
    const exercise = testBatch1[i];
    console.log(`\n${i + 1}/${testBatch1.length}. Testing: "${exercise.name}" (${exercise.type})`);
    console.log('=' + '='.repeat(60));
    
    try {
      const startTime = Date.now();
      const video = await searchExerciseVideo(exercise.name, exercise.type);
      const duration = Date.now() - startTime;
      
      if (video) {
        console.log(`✅ FOUND VIDEO:`);
        console.log(`   ID: ${video.id}`);
        console.log(`   Thumbnail: ${video.thumbnailUrl}`);
        console.log(`   Search time: ${duration}ms`);
        
        results.push({
          exercise: exercise.name,
          type: exercise.type,
          success: true,
          videoId: video.id,
          searchTime: duration
        });
      } else {
        console.log(`❌ NO VIDEO FOUND (Quality threshold not met)`);
        
        results.push({
          exercise: exercise.name,
          type: exercise.type,
          success: false,
          reason: 'Quality threshold not met',
          searchTime: duration
        });
      }
      
      // Rate limiting: Wait 2 seconds between searches
      if (i < testBatch1.length - 1) {
        console.log(`⏳ Waiting 2 seconds before next search...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
    } catch (error) {
      console.log(`❌ ERROR: ${error.message}`);
      
      results.push({
        exercise: exercise.name,
        type: exercise.type,
        success: false,
        error: error.message
      });
    }
  }
  
  // Summary Report
  console.log('\n\n📋 TEST RESULTS SUMMARY');
  console.log('=' + '='.repeat(50));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`✅ Successful: ${successful.length}/${results.length}`);
  console.log(`❌ Failed: ${failed.length}/${results.length}`);
  
  console.log('\n🎯 SUCCESSFUL MATCHES:');
  successful.forEach(r => {
    console.log(`   • ${r.exercise} → ${r.videoId}`);
  });
  
  console.log('\n⚠️  FAILED MATCHES:');
  failed.forEach(r => {
    const reason = r.error || r.reason || 'Unknown';
    console.log(`   • ${r.exercise} (${reason})`);
  });
  
  console.log('\n🔍 KEY OBSERVATIONS:');
  console.log('   • Check if "Arm circles and leg swings" now finds proper video');
  console.log('   • Verify air bike exercises either find good videos or show none');
  console.log('   • Confirm known good exercises (squat, push-ups) still work');
  
  return results;
}

// Run the test
testVideoAlgorithm().catch(console.error);