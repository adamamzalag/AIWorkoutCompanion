import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

function classifyExercise(exerciseName) {
  return 'strength'; // All remaining exercises are strength exercises
}

function generateSearchTerms(exerciseName, category) {
  return [
    `${exerciseName} exercise form`,
    `${exerciseName} proper technique`,
    `how to do ${exerciseName}`,
    `${exerciseName} tutorial`,
    `${exerciseName} demonstration`
  ];
}

function parseDuration(duration) {
  if (!duration) return 0;
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || '0');
  const minutes = parseInt(match[2] || '0'); 
  const seconds = parseInt(match[3] || '0');
  return hours * 3600 + minutes * 60 + seconds;
}

function scoreVideo(item, details, category) {
  const title = item.snippet.title.toLowerCase();
  const duration = parseDuration(details.contentDetails.duration);
  
  let score = 0;
  
  // Duration scoring (strict 5-minute maximum)
  if (duration > 300) return 0;
  if (duration >= 60 && duration <= 300) score += 30;
  if (duration >= 30 && duration < 60) score += 20;
  if (duration < 30) score += 10;
  
  // Strength exercise scoring
  if (title.includes('form') || title.includes('technique')) score += 25;
  if (title.includes('exercise') || title.includes('workout')) score += 20;
  if (title.includes('tutorial') || title.includes('how to')) score += 15;
  if (title.includes('beginner') || title.includes('proper')) score += 10;
  
  // Quality indicators
  if (details.statistics.viewCount > 10000) score += 10;
  if (details.statistics.likeCount > 100) score += 5;
  
  return score;
}

async function searchVideoForExercise(exerciseName) {
  const category = classifyExercise(exerciseName);
  const searchTerms = generateSearchTerms(exerciseName, category);
  
  console.log(`\n🔍 Searching for: ${exerciseName}`);
  
  let bestVideo = null;
  let bestScore = 0;
  
  for (const searchTerm of searchTerms) {
    try {
      console.log(`  → Trying: "${searchTerm}"`);
      
      const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(searchTerm)}&type=video&maxResults=10&key=${process.env.YOUTUBE_API_KEY}`;
      const searchResponse = await fetch(searchUrl);
      const searchData = await searchResponse.json();
      
      if (!searchData.items || searchData.items.length === 0) {
        console.log(`    ❌ No results found`);
        continue;
      }
      
      const videoIds = searchData.items.map(item => item.id.videoId).join(',');
      const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,statistics&id=${videoIds}&key=${process.env.YOUTUBE_API_KEY}`;
      const detailsResponse = await fetch(detailsUrl);
      const detailsData = await detailsResponse.json();
      
      for (let i = 0; i < searchData.items.length; i++) {
        const item = searchData.items[i];
        const details = detailsData.items.find(d => d.id === item.id.videoId);
        
        if (!details) continue;
        
        const score = scoreVideo(item, details, category);
        const duration = parseDuration(details.contentDetails.duration);
        
        console.log(`    📹 "${item.snippet.title}" - ${Math.floor(duration/60)}:${(duration%60).toString().padStart(2,'0')} - Score: ${score}`);
        
        if (score > bestScore) {
          bestScore = score;
          bestVideo = {
            id: item.id.videoId,
            title: item.snippet.title,
            thumbnailUrl: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
            duration: duration,
            score: score
          };
        }
      }
      
      if (bestScore > 40) {
        break;
      }
      
    } catch (error) {
      console.log(`    ❌ Error searching "${searchTerm}":`, error.message);
    }
    
    // Wait between searches
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  if (bestVideo) {
    console.log(`✅ Best match: "${bestVideo.title}" (${Math.floor(bestVideo.duration/60)}:${(bestVideo.duration%60).toString().padStart(2,'0')}) - Score: ${bestVideo.score}`);
    return bestVideo;
  } else {
    console.log(`❌ No suitable video found for ${exerciseName}`);
    return null;
  }
}

async function finishWorkout57Videos() {
  console.log('🎯 Finding videos for remaining Workout 57 exercises...\n');
  
  const remainingExercises = [
    { id: 142, name: 'Dumbbell Incline Chest Fly' },
    { id: 143, name: 'Triceps Dips (Bench or Parallel Bars)' },
    { id: 144, name: 'Cable Rope Overhead Triceps Extension' },
    { id: 145, name: 'Moderate Intensity Cardio - Air Bike' }
  ];
  
  let successCount = 0;
  
  for (const exercise of remainingExercises) {
    const video = await searchVideoForExercise(exercise.name);
    
    if (video) {
      try {
        await pool.query(
          'UPDATE exercises SET youtube_id = $1, thumbnail_url = $2 WHERE id = $3',
          [video.id, video.thumbnailUrl, exercise.id]
        );
        
        console.log(`✅ Updated exercise ${exercise.id}: ${exercise.name}`);
        successCount++;
        
      } catch (error) {
        console.log(`❌ Failed to update exercise ${exercise.id}:`, error.message);
      }
    }
    
    // Wait between exercises
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log(`\n📊 Final Results: ${successCount}/4 remaining exercises updated`);
  console.log('\n🎉 Workout 57 video optimization complete!');
}

finishWorkout57Videos()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });