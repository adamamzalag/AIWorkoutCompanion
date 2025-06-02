// Test the improved YouTube search with actual API calls

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
      name.includes('pull-up') || name.includes('push-up') || name.includes('dumbbell')) {
    return 'strength';
  }
  if (name.includes('treadmill') || name.includes('jogging') || name.includes('cardio')) {
    return 'cardio';
  }
  return 'general';
}

// Generate search terms
function generateSearchTerms(exerciseName, category) {
  const baseName = exerciseName.toLowerCase().replace(/[^\w\s]/g, '');
  
  switch (category) {
    case 'flexibility':
      return [`${exerciseName} stretch tutorial`, `${exerciseName} yoga pose`];
    case 'strength':
      return [`${exerciseName} form tutorial`, `how to ${baseName} proper form`];
    case 'warmup':
      return [`${exerciseName} warm up`, `${exerciseName} mobility`];
    default:
      return [`${exerciseName} exercise tutorial`, `how to do ${baseName}`];
  }
}

// Parse YouTube duration
function parseDuration(duration) {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  
  const hours = parseInt(match[1]) || 0;
  const minutes = parseInt(match[2]) || 0;
  const seconds = parseInt(match[3]) || 0;
  
  return (hours * 3600) + (minutes * 60) + seconds;
}

// Score videos with 5-minute maximum
function scoreVideo(item, details, category) {
  let score = 0;
  const title = item.snippet.title.toLowerCase();
  
  // Enforce 5-minute maximum
  if (details?.duration) {
    const duration = parseDuration(details.duration);
    if (duration > 300) return -100; // Reject videos over 5 minutes
    if (duration >= 30 && duration <= 180) score += 25;
    else if (duration >= 181 && duration <= 300) score += 10;
  }
  
  // Basic scoring
  if (title.includes('tutorial')) score += 30;
  if (title.includes('how to')) score += 25;
  if (title.includes('form')) score += 20;
  
  // Category bonuses
  if (category === 'flexibility' && title.includes('stretch')) score += 20;
  if (category === 'strength' && title.includes('strength')) score += 20;
  
  return score;
}

async function testSearchForExercise(exerciseName) {
  console.log(`\nTesting search for: "${exerciseName}"`);
  console.log('=' .repeat(50));
  
  const category = classifyExercise(exerciseName);
  console.log(`Category: ${category}`);
  
  const searchTerms = generateSearchTerms(exerciseName, category);
  console.log(`Search terms: ${searchTerms.join(', ')}`);
  
  for (const query of searchTerms) {
    try {
      console.log(`\nTrying: "${query}"`);
      
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
      if (!data.items || data.items.length === 0) {
        console.log(`  No results found`);
        continue;
      }

      // Get details for first video
      const videoId = data.items[0].id.videoId;
      const detailsUrl = `${YOUTUBE_BASE_URL}/videos?` +
        `part=contentDetails&id=${videoId}&key=${YOUTUBE_API_KEY}`;
      
      const detailsResponse = await fetch(detailsUrl);
      const detailsData = await detailsResponse.json();
      
      const video = data.items[0];
      const details = detailsData.items?.[0];
      const score = scoreVideo(video, details, category);
      const duration = details ? parseDuration(details.contentDetails.duration) : 0;
      
      console.log(`  Found: "${video.snippet.title}"`);
      console.log(`  Channel: ${video.snippet.channelTitle}`);
      console.log(`  Duration: ${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')}`);
      console.log(`  Score: ${score}`);
      
      if (score > 0) {
        console.log(`  ✅ Good match found!`);
        return;
      }
      
    } catch (error) {
      console.log(`  Error: ${error.message}`);
    }
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log(`  ❌ No suitable video found`);
}

async function runTests() {
  if (!YOUTUBE_API_KEY) {
    console.log('YouTube API key not found');
    return;
  }
  
  const testExercises = [
    'Push-ups',
    'Child\'s Pose'
  ];
  
  console.log('Testing YouTube Search Algorithm');
  console.log('=================================');
  
  for (const exercise of testExercises) {
    await testSearchForExercise(exercise);
    await new Promise(resolve => setTimeout(resolve, 2000)); // Rate limiting
  }
}

runTests().catch(console.error);