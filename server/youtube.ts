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

export async function searchExerciseVideo(exerciseName: string): Promise<YouTubeVideo | null> {
  if (!YOUTUBE_API_KEY) {
    console.error('YouTube API key not configured');
    return null;
  }

  // Try different search patterns optimized for short, focused tutorials
  const searchQueries = [
    `how to ${exerciseName}`,
    `${exerciseName} exercise tutorial`,
    `${exerciseName} proper form`,
    `${exerciseName} technique tutorial`,
    `${exerciseName} how to perform`
  ];

  for (const query of searchQueries) {
    try {
      const video = await searchVideos(query);
      if (video) {
        return video;
      }
    } catch (error) {
      console.error(`Error searching for "${query}":`, error);
      continue;
    }
  }

  return null;
}

async function searchVideos(query: string): Promise<YouTubeVideo | null> {
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
      const score = calculateVideoScore(item, details);
      
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

function calculateVideoScore(item: any, details: any): number {
  let score = 0;
  const title = item.snippet.title.toLowerCase();
  const channelTitle = item.snippet.channelTitle;
  
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
  
  // Duration preference (short, focused tutorials only)
  if (details?.duration) {
    const duration = parseDuration(details.duration);
    if (duration >= 30 && duration <= 180) score += 25; // 30s-3min (ideal)
    else if (duration >= 181 && duration <= 300) score += 10; // 3-5min (acceptable)
    else if (duration > 300) score -= 30; // too long, penalize heavily
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