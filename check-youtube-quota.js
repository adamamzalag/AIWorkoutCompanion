async function checkYouTubeQuota() {
  if (!process.env.YOUTUBE_API_KEY) {
    console.log('❌ YouTube API key not found');
    return;
  }

  try {
    // Make a simple search request to check if quota is available
    const testUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=test&type=video&maxResults=1&key=${process.env.YOUTUBE_API_KEY}`;
    
    console.log('🔍 Testing YouTube API access...');
    const response = await fetch(testUrl);
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ YouTube API is accessible');
      
      // Check response headers for quota information
      const quotaUser = response.headers.get('x-ratelimit-quota-user');
      const quotaUsed = response.headers.get('x-ratelimit-used');
      const quotaRemaining = response.headers.get('x-ratelimit-remaining');
      
      if (quotaUser || quotaUsed || quotaRemaining) {
        console.log('\n📊 Quota Information:');
        if (quotaUser) console.log(`User Quota: ${quotaUser}`);
        if (quotaUsed) console.log(`Used: ${quotaUsed}`);
        if (quotaRemaining) console.log(`Remaining: ${quotaRemaining}`);
      } else {
        console.log('\n📊 Quota headers not available in response');
        console.log('YouTube API quota information is typically:');
        console.log('- 10,000 units per day for free accounts');
        console.log('- Search requests cost 100 units each');
        console.log('- Video details requests cost 1 unit each');
      }
      
      console.log('\n📈 Estimated usage from our recent video searches:');
      console.log('- We searched for 9 exercises');
      console.log('- Average 3-4 search terms per exercise');
      console.log('- Each search: 100 units + 1 unit for details');
      console.log('- Estimated total: ~2,700-3,600 units used');
      console.log('- Remaining quota: ~6,400-7,300 units (estimated)');
      
    } else {
      console.log('❌ YouTube API Error:', response.status, response.statusText);
      if (data.error) {
        console.log('Error details:', data.error.message);
        
        if (data.error.errors) {
          data.error.errors.forEach(err => {
            if (err.reason === 'quotaExceeded') {
              console.log('🚫 Quota exceeded - daily limit reached');
            } else if (err.reason === 'keyInvalid') {
              console.log('🔑 Invalid API key');
            } else {
              console.log(`Error: ${err.reason} - ${err.message}`);
            }
          });
        }
      }
    }
    
  } catch (error) {
    console.log('❌ Network error:', error.message);
  }
}

checkYouTubeQuota()
  .then(() => {
    console.log('\n✅ Quota check complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  });