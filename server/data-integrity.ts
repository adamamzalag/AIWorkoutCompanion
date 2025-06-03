import { storage } from "./storage";
import { searchExerciseVideo } from "./youtube";

export async function auditAndFixExerciseVideos(): Promise<{
  totalExercises: number;
  exercisesWithoutVideos: number;
  videosFound: number;
  failed: string[];
}> {
  console.log('🔍 Starting data integrity audit for exercise videos...');
  
  // Get all exercises without YouTube videos
  const exercisesWithoutVideos = await storage.getExercisesWithoutVideos();
  
  console.log(`📊 Found ${exercisesWithoutVideos.length} exercises without videos`);
  
  let videosFound = 0;
  const failed: string[] = [];
  
  for (const exercise of exercisesWithoutVideos) {
    console.log(`🎥 Searching video for: ${exercise.name} (${exercise.type})`);
    
    try {
      const videoResult = await searchExerciseVideo(exercise.name, exercise.type);
      
      if (videoResult) {
        await storage.updateExercise(exercise.id, {
          youtubeId: videoResult.id,
          thumbnailUrl: videoResult.thumbnailUrl
        });
        
        console.log(`✅ Found video for ${exercise.name}: ${videoResult.id}`);
        videosFound++;
      } else {
        console.log(`❌ No video found for ${exercise.name}`);
        failed.push(exercise.name);
      }
      
      // Small delay to respect API rate limits
      await new Promise(resolve => setTimeout(resolve, 200));
      
    } catch (error) {
      console.error(`❌ Error searching video for ${exercise.name}:`, error);
      failed.push(exercise.name);
    }
  }
  
  const totalExercises = await storage.getTotalExerciseCount();
  
  console.log(`📈 Video search complete:`);
  console.log(`   - Total exercises: ${totalExercises}`);
  console.log(`   - Videos found: ${videosFound}`);
  console.log(`   - Failed searches: ${failed.length}`);
  
  return {
    totalExercises,
    exercisesWithoutVideos: exercisesWithoutVideos.length,
    videosFound,
    failed
  };
}

export async function generateDataIntegrityReport(): Promise<{
  exerciseStats: any[];
  missingVideos: any[];
  duplicateExercises: any[];
  orphanedData: any[];
}> {
  console.log('📊 Generating comprehensive data integrity report...');
  
  // Exercise statistics by type
  const exerciseStats = await storage.getExerciseStatsByType();
  
  // Exercises missing videos
  const missingVideos = await storage.getExercisesWithoutVideos();
  
  // Check for duplicate exercises (same name, different IDs)
  const duplicateExercises = await storage.findDuplicateExercises();
  
  // Check for orphaned workout data (exercises referenced but not existing)
  const orphanedData = await storage.findOrphanedWorkoutData();
  
  return {
    exerciseStats,
    missingVideos,
    duplicateExercises,
    orphanedData
  };
}