import { useState, useEffect } from 'react';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

interface GenerationProgressProps {
  operationId: string;
  onComplete: (success: boolean, data?: any) => void;
}

export function GenerationProgress({ operationId, onComplete }: GenerationProgressProps) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('starting');
  const [currentStep, setCurrentStep] = useState('Initializing...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    let isActive = true;
    
    const checkProgress = async () => {
      if (!isActive) return;
      
      try {
        const response = await fetch(`/api/generation-progress/${operationId}`);
        const data = await response.json();
        
        if (!isActive) return; // Component unmounted during fetch
        
        if (data.progress !== undefined) {
          setProgress(data.progress);
          setCurrentStep(data.currentStep || 'Processing...');
          setStatus(data.status);
          
          if (data.status === 'completed') {
            if (interval) clearInterval(interval);
            isActive = false;
            onComplete(true, data.result);
            return;
          } else if (data.status === 'failed' || data.status === 'error') {
            if (interval) clearInterval(interval);
            isActive = false;
            setError(data.error || 'Generation failed');
            onComplete(false);
            return;
          }
        }
      } catch (err) {
        if (!isActive) return;
        console.error('Progress check failed:', err);
        if (interval) clearInterval(interval);
        isActive = false;
        setError('Failed to check progress');
        onComplete(false);
      }
    };

    // Check immediately and then every 2 seconds (reduced frequency)
    checkProgress();
    interval = setInterval(checkProgress, 2000);

    return () => {
      isActive = false;
      if (interval) clearInterval(interval);
    };
  }, [operationId, onComplete]);

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          {error ? (
            <XCircle className="h-5 w-5 text-red-500" />
          ) : status === 'completed' ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : (
            <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
          )}
          {error ? 'Generation Failed' : status === 'completed' ? 'Complete!' : 'Generating Workout Plan'}
        </CardTitle>
        <CardDescription>
          {error ? error : currentStep}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Progress value={progress} className="w-full" />
          <div className="text-center text-sm text-muted-foreground">
            {progress}% complete
          </div>
        </div>
      </CardContent>
    </Card>
  );
}