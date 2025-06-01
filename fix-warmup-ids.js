import { storage } from './server/storage.js';

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function fixExistingWorkoutWarmups() {
  console.log('🔧 Fixing warmup/cooldown IDs in existing workouts...');
  
  try {
    // Get all workouts
    const workouts = await storage.getWorkouts();
    console.log(`Found ${workouts.length} workouts to check`);
    
    let updatedCount = 0;
    
    for (const workout of workouts) {
      let needsUpdate = false;
      let updatedWarmUp = workout.warmUp;
      let updatedCoolDown = workout.coolDown;
      
      // Process warmup
      if (workout.warmUp && typeof workout.warmUp === 'object' && workout.warmUp.activities) {
        console.log(`\n📝 Processing warmup for workout ${workout.id}: ${workout.title}`);
        
        const processedActivities = [];
        for (const activity of workout.warmUp.activities) {
          if (!activity.exerciseId || typeof activity.exerciseId === 'string') {
            // Need to find or create exercise
            console.log(`  🔍 Finding exercise for: ${activity.exercise}`);
            
            // Get all exercises
            const allExercises = await storage.getExercises();
            
            // Try to find existing exercise
            const targetSlug = slugify(activity.exercise);
            let existingExercise = allExercises.find(ex => 
              ex.name.toLowerCase() === activity.exercise.toLowerCase() ||
              ex.slug === targetSlug ||
              ex.name.toLowerCase().includes(activity.exercise.toLowerCase()) ||
              activity.exercise.toLowerCase().includes(ex.name.toLowerCase())
            );
            
            if (existingExercise) {
              console.log(`    ✅ Found existing: ${existingExercise.name} (ID: ${existingExercise.id})`);
              processedActivities.push({
                ...activity,
                exerciseId: existingExercise.id,
                exercise: existingExercise.name
              });
            } else {
              console.log(`    ➕ Creating new exercise: ${activity.exercise}`);
              const newExercise = await storage.createExercise({
                slug: targetSlug,
                name: activity.exercise,
                difficulty: "beginner",
                muscle_groups: ["general"],
                instructions: [`Perform ${activity.exercise.toLowerCase()} as instructed`],
                equipment: ["none"],
                youtubeId: null
              });
              
              console.log(`    ✅ Created exercise: ${newExercise.name} (ID: ${newExercise.id})`);
              processedActivities.push({
                ...activity,
                exerciseId: newExercise.id,
                exercise: newExercise.name
              });
            }
            needsUpdate = true;
          } else {
            // Already has proper ID
            processedActivities.push(activity);
          }
        }
        
        updatedWarmUp = {
          ...workout.warmUp,
          activities: processedActivities
        };
      }
      
      // Process cooldown
      if (workout.coolDown && typeof workout.coolDown === 'object' && workout.coolDown.activities) {
        console.log(`\n❄️ Processing cooldown for workout ${workout.id}: ${workout.title}`);
        
        const processedActivities = [];
        for (const activity of workout.coolDown.activities) {
          if (!activity.exerciseId || typeof activity.exerciseId === 'string') {
            console.log(`  🔍 Finding exercise for: ${activity.exercise}`);
            
            const allExercises = await storage.getExercises();
            const targetSlug = slugify(activity.exercise);
            let existingExercise = allExercises.find(ex => 
              ex.name.toLowerCase() === activity.exercise.toLowerCase() ||
              ex.slug === targetSlug ||
              ex.name.toLowerCase().includes(activity.exercise.toLowerCase()) ||
              activity.exercise.toLowerCase().includes(ex.name.toLowerCase())
            );
            
            if (existingExercise) {
              console.log(`    ✅ Found existing: ${existingExercise.name} (ID: ${existingExercise.id})`);
              processedActivities.push({
                ...activity,
                exerciseId: existingExercise.id,
                exercise: existingExercise.name
              });
            } else {
              console.log(`    ➕ Creating new exercise: ${activity.exercise}`);
              const newExercise = await storage.createExercise({
                slug: targetSlug,
                name: activity.exercise,
                difficulty: "beginner",
                muscle_groups: ["general"],
                instructions: [`Perform ${activity.exercise.toLowerCase()} as instructed`],
                equipment: ["none"],
                youtubeId: null
              });
              
              console.log(`    ✅ Created exercise: ${newExercise.name} (ID: ${newExercise.id})`);
              processedActivities.push({
                ...activity,
                exerciseId: newExercise.id,
                exercise: newExercise.name
              });
            }
            needsUpdate = true;
          } else {
            processedActivities.push(activity);
          }
        }
        
        updatedCoolDown = {
          ...workout.coolDown,
          activities: processedActivities
        };
      }
      
      // Update workout if needed
      if (needsUpdate) {
        console.log(`  💾 Updating workout ${workout.id} with real exercise IDs`);
        
        // Use direct SQL update since we need to update JSON fields
        await storage.db.update(storage.workouts)
          .set({
            warmUp: updatedWarmUp,
            coolDown: updatedCoolDown
          })
          .where(storage.eq(storage.workouts.id, workout.id));
          
        updatedCount++;
        console.log(`  ✅ Updated workout ${workout.id}`);
      }
    }
    
    console.log(`\n🎉 Migration completed! Updated ${updatedCount} workouts with real exercise IDs`);
    
  } catch (error) {
    console.error('💥 Error during migration:', error);
  }
}

fixExistingWorkoutWarmups();