/**
 * Gemini AI Service (Frontend)
 *
 * This service now calls the backend API for AI parsing
 * to keep the Gemini API key secure (not exposed in browser)
 */

import api from './api';

// Response type from AI parsing
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
 * Check if AI parsing is available
 */
export async function checkAIStatus(): Promise<{ available: boolean; reason: string }> {
  try {
    const response = await api.get('/emails/ai-status');
    return response.data;
  } catch {
    return {
      available: false,
      reason: 'Failed to check AI status',
    };
  }
}

/**
 * Parse email content using Gemini AI via backend
 *
 * @param emailContent - The raw email text to parse
 * @returns Parsed email data as JSON string (for backward compatibility)
 */
export const parseEmailWithGemini = async (emailContent: string): Promise<string> => {
  try {
    const response = await api.post('/emails/parse-with-ai', { emailContent });

    if (response.data.success) {
      return JSON.stringify(response.data.data, null, 2);
    } else {
      return JSON.stringify(
        {
          error: response.data.error || 'AI parsing failed',
          confidence: response.data.confidence || 0,
        },
        null,
        2
      );
    }
  } catch (error: unknown) {
    console.error('AI parsing error:', error);

    // Handle specific error cases
    const axiosErr = error as {
      response?: {
        status?: number;
        data?: { message?: string; error?: string; confidence?: number };
      };
      message?: string;
    };
    if (axiosErr?.response?.status === 503) {
      return JSON.stringify(
        {
          error: 'Serviciul AI nu este configurat. Contactați administratorul.',
          details: axiosErr.response?.data?.message,
        },
        null,
        2
      );
    }

    if (axiosErr?.response?.status === 401) {
      return JSON.stringify(
        {
          error: 'Sesiunea a expirat. Vă rugăm să vă autentificați din nou.',
        },
        null,
        2
      );
    }

    if (axiosErr?.response?.status === 422) {
      return JSON.stringify(
        {
          error: axiosErr.response?.data?.error || 'Nu s-au putut extrage date din email.',
          confidence: axiosErr.response?.data?.confidence || 0,
        },
        null,
        2
      );
    }

    return JSON.stringify(
      {
        error: 'Eroare la analiza emailului cu AI.',
        details:
          (error instanceof Error ? error.message : undefined) ?? 'Vă rugăm să încercați din nou.',
      },
      null,
      2
    );
  }
};

/**
 * Parse email and return typed data (new API)
 */
export async function parseEmail(emailContent: string): Promise<ParsedEmailData> {
  try {
    const response = await api.post('/emails/parse-with-ai', { emailContent });

    if (response.data.success) {
      return response.data.data;
    } else {
      return {
        error: response.data.error || 'AI parsing failed',
        confidence: response.data.confidence || 0,
      };
    }
  } catch (error: unknown) {
    const axiosErr = error as { response?: { data?: { error?: string } }; message?: string };
    return {
      error:
        axiosErr?.response?.data?.error ??
        (error instanceof Error ? error.message : 'AI parsing failed'),
      confidence: 0,
    };
  }
}

export default {
  parseEmailWithGemini,
  parseEmail,
  checkAIStatus,
};
