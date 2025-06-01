import { searchExerciseVideo } from './server/youtube.js';
import { storage } from './server/storage.js';

async function populateVideos() {
  console.log('Starting YouTube video population...');
  
  try {
    // Get exercises that need videos
    const allExercises = await storage.getExercises();
    const exercisesNeedingVideos = allExercises.filter(ex => !ex.youtubeId);
    
    console.log(`Found ${exercisesNeedingVideos.length} exercises needing YouTube videos`);
    
    if (exercisesNeedingVideos.length === 0) {
      console.log('All exercises already have videos!');
      return;
    }
    
    const BATCH_SIZE = 10;
    const DELAY_BETWEEN_BATCHES = 2000; // 2 seconds
    
    for (let i = 0; i < exercisesNeedingVideos.length; i += BATCH_SIZE) {
      const batch = exercisesNeedingVideos.slice(i, i + BATCH_SIZE);
      console.log(`Processing batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(exercisesNeedingVideos.length/BATCH_SIZE)} (${batch.length} exercises)`);
      
      for (const exercise of batch) {
        try {
          console.log(`  Searching video for: ${exercise.name}`);
          const video = await searchExerciseVideo(exercise.name);
          
          if (video) {
            await storage.updateExercise(exercise.id, {
              youtubeId: video.id,
              thumbnailUrl: video.thumbnailUrl
            });
            console.log(`  ✓ Found video for ${exercise.name}: ${video.id}`);
          } else {
            console.log(`  ✗ No video found for ${exercise.name}`);
          }
        } catch (error) {
          console.error(`  Error processing ${exercise.name}:`, error.message);
        }
      }
      
      // Wait between batches to avoid rate limiting
      if (i + BATCH_SIZE < exercisesNeedingVideos.length) {
        console.log(`  Waiting ${DELAY_BETWEEN_BATCHES/1000}s before next batch...`);
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
      }
    }
    
    console.log('✅ YouTube video population completed!');
    
    // Show summary
    const updatedExercises = await storage.getExercises();
    const exercisesWithVideos = updatedExercises.filter(ex => ex.youtubeId);
    console.log(`Final result: ${exercisesWithVideos.length}/${updatedExercises.length} exercises now have YouTube videos`);
    
  } catch (error) {
    console.error('Error during video population:', error);
  }
}

populateVideos();