/**
 * HS Codes Service
 * Handles customs code lookup API calls
 */

import api from './api';

export interface HsCode {
  id: string;
  code: string;
  description: string;
  descriptionEn: string | null;
  chapter: string;
  heading: string;
  dutyRate: number | null;
  vatRate: number | null;
  requiresInspection: boolean;
  requiresLicense: boolean;
  restrictions: string | null;
}

export interface DutyCalculation {
  dutyAmount: number;
  vatAmount: number;
  totalTaxes: number;
  dutyRate: number;
  vatRate: number;
}

/**
 * Search HS codes by code or description
 */
export const searchHsCodes = async (query: string, limit: number = 20): Promise<HsCode[]> => {
  try {
    const response = await api.get<{ results: HsCode[] }>('/hscodes/search', {
      params: { q: query, limit },
    });
    return response.data.results;
  } catch (error: any) {
    console.error('Failed to search HS codes:', error);
    return [];
  }
};

/**
 * Get HS code by exact code
 */
export const getHsCodeByCode = async (code: string): Promise<HsCode | null> => {
  try {
    const response = await api.get<HsCode>(`/hscodes/code/${code}`);
    return response.data;
  } catch (error: any) {
    return null;
  }
};

/**
 * Calculate customs duty for a given HS code and cargo value
 */
export const calculateDuty = async (
  code: string,
  cargoValue: number,
  currency: string = 'USD'
): Promise<DutyCalculation | null> => {
  try {
    const response = await api.post<DutyCalculation>('/hscodes/calculate-duty', {
      code,
      cargoValue,
      currency,
    });
    return response.data;
  } catch (error: any) {
    console.error('Failed to calculate duty:', error);
    return null;
  }
};

/**
 * Get all chapters for category navigation
 */
export const getChapters = async (): Promise<{ chapter: string; description: string; count: number }[]> => {
  try {
    const response = await api.get<{ chapters: { chapter: string; description: string; count: number }[] }>('/hscodes/chapters');
    return response.data.chapters;
  } catch (error: any) {
    console.error('Failed to get chapters:', error);
    return [];
  }
};

// Export service
const hscodesService = {
  searchHsCodes,
  getHsCodeByCode,
  calculateDuty,
  getChapters,
};

export default hscodesService;
