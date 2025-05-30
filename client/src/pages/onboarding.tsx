import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { apiRequest } from "@/lib/queryClient";
import { ChevronLeft, ChevronRight, Sparkles, Plus, X } from "lucide-react";

const onboardingSchema = z.object({
  fitnessLevel: z.enum(["beginner", "intermediate", "advanced"]),
  equipment: z.array(z.string()).min(1, "Please select at least one equipment option"),
  goals: z.array(z.string()).min(1, "Please select at least one fitness goal"),
  notes: z.string().optional(),
});

type OnboardingForm = z.infer<typeof onboardingSchema>;

const equipmentOptions = [
  "none", "dumbbells", "barbells", "resistance_bands", "pull_up_bar",
  "kettlebells", "medicine_ball", "yoga_mat", "foam_roller", "cable_machine",
  "squat_rack", "bench", "treadmill", "stationary_bike"
];

const goalOptions = [
  "weight_loss", "muscle_gain", "strength", "endurance", "flexibility",
  "general_fitness", "athletic_performance", "rehabilitation", "stress_relief"
];

const steps = [
  { title: "Fitness Level", description: "Tell us about your experience" },
  { title: "Equipment", description: "What do you have access to?" },
  { title: "Goals", description: "What do you want to achieve?" },
  { title: "Notes", description: "Any additional information?" },
];

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [_, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [customEquipment, setCustomEquipment] = useState("");

  const form = useForm<OnboardingForm>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      equipment: [],
      goals: [],
      notes: "",
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: OnboardingForm) => {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          onboardingCompleted: true,
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to update profile");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      setLocation("/");
    },
  });

  const onSubmit = (data: OnboardingForm) => {
    updateProfileMutation.mutate(data);
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const progress = ((currentStep + 1) / steps.length) * 100;

  const addCustomEquipment = () => {
    if (customEquipment.trim()) {
      const currentEquipment = form.getValues("equipment");
      if (!currentEquipment.includes(customEquipment.trim())) {
        form.setValue("equipment", [...currentEquipment, customEquipment.trim()]);
      }
      setCustomEquipment("");
    }
  };

  const removeEquipment = (equipmentToRemove: string) => {
    const currentEquipment = form.getValues("equipment");
    form.setValue("equipment", currentEquipment.filter(item => item !== equipmentToRemove));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex items-center justify-center p-4">
      <Card className="w-full max-w-md h-[85vh] flex flex-col glass-effect border-border/50">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-12 h-12 bg-gradient-to-r from-primary to-secondary rounded-full flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <CardTitle className="font-poppins text-2xl text-foreground">
              Welcome to Your Fitness Journey
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Let's personalize your workout experience
            </CardDescription>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Step {currentStep + 1} of {steps.length}</span>
              <span>{Math.round(progress)}% complete</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-hidden flex flex-col">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col">
              {currentStep === 0 && (
                <div className="space-y-4">
                  <div className="text-center">
                    <h3 className="font-poppins font-semibold text-lg text-foreground">
                      {steps[0].title}
                    </h3>
                    <p className="text-sm text-muted-foreground">{steps[0].description}</p>
                  </div>
                  <FormField
                    control={form.control}
                    name="fitnessLevel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground">How would you describe your fitness level?</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="glass-effect border-border/50 h-12">
                              <SelectValue placeholder="Select your fitness level" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="glass-effect border-border/50 z-50 w-[var(--radix-select-trigger-width)] max-h-[300px]">
                            <SelectItem value="beginner" className="hover:bg-card/60 focus:bg-card/60">Beginner - New to exercise</SelectItem>
                            <SelectItem value="intermediate" className="hover:bg-card/60 focus:bg-card/60">Intermediate - Regular exercise experience</SelectItem>
                            <SelectItem value="advanced" className="hover:bg-card/60 focus:bg-card/60">Advanced - Experienced athlete</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {currentStep === 1 && (
                <div className="flex-1 flex flex-col space-y-4 min-h-0">
                  <div className="text-center flex-shrink-0">
                    <h3 className="font-poppins font-semibold text-lg text-foreground">
                      {steps[1].title}
                    </h3>
                    <p className="text-sm text-muted-foreground">{steps[1].description}</p>
                  </div>
                  <FormField
                    control={form.control}
                    name="equipment"
                    render={() => (
                      <FormItem className="flex-1 flex flex-col min-h-0">
                        <FormLabel className="text-foreground flex-shrink-0">Available Equipment</FormLabel>
                        <div className="flex-1 flex flex-col space-y-3 min-h-0">
                          <div className="flex-1 overflow-y-auto min-h-[200px]">
                            <div className="grid grid-cols-1 gap-2 pr-2">
                              {equipmentOptions.map((item) => (
                                <FormField
                                  key={item}
                                  control={form.control}
                                  name="equipment"
                                  render={({ field }) => {
                                    return (
                                      <FormItem>
                                        <FormControl>
                                          <label className="flex items-center space-x-3 glass-effect rounded-lg p-2.5 cursor-pointer hover:bg-card/60 focus-within:bg-card/60 transition-colors touch-target">
                                            <Checkbox
                                              checked={field.value?.includes(item)}
                                              className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                              onCheckedChange={(checked) => {
                                                return checked
                                                  ? field.onChange([...field.value, item])
                                                  : field.onChange(
                                                      field.value?.filter((value) => value !== item)
                                                    )
                                              }}
                                            />
                                            <span className="text-sm text-foreground font-medium capitalize flex-1">
                                              {item.replace('_', ' ')}
                                            </span>
                                          </label>
                                        </FormControl>
                                      </FormItem>
                                    )
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                          
                          {/* Custom Equipment Input */}
                          <div className="space-y-2 flex-shrink-0">
                            <div className="flex gap-2">
                              <Input
                                placeholder="Add custom equipment..."
                                value={customEquipment}
                                onChange={(e) => setCustomEquipment(e.target.value)}
                                className="glass-effect border-border/50 flex-1"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    addCustomEquipment();
                                  }
                                }}
                              />
                              <Button
                                type="button"
                                size="sm"
                                onClick={addCustomEquipment}
                                className="bg-primary hover:bg-primary/90 px-3"
                              >
                                <Plus size={16} />
                              </Button>
                            </div>
                            
                            {/* Selected Equipment Tags */}
                            {form.watch("equipment").length > 0 && (
                              <div className="space-y-2">
                                <p className="text-xs text-muted-foreground">Selected equipment:</p>
                                <div className="flex flex-wrap gap-1">
                                  {form.watch("equipment").map((item) => (
                                    <div
                                      key={item}
                                      className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-md text-xs"
                                    >
                                      <span className="capitalize">{item.replace('_', ' ')}</span>
                                      <button
                                        type="button"
                                        onClick={() => removeEquipment(item)}
                                        className="hover:bg-primary/20 rounded-full p-0.5"
                                      >
                                        <X size={12} />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {currentStep === 2 && (
                <div className="flex-1 flex flex-col space-y-4 min-h-0">
                  <div className="text-center flex-shrink-0">
                    <h3 className="font-poppins font-semibold text-lg text-foreground">
                      {steps[2].title}
                    </h3>
                    <p className="text-sm text-muted-foreground">{steps[2].description}</p>
                  </div>
                  <FormField
                    control={form.control}
                    name="goals"
                    render={() => (
                      <FormItem className="flex-1 flex flex-col min-h-0">
                        <FormLabel className="text-foreground flex-shrink-0">Fitness Goals</FormLabel>
                        <div className="flex-1 overflow-y-auto min-h-[200px]">
                          <div className="grid grid-cols-1 gap-2 pr-2">
                            {goalOptions.map((item) => (
                              <FormField
                                key={item}
                                control={form.control}
                                name="goals"
                                render={({ field }) => {
                                  return (
                                    <FormItem>
                                      <FormControl>
                                        <label className="flex items-center space-x-3 glass-effect rounded-lg p-2.5 cursor-pointer hover:bg-card/60 focus-within:bg-card/60 transition-colors touch-target">
                                          <Checkbox
                                            checked={field.value?.includes(item)}
                                            className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                            onCheckedChange={(checked) => {
                                              return checked
                                                ? field.onChange([...field.value, item])
                                                : field.onChange(
                                                    field.value?.filter((value) => value !== item)
                                                  )
                                            }}
                                          />
                                          <span className="text-sm text-foreground font-medium capitalize flex-1">
                                            {item.replace('_', ' ')}
                                          </span>
                                        </label>
                                      </FormControl>
                                    </FormItem>
                                  )
                                }}
                              />
                            ))}
                          </div>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-4">
                  <div className="text-center">
                    <h3 className="font-poppins font-semibold text-lg text-foreground">
                      {steps[3].title}
                    </h3>
                    <p className="text-sm text-muted-foreground">{steps[3].description}</p>
                  </div>
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground">Additional Notes (Optional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Any injuries, preferences, or specific requirements..."
                            className="glass-effect border-border/50 min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              <div className="flex justify-between pt-4 flex-shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevStep}
                  disabled={currentStep === 0}
                  className="flex items-center space-x-2 glass-effect border-border/50 hover:bg-card/60 text-foreground"
                >
                  <ChevronLeft size={16} />
                  <span>Back</span>
                </Button>

                {currentStep < steps.length - 1 ? (
                  <Button
                    type="button"
                    onClick={nextStep}
                    className="flex items-center space-x-2 bg-primary hover:bg-primary/90"
                  >
                    <span>Next</span>
                    <ChevronRight size={16} />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={updateProfileMutation.isPending}
                    className="flex items-center space-x-2 bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90"
                  >
                    {updateProfileMutation.isPending ? (
                      <span>Setting up...</span>
                    ) : (
                      <>
                        <span>Complete Setup</span>
                        <Sparkles size={16} />
                      </>
                    )}
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}