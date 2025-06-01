import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

interface GenerationProgressProps {
  operationId: string;
  onComplete: (success: boolean, data?: any) => void;
}

export function GenerationProgress({ operationId, onComplete }: GenerationProgressProps) {
  const [status, setStatus] = useState('starting');
  const [currentStep, setCurrentStep] = useState('Initializing workout plan generation...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    let isActive = true;
    
    // Request notification permission when component mounts
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
    
    const checkProgress = async () => {
      if (!isActive) return;
      
      try {
        const response = await fetch(`/api/generation-progress/${operationId}`);
        const data = await response.json();
        
        if (!isActive) return; // Component unmounted during fetch
        
        if (data.progress !== undefined) {
          setCurrentStep(data.currentStep || 'Processing workout plan...');
          setStatus(data.status);
          
          if (data.status === 'completed') {
            if (interval) clearInterval(interval);
            isActive = false;
            localStorage.removeItem('activeGenerationId'); // Clear global tracking
            
            // Show browser notification
            if (Notification.permission === 'granted') {
              new Notification('Workout Plan Ready!', {
                body: 'Your personalized workout plan has been generated successfully.',
                icon: '/favicon.ico'
              });
            }
            
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

    // Check immediately and then every 2 seconds
    checkProgress();
    interval = setInterval(checkProgress, 5000);

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
          {!error && status !== 'completed' && (
            <div className="text-center">
              <div className="text-lg font-medium text-blue-600 mb-2">
                AI Coach is designing your workout plan...
              </div>
              <div className="text-sm text-muted-foreground">
                You will be notified when it's ready!
              </div>
            </div>
          )}
          {status === 'completed' && (
            <div className="text-center text-green-600 font-medium">
              Your workout plan is ready!
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}