import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TopNavigation, BottomNavigation } from "@/components/navigation";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import WorkoutsPage from "@/pages/workouts";
import ProgressPage from "@/pages/progress";
import WorkoutPage from "@/pages/workout";
import AIChatPage from "@/pages/ai-chat";
import OnboardingPage from "@/pages/onboarding";
import ProfilePage from "@/pages/profile";
import { Button } from "@/components/ui/button";

function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-slate-800/90 backdrop-blur-sm rounded-2xl border border-slate-700/50 shadow-2xl p-8 space-y-8">
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="w-12 h-12 bg-gradient-to-r from-green-400 to-blue-500 rounded-xl mx-auto flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white">
              AI Workout Coach
            </h1>
            <p className="text-slate-400">
              Welcome! Sign in to continue
            </p>
          </div>

          {/* Sign In Button */}
          <div className="space-y-6">
            <Button 
              size="lg" 
              className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-4 rounded-xl shadow-lg transform transition-all duration-200 hover:scale-[1.02] hover:shadow-xl"
              onClick={() => window.location.href = '/api/login'}
            >
              Continue with Replit
            </Button>
            
            <div className="text-center">
              <p className="text-slate-500 text-sm">
                Secure authentication powered by Replit
              </p>
            </div>
          </div>

          {/* Features */}
          <div className="space-y-4 pt-4 border-t border-slate-700/50">
            <div className="flex items-center space-x-3 text-slate-300">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span className="text-sm">Personalized AI workout plans</span>
            </div>
            <div className="flex items-center space-x-3 text-slate-300">
              <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
              <span className="text-sm">Real-time coaching feedback</span>
            </div>
            <div className="flex items-center space-x-3 text-slate-300">
              <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
              <span className="text-sm">Progress tracking & analytics</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function OnboardingCheck({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <LandingPage />;
  }

  if (user && !user.onboardingCompleted) {
    return <OnboardingPage />;
  }

  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/workouts" component={WorkoutsPage} />
      <Route path="/progress" component={ProgressPage} />
      <Route path="/workout" component={WorkoutPage} />
      <Route path="/ai-chat" component={AIChatPage} />
      <Route path="/profile" component={ProfilePage} />
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [location] = useLocation();
  const isAIChatPage = location === '/ai-chat';

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <OnboardingCheck>
          <div className="mobile-container bg-background min-h-screen">
            {!isAIChatPage && <TopNavigation />}
            <Toaster />
            <Router />
            <BottomNavigation />
          </div>
        </OnboardingCheck>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
