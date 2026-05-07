/**
 * Bookings Stats Service — Phase A8
 *
 * GET /api/bookings/stats?tab=loading|transit|port|delivered|archive
 * Returns: { count, totalValueUSD, totalValueMDL }
 *
 * In-memory cache with 30s TTL (no Redis dependency required).
 */

import prisma from '../../lib/prisma';
import { Router, Request, Response } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import logger from '../../utils/logger';

// ─── In-memory cache ────────────────────────────────────────────────────────

interface CacheEntry {
  data: TabStats;
  expiresAt: number;
}

interface TabStats {
  count: number;
  totalValueUSD: number;
  totalValueMDL: number;
}

interface AllTabStats {
  all: TabStats;
  loading: TabStats;
  transit: TabStats;
  port: TabStats;
  delivered: TabStats;
  archive: TabStats;
  /** Rulaj = total value of all non-CANCELLED bookings */
  turnover: TabStats;
}

const CACHE_TTL_MS = 30_000; // 30 seconds
let cache: { data: AllTabStats; expiresAt: number } | null = null;

// ─── MDL exchange rate (fallback if not in admin settings) ──────────────────
const MDL_RATE_FALLBACK = 17.8; // approximate USD→MDL

// ─── Stats computation ───────────────────────────────────────────────────────

async function computeStats(): Promise<AllTabStats> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Get all bookings with minimal fields
  const bookings = await (prisma.booking as any).findMany({
    where: { archived: false },
    select: {
      id: true,
      status: true,
      totalPrice: true,
      createdAt: true,
      arrivalDateConstanta: true,
      eta: true,
    },
  });

  const empty = (): TabStats => ({ count: 0, totalValueUSD: 0, totalValueMDL: 0 });

  const stats: AllTabStats = {
    all: empty(),
    loading: empty(),
    transit: empty(),
    port: empty(),
    delivered: empty(),
    archive: empty(),
    turnover: empty(),
  };

  for (const b of bookings) {
    const price = b.totalPrice || 0;
    const mdl = price * MDL_RATE_FALLBACK;

    const addTo = (tab: TabStats) => {
      tab.count++;
      tab.totalValueUSD += price;
      tab.totalValueMDL += mdl;
    };

    addTo(stats.all);

    // Rulaj = all non-CANCELLED bookings
    if (b.status !== 'CANCELLED') {
      addTo(stats.turnover);
    }

    switch (b.status) {
      case 'DRAFT':
      case 'CONFIRMED':
        addTo(stats.loading);
        break;

      case 'IN_TRANSIT': {
        // PORT = IN_TRANSIT with arrivalDateConstanta set
        const hasArrival = !!b.arrivalDateConstanta;
        if (hasArrival) {
          addTo(stats.port);
        } else {
          addTo(stats.transit);
        }
        break;
      }

      case 'DELIVERED': {
        const deliveredAt = new Date(b.createdAt);
        if (deliveredAt > thirtyDaysAgo) {
          addTo(stats.delivered);
        } else {
          addTo(stats.archive);
        }
        break;
      }

      case 'CANCELLED':
        addTo(stats.archive);
        break;

      default:
        break;
    }
  }

  // Round monetary values
  for (const key of Object.keys(stats) as Array<keyof AllTabStats>) {
    stats[key].totalValueUSD = Math.round(stats[key].totalValueUSD);
    stats[key].totalValueMDL = Math.round(stats[key].totalValueMDL);
  }

  return stats;
}

// ─── Get cached or fresh stats ───────────────────────────────────────────────

export async function getBookingStats(): Promise<AllTabStats> {
  const now = Date.now();
  if (cache && cache.expiresAt > now) {
    return cache.data;
  }

  const data = await computeStats();
  cache = { data, expiresAt: now + CACHE_TTL_MS };
  return data;
}

/** Invalidate cache (call after telex-release / documents-uploaded mutations) */
export function invalidateStatsCache(): void {
  cache = null;
}

// ─── Express router ──────────────────────────────────────────────────────────

const router = Router();

type TabKey = 'loading' | 'transit' | 'port' | 'delivered' | 'archive' | 'all';
const VALID_TABS: TabKey[] = ['loading', 'transit', 'port', 'delivered', 'archive', 'all'];

/**
 * GET /api/bookings/stats
 * Query: ?tab=loading|transit|port|delivered|archive|all  (default: all)
 */
router.get('/stats', authMiddleware, async (req: Request, res: Response) => {
  try {
    const tab = (req.query.tab as TabKey) || 'all';

    if (!VALID_TABS.includes(tab)) {
      return res.status(400).json({
        success: false,
        error: `Invalid tab. Must be one of: ${VALID_TABS.join(', ')}`,
      });
    }

    const allStats = await getBookingStats();

    return res.json({
      success: true,
      tab,
      stats: allStats[tab],
      // Also return all tab counts for badge rendering
      tabs: {
        all: allStats.all.count,
        loading: allStats.loading.count,
        transit: allStats.transit.count,
        port: allStats.port.count,
        delivered: allStats.delivered.count,
        archive: allStats.archive.count,
      },
      // Rulaj = total value of all non-CANCELLED bookings
      turnover: allStats.turnover.totalValueUSD,
    });
  } catch (err: any) {
    logger.error('[bookings-stats] error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
