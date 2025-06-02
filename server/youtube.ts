interface YouTubeVideo {
  id: string;
  title: string;
  thumbnailUrl: string;
  channelTitle: string;
  duration: string;
  viewCount: number;
}

interface YouTubeSearchResponse {
  items: Array<{
    id: { videoId: string };
    snippet: {
      title: string;
      channelTitle: string;
      thumbnails: {
        medium: { url: string };
        high: { url: string };
      };
    };
  }>;
}

interface YouTubeVideoDetailsResponse {
  items: Array<{
    contentDetails: {
      duration: string;
    };
    statistics: {
      viewCount: string;
    };
  }>;
}

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_BASE_URL = 'https://www.googleapis.com/youtube/v3';

// Exercise classification for targeted video search
function classifyExercise(exerciseName: string): string {
  const name = exerciseName.toLowerCase().trim();
  
  // Flexibility/Stretching exercises
  if (name.includes('stretch') || name.includes('stretching') || 
      name.includes('breathing') || name.includes('breath') ||
      name.includes('flexibility') || name.includes('cool down') ||
      name.includes('cooldown')) {
    return 'flexibility';
  }
  
  // Warm-up exercises
  if (name.includes('circles') || name.includes('circle') ||
      name.includes('swings') || name.includes('swing') ||
      name.includes('activation') || name.includes('warm') ||
      name.includes('mobility') || name.includes('dynamic')) {
    return 'warmup';
  }
  
  // Cardio exercises
  if (name.includes('treadmill') || name.includes('jogging') ||
      name.includes('running') || name.includes('bike') ||
      name.includes('cycling') || name.includes('cardio') ||
      name.includes('walking') || name.includes('jog')) {
    return 'cardio';
  }
  
  // Strength exercises
  if (name.includes('press') || name.includes('squat') ||
      name.includes('curl') || name.includes('row') ||
      name.includes('deadlift') || name.includes('bench') ||
      name.includes('barbell') || name.includes('dumbbell') ||
      name.includes('weight') || name.includes('lift') ||
      name.includes('pull-up') || name.includes('pullup') ||
      name.includes('pull-apart') || name.includes('band') ||
      name.includes('pushup') || name.includes('push-up')) {
    return 'strength';
  }
  
  // Default fallback
  return 'general';
}

// Get category-specific scoring bonuses
function getCategoryBonus(title: string, category: string): number {
  let bonus = 0;
  
  switch (category) {
    case 'flexibility':
      if (title.includes('stretch')) bonus += 20;
      if (title.includes('flexibility')) bonus += 15;
      if (title.includes('mobility')) bonus += 10;
      if (title.includes('relax')) bonus += 8;
      break;
      
    case 'warmup':
      if (title.includes('warm')) bonus += 20;
      if (title.includes('activation')) bonus += 15;
      if (title.includes('dynamic')) bonus += 12;
      if (title.includes('prep')) bonus += 10;
      break;
      
    case 'cardio':
      if (title.includes('cardio')) bonus += 20;
      if (title.includes('conditioning')) bonus += 15;
      if (title.includes('endurance')) bonus += 12;
      if (title.includes('hiit')) bonus += 10;
      break;
      
    case 'strength':
      if (title.includes('strength')) bonus += 20;
      if (title.includes('muscle')) bonus += 15;
      if (title.includes('build')) bonus += 12;
      if (title.includes('form')) bonus += 15;
      break;
      
    default: // general
      if (title.includes('exercise')) bonus += 10;
      if (title.includes('workout')) bonus += 8;
      break;
  }
  
  return bonus;
}

// Generate search terms optimized for flexibility/stretching exercises
function generateFlexibilitySearches(exerciseName: string): string[] {
  const baseName = exerciseName.toLowerCase().replace(/[^\w\s]/g, '');
  return [
    `${exerciseName} stretch tutorial`,
    `${exerciseName} flexibility exercise`,
    `how to ${baseName} stretch properly`,
    `${exerciseName} stretching technique`,
    `${baseName} stretch form`
  ];
}

// Generate search terms optimized for warm-up exercises
function generateWarmupSearches(exerciseName: string): string[] {
  const baseName = exerciseName.toLowerCase().replace(/[^\w\s]/g, '');
  return [
    `${exerciseName} warm up exercise`,
    `how to do ${baseName} warmup`,
    `${exerciseName} mobility drill`,
    `${baseName} activation exercise`,
    `${exerciseName} dynamic warmup`
  ];
}

// Generate search terms optimized for cardio exercises
function generateCardioSearches(exerciseName: string): string[] {
  const baseName = exerciseName.toLowerCase().replace(/[^\w\s]/g, '');
  return [
    `${exerciseName} cardio exercise`,
    `how to ${baseName} properly`,
    `${exerciseName} technique tutorial`,
    `${baseName} form demonstration`,
    `${exerciseName} workout guide`
  ];
}

// Generate search terms optimized for strength exercises
function generateStrengthSearches(exerciseName: string): string[] {
  const baseName = exerciseName.toLowerCase().replace(/[^\w\s]/g, '');
  return [
    `${exerciseName} form tutorial`,
    `how to ${baseName} proper form`,
    `${exerciseName} technique guide`,
    `${baseName} exercise demonstration`,
    `${exerciseName} strength training`
  ];
}

