import { storage } from './server/storage.js';

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_BASE_URL = 'https://www.googleapis.com/youtube/v3';

async function fastSearchVideo(exerciseName) {
  const query = `how to ${exerciseName} exercise form`;
  const searchUrl = `${YOUTUBE_BASE_URL}/search?` +
    `part=snippet&type=video&q=${encodeURIComponent(query)}&` +
    `maxResults=3&key=${YOUTUBE_API_KEY}&` +
    `videoDefinition=any&videoDuration=medium&` +
    `relevanceLanguage=en&safeSearch=strict`;

  try {
    const response = await fetch(searchUrl);
    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.items || data.items.length === 0) {
      return null;
    }

    // Find first fitness-related video
    for (const item of data.items) {
      const title = item.snippet.title.toLowerCase();
      const channel = item.snippet.channelTitle.toLowerCase();
      
      // Check for fitness channels or exercise-related keywords
      if (channel.includes('fitness') || 
          channel.includes('workout') || 
          title.includes('exercise') ||
          title.includes('form') ||
          title.includes('how to')) {
        
        return {
          id: item.id.videoId,
          thumbnailUrl: `https://i.ytimg.com/vi/${item.id.videoId}/hqdefault.jpg`
        };
      }
    }

    // If no fitness-specific video found, use first result
    const firstItem = data.items[0];
    return {
      id: firstItem.id.videoId,
      thumbnailUrl: `https://i.ytimg.com/vi/${firstItem.id.videoId}/hqdefault.jpg`
    };

  } catch (error) {
    console.error(`Error searching for ${exerciseName}:`, error.message);
    return null;
  }
}

async function fastPopulateVideos() {
  console.log('🚀 Fast YouTube video population starting...');
  
  try {
    const allExercises = await storage.getExercises();
    const exercisesNeedingVideos = allExercises.filter(ex => !ex.youtubeId);
    
    console.log(`📊 Processing ${exercisesNeedingVideos.length} exercises`);
    
    if (exercisesNeedingVideos.length === 0) {
      console.log('✅ All exercises already have videos!');
      return;
    }

    // Process in parallel batches of 10
    const BATCH_SIZE = 10;
    let totalProcessed = 0;
    let successCount = 0;

    for (let i = 0; i < exercisesNeedingVideos.length; i += BATCH_SIZE) {
      const batch = exercisesNeedingVideos.slice(i, i + BATCH_SIZE);
      
      console.log(`\n📦 Processing batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(exercisesNeedingVideos.length/BATCH_SIZE)} (${batch.length} exercises)`);
      
      // Process batch in parallel
      const promises = batch.map(async (exercise) => {
        const video = await fastSearchVideo(exercise.name);
        if (video) {
          await storage.updateExercise(exercise.id, {
            youtubeId: video.id,
            thumbnailUrl: video.thumbnailUrl
          });
          return { success: true, exercise: exercise.name };
        }
        return { success: false, exercise: exercise.name };
      });

      const results = await Promise.all(promises);
      
      // Count results
      for (const result of results) {
        totalProcessed++;
        if (result.success) {
          successCount++;
          console.log(`  ✅ ${result.exercise}`);
        } else {
          console.log(`  ❌ ${result.exercise}`);
        }
      }

      // Small delay to respect API limits (only 1 second)
      if (i + BATCH_SIZE < exercisesNeedingVideos.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`\n🎉 Completed! ${successCount}/${totalProcessed} exercises now have videos`);

  } catch (error) {
    console.error('💥 Error during fast video population:', error);
  }
}

fastPopulateVideos();