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
    // Fallback to exercise-specific Unsplash image when no YouTube video is available
    const searchQuery = encodeURIComponent(`${exerciseName} exercise fitness`);
    return (
      <div className={`relative ${className}`}>
        <img
          src={`https://images.unsplash.com/1600x900/?${searchQuery}`}
          alt={`${exerciseName} exercise`}
          className="w-full h-full object-cover rounded-2xl"
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