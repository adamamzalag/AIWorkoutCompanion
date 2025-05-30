import { Link, useLocation } from 'wouter';
import { Home, Dumbbell, TrendingUp, MessageCircle } from 'lucide-react';

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

export function TopNavigation() {
  return (
    <nav className="glass-effect fixed top-0 left-1/2 transform -translate-x-1/2 w-full max-w-sm z-50 px-4 py-3 rounded-b-2xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-r from-primary to-secondary rounded-full flex items-center justify-center">
            <Dumbbell className="text-white" size={16} />
          </div>
          <span className="font-poppins font-semibold text-lg text-foreground">AI Fitness</span>
        </div>
        <Link href="/profile">
          <button className="w-10 h-10 glass-effect rounded-full flex items-center justify-center touch-target">
            <div className="w-6 h-6 bg-gradient-to-r from-accent to-primary rounded-full"></div>
          </button>
        </Link>
      </div>
    </nav>
  );
}
