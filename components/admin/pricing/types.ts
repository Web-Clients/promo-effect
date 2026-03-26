/**
 * Shared types for AdminPricingPanel sub-components
 */

export interface WeightRange {
  label: string;
  min: number;
  max: number;
  enabled: boolean;
  freightSurcharge: number;
  terrestrialSurcharge: number;
}

export type Tab = 'base-prices' | 'port-adjustments' | 'settings';
