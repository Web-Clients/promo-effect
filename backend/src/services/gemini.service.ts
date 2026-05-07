/**
 * AI Email Parsing Service (via LiteLLM Gateway)
 *
 * Uses LiteLLM gateway (https://api.megapromoting.com) instead of direct Gemini SDK.
 * Per company rule: NO direct provider calls — always through LiteLLM gateway.
 * Compatible with OpenAI SDK (LiteLLM exposes OpenAI-compatible API).
 *
 * Filename kept as `gemini.service.ts` for backward compat with imports.
 */

import OpenAI from 'openai';
import logger from '../utils/logger';

const LITELLM_URL = process.env.LITELLM_URL || 'https://api.megapromoting.com';
const LITELLM_API_KEY = process.env.LITELLM_API_KEY || process.env.GEMINI_API_KEY || '';
const AI_MODEL = process.env.AI_MODEL || 'gpt-5.4-nano';

let client: OpenAI | null = null;

if (LITELLM_API_KEY) {
  client = new OpenAI({
    apiKey: LITELLM_API_KEY,
    baseURL: `${LITELLM_URL}/v1`,
  });
  logger.info(`[AI] LiteLLM client initialized (model: ${AI_MODEL})`);
} else {
  logger.warn('[AI] LITELLM_API_KEY not configured - AI parsing disabled');
}

export interface ParsedEmailData {
  containerNumber?: string;
  billOfLading?: string;
  vesselName?: string;
  voyageNumber?: string;
  departureDate?: string;
  eta?: string;
  portOfLoading?: string;
  portOfDischarge?: string;
  shippingLine?: string;
  cargoDescription?: string;
  weight?: string;
  volume?: string;
  containerType?: string;
  packageCount?: string;
  sealNumber?: string;
  // Shipper (Chinese exporter)
  shipperName?: string;
  shipperAddress?: string;
  shipperContact?: string;
  shipperPhone?: string;
  shipperEmail?: string;
  shipperWebsite?: string;

  // Consignee (Moldovan/Romanian receiver)
  consigneeName?: string;
  consigneeAddress?: string;
  consigneeContact?: string;
  consigneePhone?: string;
  consigneeEmail?: string;
  consigneeIDNO?: string; // e.g. "IDNO 1234567890123" or IDNO/CUI after label

  // Notify party
  notifyPartyName?: string;
  notifyPartyAddress?: string;
  notifyPartyEmail?: string;

  // Legacy supplier fields (from email context)
  supplierName?: string;
  supplierPhone?: string;
  supplierEmail?: string;
  freightTerms?: string;
  blDate?: string;
  placeOfIssue?: string;
  confidence?: number;
  error?: string;
}

export function isGeminiConfigured(): boolean {
  return !!LITELLM_API_KEY && !!client;
}

async function callLiteLLM(
  prompt: string,
  systemRole = 'You are a logistics data extraction specialist.'
): Promise<string> {
  if (!client) throw new Error('LiteLLM client not initialized');
  const completion = await client.chat.completions.create({
    model: AI_MODEL,
    messages: [
      { role: 'system', content: systemRole },
      { role: 'user', content: prompt },
    ],
    temperature: 0.1,
    max_tokens: 2000,
  });
  return completion.choices[0]?.message?.content || '';
}

