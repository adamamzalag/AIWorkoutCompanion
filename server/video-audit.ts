import { storage } from "./storage";
import { searchYouTubeVideos } from "./youtube";

interface VideoSearchResult {
  exerciseId: number;
  exerciseName: string;
  exerciseType: string;
  success: boolean;
  videoId?: string;
  error?: string;
}

export async function runComprehensiveVideoAudit(): Promise<{
  totalProcessed: number;
  successCount: number;
  failureCount: number;
  results: VideoSearchResult[];
}> {
  console.log('🔍 Starting comprehensive video audit for exercises missing YouTube coverage...');
  
  // Get all exercises without YouTube videos
  const exercisesWithoutVideos = await storage.getExercisesWithoutVideos();
  console.log(`📊 Found ${exercisesWithoutVideos.length} exercises without YouTube videos`);
  
  const results: VideoSearchResult[] = [];
  let successCount = 0;
  let failureCount = 0;

  for (const exercise of exercisesWithoutVideos) {
    console.log(`🎯 Searching videos for: ${exercise.name} (${exercise.type})`);
    
    try {
      // Search for YouTube videos using exercise name
      const videos = await searchYouTubeVideos(exercise.name);
      
      if (videos.length > 0) {
        // Use the first video found
        const selectedVideo = videos[0];
        
        // Update exercise with YouTube ID
        await storage.updateExercise(exercise.id, {
          youtubeId: selectedVideo.id
        });
        
        results.push({
          exerciseId: exercise.id,
          exerciseName: exercise.name,
          exerciseType: exercise.type,
          success: true,
          videoId: selectedVideo.id
        });
        
        successCount++;
        console.log(`✅ Found and assigned video ${selectedVideo.id} to ${exercise.name}`);
      } else {
        results.push({
          exerciseId: exercise.id,
          exerciseName: exercise.name,
          exerciseType: exercise.type,
          success: false,
          error: 'No videos found'
        });
        
        failureCount++;
        console.log(`❌ No videos found for ${exercise.name}`);
      }
      
      // Add small delay to respect YouTube API rate limits
      await new Promise(resolve => setTimeout(resolve, 200));
      
    } catch (error) {
      results.push({
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        exerciseType: exercise.type,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      failureCount++;
      console.log(`❌ Error searching for ${exercise.name}:`, error);
    }
  }

  const summary = {
    totalProcessed: exercisesWithoutVideos.length,
    successCount,
    failureCount,
    results
  };

  console.log(`🎯 Video audit complete!`);
  console.log(`📊 Processed: ${summary.totalProcessed}, Success: ${successCount}, Failed: ${failureCount}`);
  
  return summary;
}