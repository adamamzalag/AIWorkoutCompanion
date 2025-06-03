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

// Multi-key failover system for YouTube API
const YOUTUBE_API_KEYS = [
  process.env.YOUTUBE_API_KEY,
  process.env.YOUTUBE_API_KEY_2,
  process.env.YOUTUBE_API_KEY_3
].filter(Boolean); // Remove any undefined keys

const YOUTUBE_BASE_URL = 'https://www.googleapis.com/youtube/v3';

// API key rotation state
let currentKeyIndex = 0;
let lastQuotaReset = new Date();

// Check if it's a new day (quota resets at midnight Pacific)
function shouldResetQuota(): boolean {
  const now = new Date();
  const pacificTime = new Date(now.toLocaleString("en-US", {timeZone: "America/Los_Angeles"}));
  const lastResetPacific = new Date(lastQuotaReset.toLocaleString("en-US", {timeZone: "America/Los_Angeles"}));
  
  return pacificTime.getDate() !== lastResetPacific.getDate();
}

// Get current active API key
function getCurrentApiKey(): string | null {
  if (shouldResetQuota()) {
    console.log('🔄 Daily quota reset detected, resetting to first API key');
    currentKeyIndex = 0;
    lastQuotaReset = new Date();
  }
  
  if (currentKeyIndex >= YOUTUBE_API_KEYS.length) {
    console.error('❌ All YouTube API keys exhausted');
    return null;
  }
  
  return YOUTUBE_API_KEYS[currentKeyIndex];
}

// Rotate to next API key when quota exceeded
function rotateToNextKey(): boolean {
  currentKeyIndex++;
  
  if (currentKeyIndex >= YOUTUBE_API_KEYS.length) {
    console.error('❌ All YouTube API keys exhausted for today');
    return false;
  }
  
  console.log(`🔄 Rotating to API key ${currentKeyIndex + 1}/${YOUTUBE_API_KEYS.length}`);
  return true;
}

// Get current API key status for monitoring
export function getApiKeyStatus() {
  return {
    totalKeys: YOUTUBE_API_KEYS.length,
    currentKeyIndex: currentKeyIndex,
    activeKey: currentKeyIndex + 1,
    keysRemaining: YOUTUBE_API_KEYS.length - currentKeyIndex,
    quotaResetTime: 'Midnight Pacific Time',
    lastReset: lastQuotaReset.toISOString()
  };
}

