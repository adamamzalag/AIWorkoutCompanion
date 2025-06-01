import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { 
  Dumbbell, 
  Target, 
  Clock, 
  TrendingUp, 
  Plus, 
  Sparkles, 
  Play, 
  Calendar,
  Filter,
  Search
} from 'lucide-react';
import type { WorkoutPlan, Workout, User } from '@shared/schema';
import type { WorkoutPlanRequest } from '../../../server/openai';
import { WorkoutCard } from '@/components/workout-card';
import { GenerationProgress } from '@/components/generation-progress';
import { useAuth } from '@/hooks/useAuth';

const generatePlanSchema = z.object({
  duration: z.number().min(1, "Duration must be at least 1 week").max(52, "Duration cannot exceed 52 weeks"),
  workoutsPerWeek: z.number().min(1, "Must have at least 1 workout per week").max(7, "Cannot have more than 7 workouts per week"),
  timePerWorkout: z.number().min(15, "Workouts must be at least 15 minutes").max(180, "Workouts cannot exceed 3 hours"),
  planType: z.enum(["independent", "progressive"], {
    required_error: "Please select a plan type",
  }),
});

// Plan type options
const planTypeOptions = [
  { value: 'independent', label: 'Independent Plan', description: 'Create a fresh plan based on your current profile' },
  { value: 'progressive', label: 'Progressive Plan', description: 'Build on your previous plan results and progress' }
];

