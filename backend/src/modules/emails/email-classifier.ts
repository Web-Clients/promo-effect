/**
 * Email Classifier — telex/document detection + AI parsing via Gemini.
 * Extracted from email.service.ts (Task C3).
 */

import logger from '../../utils/logger';
import {
  ParsedEmail,
  ExtractedBookingData,
  isContainerNumber,
  isBlNumber,
  CHINA_PORTS_WHITELIST,
} from './email.types';

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

    // Validate AI output: enforce BL ≠ container distinction
    const rawContainer = geminiResult.containerNumber?.trim().toUpperCase();
    const rawBl = geminiResult.billOfLading?.trim().toUpperCase();

    const validatedContainer =
      rawContainer && isContainerNumber(rawContainer) ? rawContainer : undefined;
    const validatedBl = rawBl && isBlNumber(rawBl) && !isContainerNumber(rawBl) ? rawBl : undefined;

    // Validate portOrigin is a known China port (guard against swapped ports)
    let portOrigin = geminiResult.portOfLoading;
    let portDestination = geminiResult.portOfDischarge;
    if (portOrigin && portDestination) {
      const originUpper = portOrigin.toUpperCase().split(',')[0].trim();
      const destUpper = portDestination.toUpperCase().split(',')[0].trim();
      // If origin looks like European port and destination looks like China → swap
      if (!CHINA_PORTS_WHITELIST.has(originUpper) && CHINA_PORTS_WHITELIST.has(destUpper)) {
        logger.warn('[AI] Port of Loading/Discharge appear swapped — auto-correcting');
        [portOrigin, portDestination] = [portDestination, portOrigin];
      }
    }

    return {
      containerNumber: validatedContainer,
      blNumber: validatedBl,
      shippingLine: geminiResult.shippingLine,
      vesselName: geminiResult.vesselName,
      voyageNumber: undefined,
      portOrigin,
      portDestination,
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

    // Validate AI output: enforce strict BL ≠ container distinction
    const rawContainer = result.containerNumber?.trim().toUpperCase();
    const rawBl = result.billOfLading?.trim().toUpperCase();

    const validatedContainer =
      rawContainer && isContainerNumber(rawContainer) ? rawContainer : undefined;
    const validatedBl = rawBl && isBlNumber(rawBl) && !isContainerNumber(rawBl) ? rawBl : undefined;

    if (rawContainer && !validatedContainer) {
      logger.warn(`[AI-PDF] Rejected invalid containerNumber from AI: "${rawContainer}"`);
    }
    if (rawBl && !validatedBl) {
      logger.warn(
        `[AI-PDF] Rejected invalid billOfLading from AI: "${rawBl}" (matches container pattern or invalid)`
      );
    }

    // Guard against swapped ports
    let portOrigin = result.portOfLoading;
    let portDestination = result.portOfDischarge;
    if (portOrigin && portDestination) {
      const originUpper = portOrigin.toUpperCase().split(',')[0].trim();
      const destUpper = portDestination.toUpperCase().split(',')[0].trim();
      if (!CHINA_PORTS_WHITELIST.has(originUpper) && CHINA_PORTS_WHITELIST.has(destUpper)) {
        logger.warn('[AI-PDF] Port of Loading/Discharge appear swapped — auto-correcting');
        [portOrigin, portDestination] = [portDestination, portOrigin];
      }
    }

    return {
      containerNumber: validatedContainer,
      blNumber: validatedBl,
      shippingLine: result.shippingLine,
      vesselName: result.vesselName,
      voyageNumber: result.voyageNumber,
      portOrigin,
      portDestination,
      etd: result.departureDate ? new Date(result.departureDate) : undefined,
      eta: result.eta ? new Date(result.eta) : undefined,
      containerType: result.containerType,
      cargoWeight: result.weight,
      cargoDescription: result.cargoDescription,
      // Supplier (Chinese shipper)
      supplierName: result.shipperName || result.supplierName,
      supplierPhone: result.shipperPhone || result.supplierPhone,
      supplierEmail: result.shipperEmail || result.supplierEmail,
      supplierAddress: result.shipperAddress,
      supplierContact: result.shipperContact,
      supplierWebsite: result.shipperWebsite,
      // Consignee (Moldovan/Romanian beneficiary)
      consigneeName: result.consigneeName,
      consigneeAddress: result.consigneeAddress,
      consigneeContact: result.consigneeContact,
      consigneePhone: result.consigneePhone,
      consigneeEmail: result.consigneeEmail,
      consigneeIDNO: result.consigneeIDNO,
      // Notify party
      notifyPartyName: result.notifyPartyName,
      notifyPartyAddress: result.notifyPartyAddress,
      notifyPartyEmail: result.notifyPartyEmail,
      confidence: result.confidence || 85,
      extractionMethod: 'AI',
      rawEmailId: '',
    };
  } catch {
    return null;
  }
}
