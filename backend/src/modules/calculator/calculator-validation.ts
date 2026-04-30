/**
 * Calculator Validation
 * Zod schemas and input validation for calculator module
 */

import { z } from 'zod';
import { CalculatorInput } from './calculator.types';
import { t } from '../../utils/i18n';

export const ContainerEntrySchema = z.object({
  type: z.string().min(1, t('validation.containerTypeRequired')),
  quantity: z.number().int().min(1).max(50),
});

export const CalculatorInputSchema = z.object({
  portOrigin: z.string().min(1, t('validation.portOriginRequired')),
  portDestination: z.string().optional().default('Constanta'),
  containerType: z.string().min(1, t('validation.containerTypeRequired')),
  containers: z.array(ContainerEntrySchema).optional(),
  cargoCategory: z.string().optional().default(''),
  cargoWeight: z.string().min(1, t('validation.cargoWeightRequired')),
  cargoReadyDate: z.string().min(1, t('validation.cargoReadyDateRequired')),
  includeInsurance: z.boolean().optional().default(false),
  incoterm: z.enum(['FOB', 'EXW', 'CFR']).optional().default('FOB'),
  shippingLine: z.string().optional(),
  finalDestination: z.string().optional().default('constanta'),
});

export type ValidatedCalculatorInput = z.infer<typeof CalculatorInputSchema>;

/**
 * Validate calculator input — throws descriptive errors
 */
export function validateCalculatorInput(input: CalculatorInput, lang: string = 'ro'): void {
  if (!input.portOrigin) {
    throw new Error(t('validation.portOriginRequired', lang));
  }

  if (!input.containerType) {
    throw new Error(t('validation.containerTypeRequired', lang));
  }

  if (!input.cargoWeight) {
    throw new Error(t('validation.cargoWeightRequired', lang));
  }

  if (!input.cargoReadyDate) {
    throw new Error(t('validation.cargoReadyDateRequired', lang));
  }

  const readyDate = new Date(input.cargoReadyDate);
  if (isNaN(readyDate.getTime())) {
    throw new Error(t('validation.cargoReadyDateInvalid', lang));
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (readyDate < today) {
    throw new Error(t('validation.cargoReadyDatePast', lang));
  }

  // CFR requires a shipping line
  if ((input as any).incoterm === 'CFR' && !(input as any).shippingLine) {
    throw new Error(t('validation.cfrShippingLineRequired', lang));
  }
}
