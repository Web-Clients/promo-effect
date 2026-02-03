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
  departureDate?: string;
  eta?: string;
  portOfLoading?: string;
  portOfDischarge?: string;
  shippingLine?: string;
  cargoDescription?: string;
  weight?: string;
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
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

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

export default {
  isGeminiConfigured,
  parseEmailWithGemini
};
