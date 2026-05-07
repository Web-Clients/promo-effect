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
  shipperName?: string;
  shipperAddress?: string;
  consigneeName?: string;
  consigneeAddress?: string;
  notifyPartyName?: string;
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
    const prompt = `Analizează conținutul următorului email de logistică și extrage informațiile cheie în format JSON.

Extrage următoarele câmpuri dacă sunt disponibile:
- containerNumber: Numărul containerului (format: 4 litere + 7 cifre, ex: MSCU1234567)
- billOfLading: Numărul Bill of Lading (B/L)
- vesselName: Numele navei
- departureDate: Data plecării în format YYYY-MM-DD
- eta: Data estimată a sosirii (ETA) în format YYYY-MM-DD
- portOfLoading: Portul de încărcare
- portOfDischarge: Portul de descărcare
- shippingLine: Compania de transport (MSC, Maersk, CMA CGM, etc.)
- cargoDescription: Descrierea mărfii
- weight: Greutatea în kg sau tone

Răspunde DOAR cu un obiect JSON valid, fără text suplimentar.
Dacă un câmp nu poate fi găsit, omite-l din răspuns.
Adaugă un câmp "confidence" cu un scor între 0-100 indicând încrederea în extracție.

Conținut Email:
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
    const prompt = `You are a logistics data extraction specialist. Analyze the following shipping document text (extracted from a Bill of Lading PDF or Shipping Instruction PDF) and extract ALL available fields.

IMPORTANT: This is a structured shipping document (HBL/MBL/SI), not a regular email. Extract data precisely.

Extract the following fields into a JSON object:
- billOfLading: B/L number (may appear as "B/L NO", "HBL", "MBL", "BOOKING NO" — extract ALL reference numbers, separate with " / ")
- containerNumber: Container number (format: 4 letters + 7 digits, e.g., MSCU1234567). May say "N/M" if not yet assigned — in that case omit this field
- sealNumber: Seal number(s)
- vesselName: Ocean vessel name (after "Ocean Vessel" or "M/V")
- voyageNumber: Voyage number (after "Voy.No." or "Voyage")
- portOfLoading: Port of Loading
- portOfDischarge: Port of Discharge
- shippingLine: Shipping line company (MSC, Maersk, CMA CGM, COSCO, Hapag-Lloyd, ONE, Evergreen, Yang Ming, ZIM, ASG, etc.)
- containerType: Container type and quantity (e.g., "1x40HQ", "2x20DC")
- weight: Gross weight with unit (e.g., "7800KGS", "18500KG")
- volume: Volume/measurement (e.g., "68CBM", "45M3")
- cargoDescription: Description of goods/commodity
- packageCount: Number and type of packages (e.g., "390 CARTONS", "150 PALLETS")
- shipperName: Shipper/Exporter company name
- shipperAddress: Shipper full address
- consigneeName: Consignee company name (the receiver)
- consigneeAddress: Consignee full address
- notifyPartyName: Notify Party name
- freightTerms: "PREPAID" or "COLLECT"
- departureDate: Departure/sailing date in YYYY-MM-DD format
- eta: Estimated arrival date in YYYY-MM-DD (if available)
- blDate: Date of B/L issue in YYYY-MM-DD format
- placeOfIssue: Place of B/L issue (e.g., "SHENZHEN")
- supplierName: Chinese supplier/shipper contact name (from email signatures)
- supplierPhone: Phone number of supplier
- supplierEmail: Email of supplier

Respond ONLY with a valid JSON object. No extra text.
If a field cannot be found, omit it.
Add a "confidence" field with a score 0-100 indicating extraction confidence.

${emailContext ? `Email context:\n---\n${emailContext.substring(0, 1000)}\n---\n\n` : ''}Document text:
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
