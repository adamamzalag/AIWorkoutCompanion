import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Exercise classification function
function classifyExercise(exerciseName) {
  const name = exerciseName.toLowerCase();
  
  // Flexibility/Stretching patterns
  if (name.includes('stretch') || name.includes('flexibility') || 
      name.includes('relaxation') || name.includes('breathing')) {
    return 'flexibility';
  }
  
  // Warmup patterns
  if (name.includes('circles') || name.includes('warm') ||
      name.includes('pull-apart') || name.includes('band pull')) {
    return 'warmup';
  }
  
  // Cardio patterns
  if (name.includes('cardio') || name.includes('bike') || name.includes('treadmill') ||
      name.includes('jog') || name.includes('run') || name.includes('cycling')) {
    return 'cardio';
  }
  
  // Strength patterns (default for most exercises)
  return 'strength';
}

// Generate category-specific search terms
function generateSearchTerms(exerciseName, category) {
  const baseName = exerciseName.toLowerCase();
  
  switch (category) {
    case 'strength':
      return [
        `${exerciseName} exercise form`,
        `${exerciseName} proper technique`,
        `how to do ${exerciseName}`,
        `${exerciseName} tutorial`,
        `${exerciseName} demonstration`
      ];
    
    case 'cardio':
      return [
        `${exerciseName} workout`,
        `${exerciseName} exercise`,
        `${exerciseName} technique`,
        `how to ${exerciseName}`,
        `${exerciseName} form`
      ];
    
    case 'flexibility':
      return [
        `${exerciseName} technique`,
        `${exerciseName} exercise`,
        `how to do ${exerciseName}`,
        `${exerciseName} proper form`,
        `${exerciseName} demonstration`
      ];
    
    case 'warmup':
      return [
        `${exerciseName} exercise`,
        `${exerciseName} warmup`,
        `how to do ${exerciseName}`,
        `${exerciseName} technique`,
        `${exerciseName} demonstration`
      ];
    
    default:
      return [`${exerciseName} exercise`, `how to do ${exerciseName}`];
  }
}

// Parse YouTube duration from ISO 8601 format
function parseDuration(duration) {
  if (!duration) return 0;
  
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  
  const hours = parseInt(match[1] || '0');
  const minutes = parseInt(match[2] || '0'); 
  const seconds = parseInt(match[3] || '0');
  
  return hours * 3600 + minutes * 60 + seconds;
}

// Score video relevance
function scoreVideo(item, details, category) {
  const title = item.snippet.title.toLowerCase();
  const description = item.snippet.description.toLowerCase();
  const duration = parseDuration(details.contentDetails.duration);
  
  let score = 0;
  
  // Duration scoring (strict 5-minute maximum)
  if (duration > 300) return 0; // Automatically disqualify videos over 5 minutes
  if (duration >= 60 && duration <= 300) score += 30; // Prefer 1-5 minute videos
  if (duration >= 30 && duration < 60) score += 20; // Short videos ok
  if (duration < 30) score += 10; // Very short videos lower priority
  
  // Category-specific scoring
  switch (category) {
    case 'strength':
      if (title.includes('form') || title.includes('technique')) score += 25;
      if (title.includes('exercise') || title.includes('workout')) score += 20;
      if (title.includes('tutorial') || title.includes('how to')) score += 15;
      if (title.includes('beginner') || title.includes('proper')) score += 10;
      break;
      
    case 'cardio':
      if (title.includes('workout') || title.includes('exercise')) score += 25;
      if (title.includes('technique') || title.includes('form')) score += 20;
      if (title.includes('cardio') || title.includes('training')) score += 15;
      break;
      
    case 'flexibility':
      if (title.includes('stretch') || title.includes('flexibility')) score += 25;
      if (title.includes('technique') || title.includes('proper')) score += 20;
      if (title.includes('exercise') || title.includes('how to')) score += 15;
      break;
      
    case 'warmup':
      if (title.includes('warmup') || title.includes('warm up')) score += 25;
      if (title.includes('exercise') || title.includes('movement')) score += 20;
      if (title.includes('technique') || title.includes('form')) score += 15;
      break;
  }
  
  // Quality indicators
  if (details.statistics.viewCount > 10000) score += 10;
  if (details.statistics.likeCount > 100) score += 5;
  
  return score;
}

