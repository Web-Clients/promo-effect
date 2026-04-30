/**
 * Email Parser — regex extraction of booking fields from email text.
 * Extracted from email.service.ts (Task C3).
 */

import {
  ParsedEmail,
  ExtractedBookingData,
  REGEX_PATTERNS,
  SHIPPING_LINE_MAP,
} from './email.types';

/**
 * Parse a single email and extract booking data using regex patterns.
 * Returns an ExtractedBookingData with a confidence score (0–100).
 */
export async function parseEmailWithRegex(email: ParsedEmail): Promise<ExtractedBookingData> {
  const content = `${email.subject}\n${email.body}`;
  const extracted: ExtractedBookingData = {
    confidence: 0,
    extractionMethod: 'REGEX',
    rawEmailId: email.id,
  };

  let matchCount = 0;

  const containerMatches = content.match(REGEX_PATTERNS.containerNumber);
  if (containerMatches?.length) {
    extracted.containerNumber = containerMatches[0].toUpperCase();
    matchCount++;
  }

  const blMatches = content.match(REGEX_PATTERNS.blNumber);
  if (blMatches?.length) {
    extracted.blNumber = blMatches[0].toUpperCase();
    matchCount++;
  }

  const lineMatches = content.match(REGEX_PATTERNS.shippingLines);
  if (lineMatches?.length) {
    const rawLine = lineMatches[0].toLowerCase().replace(/\s+/g, ' ');
    extracted.shippingLine = SHIPPING_LINE_MAP[rawLine] || lineMatches[0];
    matchCount++;
  }

  const chinaPortMatches = content.match(REGEX_PATTERNS.chinesePorts);
  if (chinaPortMatches?.length) {
    extracted.portOrigin = chinaPortMatches[0];
    matchCount++;
  }

  const euPortMatches = content.match(REGEX_PATTERNS.europeanPorts);
  if (euPortMatches?.length) {
    extracted.portDestination = euPortMatches[0];
    matchCount++;
  }

  const vesselMatches = REGEX_PATTERNS.vesselName.exec(content);
  if (vesselMatches) {
    extracted.vesselName = vesselMatches[1].trim();
    matchCount++;
  }

  const voyageMatches = REGEX_PATTERNS.voyageNumber.exec(content);
  if (voyageMatches) {
    extracted.voyageNumber = voyageMatches[1].trim();
    matchCount++;
  }

  const containerTypeMatches = content.match(REGEX_PATTERNS.containerType);
  if (containerTypeMatches?.length) {
    const type = containerTypeMatches[0].toLowerCase();
    if (type.includes('40') && (type.includes('hc') || type.includes('hq'))) {
      extracted.containerType = '40ft_HC';
    } else if (type.includes('40')) {
      extracted.containerType = '40ft';
    } else {
      extracted.containerType = '20ft';
    }
    matchCount++;
  }

  const dateMatches = content.match(REGEX_PATTERNS.dateISO);
  if (dateMatches) {
    const etdCtx = /ETD|departure|sailing|depart/i;
    const etaCtx = /ETA|arrival|arrive/i;

    for (const dateStr of dateMatches) {
      const contextBefore = content.substring(
        Math.max(0, content.indexOf(dateStr) - 30),
        content.indexOf(dateStr)
      );
      if (etdCtx.test(contextBefore) && !extracted.etd) {
        extracted.etd = new Date(dateStr);
        matchCount++;
      } else if (etaCtx.test(contextBefore) && !extracted.eta) {
        extracted.eta = new Date(dateStr);
        matchCount++;
      }
    }
  }

  const emailMatches = content.match(REGEX_PATTERNS.email);
  if (emailMatches) {
    const supplierEmail = emailMatches.find(
      (e) => !e.includes('promo-efect') && !e.includes('gmail.com') && !e.includes('yahoo.com')
    );
    if (supplierEmail) {
      extracted.supplierEmail = supplierEmail;
      matchCount++;
    }
  }

  const phoneMatches = content.match(REGEX_PATTERNS.phoneChina);
  if (phoneMatches?.length) {
    extracted.supplierPhone = phoneMatches[0];
    matchCount++;
  }

  // Weighted confidence (0–100)
  const weights: Record<string, number> = {
    containerNumber: 20,
    blNumber: 15,
    shippingLine: 10,
    portOrigin: 10,
    portDestination: 10,
    containerType: 10,
    etd: 5,
    eta: 5,
    vesselName: 5,
    voyageNumber: 5,
    supplierEmail: 3,
    supplierPhone: 2,
  };

  let totalWeight = 0;
  let earnedWeight = 0;
  for (const [field, weight] of Object.entries(weights)) {
    totalWeight += weight;
    if (extracted[field as keyof ExtractedBookingData]) earnedWeight += weight;
  }
  extracted.confidence = Math.round((earnedWeight / totalWeight) * 100);

  return extracted;
}
