/**
 * Email Classifier — telex/document detection + AI parsing via Gemini.
 * Extracted from email.service.ts (Task C3).
 */

import logger from '../../utils/logger';
import { ParsedEmail, ExtractedBookingData } from './email.types';

/**
 * Detect whether an email likely contains a telex release.
 */
export function isTelexRelease(subject: string, body: string): boolean {
  const text = `${subject}\n${body}`.toLowerCase();
  return /telex\s*release|surrendered\s*b\/l|original\s*b\/l\s*surrendered/.test(text);
}

/**
 * Detect whether documents (B/L, invoice, packing list) are attached or referenced.
 */
export function hasDocumentsIndicator(
  subject: string,
  body: string,
  attachments: string[]
): boolean {
  const text = `${subject}\n${body}`.toLowerCase();
  const hasKeyword = /bill\s*of\s*lading|b\/l|packing\s*list|commercial\s*invoice|telex/.test(text);
  const hasPdfAttachment = attachments.some((name) => name.toLowerCase().endsWith('.pdf'));
  return hasKeyword || hasPdfAttachment;
}

/**
 * Parse email using Gemini AI (fallback when regex confidence < 80%).
 */
export async function parseEmailWithAI(email: ParsedEmail): Promise<ExtractedBookingData> {
  try {
    const geminiService = await import('../../services/gemini.service');

    if (!geminiService.isGeminiConfigured()) {
      logger.warn('Gemini API key not configured, skipping AI parsing');
      return { confidence: 0, extractionMethod: 'AI', rawEmailId: email.id };
    }

    const emailContent = `
From: ${email.from}
Subject: ${email.subject}
Date: ${email.date.toISOString()}
Body:
${email.body.substring(0, 5000)}
    `.trim();

    const geminiResult = await geminiService.parseEmailWithGemini(emailContent);

    if (geminiResult.error) {
      logger.warn('Gemini parsing failed:', geminiResult.error);
      return { confidence: 0, extractionMethod: 'AI', rawEmailId: email.id };
    }

    return {
      containerNumber: geminiResult.containerNumber,
      blNumber: geminiResult.billOfLading,
      shippingLine: geminiResult.shippingLine,
      vesselName: geminiResult.vesselName,
      voyageNumber: undefined,
      portOrigin: geminiResult.portOfLoading,
      portDestination: geminiResult.portOfDischarge,
      etd: geminiResult.departureDate ? new Date(geminiResult.departureDate) : undefined,
      eta: geminiResult.eta ? new Date(geminiResult.eta) : undefined,
      containerType: undefined,
      cargoWeight: geminiResult.weight,
      cargoDescription: geminiResult.cargoDescription,
      supplierName: undefined,
      supplierPhone: undefined,
      supplierEmail: undefined,
      confidence: geminiResult.confidence || 75,
      extractionMethod: 'AI',
      rawEmailId: email.id,
    };
  } catch (error) {
    logger.error('AI parsing failed:', error);
    return { confidence: 0, extractionMethod: 'AI', rawEmailId: email.id };
  }
}

/**
 * Parse a shipping document (PDF text) with Gemini using specialised prompt.
 */
export async function parseShippingDocumentWithAI(
  pdfText: string,
  emailContext: string
): Promise<ExtractedBookingData | null> {
  try {
    const geminiService = await import('../../services/gemini.service');
    if (!geminiService.isGeminiConfigured()) return null;

    const result = await geminiService.parseShippingDocumentWithGemini(pdfText, emailContext);
    if (result.error) return null;

    return {
      containerNumber: result.containerNumber,
      blNumber: result.billOfLading,
      shippingLine: result.shippingLine,
      vesselName: result.vesselName,
      voyageNumber: result.voyageNumber,
      portOrigin: result.portOfLoading,
      portDestination: result.portOfDischarge,
      etd: result.departureDate ? new Date(result.departureDate) : undefined,
      eta: result.eta ? new Date(result.eta) : undefined,
      containerType: result.containerType,
      cargoWeight: result.weight,
      cargoDescription: result.cargoDescription,
      supplierName: result.shipperName || result.supplierName,
      supplierPhone: result.supplierPhone,
      supplierEmail: result.supplierEmail,
      confidence: result.confidence || 85,
      extractionMethod: 'AI',
      rawEmailId: '',
    };
  } catch {
    return null;
  }
}
