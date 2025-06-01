import { useState } from 'react';
import { Play } from 'lucide-react';

interface YouTubeVideoProps {
  videoId?: string | null;
  thumbnailUrl?: string | null;
  exerciseName: string;
  className?: string;
}

export function YouTubeVideo({ videoId, thumbnailUrl, exerciseName, className = "" }: YouTubeVideoProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showPlayer, setShowPlayer] = useState(false);

  // Fallback thumbnail URL using YouTube's default thumbnail
  const fallbackThumbnail = videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : null;
  const displayThumbnail = thumbnailUrl || fallbackThumbnail;

  const handlePlay = () => {
    if (videoId) {
      setIsPlaying(true);
      setShowPlayer(true);
    }
  };

  if (!videoId || !displayThumbnail) {
    // Generate exercise-specific Unsplash search terms with proper API format
    const getExerciseImageQuery = (name: string) => {
      const lowerName = name.toLowerCase();
      
      // Map exercise types to specific, working Unsplash image IDs
      if (lowerName.includes('treadmill') || lowerName.includes('jogging') || lowerName.includes('running')) {
        return 'photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=800&h=600&q=80'; // Person running on treadmill
      }
      if (lowerName.includes('stretch') || lowerName.includes('chest opener') || lowerName.includes('chest stretch')) {
        return 'photo-1506629905607-683b2b53b7dc?auto=format&fit=crop&w=800&h=600&q=80'; // Person stretching
      }
      if (lowerName.includes('circle') || lowerName.includes('arm circle')) {
        return 'photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=800&h=600&q=80'; // Person doing arm exercises
      }
      if (lowerName.includes('breath') || lowerName.includes('breathing')) {
        return 'photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=800&h=600&q=80'; // Meditation/breathing
      }
      if (lowerName.includes('bench press')) {
        return 'photo-1583454110551-21f2fa2afe61?auto=format&fit=crop&w=800&h=600&q=80'; // Person bench pressing
      }
      if (lowerName.includes('shoulder press') || lowerName.includes('dumbbell')) {
        return 'photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=800&h=600&q=80'; // Person with dumbbells
      }
      if (lowerName.includes('tricep')) {
        return 'photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=800&h=600&q=80'; // Person doing tricep exercise
      }
      
      // Default to general fitness
      return 'photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=800&h=600&q=80';
    };

    const imageId = getExerciseImageQuery(exerciseName);
    
    return (
      <div className={`relative ${className}`}>
        <img
          src={`https://images.unsplash.com/${imageId}`}
          alt={`${exerciseName} exercise`}
          className="w-full h-full object-cover rounded-2xl"
          onError={(e) => {
            // Fallback to a reliable generic fitness image
            const target = e.target as HTMLImageElement;
            target.src = 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=800&h=600&q=80';
          }}
        />
        {/* Exercise label for fallback images */}
        <div className="absolute bottom-3 left-3 right-3">
          <div className="glass-effect bg-black/50 text-white text-sm px-3 py-2 rounded-lg backdrop-blur-sm">
            <div className="font-medium">{exerciseName}</div>
            <div className="text-xs opacity-80">Exercise demonstration</div>
          </div>
        </div>
      </div>
    );
  }

  if (showPlayer && isPlaying) {
    return (
      <div className={`relative ${className}`}>
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`}
          title={`${exerciseName} tutorial`}
          className="w-full h-full rounded-2xl"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <div className={`relative cursor-pointer group ${className}`} onClick={handlePlay}>
      {/* Video Thumbnail */}
      <img
        src={displayThumbnail}
        alt={`${exerciseName} tutorial`}
        className="w-full h-full object-cover rounded-2xl"
      />
      
      {/* Play Button Overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-2xl group-hover:bg-black/40 transition-colors">
        <div className="glass-effect bg-white/20 hover:bg-white/30 rounded-full p-4 transform group-hover:scale-110 transition-all duration-200">
          <Play size={32} className="text-white ml-1" fill="currentColor" />
        </div>
      </div>

      {/* Video Tutorial Label */}
      <div className="absolute bottom-3 left-3 right-3">
        <div className="glass-effect bg-black/50 text-white text-sm px-3 py-2 rounded-lg backdrop-blur-sm">
          <div className="font-medium">{exerciseName} Tutorial</div>
          <div className="text-xs opacity-80">Tap to play video</div>
        </div>
      </div>
    </div>
  );
}