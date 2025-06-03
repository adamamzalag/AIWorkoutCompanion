import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Search, Filter, Play } from 'lucide-react';
import { YouTubeVideo } from '@/components/youtube-video';
import type { Exercise } from '@shared/schema';

export default function ExercisesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);

  const { data: exercises = [], isLoading } = useQuery<Exercise[]>({
    queryKey: ['/api/exercises'],
  });

  const filteredExercises = exercises.filter(exercise => {
    const matchesSearch = exercise.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         exercise.muscle_groups.some(mg => mg.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = selectedType === 'all' || exercise.type === selectedType;
    return matchesSearch && matchesType;
  });

  const exerciseTypes = ['all', 'warmup', 'main', 'cardio', 'cooldown'];
  const typeColors = {
    warmup: 'bg-blue-100 text-blue-800',
    main: 'bg-green-100 text-green-800', 
    cardio: 'bg-orange-100 text-orange-800',
    cooldown: 'bg-purple-100 text-purple-800'
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Exercise Library</h1>
        <p className="text-gray-600">Browse exercises from your workout plans</p>
      </div>

      {/* Search and Filter Controls */}
      <div className="mb-6 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search exercises..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {exerciseTypes.map(type => (
            <Button
              key={type}
              variant={selectedType === type ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedType(type)}
              className="capitalize"
            >
              {type === 'all' ? 'All Types' : type}
            </Button>
          ))}
        </div>
      </div>

      {/* Exercise Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredExercises.map(exercise => (
          <Card key={exercise.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">{exercise.name}</CardTitle>
                <Badge className={typeColors[exercise.type as keyof typeof typeColors]}>
                  {exercise.type}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Muscle Groups</p>
                  <div className="flex flex-wrap gap-1">
                    {exercise.muscle_groups.map(mg => (
                      <Badge key={mg} variant="secondary" className="text-xs">
                        {mg}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-600 mb-1">Equipment</p>
                  <div className="flex flex-wrap gap-1">
                    {exercise.equipment.map(eq => (
                      <Badge key={eq} variant="outline" className="text-xs">
                        {eq}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <span className="text-sm capitalize text-gray-500">
                    {exercise.difficulty}
                  </span>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        size="sm" 
                        onClick={() => setSelectedExercise(exercise)}
                      >
                        <Play className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>{exercise.name}</DialogTitle>
                      </DialogHeader>
                      
                      {selectedExercise && (
                        <div className="space-y-4">
                          {exercise.youtubeId && (
                            <div>
                              <h4 className="font-semibold mb-2">Video Tutorial</h4>
                              <YouTubeVideo 
                                videoId={exercise.youtubeId}
                              />
                            </div>
                          )}
                          
                          <div>
                            <h4 className="font-semibold mb-2">Instructions</h4>
                            <ol className="list-decimal list-inside space-y-1">
                              {exercise.instructions.map((instruction, index) => (
                                <li key={index} className="text-sm">{instruction}</li>
                              ))}
                            </ol>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <h4 className="font-semibold mb-2">Muscle Groups</h4>
                              <div className="flex flex-wrap gap-1">
                                {exercise.muscle_groups.map(mg => (
                                  <Badge key={mg} variant="secondary" className="text-xs">
                                    {mg}
                                  </Badge>
                                ))}
                              </div>
                            </div>

                            <div>
                              <h4 className="font-semibold mb-2">Equipment</h4>
                              <div className="flex flex-wrap gap-1">
                                {exercise.equipment.map(eq => (
                                  <Badge key={eq} variant="outline" className="text-xs">
                                    {eq}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>

                          {exercise.modifications && exercise.modifications.length > 0 && (
                            <div>
                              <h4 className="font-semibold mb-2">Modifications</h4>
                              <ul className="list-disc list-inside space-y-1">
                                {exercise.modifications.map((mod, index) => (
                                  <li key={index} className="text-sm">{mod}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredExercises.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No exercises found matching your criteria.</p>
        </div>
      )}
    </div>
  );
}