// Generate search terms for general exercises
function generateGeneralSearches(exerciseName: string): string[] {
  const baseName = exerciseName.toLowerCase().replace(/[^\w\s]/g, '');
  return [
    `${exerciseName} exercise tutorial`,
    `how to do ${baseName}`,
    `${exerciseName} proper form`,
    `${baseName} technique`,
    `${exerciseName} demonstration`
  ];
}

// Fitness channels that tend to have quality exercise tutorials
const PREFERRED_CHANNELS = [
  'Athlean-X',
  'FitnessBlender',
  'Calisthenic Movement',
  'ScottHermanFitness',
  'Jeremy Ethier',
  'Jeff Nippard',
  'Bodybuilding.com',
  'HASfit',
  'Yoga with Adriene',
  'MadFit'
];

export async function searchExerciseVideo(exerciseName: string): Promise<{ id: string; thumbnailUrl: string } | null> {
  if (!YOUTUBE_API_KEY) {
    console.error('YouTube API key not configured');
    return null;
  }

  console.log(`🔍 Searching YouTube for: "${exerciseName}"`);

  // Classify exercise and get category-specific search terms
  const category = classifyExercise(exerciseName);
  console.log(`  📂 Exercise category: ${category}`);
  
  let searchQueries: string[] = [];
  switch (category) {
    case 'flexibility':
      searchQueries = generateFlexibilitySearches(exerciseName);
      break;
    case 'warmup':
      searchQueries = generateWarmupSearches(exerciseName);
      break;
    case 'cardio':
      searchQueries = generateCardioSearches(exerciseName);
      break;
    case 'strength':
      searchQueries = generateStrengthSearches(exerciseName);
      break;
    default:
      searchQueries = generateGeneralSearches(exerciseName);
      break;
  }

  for (let i = 0; i < searchQueries.length; i++) {
    const query = searchQueries[i];
    console.log(`  📝 Trying search ${i + 1}/${searchQueries.length}: "${query}"`);
    
    try {
      // Add rate limiting - wait 1 second between API calls
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      const video = await searchVideos(query, category);
      if (video) {
        console.log(`  ✅ Found video: "${video.title}" by ${video.channelTitle} (${video.duration})`);
        
        // Verify the video is accessible by checking thumbnail
        try {
          const thumbnailResponse = await fetch(video.thumbnailUrl, { method: 'HEAD' });
          if (thumbnailResponse.ok) {
            console.log(`  ✅ Video verified accessible`);
            return { id: video.id, thumbnailUrl: video.thumbnailUrl };
          } else {
            console.log(`  ⚠️ Video thumbnail not accessible (${thumbnailResponse.status}), trying next search`);
            continue;
          }
        } catch (thumbnailError) {
          console.log(`  ⚠️ Video accessibility check failed, trying next search`);
          continue;
        }
      } else {
        console.log(`  ❌ No suitable video found for this search`);
      }
    } catch (error) {
      console.error(`  ❌ Error searching for "${query}":`, error);
      
      // Handle quota exceeded errors
      if (error.message.includes('quotaExceeded')) {
        console.log(`  ⚠️ YouTube API quota exceeded, stopping search`);
        break;
      }
      continue;
    }
  }
  


  console.log(`❌ No accessible YouTube videos found for: ${exerciseName}`);
  return null;
}

async function searchVideos(query: string, category: string = 'general'): Promise<YouTubeVideo | null> {
  const searchUrl = `${YOUTUBE_BASE_URL}/search?` +
    `part=snippet&type=video&q=${encodeURIComponent(query)}&` +
    `maxResults=10&key=${YOUTUBE_API_KEY}&` +
    `videoDefinition=any&videoDuration=medium&` +
    `relevanceLanguage=en&safeSearch=strict`;

  const response = await fetch(searchUrl);
  if (!response.ok) {
    throw new Error(`YouTube API error: ${response.status}`);
  }

  const data: YouTubeSearchResponse = await response.json();
  
  if (!data.items || data.items.length === 0) {
    return null;
  }

  // Score and filter videos
  const scoredVideos = await Promise.all(
    data.items.map(async (item) => {
      const details = await getVideoDetails(item.id.videoId);
      const score = calculateVideoScore(item, details, category);
      
      return {
        video: {
          id: item.id.videoId,
          title: item.snippet.title,
          thumbnailUrl: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url,
          channelTitle: item.snippet.channelTitle,
          duration: details?.duration || '',
          viewCount: details?.viewCount || 0
        },
        score
      };
    })
  );

  // Sort by score and return the best video
  scoredVideos.sort((a, b) => b.score - a.score);
  const bestVideo = scoredVideos.find(v => v.score > 0);
  
  return bestVideo ? bestVideo.video : null;
}

