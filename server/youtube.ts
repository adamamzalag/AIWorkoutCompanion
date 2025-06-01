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

  // Try different search patterns
  const searchQueries = [
    `${exerciseName} tutorial`,
    `${exerciseName} exercise how to`,
    `${exerciseName} proper form`,
    `how to do ${exerciseName}`
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
  
  // Duration preference (not too short, not too long)
  if (details?.duration) {
    const duration = parseDuration(details.duration);
    if (duration >= 60 && duration <= 600) score += 15; // 1-10 minutes
    else if (duration >= 30 && duration <= 1200) score += 10; // 30s-20min
    else if (duration > 1200) score -= 20; // too long
  }
  
  // Negative indicators
  if (title.includes('fail')) score -= 50;
  if (title.includes('funny')) score -= 30;
  if (title.includes('compilation')) score -= 25;
  if (title.includes('reaction')) score -= 40;
  if (title.includes('vs')) score -= 15;
  
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

export async function updateExerciseVideos(storage: any): Promise<void> {
  console.log('Starting exercise video update process...');
  
  try {
    // Get all exercises without YouTube videos
    const exercises = await storage.getExercises();
    const exercisesToUpdate = exercises.filter((ex: any) => !ex.youtubeId || !ex.thumbnailUrl);
    
    console.log(`Found ${exercisesToUpdate.length} exercises that need YouTube videos`);
    
    for (const exercise of exercisesToUpdate) {
      console.log(`Searching video for: ${exercise.name}`);
      
      const video = await searchExerciseVideo(exercise.name);
      
      if (video) {
        console.log(`Found video for ${exercise.name}: ${video.id}`);
        
        // Update exercise with video data
        await storage.updateExercise(exercise.id, {
          youtubeId: video.id,
          thumbnailUrl: video.thumbnailUrl
        });
        
        console.log(`Updated ${exercise.name} with video ${video.id}`);
      } else {
        console.log(`No suitable video found for ${exercise.name}`);
      }
      
      // Add a small delay to respect YouTube API rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('Exercise video update process completed');
  } catch (error) {
    console.error('Error updating exercise videos:', error);
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