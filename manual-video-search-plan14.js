// Manual test of video search for plan 14 exercises
import pkg from 'pg';
const { Pool } = pkg;

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_BASE_URL = 'https://www.googleapis.com/youtube/v3';

// Classification function
function classifyExercise(exerciseName) {
  const name = exerciseName.toLowerCase().trim();
  
  if (name.includes('stretch') || name.includes('pose') || name.includes('yoga')) {
    return 'flexibility';
  }
  if (name.includes('circles') || name.includes('warm') || name.includes('mobility')) {
    return 'warmup';
  }
  if (name.includes('press') || name.includes('squat') || name.includes('curl') || 
      name.includes('pull-up') || name.includes('push-up') || name.includes('dumbbell') ||
      name.includes('barbell') || name.includes('triceps') || name.includes('biceps')) {
    return 'strength';
  }
  if (name.includes('treadmill') || name.includes('jogging') || name.includes('cardio') || name.includes('bike')) {
    return 'cardio';
  }
  return 'general';
}

// Generate category-specific search terms
function generateSearchTerms(exerciseName, category) {
  const baseName = exerciseName.toLowerCase().replace(/[^\w\s]/g, '');
  
  switch (category) {
    case 'strength':
      return [
        `${exerciseName} form tutorial`,
        `how to ${baseName} proper form`
      ];
    case 'cardio':
      return [
        `${exerciseName} technique`,
        `how to ${baseName} properly`
      ];
    default:
      return [
        `${exerciseName} exercise tutorial`,
        `how to do ${baseName}`
      ];
  }
}

async function testVideoSearchForPlan14() {
  console.log('Manual Video Search Test for Plan 14');
  console.log('====================================');
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    // Get 2 exercises from plan 14 that need videos
    const result = await pool.query(`
      SELECT DISTINCT e.id, e.name, e.youtube_id 
      FROM exercises e, workouts w, jsonb_array_elements(w.exercises) as exercise_data
      WHERE w.plan_id = 14 
      AND e.id = (exercise_data->>'exerciseId')::int 
      AND e.youtube_id IS NULL 
      LIMIT 2
    `);
    
    console.log(`Testing video search for ${result.rows.length} exercises:\n`);
    
    for (const exercise of result.rows) {
      console.log(`Exercise: "${exercise.name}"`);
      const category = classifyExercise(exercise.name);
      console.log(`Category: ${category}`);
      
      const searchTerms = generateSearchTerms(exercise.name, category);
      console.log(`Search terms: ${searchTerms.join(', ')}`);
      
      // Test first search term
      const query = searchTerms[0];
      console.log(`Testing search: "${query}"`);
      
      try {
        const searchUrl = `${YOUTUBE_BASE_URL}/search?` +
          `part=snippet&type=video&q=${encodeURIComponent(query)}&` +
          `maxResults=3&key=${YOUTUBE_API_KEY}&` +
          `videoDuration=medium&relevanceLanguage=en&safeSearch=strict`;

        const response = await fetch(searchUrl);
        if (!response.ok) {
          console.log(`  API Error: ${response.status}`);
          continue;
        }

        const data = await response.json();
        if (data.items && data.items.length > 0) {
          const video = data.items[0];
          console.log(`  Found: "${video.snippet.title}"`);
          console.log(`  Channel: ${video.snippet.channelTitle}`);
          console.log(`  Video ID: ${video.id.videoId}`);
          
          // Could update database here: 
          // await pool.query('UPDATE exercises SET youtube_id = $1, thumbnail_url = $2 WHERE id = $3',
          //   [video.id.videoId, video.snippet.thumbnails.medium.url, exercise.id]);
          
        } else {
          console.log(`  No results found`);
        }
      } catch (error) {
        console.log(`  Error: ${error.message}`);
      }
      
      console.log(''); // blank line
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
  } catch (error) {
    console.error('Database error:', error);
  } finally {
    await pool.end();
  }
}

testVideoSearchForPlan14().catch(console.error);