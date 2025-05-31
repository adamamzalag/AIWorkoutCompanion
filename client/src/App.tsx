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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex items-center justify-center p-6">
      <div className="max-w-md w-full space-y-8 text-center">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">
            AI Workout Coach
          </h1>
          <p className="text-muted-foreground text-lg">
            Get personalized workout plans and AI-powered coaching to reach your fitness goals.
          </p>
        </div>
        
        <div className="space-y-4">
          <Button 
            size="lg" 
            className="w-full"
            onClick={() => window.location.href = '/api/login'}
          >
            Sign In to Get Started
          </Button>
          <p className="text-sm text-muted-foreground">
            Secure authentication powered by your account
          </p>
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
