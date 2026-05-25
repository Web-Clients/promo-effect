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
  DESTINATION_PORTS_WHITELIST,
  normalizeShippingLine,
  detectShippingLineFromText,
  detectPortFromText,
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
    let validatedBl = rawBl && isBlNumber(rawBl) && !isContainerNumber(rawBl) ? rawBl : undefined;
    if (validatedContainer && validatedBl && validatedContainer === validatedBl) {
      logger.warn(
        `[AI] BL number equals container number ("${validatedContainer}") — rejecting BL`
      );
      validatedBl = undefined;
    }

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
      shippingLine: normalizeShippingLine(geminiResult.shippingLine) || geminiResult.shippingLine,
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

    let validatedContainer =
      rawContainer && isContainerNumber(rawContainer) ? rawContainer : undefined;
    let validatedBl = rawBl && isBlNumber(rawBl) && !isContainerNumber(rawBl) ? rawBl : undefined;

    if (rawContainer && !validatedContainer) {
      logger.warn(`[AI-PDF] Rejected invalid containerNumber from AI: "${rawContainer}"`);
    }
    if (rawBl && !validatedBl) {
      logger.warn(
        `[AI-PDF] Rejected invalid billOfLading from AI: "${rawBl}" (matches container pattern or invalid)`
      );
    }
    // Hard reject if BL == container (the exact bug we saw on the CMA-CGM BL).
    if (validatedContainer && validatedBl && validatedContainer === validatedBl) {
      logger.warn(
        `[AI-PDF] BL number equals container number ("${validatedContainer}") — rejecting BL and falling back to PDF text scan`
      );
      validatedBl = undefined;
    }
    // Fallback: scrape BL from raw PDF text using regex if AI dropped it.
    if (!validatedBl) {
      const labelMatch = pdfText.match(
        /(?:B\/L\s*N[oO]\.?|BL\s*N[oO]\.?|H\.?B\.?L\.?\s*N?[oO]?\.?|M\.?B\.?L\.?\s*N?[oO]?\.?|Bill\s*of\s*Lading\s*N[oO]\.?|Document\s*N[oO]\.?|Reference\s*N[oO]\.?)\s*[:\-]?\s*([A-Z0-9][A-Z0-9 \-]{4,19})/i
      );
      if (labelMatch && labelMatch[1]) {
        const candidate = labelMatch[1].trim().toUpperCase();
        if (
          isBlNumber(candidate) &&
          !isContainerNumber(candidate) &&
          candidate !== validatedContainer
        ) {
          validatedBl = candidate;
          logger.info(`[AI-PDF] Recovered BL from PDF text via label regex: "${candidate}"`);
        }
      }
    }

    // Guard against swapped ports + validate against whitelists
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
    // Whitelist guard — if AI returned a garbage port name (e.g. "Jo", "Ergonjo"),
    // scrape the PDF text for a known port instead.
    {
      const originUpper = portOrigin?.toUpperCase().split(',')[0].trim() ?? '';
      if (!portOrigin || !CHINA_PORTS_WHITELIST.has(originUpper)) {
        const fallback = detectPortFromText(pdfText, CHINA_PORTS_WHITELIST);
        if (fallback) {
          if (portOrigin && portOrigin !== fallback) {
            logger.warn(
              `[AI-PDF] Suspicious portOfLoading from AI ("${portOrigin}") — overriding with text-scan hit "${fallback}"`
            );
          }
          portOrigin = fallback;
        } else if (portOrigin && !CHINA_PORTS_WHITELIST.has(originUpper)) {
          logger.warn(
            `[AI-PDF] portOfLoading "${portOrigin}" not in China whitelist and no fallback found — keeping with warning`
          );
        }
      }
      const destUpper = portDestination?.toUpperCase().split(',')[0].trim() ?? '';
      if (!portDestination || !DESTINATION_PORTS_WHITELIST.has(destUpper)) {
        const fallback = detectPortFromText(pdfText, DESTINATION_PORTS_WHITELIST);
        if (fallback) {
          if (portDestination && portDestination !== fallback) {
            logger.warn(
              `[AI-PDF] Suspicious portOfDischarge from AI ("${portDestination}") — overriding with text-scan hit "${fallback}"`
            );
          }
          portDestination = fallback;
        } else if (portDestination && !DESTINATION_PORTS_WHITELIST.has(destUpper)) {
          logger.warn(
            `[AI-PDF] portOfDischarge "${portDestination}" not in destination whitelist — keeping with warning`
          );
        }
      }
    }

    // Validate + normalize shipping line; fallback to header/text regex scan.
    let validatedShippingLine = normalizeShippingLine(result.shippingLine);
    if (!validatedShippingLine) {
      const fallback = detectShippingLineFromText(pdfText);
      if (fallback) {
        if (result.shippingLine && result.shippingLine.toUpperCase() !== fallback.toUpperCase()) {
          logger.warn(
            `[AI-PDF] AI shippingLine "${result.shippingLine}" did not match known carriers — overriding with text-scan hit "${fallback}"`
          );
        }
        validatedShippingLine = fallback;
      } else if (result.shippingLine) {
        // Keep as-is but warn
        validatedShippingLine = result.shippingLine;
        logger.warn(`[AI-PDF] shippingLine "${result.shippingLine}" not recognized`);
      }
    } else if (
      result.shippingLine &&
      validatedShippingLine.toUpperCase() !== result.shippingLine.trim().toUpperCase()
    ) {
      // Normalization happened (e.g. "cma-cgm" → "CMA CGM"); log for observability.
      logger.info(
        `[AI-PDF] Normalized shippingLine "${result.shippingLine}" → "${validatedShippingLine}"`
      );
    }
    // Sanity: if BL prefix or container prefix points to a different carrier than
    // the AI output, override with text-scan hit (e.g. ONE vs CMA-CGM bug).
    const carrierFromSignals = detectShippingLineFromText(pdfText);
    if (
      carrierFromSignals &&
      validatedShippingLine &&
      carrierFromSignals.toUpperCase() !== validatedShippingLine.toUpperCase()
    ) {
      logger.warn(
        `[AI-PDF] shippingLine conflict — AI said "${validatedShippingLine}" but document signals point to "${carrierFromSignals}". Overriding.`
      );
      validatedShippingLine = carrierFromSignals;
    }

    // Consignee sanity check: reject placeholder names + reject if it equals shipper.
    let validatedConsigneeName = result.consigneeName?.trim();
    const shipperName = (result.shipperName || result.supplierName)?.trim();
    if (validatedConsigneeName) {
      const placeholderRe = /^(import\s*srl|importator|to\s*order|n\/a|n\.a\.|unknown|tbd)\.?$/i;
      if (placeholderRe.test(validatedConsigneeName)) {
        logger.warn(
          `[AI-PDF] Rejected placeholder consigneeName "${validatedConsigneeName}" — clearing`
        );
        validatedConsigneeName = undefined;
      } else if (
        shipperName &&
        validatedConsigneeName.toLowerCase() === shipperName.toLowerCase()
      ) {
        logger.warn(
          `[AI-PDF] consigneeName equals shipperName ("${shipperName}") — clearing (AI confused Shipper with Consignee)`
        );
        validatedConsigneeName = undefined;
      }
    }

    return {
      containerNumber: validatedContainer,
      blNumber: validatedBl,
      shippingLine: validatedShippingLine,
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
      consigneeName: validatedConsigneeName,
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
  } catch (err) {
    logger.error('[AI-PDF] parseShippingDocumentWithAI threw:', err);
    return null;
  }
}