async function getVideoDetails(videoId: string): Promise<{ duration: string; viewCount: number } | null> {
  try {
    const detailsUrl = `${YOUTUBE_BASE_URL}/videos?` +
      `part=contentDetails,statistics&id=${videoId}&key=${YOUTUBE_API_KEY}`;

    const response = await fetch(detailsUrl);
    if (!response.ok) return null;

    const data: YouTubeVideoDetailsResponse = await response.json();
    const item = data.items?.[0];
    
    if (!item) return null;

    return {
      duration: item.contentDetails.duration,
      viewCount: parseInt(item.statistics.viewCount) || 0
    };
  } catch (error) {
    console.error('Error fetching video details:', error);
    return null;
  }
}

function calculateVideoScore(item: any, details: any, exerciseCategory: string = 'general'): number {
  let score = 0;
  const title = item.snippet.title.toLowerCase();
  const channelTitle = item.snippet.channelTitle;
  
  // STRICT 5-minute maximum enforcement - reject anything longer
  if (details?.duration) {
    const duration = parseDuration(details.duration);
    if (duration > 300) return -100; // Immediate rejection for videos over 5 minutes
  }
  
  // Category-specific scoring adjustments
  score += getCategoryBonus(title, exerciseCategory);
  
  // Positive indicators
  if (title.includes('tutorial')) score += 30;
  if (title.includes('how to')) score += 25;
  if (title.includes('proper form')) score += 20;
  if (title.includes('technique')) score += 15;
  if (title.includes('beginner')) score += 10;
  
  // Channel preference
  if (PREFERRED_CHANNELS.some(channel => 
    channelTitle.toLowerCase().includes(channel.toLowerCase())
  )) {
    score += 40;
  }
  
  // View count bonus (popular videos tend to be better)
  if (details?.viewCount) {
    if (details.viewCount > 1000000) score += 20;
    else if (details.viewCount > 100000) score += 15;
    else if (details.viewCount > 10000) score += 10;
  }
  
  // Duration preference (under 5 minutes only)
  if (details?.duration) {
    const duration = parseDuration(details.duration);
    if (duration >= 30 && duration <= 180) score += 25; // 30s-3min (ideal)
    else if (duration >= 181 && duration <= 300) score += 10; // 3-5min (acceptable)
    else if (duration < 30) score -= 15; // too short
  }
  
  // Negative indicators - filter out irrelevant content
  if (title.includes('fail')) score -= 50;
  if (title.includes('funny')) score -= 30;
  if (title.includes('compilation')) score -= 25;
  if (title.includes('reaction')) score -= 40;
  if (title.includes('vs')) score -= 15;
  if (title.includes('challenge')) score -= 20;
  if (title.includes('review')) score -= 25;
  if (title.includes('workout routine')) score -= 15; // too general
  if (title.includes('full workout')) score -= 20; // too long/general
  if (title.includes('fighting')) score -= 40; // not exercise tutorial
  if (title.includes('combat')) score -= 40;
  if (title.includes('martial arts')) score -= 30;
  
  return score;
}

function parseDuration(duration: string): number {
  // Parse ISO 8601 duration (PT4M13S = 4 minutes 13 seconds)
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  
  const hours = parseInt(match[1]) || 0;
  const minutes = parseInt(match[2]) || 0;
  const seconds = parseInt(match[3]) || 0;
  
  return hours * 3600 + minutes * 60 + seconds;
}



// Universal function to find tutorial videos for ANY exercise/movement type
export async function updateAllExerciseTypes(storage: any): Promise<void> {
  console.log('Starting universal video search for all movements and exercises...');
  
  try {
    const exercises = await storage.getExercises();
    
    for (const exercise of exercises) {
      if (exercise.youtubeId && exercise.thumbnailUrl) {
        console.log(`Skipping ${exercise.name} - already has video`);
        continue;
      }
      
      console.log(`Searching video for: ${exercise.name}`);
      
      // Universal search approach - try multiple search patterns for ANY movement type
      const video = await searchExerciseVideo(exercise.name);
      
      if (video) {
        console.log(`Found video for ${exercise.name}: ${video.id} (${video.title}) - Duration: ${video.duration}`);
        
        await storage.updateExercise(exercise.id, {
          youtubeId: video.id,
          thumbnailUrl: video.thumbnailUrl
        });
        
        console.log(`Updated ${exercise.name} with video ${video.id}`);
      } else {
        console.log(`No suitable video found for ${exercise.name}`);
      }
      
      // Respect API rate limits
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log('Universal video update process completed');
  } catch (error) {
    console.error('Error in universal video update:', error);
  }
}

export async function updateSpecificExerciseVideo(storage: any, exerciseId: number): Promise<void> {
  try {
    const exercise = await storage.getExercise(exerciseId);
    if (!exercise) return;
    
    console.log(`Searching video for specific exercise: ${exercise.name}`);
    const video = await searchExerciseVideo(exercise.name);
    
    if (video) {
      await storage.updateExercise(exerciseId, {
        youtubeId: video.id,
        thumbnailUrl: video.thumbnailUrl
      });
      console.log(`Updated ${exercise.name} with video ${video.id}`);
    }
  } catch (error) {
    console.error(`Error updating video for exercise ${exerciseId}:`, error);
  }
}