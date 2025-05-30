import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { apiRequest } from "@/lib/queryClient";
import { User } from "@shared/schema";
import { Settings, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const profileSchema = z.object({
  fitnessLevel: z.enum(["beginner", "intermediate", "advanced"]),
  equipment: z.array(z.string()).min(1, "Please select at least one equipment option"),
  goals: z.array(z.string()).min(1, "Please select at least one fitness goal"),
  notes: z.string().optional(),
});

type ProfileForm = z.infer<typeof profileSchema>;

const equipmentOptions = [
  "none", "dumbbells", "barbells", "resistance_bands", "pull_up_bar",
  "kettlebells", "medicine_ball", "yoga_mat", "foam_roller", "cable_machine",
  "squat_rack", "bench", "treadmill", "stationary_bike"
];

const goalOptions = [
  "weight_loss", "muscle_gain", "strength", "endurance", "flexibility",
  "general_fitness", "athletic_performance", "rehabilitation", "stress_relief"
];

export default function ProfilePage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery<User>({
    queryKey: ["/api/profile"],
  });

  const form = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fitnessLevel: profile?.fitnessLevel as any || "beginner",
      equipment: profile?.equipment || [],
      goals: profile?.goals || [],
      notes: profile?.notes || "",
    },
    values: profile ? {
      fitnessLevel: profile.fitnessLevel as any || "beginner",
      equipment: profile.equipment || [],
      goals: profile.goals || [],
      notes: profile.notes || "",
    } : undefined,
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileForm) => {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error("Failed to update profile");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      toast({
        title: "Profile updated",
        description: "Your fitness profile has been saved successfully.",
      });
    },
  });

  const onSubmit = (data: ProfileForm) => {
    updateProfileMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="px-4 pb-24 pt-20 space-y-6 fade-in">
        <div className="space-y-4">
          <div className="h-8 bg-muted rounded animate-pulse" />
          <div className="h-4 bg-muted rounded animate-pulse w-2/3" />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 bg-muted rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pb-24 pt-20 space-y-6 fade-in">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-gradient-to-r from-primary to-secondary rounded-full flex items-center justify-center">
          <Settings className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-poppins font-bold text-2xl text-foreground">Profile Settings</h1>
          <p className="text-muted-foreground">Manage your fitness preferences</p>
        </div>
      </div>

      <Card className="glass-effect border-border/50">
        <CardHeader>
          <CardTitle className="font-poppins text-foreground">Fitness Profile</CardTitle>
          <CardDescription>
            Update your preferences to get better workout recommendations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Fitness Level */}
              <FormField
                control={form.control}
                name="fitnessLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Fitness Level</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="glass-effect border-border/50">
                          <SelectValue placeholder="Select your fitness level" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="beginner">Beginner - New to exercise</SelectItem>
                        <SelectItem value="intermediate">Intermediate - Regular exercise experience</SelectItem>
                        <SelectItem value="advanced">Advanced - Experienced athlete</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Equipment */}
              <FormField
                control={form.control}
                name="equipment"
                render={() => (
                  <FormItem>
                    <FormLabel className="text-foreground">Available Equipment</FormLabel>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {equipmentOptions.map((item) => (
                        <FormField
                          key={item}
                          control={form.control}
                          name="equipment"
                          render={({ field }) => {
                            return (
                              <FormItem>
                                <FormControl>
                                  <label className="flex items-center space-x-3 glass-effect rounded-lg p-3 cursor-pointer hover:bg-card/60 transition-colors touch-target">
                                    <Checkbox
                                      checked={field.value?.includes(item)}
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
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Goals */}
              <FormField
                control={form.control}
                name="goals"
                render={() => (
                  <FormItem>
                    <FormLabel className="text-foreground">Fitness Goals</FormLabel>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {goalOptions.map((item) => (
                        <FormField
                          key={item}
                          control={form.control}
                          name="goals"
                          render={({ field }) => {
                            return (
                              <FormItem>
                                <FormControl>
                                  <label className="flex items-center space-x-3 glass-effect rounded-lg p-3 cursor-pointer hover:bg-card/60 transition-colors touch-target">
                                    <Checkbox
                                      checked={field.value?.includes(item)}
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
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Notes */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Additional Notes</FormLabel>
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

              <Button
                type="submit"
                disabled={updateProfileMutation.isPending}
                className="w-full bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white py-3 touch-target"
              >
                {updateProfileMutation.isPending ? (
                  <span>Saving...</span>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Profile
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}