function tryParseJson(text: string): unknown | null {
  const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

export async function parseEmailWithGemini(emailContent: string): Promise<ParsedEmailData> {
  if (!client) {
    return { error: 'AI service not configured. Set LITELLM_API_KEY.', confidence: 0 };
  }

  try {
    const prompt = `You are a logistics data extraction specialist. Analyze the following shipping email and extract key fields into JSON.

CRITICAL RULES — read carefully:
1. containerNumber: ALWAYS exactly 4 UPPERCASE letters followed by exactly 7 digits. Example: CMAU8850469, MRKU8601423, FFAU2287130. NEVER put a BL number here.
2. billOfLading: The shipping document reference number. It is NOT a container number. Examples: "ASG 202604078", "MEDUKC298446", "HBL04078", "HLCUTA12506BFWH4". Look for labels: "B/L NO", "BL NO", "HBL", "MBL", "Bill of Lading Number".
3. These two fields are ALWAYS different values. If you are unsure, OMIT the field rather than guessing.
4. portOfLoading is the ORIGIN port (usually in China: Shanghai, Ningbo, Qingdao, Shenzhen, Guangzhou, Tianjin, Xiamen, Dalian, Yantian, Nansha, etc.)
5. portOfDischarge is the DESTINATION port (usually: Constanta, Rotterdam, Hamburg, Piraeus, Odessa, etc.)
6. Do NOT swap origin and destination — China is origin, Europe/Black Sea is destination.

Extract these fields if available:
- containerNumber: Container number (strictly 4 letters + 7 digits, e.g., CMAU8850469)
- billOfLading: B/L document number (NOT container number — see rules above)
- vesselName: Vessel/ship name
- departureDate: Departure/sailing date in YYYY-MM-DD format
- eta: Estimated arrival date in YYYY-MM-DD format
- portOfLoading: Origin port (China)
- portOfDischarge: Destination port (Europe/Black Sea)
- shippingLine: Carrier company (MSC, Maersk, CMA CGM, ONE, ASG, PIL, etc.)
- cargoDescription: Description of goods
- weight: Gross weight in TONS or KG only (e.g., "24.35 tons", "10-15 tone", "24350kg").
    NEVER include USD, EUR, MDL or any currency. NEVER include monetary values.
    If you can't find a weight, omit this field entirely (don't guess).
- containerType: Container size/type (e.g., "40HQ", "20DV", "40HC")
- freightTerms: "PREPAID" or "COLLECT"

Respond ONLY with a valid JSON object. No extra text.
Omit any field you cannot find with certainty.
Add a "confidence" field with a score 0-100.

Email content:
---
${emailContent}
---`;

    const text = await callLiteLLM(prompt);
    const parsed = tryParseJson(text) as Partial<ParsedEmailData> | null;

    if (!parsed) {
      logger.error('[AI] Failed to parse JSON from response:', text.slice(0, 200));
      return {
        error: 'Failed to parse AI response.',
        confidence: 0,
      };
    }

    return {
      ...parsed,
      confidence: parsed.confidence || 75,
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[AI] parseEmailWithGemini error:', msg);
    return {
      error: `AI parsing failed: ${msg}`,
      confidence: 0,
    };
  }
}

export async function parseShippingDocumentWithGemini(
  pdfText: string,
  emailContext?: string
): Promise<ParsedEmailData> {
  if (!client) {
    return { error: 'AI service not configured.', confidence: 0 };
  }

  try {
    const prompt = `You are a logistics data extraction specialist focused on Bill of Lading parsing. Analyze the following shipping document (extracted from a BL/HBL/MBL PDF) and extract ALL available fields with precision.

═══ CRITICAL FIELD DISTINCTIONS — DO NOT CONFUSE ═══

1. billOfLading (B/L Number):
   - This is the DOCUMENT identifier printed on the Bill of Lading header
   - Found after labels: "B/L NO", "B/L NUMBER", "HBL", "MBL", "Bill of Lading No."
   - Examples: "ASG 202604078", "MEDUKC298446", "HBL04078", "HLCUTA12506BFWH4", "NGP3566733"
   - Can contain letters and numbers in various combinations
   - Usually printed prominently at the TOP of the document

2. containerNumber:
   - STRICTLY: exactly 4 UPPERCASE letters + exactly 7 digits. That is the ONLY valid format.
   - Examples: CMAU8850469, MRKU8601423, FFAU2287130, HAMU2097764, CAAU6714302
   - Found in the "Container No." field or "CONTAINER NO." column
   - If the document says "N/M" (not mentioned) → OMIT this field entirely
   - NEVER put a BL number in this field. NEVER put a booking reference here.

3. sealNumber:
   - The seal number is printed alongside or after the container number
   - Often separated by "/" — e.g., "CMAU8850469/M5174463" → container=CMAU8850469, seal=M5174463
   - Seal is usually shorter and may be purely numeric or alphanumeric WITHOUT the 4+7 pattern

4. portOfLoading (ORIGIN — always China or Asia):
   - Look for "Port of Loading", "POL", "Place of Receipt", "Pre-carriage"
   - China ports: Shanghai, Ningbo, Qingdao, Shenzhen, Guangzhou, Tianjin, Xiamen, Dalian, Yantian, Nansha, Shekou
   - This is where cargo STARTS its journey

5. portOfDischarge (DESTINATION — Europe/Black Sea):
   - Look for "Port of Discharge", "POD", "Place of Delivery", "Final Destination"
   - Destination ports: Constanta (Romania), Rotterdam, Hamburg, Piraeus, Odessa, Giurgiulesti
   - This is where cargo ARRIVES

6. shippingLine:
   - The carrier operating the vessel. Can be detected from BL prefix or explicit company name.
   - ASG prefix → ASG; MED prefix → MSC; HLCU prefix → Hapag-Lloyd; CMDU prefix → CMA CGM
   - ONE, Maersk, COSCO, Evergreen, OOCL, Yang Ming, ZIM, PIL, Wan Hai, Arkas, KMTC

═══ FIELDS TO EXTRACT ═══

- billOfLading: B/L document number (from B/L NO label at top of document)
- containerNumber: Container number (STRICT: 4 letters + 7 digits ONLY)
- sealNumber: Seal number (usually after container number, separated by "/")
- vesselName: Ocean vessel name (from "Ocean Vessel" or "M/V" field)
- voyageNumber: Voyage number (from "Voy.No." field)
- portOfLoading: Port of Loading — ORIGIN (China/Asia)
- portOfDischarge: Port of Discharge — DESTINATION (Europe)
- shippingLine: Carrier/shipping line company name
- containerType: Container type e.g. "1x40HQ", "1x20DV", "2x40HC"
- weight: Gross weight with unit (e.g., "24350KGS", "7500KG")
- volume: CBM measurement (e.g., "68CBM")
- cargoDescription: Description of goods
- packageCount: Number and type of packages (e.g., "1441 CARTONS")
SHIPPER (Furnizor — Chinese exporter):
- shipperName: Shipper/Exporter company name (Chinese exporter)
- shipperAddress: Shipper full address (street, city, province, China)
- shipperContact: Contact person name at shipper (if present)
- shipperPhone: Phone/fax number of shipper (Chinese format: +86...)
- shipperEmail: Email address of shipper (rare in BL but check signature blocks)
- shipperWebsite: Website of shipper (if in letterhead or document)

CONSIGNEE (Beneficiar — Moldovan/Romanian receiver):
- consigneeName: Consignee company name (Moldova or Romania)
- consigneeAddress: Consignee full address
- consigneeContact: Contact person at consignee (if present)
- consigneePhone: Phone number of consignee
- consigneeEmail: Email address of consignee
- consigneeIDNO: Moldovan IDNO or Romanian CUI/CIF tax identifier (digits after "IDNO", "CUI", "CIF" label, or standalone 13-digit number for Moldova / 6-10 digit for Romania)

NOTIFY PARTY:
- notifyPartyName: Notify Party company name
- notifyPartyAddress: Notify Party full address
- notifyPartyEmail: Notify Party email (often the actual recipient contact)

OTHER:
- freightTerms: "PREPAID" or "COLLECT"
- departureDate: Departure/sailing date in YYYY-MM-DD format
- blDate: Date of B/L issue in YYYY-MM-DD format
- placeOfIssue: Place where B/L was issued
- supplierName: Supplier/shipper contact name (if from email context, fallback to shipperName)
- supplierPhone: Phone number of supplier (fallback to shipperPhone)
- supplierEmail: Email address of supplier (fallback to shipperEmail)

Respond ONLY with a valid JSON object. No extra text outside the JSON.
If a field cannot be found with certainty, OMIT it entirely.
Add a "confidence" field (0-100) reflecting overall extraction quality.

${emailContext ? `Email context (sender info):\n---\n${emailContext.substring(0, 1000)}\n---\n\n` : ''}Shipping document text:
---
${pdfText.substring(0, 8000)}
---`;

    const text = await callLiteLLM(
      prompt,
      'You are a logistics data extraction specialist focused on Bill of Lading parsing.'
    );
    const parsed = tryParseJson(text) as Partial<ParsedEmailData> | null;

    if (!parsed) {
      logger.error('[AI] Failed to parse shipping document response:', text.slice(0, 200));
      return {
        error: 'Failed to parse AI response for shipping document.',
        confidence: 0,
      };
    }

    return {
      ...parsed,
      confidence: parsed.confidence || 80,
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[AI] parseShippingDocumentWithGemini error:', msg);
    return {
      error: `AI parsing failed: ${msg}`,
      confidence: 0,
    };
  }
}

export default {
  isGeminiConfigured,
  parseEmailWithGemini,
  parseShippingDocumentWithGemini,
};
