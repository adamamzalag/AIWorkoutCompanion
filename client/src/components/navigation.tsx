import { Link, useLocation } from 'wouter';
import { Home, Dumbbell, TrendingUp, MessageCircle, Settings, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export function BottomNavigation() {
  const [location] = useLocation();

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
  const [operationId, setOperationId] = useState<string | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    const checkStorageAndProgress = async () => {
      const storedOperationId = localStorage.getItem('activeGenerationId');
      
      if (storedOperationId) {
        if (operationId !== storedOperationId) {
          setOperationId(storedOperationId);
          setIsGenerating(true);
        }
        
        // Poll for completion
        try {
          const response = await fetch(`/api/generation-progress/${storedOperationId}`);
          const data = await response.json();
          
          if (data.status === 'completed' || data.status === 'failed') {
            localStorage.removeItem('activeGenerationId');
            setIsGenerating(false);
            setOperationId(null);
          }
        } catch (error) {
          // If operation doesn't exist, clear it
          localStorage.removeItem('activeGenerationId');
          setIsGenerating(false);
          setOperationId(null);
        }
      } else if (isGenerating) {
        // No stored operation but we think we're generating - clear state
        setIsGenerating(false);
        setOperationId(null);
      }
    };

    // Check immediately and then every 3 seconds
    checkStorageAndProgress();
    interval = setInterval(checkStorageAndProgress, 3000);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [operationId, isGenerating]);

  return { isGenerating, operationId };
}

export function TopNavigation() {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const { isGenerating, operationId } = useGlobalGenerationStatus();

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
          {isGenerating && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="w-10 h-10 glass-effect rounded-full flex items-center justify-center touch-target hover:bg-card/60 transition-colors">
                  <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-3 mr-4" align="end">
                <div className="text-center space-y-2">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                    <span className="font-medium text-sm">Plan Generation in Progress</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Your AI workout plan is being created in the background. You'll be notified when it's ready!
                  </p>
                </div>
              </PopoverContent>
            </Popover>
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
