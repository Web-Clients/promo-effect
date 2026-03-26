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
  containerType?: string; // Optional: if set, interval applies only to this container type
}

export type Tab = 'base-prices' | 'port-adjustments' | 'settings';
