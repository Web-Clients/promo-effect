/**
 * Gemini AI Service
 * 
 * Handles AI-powered email parsing using Google's Gemini API
 * This runs on the backend to keep API keys secure
 */

// @ts-ignore - Package types may not be available immediately after install
import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Initialize Gemini client (only if API key is configured)
let genAI: GoogleGenerativeAI | null = null;

if (GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  console.log('✅ Gemini AI service initialized');
} else {
  console.warn('⚠️ GEMINI_API_KEY not configured - AI parsing disabled');
}

// Response schema for email parsing
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

/**
 * Check if Gemini AI is configured and available
 */
export function isGeminiConfigured(): boolean {
  return !!GEMINI_API_KEY && !!genAI;
}

/**
 * Parse email content using Gemini AI
 * Extracts logistics/shipping information from email text
 */
export async function parseEmailWithGemini(emailContent: string): Promise<ParsedEmailData> {
  if (!genAI) {
    return {
      error: 'Gemini API key is not configured. Please add GEMINI_API_KEY to your backend .env file.',
      confidence: 0
    };
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

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

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parse JSON response
    try {
      // Remove markdown code blocks if present
      const cleanedText = text.replace(/```json\n?|\n?```/g, '').trim();
      const parsed = JSON.parse(cleanedText);
      
      return {
        ...parsed,
        confidence: parsed.confidence || 75
      };
    } catch (parseError) {
      console.error('Failed to parse Gemini response as JSON:', text);
      return {
        error: 'Failed to parse AI response. The email may not contain recognizable shipping information.',
        confidence: 0
      };
    }
  } catch (error: any) {
    console.error('Gemini API error:', error);
    
    // Handle specific error types
    if (error.message?.includes('API_KEY_INVALID')) {
      return {
        error: 'Invalid Gemini API key. Please check your configuration.',
        confidence: 0
      };
    }
    
    if (error.message?.includes('QUOTA_EXCEEDED')) {
      return {
        error: 'Gemini API quota exceeded. Please try again later.',
        confidence: 0
      };
    }

    return {
      error: `AI parsing failed: ${error.message || 'Unknown error'}`,
      confidence: 0
    };
  }
}

/**
 * Parse shipping document (HBL/SI) text extracted from PDF
 * Uses a specialized prompt for Bill of Lading and Shipping Instruction documents
 */
export async function parseShippingDocumentWithGemini(
  pdfText: string,
  emailContext?: string
): Promise<ParsedEmailData> {
  if (!genAI) {
    return {
      error: 'Gemini API key is not configured.',
      confidence: 0
    };
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

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
- containerType: Container type and quantity (e.g., "1x40HQ", "2x20DC"). Look for patterns like "1X40HQ", "40HQ", "20GP", etc.
- weight: Gross weight with unit (e.g., "7800KGS", "18500KG")
- volume: Volume/measurement (e.g., "68CBM", "45M3")
- cargoDescription: Description of goods/commodity (e.g., "PLASTIC TOYS", "FURNITURE")
- packageCount: Number and type of packages (e.g., "390 CARTONS", "150 PALLETS")
- shipperName: Shipper/Exporter company name
- shipperAddress: Shipper full address
- consigneeName: Consignee company name (the receiver)
- consigneeAddress: Consignee full address
- notifyPartyName: Notify Party name
- freightTerms: "PREPAID" or "COLLECT"
- departureDate: Departure/sailing date in YYYY-MM-DD format
- eta: Estimated arrival date in YYYY-MM-DD (if available)
- blDate: Date of B/L issue in YYYY-MM-DD format (look for "Date" near bottom or "Laden on Board")
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

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    try {
      const cleanedText = text.replace(/```json\n?|\n?```/g, '').trim();
      const parsed = JSON.parse(cleanedText);

      return {
        ...parsed,
        confidence: parsed.confidence || 80
      };
    } catch (parseError) {
      console.error('[Gemini] Failed to parse shipping document response:', text);
      return {
        error: 'Failed to parse AI response for shipping document.',
        confidence: 0
      };
    }
  } catch (error: any) {
    console.error('[Gemini] Shipping document parsing error:', error);
    return {
      error: `AI parsing failed: ${error.message || 'Unknown error'}`,
      confidence: 0
    };
  }
}

export default {
  isGeminiConfigured,
  parseEmailWithGemini,
  parseShippingDocumentWithGemini,
};
