import { useState, useEffect } from 'react';
import { Play, Dumbbell, Heart, Zap, Flower2 } from 'lucide-react';

interface YouTubeVideoProps {
  videoId?: string | null;
  exerciseName: string;
  exerciseIndex?: number;
  totalExercises?: number;
  workoutTitle?: string;
  className?: string;
}

export function YouTubeVideo({ 
  videoId, 
  exerciseName, 
  exerciseIndex = 1,
  totalExercises = 1,
  workoutTitle = "Workout",
  className = "" 
}: YouTubeVideoProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showPlayer, setShowPlayer] = useState(false);

  // Reset video player state when exercise changes
  useEffect(() => {
    setIsPlaying(false);
    setShowPlayer(false);
  }, [exerciseName, videoId]);

  // Exercise category classification for themed styling
  const getExerciseCategory = (name: string) => {
    const lowerName = name.toLowerCase();
    
    if (lowerName.includes('stretch') || lowerName.includes('breathing') || lowerName.includes('relaxation')) {
      return 'flexibility';
    }
    if (lowerName.includes('circles') || lowerName.includes('warm') || lowerName.includes('pull-apart')) {
      return 'warmup';
    }
    if (lowerName.includes('cardio') || lowerName.includes('bike') || lowerName.includes('treadmill') || 
        lowerName.includes('jog') || lowerName.includes('run')) {
      return 'cardio';
    }
    return 'strength';
  };

  // Category-specific styling
  const getThemeColors = (category: string) => {
    switch (category) {
      case 'strength':
        return {
          gradient: 'from-blue-600/90 via-blue-700/90 to-indigo-800/90',
          accent: 'text-blue-200',
          icon: Dumbbell
        };
      case 'cardio':
        return {
          gradient: 'from-orange-600/90 via-red-600/90 to-pink-700/90',
          accent: 'text-orange-200',
          icon: Heart
        };
      case 'warmup':
        return {
          gradient: 'from-emerald-600/90 via-teal-600/90 to-cyan-700/90',
          accent: 'text-emerald-200',
          icon: Zap
        };
      case 'flexibility':
        return {
          gradient: 'from-purple-600/90 via-violet-600/90 to-indigo-700/90',
          accent: 'text-purple-200',
          icon: Flower2
        };
      default:
        return {
          gradient: 'from-gray-600/90 via-gray-700/90 to-gray-800/90',
          accent: 'text-gray-200',
          icon: Dumbbell
        };
    }
  };

  const handlePlay = () => {
    if (videoId) {
      setIsPlaying(true);
      setShowPlayer(true);
    }
  };

  const category = getExerciseCategory(exerciseName);
  const theme = getThemeColors(category);
  const CategoryIcon = theme.icon;

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
    <div 
      className={`relative cursor-pointer group overflow-hidden rounded-2xl ${className}`} 
      onClick={handlePlay}
    >
      {/* Beautiful themed gradient background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${theme.gradient}`} />
      
      {/* Decorative pattern overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-black/20" />
      
      {/* Content Container */}
      <div className="relative h-full flex flex-col justify-between p-6">
        
        {/* Header with exercise count and workout title */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-white/10 backdrop-blur-sm rounded-full p-2">
              <CategoryIcon size={20} className="text-white" />
            </div>
            <div>
              <div className="text-white/90 text-sm font-medium">
                Exercise {exerciseIndex} of {totalExercises}
              </div>
              <div className={`text-xs ${theme.accent} capitalize`}>
                {workoutTitle}
              </div>
            </div>
          </div>
          
          {/* Video availability indicator */}
          {videoId && (
            <div className="bg-green-500/20 backdrop-blur-sm rounded-full px-3 py-1">
              <div className="text-green-300 text-xs font-medium">Video Available</div>
            </div>
          )}
        </div>

        {/* Center play button and exercise info */}
        <div className="flex flex-col items-center space-y-4">
          
          {/* Large play button */}
          <div className="bg-white/15 hover:bg-white/25 backdrop-blur-sm rounded-full p-6 transform group-hover:scale-105 transition-all duration-300 shadow-lg">
            <Play size={40} className="text-white ml-1" fill="currentColor" />
          </div>
          
          {/* Exercise name */}
          <div className="text-center">
            <h3 className="text-white font-semibold text-lg mb-1">{exerciseName}</h3>
            <p className="text-white/70 text-sm">
              {videoId ? 'Tap to watch tutorial' : 'Exercise demonstration'}
            </p>
          </div>
        </div>

        {/* Bottom category label */}
        <div className="flex justify-center">
          <div className="bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
            <div className={`text-sm font-medium capitalize ${theme.accent}`}>
              {category} Exercise
            </div>
          </div>
        </div>
      </div>
      
      {/* Subtle shine effect on hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12 transform translate-x-full group-hover:translate-x-[-200%] transition-transform duration-1000 ease-out" />
    </div>
  );
}