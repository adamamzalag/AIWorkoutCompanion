import { searchExerciseVideo } from './server/youtube.js';
import { storage } from './server/storage.js';

async function populateVideos() {
  console.log('🚀 Starting intelligent YouTube video population with debugging...');
  
  try {
    // Get exercises that need videos
    const allExercises = await storage.getExercises();
    const exercisesNeedingVideos = allExercises.filter(ex => !ex.youtubeId);
    
    console.log(`📊 Found ${exercisesNeedingVideos.length} exercises needing YouTube videos out of ${allExercises.length} total`);
    
    if (exercisesNeedingVideos.length === 0) {
      console.log('✅ All exercises already have videos!');
      return;
    }
    
    // First, let's check the specific problematic exercises from the user's workout
    const problemExercises = [
      { id: 122, name: 'Dumbbell Triceps Kickbacks' }, // Video unavailable issue
      { id: 124, name: 'Chest stretch' } // Wrong video content issue
    ];
    
    console.log('\n🔍 First, let\'s debug the problematic exercises...');
    
    for (const problemEx of problemExercises) {
      const exercise = allExercises.find(ex => ex.id === problemEx.id);
      if (!exercise) continue;
      
      console.log(`\n🚨 DEBUGGING PROBLEM EXERCISE: ${exercise.name} (ID: ${exercise.id})`);
      console.log(`   Current youtubeId: ${exercise.youtubeId || 'None'}`);
      console.log(`   Current thumbnailUrl: ${exercise.thumbnailUrl || 'None'}`);
      
      // Test current video if it exists
      if (exercise.youtubeId) {
        try {
          const testUrl = `https://i.ytimg.com/vi/${exercise.youtubeId}/mqdefault.jpg`;
          const response = await fetch(testUrl, { method: 'HEAD' });
          console.log(`   ✅ Current video accessibility test: ${response.status} ${response.ok ? 'OK' : 'FAILED'}`);
        } catch (error) {
          console.log(`   ❌ Current video accessibility test FAILED: ${error.message}`);
        }
      }
      
      // Search for a better video
      console.log(`   🔍 Searching for replacement video...`);
      const newVideo = await searchExerciseVideo(exercise.name);
      
      if (newVideo && newVideo.id !== exercise.youtubeId) {
        console.log(`   🎯 Found new/better video: ${newVideo.id}`);
        await storage.updateExercise(exercise.id, {
          youtubeId: newVideo.id,
          thumbnailUrl: newVideo.thumbnailUrl
        });
        console.log(`   ✅ Updated ${exercise.name} with new video`);
      } else if (newVideo && newVideo.id === exercise.youtubeId) {
        console.log(`   ⚠️ Search returned same video - content quality may be the issue`);
      } else {
        console.log(`   ❌ No suitable replacement video found`);
      }
    }
    
    console.log('\n📋 Now processing remaining exercises in batches...');
    
    const BATCH_SIZE = 5; // Smaller batches for better debugging
    const DELAY_BETWEEN_BATCHES = 3000; // 3 seconds for API rate limiting
    let successCount = 0;
    let failCount = 0;
    
    for (let i = 0; i < exercisesNeedingVideos.length; i += BATCH_SIZE) {
      const batch = exercisesNeedingVideos.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i/BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(exercisesNeedingVideos.length/BATCH_SIZE);
      
      console.log(`\n📦 Processing batch ${batchNum}/${totalBatches} (${batch.length} exercises)`);
      
      for (const exercise of batch) {
        try {
          console.log(`\n  🔍 [${exercise.id}] ${exercise.name}`);
          const video = await searchExerciseVideo(exercise.name);
          
          if (video) {
            await storage.updateExercise(exercise.id, {
              youtubeId: video.id,
              thumbnailUrl: video.thumbnailUrl
            });
            successCount++;
            console.log(`  ✅ SUCCESS: Video ${video.id} saved for ${exercise.name}`);
          } else {
            failCount++;
            console.log(`  ❌ FAILED: No suitable video found for ${exercise.name}`);
          }
        } catch (error) {
          failCount++;
          console.error(`  💥 ERROR processing ${exercise.name}:`, error.message);
        }
      }
      
      // Wait between batches to avoid rate limiting
      if (i + BATCH_SIZE < exercisesNeedingVideos.length) {
        console.log(`\n  ⏱️ Waiting ${DELAY_BETWEEN_BATCHES/1000}s before next batch...`);
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
      }
    }
    
    console.log('\n🎉 YouTube video population completed!');
    console.log(`📈 Results: ${successCount} successes, ${failCount} failures`);
    
    // Show final summary
    const updatedExercises = await storage.getExercises();
    const exercisesWithVideos = updatedExercises.filter(ex => ex.youtubeId);
    console.log(`📊 Final status: ${exercisesWithVideos.length}/${updatedExercises.length} exercises have YouTube videos (${Math.round(exercisesWithVideos.length/updatedExercises.length*100)}%)`);
    
    // Show breakdown by category
    const withVideos = exercisesWithVideos.length;
    const withoutVideos = updatedExercises.length - withVideos;
    console.log(`✅ With videos: ${withVideos}`);
    console.log(`❌ Without videos: ${withoutVideos}`);
    
  } catch (error) {
    console.error('💥 Fatal error during video population:', error);
  }
}

populateVideos();