export default function WorkoutsPage() {
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');
  const [location, setLocation] = useLocation();
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: userProfile } = useQuery<User>({
    queryKey: ["/api/profile"],
  });

  const { data: workoutPlans, isLoading: plansLoading } = useQuery<WorkoutPlan[]>({
    queryKey: ['/api/workout-plans', (userProfile as any)?.id],
    queryFn: async () => {
      const userId = (userProfile as any)?.id;
      if (!userId) throw new Error('No user ID available');
      const response = await fetch(`/api/workout-plans/${userId}`);
      if (!response.ok) throw new Error('Failed to fetch workout plans');
      return response.json();
    },
    enabled: !!(userProfile as any)?.id,
  });



  const [generationState, setGenerationState] = useState<{
    isGenerating: boolean;
    operationId: string | null;
  }>({ isGenerating: false, operationId: null });

  // Auto-open generate modal when coming from home page
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('generate') === 'true') {
      setShowGenerateDialog(true);
      // Clean up the URL parameter
      setLocation('/workouts');
    }
  }, [setLocation]);

  const generatePlanMutation = useMutation({
    mutationFn: async (data: WorkoutPlanRequest) => {
      const response = await apiRequest('POST', '/api/generate-plan', data);
      return response.json();
    },
    onSuccess: (data) => {
      if (data.operationId) {
        localStorage.setItem('activeGenerationId', data.operationId); // Store for global tracking
        setShowGenerateDialog(false); // Close the form dialog
        setGenerationState({ isGenerating: true, operationId: data.operationId }); // Show progress dialog
      } else {
        queryClient.invalidateQueries({ queryKey: ['/api/workout-plans', (userProfile as any)?.id] });
        setShowGenerateDialog(false);
        toast({
          title: "Workout Plan Generated!",
          description: "Your personalized AI workout plan is ready.",
        });
      }
    },
    onError: () => {
      toast({
        title: "Generation Failed",
        description: "Failed to generate workout plan. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleGenerationComplete = (success: boolean, data?: any) => {
    setGenerationState({ isGenerating: false, operationId: null });
    
    if (success) {
      queryClient.invalidateQueries({ queryKey: ['/api/workout-plans', (userProfile as any)?.id] });
      setShowGenerateDialog(false);
      toast({
        title: "Workout Plan Generated!",
        description: "Your personalized AI workout plan is ready.",
      });
    } else {
      toast({
        title: "Generation Failed",
        description: "The workout plan generation encountered an error. Please try again.",
        variant: "destructive",
      });
    }
  };

  const form = useForm<z.infer<typeof generatePlanSchema>>({
    resolver: zodResolver(generatePlanSchema),
    defaultValues: {
      duration: 4,
      workoutsPerWeek: 3,
      timePerWorkout: 45,
      planType: "independent"
    }
  });

  const onSubmit = (values: z.infer<typeof generatePlanSchema>) => {
    if (!userProfile) {
      toast({
        title: "Profile Required",
        description: "Please complete your profile before generating a workout plan.",
        variant: "destructive",
      });
      return;
    }

    const planRequest = {
      ...values,
      userId: (userProfile as any).id,
      fitnessLevel: (userProfile.fitnessLevel as 'beginner' | 'intermediate' | 'advanced') || 'beginner',
      equipment: userProfile.equipment || [],
      goals: userProfile.goals || 'general_fitness'
    };
    generatePlanMutation.mutate(planRequest);
  };

  const filteredPlans = workoutPlans?.filter(plan => {
    const matchesSearch = plan.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         plan.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDifficulty = filterDifficulty === 'all' || plan.difficulty === filterDifficulty;
    return matchesSearch && matchesDifficulty;
  });

  // Separate active and inactive plans
  const activePlans = filteredPlans?.filter(plan => plan.isActive) || [];
  const inactivePlans = filteredPlans?.filter(plan => !plan.isActive) || [];

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-accent text-accent-foreground';
      case 'intermediate': return 'bg-primary text-primary-foreground';
      case 'advanced': return 'bg-secondary text-secondary-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="px-4 pb-24 pt-20 space-y-6 fade-in">
      {/* Header */}
      <div className="text-center space-y-4">
        <div>
          <h1 className="font-poppins font-bold text-2xl text-foreground">Workouts</h1>
          <p className="text-muted-foreground">Manage your workout plans and sessions</p>
        </div>
        
        <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
          <DialogTrigger asChild>
            <Button size="lg" className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white touch-target px-8 py-3">
              <Sparkles size={20} className="mr-2" />
              Generate AI Workout Plan
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-effect border-border/50 max-w-md mx-auto max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-poppins text-foreground">Generate AI Workout Plan</DialogTitle>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {/* Plan Type */}
                <FormField
                  control={form.control}
                  name="planType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Plan Type</FormLabel>
                      <div className="space-y-3">
                        {planTypeOptions.map((option) => (
                          <FormControl key={option.value}>
                            <label className="flex items-start space-x-3 glass-effect rounded-lg p-4 cursor-pointer hover:bg-card/60 transition-colors touch-target">
                              <input
                                type="radio"
                                name="planType"
                                value={option.value}
                                checked={field.value === option.value}
                                onChange={() => field.onChange(option.value)}
                                className="mt-1 w-4 h-4 text-primary bg-transparent border-border focus:ring-primary focus:ring-2"
                              />
                              <div className="flex-1">
                                <div className="text-foreground font-medium">{option.label}</div>
                                <div className="text-muted-foreground text-sm mt-1">{option.description}</div>
                              </div>
                            </label>
                          </FormControl>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Duration */}
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="duration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground">Duration (weeks)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="1" 
                            max="52"
                            className="glass-effect border-border/50"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="workoutsPerWeek"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground">Per Week</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="1" 
                            max="7"
                            className="glass-effect border-border/50"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="timePerWorkout"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Time per workout (minutes)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="15" 
                          max="180"
                          className="glass-effect border-border/50"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white py-3 touch-target"
                  disabled={generatePlanMutation.isPending}
                >
                  {generatePlanMutation.isPending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} className="mr-2" />
                      Generate Plan
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Generation Progress Dialog */}
        <Dialog open={generationState.isGenerating} onOpenChange={(open) => {
          if (!open) {
            setGenerationState({ isGenerating: false, operationId: null });
          }
        }}>
          <DialogContent className="glass-effect border-border/50 max-w-md mx-auto flex flex-col items-center justify-center">
            <DialogHeader className="sr-only">
              <DialogTitle>Workout Plan Generation</DialogTitle>
              <DialogDescription>
                Your AI workout plan is being generated. Please wait while we create your personalized fitness program.
              </DialogDescription>
            </DialogHeader>
            {generationState.operationId && (
              <GenerationProgress 
                operationId={generationState.operationId}
                onComplete={handleGenerationComplete}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filter */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
          <Input
            placeholder="Search workout plans..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 glass-effect border-border/50"
          />
        </div>
        
        <div className="flex items-center space-x-2">
          <Filter size={16} className="text-muted-foreground" />
          <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
            <SelectTrigger className="w-32 glass-effect border-border/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="beginner">Beginner</SelectItem>
              <SelectItem value="intermediate">Intermediate</SelectItem>
              <SelectItem value="advanced">Advanced</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Workout Plans */}
      <div className="space-y-4">
        {plansLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="glass-effect">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-5 w-20" />
                </div>
                <Skeleton className="h-4 w-full mb-2" />
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-8 w-24" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : filteredPlans && filteredPlans.length > 0 ? (
          <div className="space-y-6">
            {/* Active Plans Section */}
            {activePlans.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-poppins font-semibold text-lg text-foreground">Active Plan</h3>
                  <span className="px-3 py-1 bg-gradient-to-r from-green-500/10 to-green-600/10 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-700 rounded-full font-medium text-xs shadow-sm">Current</span>
                </div>
                <div className="space-y-3">
                  {activePlans.map((plan) => (
                    <Card key={plan.id} className="glass-effect hover:bg-card/50 transition-colors cursor-pointer border-accent/30">
                      <CardContent className="p-4">
                        <div className="mb-3">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="font-poppins font-semibold text-foreground">{plan.title}</h3>
                            <span className="px-3 py-1 bg-gradient-to-r from-purple-500/10 to-purple-600/10 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-700 rounded-full font-medium text-xs shadow-sm">
                              {plan.difficulty}
                            </span>
                            <span className="px-3 py-1 bg-gradient-to-r from-green-500/10 to-green-600/10 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-700 rounded-full font-medium text-xs shadow-sm">Active</span>
                          </div>
                        </div>
                        
                        {plan.description && (
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                            {plan.description}
                          </p>
                        )}
                        
                        <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-1">
                              <Calendar size={14} />
                              <span>{plan.duration} weeks</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Target size={14} />
                              <span>{plan.totalWorkouts} workouts</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="mb-3">
                          <div className="flex flex-wrap gap-2">
                            {plan.equipment.slice(0, 3).map((eq) => (
                              <span key={eq} className="px-3 py-1 bg-gradient-to-r from-primary/10 to-accent/10 text-primary border border-primary/20 rounded-full font-medium text-xs shadow-sm hover:shadow-md transition-shadow">
                                {eq.replace('_', ' ')}
                              </span>
                            ))}
                            {plan.equipment.length > 3 && (
                              <span className="px-3 py-1 bg-gradient-to-r from-primary/10 to-accent/10 text-primary border border-primary/20 rounded-full font-medium text-xs shadow-sm hover:shadow-md transition-shadow">
                                +{plan.equipment.length - 3}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <Link href={`/plan/${plan.id}`} className="block">
                          <Button
                            size="sm"
                            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                          >
                            View Plan
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Previous Plans Section */}
            {inactivePlans.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-poppins font-semibold text-lg text-foreground">Previous Plans</h3>
                  <span className="px-3 py-1 bg-gradient-to-r from-gray-500/10 to-gray-600/10 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-full font-medium text-xs shadow-sm">Archive</span>
                </div>
                <div className="space-y-3">
                  {inactivePlans.map((plan) => (
                    <Card key={plan.id} className="glass-effect hover:bg-card/50 transition-colors cursor-pointer opacity-75">
                      <CardContent className="p-4">
                        <div className="mb-3">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="font-poppins font-semibold text-foreground">{plan.title}</h3>
                            <span className="px-3 py-1 bg-gradient-to-r from-purple-500/10 to-purple-600/10 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-700 rounded-full font-medium text-xs shadow-sm">
                              {plan.difficulty}
                            </span>
                          </div>
                        </div>
                        
                        {plan.description && (
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                            {plan.description}
                          </p>
                        )}
                        
                        <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-1">
                              <Calendar size={14} />
                              <span>{plan.duration} weeks</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Target size={14} />
                              <span>{plan.totalWorkouts} workouts</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="mb-3">
                          <div className="flex flex-wrap gap-2">
                            {plan.equipment.slice(0, 3).map((eq) => (
                              <span key={eq} className="px-3 py-1 bg-gradient-to-r from-primary/10 to-accent/10 text-primary border border-primary/20 rounded-full font-medium text-xs shadow-sm hover:shadow-md transition-shadow">
                                {eq.replace('_', ' ')}
                              </span>
                            ))}
                            {plan.equipment.length > 3 && (
                              <span className="px-3 py-1 bg-gradient-to-r from-primary/10 to-accent/10 text-primary border border-primary/20 rounded-full font-medium text-xs shadow-sm hover:shadow-md transition-shadow">
                                +{plan.equipment.length - 3}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <Link href={`/plan/${plan.id}`} className="block">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full border-2 border-border hover:border-primary hover:bg-primary/10"
                          >
                            View Plan
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <Card className="glass-effect">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-primary to-secondary rounded-full flex items-center justify-center mx-auto mb-4">
                <Dumbbell className="text-white" size={24} />
              </div>
              <h3 className="font-poppins font-semibold text-lg text-foreground mb-2">
                No Workout Plans
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || filterDifficulty !== 'all' 
                  ? 'No plans match your search criteria'
                  : 'Create your first AI-powered workout plan to get started'
                }
              </p>
              {!searchQuery && filterDifficulty === 'all' && (
                <Button 
                  onClick={() => setShowGenerateDialog(true)}
                  className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white"
                >
                  <Sparkles size={16} className="mr-2" />
                  Generate Plan
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