async function searchVideoForExercise(exerciseName) {
  const category = classifyExercise(exerciseName);
  const searchTerms = generateSearchTerms(exerciseName, category);
  
  console.log(`\n🔍 Searching for: ${exerciseName}`);
  console.log(`📂 Category: ${category}`);
  console.log(`🔎 Search terms: ${searchTerms.join(', ')}`);
  
  if (!process.env.YOUTUBE_API_KEY) {
    console.log('❌ YouTube API key not found');
    return null;
  }
  
  let bestVideo = null;
  let bestScore = 0;
  
  for (const searchTerm of searchTerms) {
    try {
      console.log(`  → Trying: "${searchTerm}"`);
      
      // Search for videos
      const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(searchTerm)}&type=video&maxResults=10&key=${process.env.YOUTUBE_API_KEY}`;
      const searchResponse = await fetch(searchUrl);
      const searchData = await searchResponse.json();
      
      if (!searchData.items || searchData.items.length === 0) {
        console.log(`    ❌ No results found`);
        continue;
      }
      
      // Get video details for duration and stats
      const videoIds = searchData.items.map(item => item.id.videoId).join(',');
      const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,statistics&id=${videoIds}&key=${process.env.YOUTUBE_API_KEY}`;
      const detailsResponse = await fetch(detailsUrl);
      const detailsData = await detailsResponse.json();
      
      // Score each video
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
      
      // If we found a good match (score > 40), use it
      if (bestScore > 40) {
        break;
      }
      
    } catch (error) {
      console.log(`    ❌ Error searching "${searchTerm}":`, error.message);
    }
  }
  
  if (bestVideo) {
    console.log(`✅ Best match: "${bestVideo.title}" (${Math.floor(bestVideo.duration/60)}:${(bestVideo.duration%60).toString().padStart(2,'0')}) - Score: ${bestVideo.score}`);
    return bestVideo;
  } else {
    console.log(`❌ No suitable video found for ${exerciseName}`);
    return null;
  }
}

async function fixWorkout57Videos() {
  console.log('🎯 Fixing videos for Workout 57 exercises...\n');
  
  // Exercises that need fixing based on user feedback
  const exercisesToFix = [
    { id: 68, name: 'Arm Circles' }, // Poor match: toned arms video
    { id: 77, name: 'Treadmill Moderate Jog' }, // Poor match: heart rate zones  
    { id: 15, name: 'Shoulder Stretch' }, // Poor match: 10-min yoga
    { id: 100, name: 'Overhead Triceps Stretch' }, // Missing video
    { id: 141, name: 'Deep breathing and relaxation' }, // Missing video
    { id: 142, name: 'Dumbbell Incline Chest Fly' }, // Missing video
    { id: 143, name: 'Triceps Dips (Bench or Parallel Bars)' }, // Missing video
    { id: 144, name: 'Cable Rope Overhead Triceps Extension' }, // Missing video
    { id: 145, name: 'Moderate Intensity Cardio - Air Bike' } // Missing video
  ];
  
  let successCount = 0;
  let totalAttempts = 0;
  
  for (const exercise of exercisesToFix) {
    totalAttempts++;
    
    const video = await searchVideoForExercise(exercise.name);
    
    if (video) {
      try {
        // Update the exercise in the database
        await pool.query(
          'UPDATE exercises SET youtube_id = $1, thumbnail_url = $2 WHERE id = $3',
          [video.id, video.thumbnailUrl, exercise.id]
        );
        
        console.log(`✅ Updated exercise ${exercise.id}: ${exercise.name}`);
        successCount++;
        
        // Wait between API calls to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.log(`❌ Failed to update exercise ${exercise.id}:`, error.message);
      }
    }
  }
  
  console.log(`\n📊 Results: ${successCount}/${totalAttempts} exercises updated successfully`);
  
  if (successCount > 0) {
    console.log('\n🎉 Video search improvements applied! The exercises should now have better matching videos.');
  } else {
    console.log('\n⚠️ No videos were updated. Please check your YouTube API key and internet connection.');
  }
}

fixWorkout57Videos()
  .then(() => {
    console.log('\n✅ Workout 57 video fix complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });