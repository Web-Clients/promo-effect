/**
 * Calculator Validation
 * Zod schemas and input validation for calculator module
 */

import { z } from 'zod';
import { CalculatorInput } from './calculator.types';

export const ContainerEntrySchema = z.object({
  type: z.string().min(1, 'Tipul containerului este obligatoriu'),
  quantity: z.number().int().min(1).max(50),
});

export const CalculatorInputSchema = z.object({
  portOrigin: z.string().min(1, 'Portul de origine este obligatoriu'),
  portDestination: z.string().optional().default('Constanta'),
  containerType: z.string().min(1, 'Tipul containerului este obligatoriu'),
  containers: z.array(ContainerEntrySchema).optional(),
  cargoCategory: z.string().optional().default(''),
  cargoWeight: z.string().min(1, 'Greutatea mărfii este obligatorie'),
  cargoReadyDate: z.string().min(1, 'Data pregătirii mărfii este obligatorie'),
  includeInsurance: z.boolean().optional().default(false),
  incoterm: z.enum(['FOB', 'EXW', 'CFR']).optional().default('FOB'),
  shippingLine: z.string().optional(),
  finalDestination: z.string().optional().default('constanta'),
});

export type ValidatedCalculatorInput = z.infer<typeof CalculatorInputSchema>;

/**
 * Validate calculator input — throws descriptive errors
 */
export function validateCalculatorInput(input: CalculatorInput): void {
  if (!input.portOrigin) {
    throw new Error('Portul de origine este obligatoriu');
  }

  if (!input.containerType) {
    throw new Error('Tipul containerului este obligatoriu');
  }

  if (!input.cargoWeight) {
    throw new Error('Greutatea mărfii este obligatorie');
  }

  if (!input.cargoReadyDate) {
    throw new Error('Data pregătirii mărfii este obligatorie');
  }

  const readyDate = new Date(input.cargoReadyDate);
  if (isNaN(readyDate.getTime())) {
    throw new Error('Data pregătirii mărfii este invalidă');
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (readyDate < today) {
    throw new Error('Data pregătirii mărfii trebuie să fie în viitor');
  }

  // CFR requires a shipping line
  if ((input as any).incoterm === 'CFR' && !(input as any).shippingLine) {
    throw new Error('Pentru CFR selectați linia maritimă');
  }
}
