import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
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
    <div className="w-full text-center">
      <div className="inline-block">
        <div className="flex flex-col items-center gap-4 p-6">
          <div className="flex items-center gap-3">
            {error ? (
              <XCircle className="h-6 w-6 text-red-500" />
            ) : status === 'completed' ? (
              <CheckCircle className="h-6 w-6 text-green-500" />
            ) : (
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            )}
            <h3 className="font-poppins font-semibold text-lg text-foreground">
              {error ? 'Generation Failed' : status === 'completed' ? 'Plan Ready!' : 'Generating Workout Plan'}
            </h3>
          </div>
          
          <p className="text-muted-foreground max-w-sm">
            {error ? error : status === 'completed' ? 'Your personalized workout plan is ready!' : currentStep}
          </p>
          
          {!error && status !== 'completed' && (
            <div className="text-center space-y-2">
              <div className="text-primary font-medium">
                AI Coach is designing your workout plan...
              </div>
              <div className="text-sm text-muted-foreground">
                You will be notified when it's ready!
              </div>
            </div>
          )}
          
          {status === 'completed' && (
            <Button 
              onClick={() => {
                setLocation('/workouts');
                onComplete(true);
              }}
              className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white"
            >
              View Plans
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}