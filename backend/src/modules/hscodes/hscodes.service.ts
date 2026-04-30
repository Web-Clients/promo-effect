/**
 * HS Codes Service
 * Handles customs code lookup and search functionality
 *
 * MIGRATION HINT (A19):
 * To enable full-text search, run in DB:
 *   CREATE INDEX IF NOT EXISTS idx_hscodes_search
 *   ON hs_codes USING gin(to_tsvector('simple', code || ' ' || description));
 */

import prisma from '../../lib/prisma';

export interface HsCodeSearchResult {
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

// In-memory cache: query → results (30 min TTL)
const searchCache = new Map<string, { results: HsCodeSearchResult[]; expiresAt: number }>();
const CACHE_TTL_MS = 30 * 60 * 1000;

function getCached(key: string): HsCodeSearchResult[] | null {
  const entry = searchCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    searchCache.delete(key);
    return null;
  }
  return entry.results;
}

function setCache(key: string, results: HsCodeSearchResult[]): void {
  searchCache.set(key, { results, expiresAt: Date.now() + CACHE_TTL_MS });
}

export class HsCodesService {
  /**
   * Search HS codes by code or description
   * Returns matching codes sorted by relevance
   * Results cached 30 min in memory
   */
  async search(query: string, limit: number = 10): Promise<HsCodeSearchResult[]> {
    if (!query || query.length < 2) {
      return [];
    }

    const normalizedQuery = query.trim().toLowerCase();
    const cacheKey = `${normalizedQuery}:${limit}`;

    const cached = getCached(cacheKey);
    if (cached) return cached;

    const isNumericQuery = /^[\d.]+$/.test(query.trim());

    let codeResults: any[] = [];
    let descriptionResults: any[] = [];

    if (isNumericQuery) {
      // Numeric query — match by code prefix (with and without dots)
      const normalizedCode = query.replace(/\./g, '');
      codeResults = await prisma.hsCode.findMany({
        where: {
          isActive: true,
          OR: [
            { code: { startsWith: query } },
            { code: { startsWith: normalizedCode } },
            { code: { contains: query } },
          ],
        },
        take: limit,
        orderBy: { code: 'asc' },
      });
    } else {
      // Text query — search description and keywords first
      descriptionResults = await prisma.hsCode.findMany({
        where: {
          isActive: true,
          OR: [
            { description: { contains: normalizedQuery, mode: 'insensitive' } },
            { descriptionEn: { contains: normalizedQuery, mode: 'insensitive' } },
            { keywords: { contains: normalizedQuery, mode: 'insensitive' } },
          ],
        },
        take: limit,
        orderBy: { code: 'asc' },
      });

      // Also try code if text looks like partial code
      if (descriptionResults.length < limit) {
        const remainingSlots = limit - descriptionResults.length;
        const existingIds = descriptionResults.map((r) => r.id);
        codeResults = await prisma.hsCode.findMany({
          where: {
            isActive: true,
            id: { notIn: existingIds },
            code: { contains: normalizedQuery },
          },
          take: remainingSlots,
          orderBy: { code: 'asc' },
        });
      }
    }

    const results = [...codeResults, ...descriptionResults].slice(0, limit).map(this.mapToResult);
    setCache(cacheKey, results);
    return results;
  }

  /**
   * Get HS code by exact code
   */
  async getByCode(code: string): Promise<HsCodeSearchResult | null> {
    const hsCode = await prisma.hsCode.findFirst({
      where: {
        code: code,
        isActive: true,
      },
    });

    return hsCode ? this.mapToResult(hsCode) : null;
  }

  /**
   * Get HS code by ID
   */
  async getById(id: string): Promise<HsCodeSearchResult | null> {
    const hsCode = await prisma.hsCode.findUnique({
      where: { id },
    });

    return hsCode ? this.mapToResult(hsCode) : null;
  }

  /**
   * Get all chapters (first 2 digits) for category navigation
   */
  async getChapters(): Promise<{ chapter: string; description: string; count: number }[]> {
    const chapters = await prisma.hsCode.groupBy({
      by: ['chapter'],
      where: { isActive: true },
      _count: { id: true },
    });

    // Get description for each chapter
    const result = await Promise.all(
      chapters.map(async (ch) => {
        const sample = await prisma.hsCode.findFirst({
          where: { chapter: ch.chapter, isActive: true },
          select: { description: true },
        });

        // Extract chapter description (usually the first part before specific details)
        const description = sample?.description.split('-')[0].trim() || `Capitolul ${ch.chapter}`;

        return {
          chapter: ch.chapter,
          description,
          count: ch._count.id,
        };
      })
    );

    return result.sort((a, b) => a.chapter.localeCompare(b.chapter));
  }

  /**
   * Get codes by chapter
   */
  async getByChapter(chapter: string): Promise<HsCodeSearchResult[]> {
    const codes = await prisma.hsCode.findMany({
      where: {
        chapter,
        isActive: true,
      },
      orderBy: { code: 'asc' },
    });

    return codes.map(this.mapToResult);
  }

  /**
   * Calculate customs duty for a given HS code and value
   */
  async calculateDuty(
    code: string,
    cargoValue: number,
    currency: string = 'USD'
  ): Promise<{
    dutyAmount: number;
    vatAmount: number;
    totalTaxes: number;
    dutyRate: number;
    vatRate: number;
  }> {
    const hsCode = await this.getByCode(code);

    const dutyRate = hsCode?.dutyRate || 0;
    const vatRate = hsCode?.vatRate || 20; // Default 20% VAT for Moldova

    // Calculate duty on cargo value
    const dutyAmount = cargoValue * (dutyRate / 100);

    // Calculate VAT on (cargo value + duty)
    const vatAmount = (cargoValue + dutyAmount) * (vatRate / 100);

    return {
      dutyAmount: Math.round(dutyAmount * 100) / 100,
      vatAmount: Math.round(vatAmount * 100) / 100,
      totalTaxes: Math.round((dutyAmount + vatAmount) * 100) / 100,
      dutyRate,
      vatRate,
    };
  }

  /**
   * Map database record to search result
   */
  private mapToResult(hsCode: any): HsCodeSearchResult {
    return {
      id: hsCode.id,
      code: hsCode.code,
      description: hsCode.description,
      descriptionEn: hsCode.descriptionEn,
      chapter: hsCode.chapter,
      heading: hsCode.heading,
      dutyRate: hsCode.dutyRate,
      vatRate: hsCode.vatRate,
      requiresInspection: hsCode.requiresInspection,
      requiresLicense: hsCode.requiresLicense,
      restrictions: hsCode.restrictions,
    };
  }
}

export const hsCodesService = new HsCodesService();
export default hsCodesService;
