// Progress tracking for long-running operations
interface ProgressUpdate {
  userId: number;
  operationId: string;
  progress: number; // 0-100
  status: string;
  currentStep: string;
  totalSteps: number;
  currentStepIndex: number;
}

const progressMap = new Map<string, ProgressUpdate>();

export function updateProgress(
  userId: number,
  operationId: string,
  currentStepIndex: number,
  totalSteps: number,
  status: string,
  currentStep: string
) {
  const progress = Math.round((currentStepIndex / totalSteps) * 100);
  
  progressMap.set(operationId, {
    userId,
    operationId,
    progress,
    status,
    currentStep,
    totalSteps,
    currentStepIndex
  });

  console.log(`📊 Progress Update [${operationId}]: ${progress}% - ${currentStep}`);
}

export function getProgress(operationId: string): ProgressUpdate | null {
  return progressMap.get(operationId) || null;
}

export function completeProgress(operationId: string) {
  const existing = progressMap.get(operationId);
  if (existing) {
    progressMap.set(operationId, {
      ...existing,
      progress: 100,
      status: 'completed',
      currentStep: 'Complete'
    });
  }
}

export function clearProgress(operationId: string) {
  progressMap.delete(operationId);
}