// Enhanced API call with failover logic
async function makeYouTubeRequest(url: string, retryCount = 0): Promise<any> {
  const apiKey = getCurrentApiKey();
  if (!apiKey) {
    throw new Error('No YouTube API keys available');
  }
  
  const fullUrl = url.includes('key=') ? url : `${url}&key=${apiKey}`;
  
  try {
    const response = await fetch(fullUrl);
    
    if (response.status === 403) {
      const errorData = await response.json().catch(() => ({}));
      
      // Check if it's a quota exceeded error
      if (errorData.error?.errors?.[0]?.reason === 'quotaExceeded') {
        console.log(`⚠️ Quota exceeded for API key ${currentKeyIndex + 1}`);
        
        // Try to rotate to next key
        if (rotateToNextKey() && retryCount < YOUTUBE_API_KEYS.length) {
          console.log(`🔄 Retrying request with next API key...`);
          return makeYouTubeRequest(url, retryCount + 1);
        } else {
          throw new Error('All YouTube API keys exhausted');
        }
      }
    }
    
    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.status}`);
    }
    
    return response.json();
  } catch (error) {
    if (error instanceof Error && error.message.includes('fetch')) {
      throw new Error(`Network error: ${error.message}`);
    }
    throw error;
  }
}

// Exercise classification for targeted video search
function classifyExercise(exerciseName: string): string {
  const name = exerciseName.toLowerCase().trim();
  
  // Flexibility/Stretching exercises
  if (name.includes('stretch') || name.includes('stretching') || 
      name.includes('breathing') || name.includes('breath') ||
      name.includes('flexibility') || name.includes('cool down') ||
      name.includes('cooldown') || name.includes('pose') ||
      name.includes('yoga') || name.includes('cat-cow') ||
      name.includes('child')) {
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
function extractExerciseKeywords(title: string): string[] {
  const lowerTitle = title.toLowerCase();
  
  // Define exercise-specific keywords
  const exerciseTypes = [
    'squat', 'squats', 'deadlift', 'deadlifts', 'bench press', 'press',
    'curl', 'curls', 'row', 'rows', 'pull', 'pullup', 'pullups', 'chin',
    'push', 'pushup', 'pushups', 'dip', 'dips', 'lunge', 'lunges',
    'calf raise', 'calf raises', 'raises', 'extension', 'fly', 'flyes',
    'crunch', 'crunches', 'plank', 'planks', 'burpee', 'burpees',
    'mountain climber', 'jumping jack', 'split squat', 'bulgarian',
    'overhead', 'lateral', 'front raise', 'rear delt', 'tricep', 'bicep',
    'shoulder', 'chest', 'back', 'leg', 'abs', 'core', 'glute', 'hamstring'
  ];
  
  return exerciseTypes.filter(keyword => lowerTitle.includes(keyword));
}

function extractQueryKeywords(query: string): string[] {
  const lowerQuery = query.toLowerCase();
  
  // Extract key exercise terms from the search query
  const queryWords = lowerQuery.split(' ').filter(word => word.length > 2);
  const exerciseKeywords = [
    'calf', 'raises', 'squat', 'deadlift', 'bench', 'press', 'curl', 'row',
    'pull', 'push', 'lunge', 'dip', 'extension', 'fly', 'crunch', 'plank',
    'burpee', 'mountain', 'climbing', 'jack', 'bulgarian', 'split',
    'overhead', 'lateral', 'front', 'rear', 'tricep', 'bicep', 'dumbbell',
    'barbell', 'shoulder', 'chest', 'back', 'leg', 'abs', 'core'
  ];
  
  return queryWords.filter(word => exerciseKeywords.includes(word));
}

function calculateExerciseRelevance(titleKeywords: string[], queryKeywords: string[]): number {
  if (queryKeywords.length === 0) return 0;
  
  // Check for direct keyword matches
  const matches = titleKeywords.filter(titleKeyword => 
    queryKeywords.some(queryKeyword => 
      titleKeyword.includes(queryKeyword) || queryKeyword.includes(titleKeyword)
    )
  );
  
  // If no exercise keywords match, heavily penalize
  if (matches.length === 0) {
    // Check if it's a completely different exercise
    const incompatibleExercises = [
      ['calf', 'squat'], ['calf', 'deadlift'], ['calf', 'bench'],
      ['squat', 'curl'], ['squat', 'press'], ['deadlift', 'curl'],
      ['bench', 'squat'], ['curl', 'squat'], ['row', 'squat']
    ];
    
    for (const [keyword1, keyword2] of incompatibleExercises) {
      if (queryKeywords.includes(keyword1) && titleKeywords.some(k => k.includes(keyword2))) {
        return -80; // Heavy penalty for wrong exercise
      }
      if (queryKeywords.includes(keyword2) && titleKeywords.some(k => k.includes(keyword1))) {
        return -80; // Heavy penalty for wrong exercise
      }
    }
    
    return -30; // Moderate penalty for no matches
  }
  
  // Bonus for exact matches
  const exactMatches = matches.filter(match => 
    queryKeywords.includes(match) || queryKeywords.some(q => q === match)
  );
  
  return (matches.length * 25) + (exactMatches.length * 15);
}

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

// Generate optimized search terms for flexibility/stretching exercises
function generateFlexibilitySearches(exerciseName: string): string[] {
  return [
    `intitle:"${exerciseName}" stretch`,
    `${exerciseName} flexibility tutorial`
  ];
}

// Smart parsing for compound exercise names
function parseExerciseName(exerciseName: string): { simplifiedName: string; equipment: string } {
  const name = exerciseName.toLowerCase();
  
  // Extract equipment
  let equipment = '';
  if (name.includes('barbell')) equipment = 'barbell';
  else if (name.includes('dumbbell')) equipment = 'dumbbell';
  else if (name.includes('kettlebell')) equipment = 'kettlebell';
  else if (name.includes('band')) equipment = 'band';
  else if (name.includes('cable')) equipment = 'cable';
  
  // Simplify compound names
  let simplifiedName = name;
  
  // Common compound exercise patterns
  const simplifications = {
    'bent-over barbell rows': 'barbell rows',
    'bent over barbell rows': 'barbell rows',
    'standing dumbbell calf raises': 'calf raises',
    'seated dumbbell shoulder press': 'shoulder press',
    'lying dumbbell chest press': 'chest press',
    'romanian deadlift': 'deadlift',
    'sumo deadlift': 'deadlift',
    'bulgarian split squats': 'split squats',
    'single leg deadlift': 'deadlift'
  };
  
  // Apply simplifications
  for (const [compound, simple] of Object.entries(simplifications)) {
    if (name.includes(compound)) {
      simplifiedName = simple;
      break;
    }
  }
  
  // Remove equipment from simplified name if it's already extracted
  if (equipment) {
    simplifiedName = simplifiedName.replace(equipment, '').trim();
  }
  
  return { simplifiedName, equipment };
}

// Generate optimized search terms for warm-up exercises
function generateWarmupSearches(exerciseName: string): string[] {
  return [
    `intitle:"${exerciseName}" warm up`,
    `${exerciseName} warmup exercise tutorial`
  ];
}

// Generate optimized search terms for cardio exercises
function generateCardioSearches(exerciseName: string): string[] {
  return [
    `intitle:"${exerciseName}" cardio`,
    `${exerciseName} technique tutorial`
  ];
}

// Generate optimized search terms for strength exercises with smart name parsing
function generateStrengthSearches(exerciseName: string): string[] {
  const { simplifiedName, equipment } = parseExerciseName(exerciseName);
  
  // Two optimized queries only
  return [
    `intitle:"${exerciseName}" tutorial`, // Exact phrase match
    `${simplifiedName} ${equipment} proper form technique`.trim() // Simplified with equipment
  ];
}

// Generate optimized search terms for general exercises
function generateGeneralSearches(exerciseName: string): string[] {
  return [
    `intitle:"${exerciseName}" tutorial`,
    `${exerciseName} proper form technique`
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

export async function searchExerciseVideo(exerciseName: string, exerciseType?: string): Promise<{ id: string; thumbnailUrl: string } | null> {
  if (YOUTUBE_API_KEYS.length === 0) {
    console.error('No YouTube API keys configured');
    return null;
  }

  console.log(`🔍 Searching YouTube for: "${exerciseName}" (type: ${exerciseType || 'unknown'})`);

  // Use exercise type from database, fallback to classification
  let category: string;
  if (exerciseType) {
    // Map database types to search categories
    switch (exerciseType) {
      case 'warmup':
        category = 'warmup';
        break;
      case 'cardio':
        category = 'cardio';
        break;
      case 'cooldown':
        category = 'flexibility'; // cooldown exercises are typically stretches
        break;
      case 'main':
        category = 'strength';
        break;
      default:
        category = classifyExercise(exerciseName);
    }
  } else {
    category = classifyExercise(exerciseName);
  }
  
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

  // OPTIMIZATION: Reduced from 5 to 2 search attempts (60% quota reduction)
  for (let i = 0; i < Math.min(2, searchQueries.length); i++) {
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
        // Force logging for analysis when no video found
        if (query.includes('calf raises')) {
          console.log(`  🔍 DEBUG: Investigating why calf raises search failed...`);
        }
      }
    } catch (error) {
      console.error(`  ❌ Error searching for "${query}":`, error);
      
      // Handle quota exceeded errors - this will be caught by makeYouTubeRequest
      if (error instanceof Error && error.message.includes('All YouTube API keys exhausted')) {
        console.log(`  ⚠️ All YouTube API keys exhausted, stopping search`);
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
    `maxResults=25&` +
    `videoDefinition=any&videoDuration=short&` +
    `videoEmbeddable=true&videoSyndicated=true&` +
    `relevanceLanguage=en&safeSearch=strict&order=relevance`;

  const data = await makeYouTubeRequest(searchUrl);
  
  if (!data.items || data.items.length === 0) {
    return null;
  }

  // OPTIMIZATION: Pre-filter videos and only fetch details for top candidates
  // Calculate preliminary scores without video details (saves API calls)
  const preliminaryScores = data.items.map((item: any) => {
    const preliminaryScore = calculateVideoScore(item, null, category, query);
    return { item, preliminaryScore };
  });

  // Sort by preliminary score and only fetch details for top 3 candidates
  preliminaryScores.sort((a, b) => b.preliminaryScore - a.preliminaryScore);
  
  // DEBUG: Log all videos for analysis
  console.log(`\n📋 DEBUG: All ${data.items.length} videos found for query: "${query}"`);
  preliminaryScores.forEach((scored, index) => {
    console.log(`  ${index + 1}. [Score: ${scored.preliminaryScore}] "${scored.item.snippet.title}" by ${scored.item.snippet.channelTitle}`);
  });
  console.log(`\n🎯 DEBUG: Top 3 candidates selected for detailed analysis`);
  
  const topCandidates = preliminaryScores.slice(0, 3);

  // Fetch detailed information only for top candidates
  const scoredVideos = await Promise.all(
    topCandidates.map(async ({ item }) => {
      const details = await getVideoDetails(item.id.videoId);
      const finalScore = calculateVideoScore(item, details, category, query);
      
      return {
        video: {
          id: item.id.videoId,
          title: item.snippet.title,
          thumbnailUrl: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url,
          channelTitle: item.snippet.channelTitle,
          duration: details?.duration || '',
          viewCount: details?.viewCount || 0
        },
        score: finalScore
      };
    })
  );

  // Filter out videos that exceed 5 minutes and sort by final score
  const validVideos = scoredVideos.filter(v => v.score > 0);
  validVideos.sort((a, b) => b.score - a.score);
  const bestVideo = validVideos[0];
  
  return bestVideo ? bestVideo.video : null;
}

async function getVideoDetails(videoId: string): Promise<{ duration: string; viewCount: number } | null> {
  try {
    const detailsUrl = `${YOUTUBE_BASE_URL}/videos?` +
      `part=contentDetails,statistics&id=${videoId}`;

    const data = await makeYouTubeRequest(detailsUrl);
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

function calculateVideoScore(item: any, details: any, exerciseCategory: string = 'general', searchQuery: string = ''): number {
  let score = 0;
  const title = item.snippet.title.toLowerCase();
  const channelTitle = item.snippet.channelTitle;
  
  // STRICT 5-minute maximum enforcement - reject anything longer
  // Only check duration if details are available (not in preliminary scoring)
  if (details?.duration) {
    const duration = parseDuration(details.duration);
    if (duration > 300) return -100; // Immediate rejection for videos over 5 minutes
  }
  
  // Category-specific scoring adjustments
  score += getCategoryBonus(title, exerciseCategory);
  
  // Exercise relevance check - heavily penalize completely wrong exercises
  if (searchQuery) {
    const exerciseKeywords = extractExerciseKeywords(title);
    const queryKeywords = extractQueryKeywords(searchQuery);
    const relevanceScore = calculateExerciseRelevance(exerciseKeywords, queryKeywords);
    score += relevanceScore;
  }
  
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