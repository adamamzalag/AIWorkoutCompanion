import { Link, useLocation } from 'wouter';
import { Home, Dumbbell, TrendingUp, MessageCircle, Settings, Loader2, CheckCircle, ChevronLeft, ChevronRight, Play, Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { GenerationProgress } from '@/components/generation-progress';
import { useQueryClient } from '@tanstack/react-query';

// Workout-specific bottom controls
function WorkoutBottomControls() {
  const [buttonText, setButtonText] = useState('Complete Set');

  // Listen for button text updates from workout page
  useEffect(() => {
    const handleButtonTextUpdate = (event: any) => {
      setButtonText(event.detail.text);
    };

    window.addEventListener('workout-button-text-update', handleButtonTextUpdate);
    return () => {
      window.removeEventListener('workout-button-text-update', handleButtonTextUpdate);
    };
  }, []);

  return (
    <nav className="glass-effect fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-sm z-50 px-2 py-3 rounded-t-2xl">
      <div className="flex items-center space-x-1">
        {/* Previous Exercise */}
        <Button
          variant="outline"
          size="sm"
          className="flex-1 glass-effect border-border/50 text-xs px-2"
          onClick={() => {
            window.dispatchEvent(new CustomEvent('workout-previous'));
          }}
        >
          <ChevronLeft size={12} className="mr-1" />
          Previous
        </Button>

        {/* Complete Set/Exercise - Main Action */}
        <Button
          className="flex-[2] glass-effect bg-gradient-to-r from-accent to-primary hover:from-accent/90 hover:to-primary/90 text-white font-medium text-sm px-2 min-w-0"
          onClick={() => {
            window.dispatchEvent(new CustomEvent('workout-complete-set'));
          }}
        >
          <span className="truncate">{buttonText}</span>
        </Button>

        {/* Next Exercise */}
        <Button
          variant="outline"
          size="sm"
          className="flex-1 glass-effect border-border/50 text-xs px-2"
          onClick={() => {
            window.dispatchEvent(new CustomEvent('workout-next'));
          }}
        >
          Next
          <ChevronRight size={12} className="ml-1" />
        </Button>

        {/* Exit Button - Red circular border */}
        <Button
          variant="outline"
          size="sm"
          className="w-8 h-8 rounded-full p-0 border-2 border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
          onClick={() => {
            window.dispatchEvent(new CustomEvent('workout-menu'));
          }}
        >
          <X size={14} />
        </Button>
      </div>
    </nav>
  );
}

export function BottomNavigation() {
  const [location] = useLocation();
  const isWorkoutPage = location === '/workout';

  // If we're on the workout page, show workout-specific controls instead
  if (isWorkoutPage) {
    return <WorkoutBottomControls />;
  }

  const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/workouts', icon: Dumbbell, label: 'Workouts' },
    { path: '/progress', icon: TrendingUp, label: 'Progress' },
    { path: '/ai-chat', icon: MessageCircle, label: 'AI Coach' },
  ];

  return (
    <nav className="glass-effect fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-sm z-50 px-4 py-3 rounded-t-2xl">
      <div className="flex items-center justify-around">
        {navItems.map(({ path, icon: Icon, label }) => {
          const isActive = location === path;
          return (
            <Link key={path} href={path}>
              <button className={`flex flex-col items-center space-y-1 touch-target ${
                isActive ? 'text-primary' : 'text-muted-foreground'
              } transition-colors`}>
                <Icon size={20} />
                <span className="text-xs font-medium">{label}</span>
              </button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

// Global hook to check if any plan generation is in progress
function useGlobalGenerationStatus() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [operationId, setOperationId] = useState<string | null>(null);
  const [operationStartTime, setOperationStartTime] = useState<number | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    const checkStorageAndProgress = async () => {
      const storedOperationId = localStorage.getItem('activeGenerationId');
      
      if (storedOperationId) {
        if (operationId !== storedOperationId) {
          setOperationId(storedOperationId);
          setOperationStartTime(Date.now());
          setIsGenerating(true);
          setIsCompleted(false);
        }
        
        // Poll for completion
        try {
          const response = await fetch(`/api/generation-progress/${storedOperationId}`);
          
          if (!response.ok) {
            // Give new operations a 10-second grace period before clearing
            const timeSinceStart = operationStartTime ? Date.now() - operationStartTime : 0;
            if (timeSinceStart > 10000) {
              console.log('Clearing non-existent operation:', storedOperationId);
              localStorage.removeItem('activeGenerationId');
              setIsGenerating(false);
              setIsCompleted(false);
              setOperationId(null);
              setOperationStartTime(null);
            }
            return;
          }
          
          const data = await response.json();
          
          if (data.status === 'completed') {
            setIsGenerating(false);
            setIsCompleted(true);
            // Keep the operationId to show completion state
          } else if (data.status === 'failed') {
            localStorage.removeItem('activeGenerationId');
            setIsGenerating(false);
            setIsCompleted(false);
            setOperationId(null);
          }
        } catch (error) {
          // Network error or other issues
          console.log('Error checking progress:', error);
        }
      } else if (isGenerating || isCompleted) {
        // No stored operation but we think we're generating/completed - clear state
        setIsGenerating(false);
        setIsCompleted(false);
        setOperationId(null);
      }
    };

    // Check immediately and then every 3 seconds
    checkStorageAndProgress();
    interval = setInterval(checkStorageAndProgress, 3000);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [operationId, isGenerating, isCompleted]);

  const dismissCompletion = () => {
    localStorage.removeItem('activeGenerationId');
    setIsCompleted(false);
    setOperationId(null);
  };

  return { isGenerating, isCompleted, operationId, dismissCompletion };
}

export function TopNavigation() {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { isGenerating, isCompleted, operationId, dismissCompletion } = useGlobalGenerationStatus();
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // Scrolling down and past 100px
        setIsVisible(false);
      } else {
        // Scrolling up or at top
        setIsVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  return (
    <nav className={`glass-effect fixed top-0 left-1/2 transform -translate-x-1/2 w-full max-w-sm z-50 px-4 py-3 rounded-b-2xl transition-transform duration-300 ${
      isVisible ? 'translate-y-0' : '-translate-y-full'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-r from-primary to-secondary rounded-full flex items-center justify-center">
            <Dumbbell className="text-white" size={16} />
          </div>
          <span className="font-poppins font-semibold text-lg text-foreground">AI Fitness</span>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Generation Status Indicator */}
          {(isGenerating || isCompleted) && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="w-10 h-10 glass-effect rounded-full flex items-center justify-center touch-target hover:bg-card/60 transition-colors">
                  {isCompleted ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                  )}
                </Button>
              </DialogTrigger>
              <DialogContent className="glass-effect border-border/50 max-w-md mx-auto">
                <DialogHeader className="sr-only">
                  <DialogTitle>Workout Plan Generation</DialogTitle>
                  <DialogDescription>
                    Your AI workout plan is being generated. Please wait while we create your personalized fitness program.
                  </DialogDescription>
                </DialogHeader>
                {operationId && (
                  <GenerationProgress 
                    operationId={operationId}
                    onComplete={(success: boolean) => {
                      if (success) {
                        // Invalidate multiple related queries to ensure fresh data
                        queryClient.invalidateQueries({ queryKey: ['/api/workout-plans'] });
                        queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
                        queryClient.invalidateQueries({ queryKey: ['/api/recent-sessions'] });
                      }
                      setIsDialogOpen(false);
                      dismissCompletion();
                    }}
                    showViewPlansButton={true}
                  />
                )}
              </DialogContent>
            </Dialog>
          )}
          
          <Link href="/profile">
            <button className="w-10 h-10 glass-effect rounded-full flex items-center justify-center touch-target hover:bg-card/60 transition-colors">
              <Settings className="w-5 h-5 text-foreground" />
            </button>
          </Link>
        </div>
      </div>
    </nav>
  );
}
