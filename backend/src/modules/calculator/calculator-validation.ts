/**
 * Calculator Validation
 * Zod schemas and input validation for calculator module
 */

import { z } from 'zod';
import { CalculatorInput } from './calculator.types';
import { t } from '../../utils/i18n';
import {
  isIncoterm,
  requiresShippingLine,
  supplierCoversMaritime,
  INCOTERMS,
} from './calculator-incoterms';

// Zod needs a non-empty tuple; keep it derived from the one list of incoterms so
// a new one can never be accepted here and rejected downstream (or vice versa).
const INCOTERMS_TUPLE = INCOTERMS as unknown as [string, ...string[]];

export const ContainerEntrySchema = z.object({
  type: z.string().min(1, t('validation.containerTypeRequired')),
  quantity: z.number().int().min(1).max(50),
});

export const CalculatorInputSchema = z.object({
  portOrigin: z.string().optional().default(''),
  portDestination: z.string().optional().default('Constanta'),
  containerType: z.string().min(1, t('validation.containerTypeRequired')),
  containers: z.array(ContainerEntrySchema).optional(),
  cargoCategory: z.string().optional().default(''),
  cargoWeight: z.string().min(1, t('validation.cargoWeightRequired')),
  cargoReadyDate: z.string().min(1, t('validation.cargoReadyDateRequired')),
  includeInsurance: z.boolean().optional().default(false),
  incoterm: z.enum(INCOTERMS_TUPLE).optional().default('FOB'),
  shippingLine: z.string().optional(),
  finalDestination: z.string().optional().default('constanta'),
});

export type ValidatedCalculatorInput = z.infer<typeof CalculatorInputSchema>;

/**
 * Validate calculator input — throws descriptive errors
 */
export function validateCalculatorInput(input: CalculatorInput, lang: string = 'ro'): void {
  const rawIncoterm = (input as { incoterm?: unknown }).incoterm;
  const sellerPaysFreight = isIncoterm(rawIncoterm) && supplierCoversMaritime(rawIncoterm);

  // Under CFR/CIF the seller books the ocean leg, so the buyer is never asked for
  // a port of origin (client: "daca selectam cfr - nu trebue sa fie portul
  // ningbo"). The engine falls back to the reference port for the legs we do
  // price, and the offer says so.
  if (!input.portOrigin && !sellerPaysFreight) {
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

  // CFR and CIF quote one specific carrier — the one the supplier already booked.
  // CIF used to slip through here because the check named CFR alone.
  const incoterm = (input as { incoterm?: unknown }).incoterm;
  if (isIncoterm(incoterm) && requiresShippingLine(incoterm)) {
    if (!(input as { shippingLine?: string }).shippingLine) {
      throw new Error(t('validation.cfrShippingLineRequired', lang));
    }
  }
}
