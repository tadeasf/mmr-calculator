export type ConfidenceLevel = 'high' | 'medium' | 'low';

export function sigmaToConfidence(sigma: number, hasTier2: boolean): ConfidenceLevel {
  if (!hasTier2) return 'low';
  if (sigma <= 60) return 'high';
  if (sigma <= 100) return 'medium';
  return 'low';
}
