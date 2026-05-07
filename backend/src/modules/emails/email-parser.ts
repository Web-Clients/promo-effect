/**
 * Email Parser — regex extraction of booking fields from email text.
 * Extracted from email.service.ts (Task C3).
 *
 * KEY RULE: BL number and Container number are DIFFERENT things.
 *   Container: exactly 4 UPPERCASE letters + 7 digits (ISO 6346). e.g. CMAU8850469
 *   BL number: the shipping document identifier, e.g. ASG 202604078, MEDUKC298446, HBL04078
 * They are NEVER the same value. If extracted containerNumber matches BL pattern → it's a container.
 * If extracted blNumber matches container pattern → it is NOT a BL, reject it.
 */

import {
  ParsedEmail,
  ExtractedBookingData,
  REGEX_PATTERNS,
  SHIPPING_LINE_MAP,
  isContainerNumber,
  isBlNumber,
  CHINA_PORTS_WHITELIST,
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

  // ── Container number (STRICT: 4 letters + 7 digits) ──────────────────────
  const containerRx = new RegExp(REGEX_PATTERNS.containerNumber.source, 'gi');
  const containerMatches = content.match(containerRx);
  if (containerMatches?.length) {
    // Take the first match that passes strict validation
    const validContainer = containerMatches.find((m) => isContainerNumber(m));
    if (validContainer) {
      extracted.containerNumber = validContainer.toUpperCase();
    }
  }

  // ── B/L number — label-anchored extraction (highest priority) ────────────
  // Reset lastIndex before exec
  const blLabelRx = new RegExp(REGEX_PATTERNS.blNumber.source, 'gi');
  let blMatch = blLabelRx.exec(content);
  while (blMatch) {
    const candidate = blMatch[1].trim().replace(/\s+/g, ' ');
    if (isBlNumber(candidate)) {
      extracted.blNumber = candidate.toUpperCase();
      break;
    }
    blMatch = blLabelRx.exec(content);
  }

  // ── B/L fallback — carrier-specific patterns (if label not found) ─────────
  if (!extracted.blNumber) {
    const blCarrierRx = new RegExp(REGEX_PATTERNS.blNumberCarrier.source, 'gi');
    const carrierMatches = content.match(blCarrierRx);
    if (carrierMatches?.length) {
      const validBl = carrierMatches.find((m) => isBlNumber(m) && m !== extracted.containerNumber);
      if (validBl) extracted.blNumber = validBl.toUpperCase();
    }
  }

  // ── Post-extraction cross-validation ────────────────────────────────────
  // If blNumber accidentally captured a container number → nullify it
  if (extracted.blNumber && isContainerNumber(extracted.blNumber)) {
    extracted.blNumber = undefined;
  }
  // If containerNumber accidentally captured a non-container value → nullify it
  if (extracted.containerNumber && !isContainerNumber(extracted.containerNumber)) {
    extracted.containerNumber = undefined;
  }
  // BL and container must never be the same value
  if (
    extracted.blNumber &&
    extracted.containerNumber &&
    extracted.blNumber === extracted.containerNumber
  ) {
    extracted.blNumber = undefined; // container wins — BL must be found from label
  }

  // ── Shipping line ─────────────────────────────────────────────────────────
  const lineRx = new RegExp(REGEX_PATTERNS.shippingLines.source, 'gi');
  const lineMatches = content.match(lineRx);
  if (lineMatches?.length) {
    const rawLine = lineMatches[0].toLowerCase().replace(/\s+/g, ' ');
    extracted.shippingLine = SHIPPING_LINE_MAP[rawLine] || lineMatches[0].toUpperCase();
  }

  // ── Port of loading (China origin) ───────────────────────────────────────
  const chinaPortRx = new RegExp(REGEX_PATTERNS.chinesePorts.source, 'gi');
  const chinaPortMatches = content.match(chinaPortRx);
  if (chinaPortMatches?.length) {
    // Prefer match near "Port of Loading", "loading port", "POL", or "origin"
    const loadingCtxRx =
      /(?:Port\s*of\s*Loading|Loading\s*Port|POL|Origin|Place\s*of\s*Receipt)\s*[:\s]*([A-Za-z]+)/gi;
    let ctxMatch = loadingCtxRx.exec(content);
    let foundInContext = false;
    while (ctxMatch) {
      const candidate = ctxMatch[1].toUpperCase();
      if (CHINA_PORTS_WHITELIST.has(candidate)) {
        extracted.portOrigin = ctxMatch[1];
        foundInContext = true;
        break;
      }
      ctxMatch = loadingCtxRx.exec(content);
    }
    if (!foundInContext) {
      extracted.portOrigin = chinaPortMatches[0];
    }
  }

  // ── Port of discharge (European destination) ──────────────────────────────
  const euPortRx = new RegExp(REGEX_PATTERNS.europeanPorts.source, 'gi');
  const euPortMatches = content.match(euPortRx);
  if (euPortMatches?.length) {
    extracted.portDestination = euPortMatches[0];
  }

  // ── Vessel name ───────────────────────────────────────────────────────────
  const vesselRx = new RegExp(REGEX_PATTERNS.vesselName.source, 'gi');
  const vesselMatch = vesselRx.exec(content);
  if (vesselMatch) {
    extracted.vesselName = vesselMatch[1].trim();
  }

  // ── Voyage number ─────────────────────────────────────────────────────────
  const voyageRx = new RegExp(REGEX_PATTERNS.voyageNumber.source, 'gi');
  const voyageMatch = voyageRx.exec(content);
  if (voyageMatch) {
    extracted.voyageNumber = voyageMatch[1].trim();
  }

  // ── Container type ────────────────────────────────────────────────────────
  const ctypeRx = new RegExp(REGEX_PATTERNS.containerType.source, 'gi');
  const containerTypeMatches = content.match(ctypeRx);
  if (containerTypeMatches?.length) {
    const type = containerTypeMatches[0].toLowerCase();
    if (type.startsWith('45')) {
      extracted.containerType = '45ft_HC';
    } else if (
      type.includes('40') &&
      (type.includes('hc') || type.includes('hq') || type.includes('hh'))
    ) {
      extracted.containerType = '40ft_HC';
    } else if (type.includes('40')) {
      extracted.containerType = '40ft';
    } else {
      extracted.containerType = '20ft';
    }
  }

  // ── Dates ─────────────────────────────────────────────────────────────────
  const dateRx = new RegExp(REGEX_PATTERNS.dateISO.source, 'g');
  const dateMatches = content.match(dateRx);
  if (dateMatches) {
    const etdCtx = /ETD|departure|sailing|depart/i;
    const etaCtx = /ETA|arrival|arrive/i;

    for (const dateStr of dateMatches) {
      const pos = content.indexOf(dateStr);
      const contextBefore = content.substring(Math.max(0, pos - 30), pos);
      if (etdCtx.test(contextBefore) && !extracted.etd) {
        extracted.etd = new Date(dateStr);
      } else if (etaCtx.test(contextBefore) && !extracted.eta) {
        extracted.eta = new Date(dateStr);
      }
    }
  }

  // ── Supplier email ────────────────────────────────────────────────────────
  const emailRx = new RegExp(REGEX_PATTERNS.email.source, 'gi');
  const emailMatches = content.match(emailRx);
  if (emailMatches) {
    const supplierEmail = emailMatches.find(
      (e) =>
        !e.includes('promo-efect') &&
        !e.includes('efect.logistic') &&
        !e.includes('gmail.com') &&
        !e.includes('yahoo.com')
    );
    if (supplierEmail) {
      extracted.supplierEmail = supplierEmail.toLowerCase();
    }
  }

  // ── Supplier phone ────────────────────────────────────────────────────────
  const phoneRx = new RegExp(REGEX_PATTERNS.phoneChina.source, 'g');
  const phoneMatches = content.match(phoneRx);
  if (phoneMatches?.length) {
    extracted.supplierPhone = phoneMatches[0];
  }

  // ── Weighted confidence (0–100) ───────────────────────────────────────────
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
