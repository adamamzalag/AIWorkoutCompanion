/**
 * Utility functions for parsing and displaying rep information
 */

export interface RepInfo {
  minReps: number;
  maxReps: number;
  isRange: boolean;
  perArm: boolean;
  displayText: string;
  inputPlaceholder: string;
}

/**
 * Parse rep string from database into structured rep information
 * Examples:
 * - "12" -> { minReps: 12, maxReps: 12, isRange: false, perArm: false }
 * - "10-12" -> { minReps: 10, maxReps: 12, isRange: true, perArm: false }
 * - "10-12 per arm" -> { minReps: 10, maxReps: 12, isRange: true, perArm: true }
 * - "15 per arm" -> { minReps: 15, maxReps: 15, isRange: false, perArm: true }
 */
export function parseRepString(repString: string): RepInfo {
  const cleanString = repString.trim().toLowerCase();
  const perArm = cleanString.includes('per arm') || cleanString.includes('each side') || cleanString.includes('each arm');
  
  // Remove "per arm" and similar phrases to get just the numbers
  const numberPart = cleanString
    .replace(/per arm/g, '')
    .replace(/each side/g, '')
    .replace(/each arm/g, '')
    .replace(/each/g, '')
    .trim();
  
  // Check if it's a range (contains dash or "to")
  const rangeMatch = numberPart.match(/(\d+)[-–—to]+(\d+)/);
  
  if (rangeMatch) {
    const minReps = parseInt(rangeMatch[1]);
    const maxReps = parseInt(rangeMatch[2]);
    
    return {
      minReps,
      maxReps,
      isRange: true,
      perArm,
      displayText: perArm ? `${minReps}-${maxReps} per arm` : `${minReps}-${maxReps}`,
      inputPlaceholder: perArm ? `${minReps}-${maxReps} per arm` : `${minReps}-${maxReps}`
    };
  }
  
  // Single number
  const singleMatch = numberPart.match(/(\d+)/);
  if (singleMatch) {
    const reps = parseInt(singleMatch[1]);
    
    return {
      minReps: reps,
      maxReps: reps,
      isRange: false,
      perArm,
      displayText: perArm ? `${reps} per arm` : `${reps}`,
      inputPlaceholder: perArm ? `${reps} per arm` : `${reps}`
    };
  }
  
  // Fallback for unparseable strings
  return {
    minReps: 0,
    maxReps: 0,
    isRange: false,
    perArm: false,
    displayText: repString,
    inputPlaceholder: repString
  };
}

/**
 * Get the target reps for a specific set based on rep info and set number
 * For ranges, distribute evenly across sets or use progressive loading
 */
export function getTargetRepsForSet(repInfo: RepInfo, setIndex: number, totalSets: number): number {
  if (!repInfo.isRange) {
    return repInfo.minReps;
  }
  
  // For ranges, start with minimum reps and gradually increase
  const repRange = repInfo.maxReps - repInfo.minReps;
  const increment = repRange / Math.max(totalSets - 1, 1);
  const targetReps = Math.round(repInfo.minReps + (increment * setIndex));
  
  return Math.min(targetReps, repInfo.maxReps);
}

/**
 * Format reps for display in set headers
 */
export function formatSetReps(repInfo: RepInfo, setIndex: number, totalSets: number): string {
  if (!repInfo.isRange) {
    return repInfo.displayText;
  }
  
  const targetReps = getTargetRepsForSet(repInfo, setIndex, totalSets);
  const suffix = repInfo.perArm ? ' per arm' : '';
  
  return `${targetReps}${suffix}`;
}

/**
 * Calculate total reps including per arm multiplier
 */
export function calculateTotalReps(reps: number, perArm: boolean): number {
  return perArm ? reps * 2 : reps;
}