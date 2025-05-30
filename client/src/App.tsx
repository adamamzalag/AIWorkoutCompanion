import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TopNavigation, BottomNavigation } from "@/components/navigation";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import WorkoutsPage from "@/pages/workouts";
import ProgressPage from "@/pages/progress";
import WorkoutPage from "@/pages/workout";
import AIChatPage from "@/pages/ai-chat";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/workouts" component={WorkoutsPage} />
      <Route path="/progress" component={ProgressPage} />
      <Route path="/workout" component={WorkoutPage} />
      <Route path="/ai-chat" component={AIChatPage} />
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="mobile-container bg-background min-h-screen">
          <TopNavigation />
          <Toaster />
          <Router />
          <BottomNavigation />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
