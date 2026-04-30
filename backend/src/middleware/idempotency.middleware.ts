/**
 * Idempotency Middleware
 *
 * Prevents duplicate payment/booking/invoice creation on network retries.
 *
 * Usage:
 *   - Client sends header: `Idempotency-Key: <uuid>`
 *   - First request: executes normally, caches response for 24h
 *   - Subsequent requests with same key: returns cached response immediately
 *
 * Storage: Redis (if REDIS_URL configured) or in-memory Map (fallback for dev).
 * In-memory map is NOT suitable for multi-process production deployments.
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import logger from '../utils/logger';

interface CachedResponse {
  status: number;
  body: unknown;
  createdAt: number;
}

// In-memory fallback (single-process dev use only)
const inMemoryCache = new Map<string, CachedResponse>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Lazy Redis client — only instantiated if REDIS_URL is set
let redisClient: any = null;
let redisAvailable = false;

async function getRedisClient(): Promise<any> {
  if (redisClient) return redisClient;
  if (!process.env.REDIS_URL) return null;

  try {
    // Dynamically import to avoid crashing when redis package not installed
    const { createClient } = await import('redis');
    redisClient = createClient({ url: process.env.REDIS_URL });
    redisClient.on('error', (err: Error) => {
      logger.warn('[Idempotency] Redis error, falling back to in-memory:', {
        message: err.message,
      });
      redisAvailable = false;
    });
    await redisClient.connect();
    redisAvailable = true;
    logger.info('[Idempotency] Redis connected');
    return redisClient;
  } catch (err: any) {
    logger.warn('[Idempotency] Redis unavailable, using in-memory cache', {
      message: err.message,
    });
    redisAvailable = false;
    return null;
  }
}

/** Build the cache key: hash of (idempotencyKey + requestBody) */
function buildCacheKey(idempotencyKey: string, body: unknown): string {
  const bodyStr = typeof body === 'string' ? body : JSON.stringify(body ?? {});
  const hash = crypto
    .createHash('sha256')
    .update(idempotencyKey + ':' + bodyStr)
    .digest('hex');
  return `idempotency:${hash}`;
}

/** Store a response in cache */
async function setCached(cacheKey: string, data: CachedResponse): Promise<void> {
  const client = await getRedisClient();
  if (client && redisAvailable) {
    try {
      await client.setEx(cacheKey, 86400, JSON.stringify(data)); // 24h TTL
      return;
    } catch (err: any) {
      logger.warn('[Idempotency] Redis set failed, falling back to memory', {
        message: err.message,
      });
    }
  }
  // In-memory fallback
  inMemoryCache.set(cacheKey, data);
}

/** Retrieve a cached response */
async function getCached(cacheKey: string): Promise<CachedResponse | null> {
  const client = await getRedisClient();
  if (client && redisAvailable) {
    try {
      const raw = await client.get(cacheKey);
      if (raw) return JSON.parse(raw) as CachedResponse;
      return null;
    } catch (err: any) {
      logger.warn('[Idempotency] Redis get failed, falling back to memory', {
        message: err.message,
      });
    }
  }
  // In-memory fallback — also evict expired entries
  const cached = inMemoryCache.get(cacheKey);
  if (!cached) return null;
  if (Date.now() - cached.createdAt > CACHE_TTL_MS) {
    inMemoryCache.delete(cacheKey);
    return null;
  }
  return cached;
}

/**
 * Express middleware factory.
 *
 * If request has `Idempotency-Key` header:
 *   - Cache hit → return cached response with `Idempotency-Replayed: true` header
 *   - Cache miss → execute handler, intercept response, cache it
 *
 * If header is absent, passes through normally.
 */
export function idempotencyMiddleware() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const idempotencyKey = req.headers['idempotency-key'] as string | undefined;

    if (!idempotencyKey) {
      // No key provided — just pass through
      return next();
    }

    // Validate key format (should be a non-empty string, max 128 chars)
    if (typeof idempotencyKey !== 'string' || idempotencyKey.length > 128) {
      res.status(400).json({
        success: false,
        error: 'Idempotency-Key header must be a string of max 128 characters.',
      });
      return;
    }

    const cacheKey = buildCacheKey(idempotencyKey, req.body);

    // Check cache
    let cached: CachedResponse | null = null;
    try {
      cached = await getCached(cacheKey);
    } catch (err: any) {
      logger.error('[Idempotency] Cache lookup error', { message: err.message });
      // Don't block the request on cache failure
    }

    if (cached) {
      logger.info('[Idempotency] Cache hit', { key: idempotencyKey.slice(0, 8) + '...' });
      res.setHeader('Idempotency-Replayed', 'true');
      res.status(cached.status).json(cached.body);
      return;
    }

    // Intercept response to cache it
    const originalJson = res.json.bind(res);
    const originalStatus = res.status.bind(res);

    let capturedStatus = 200;

    // Override status() to capture status code
    res.status = function (code: number) {
      capturedStatus = code;
      return originalStatus(code);
    };

    // Override json() to capture and cache body
    res.json = function (body: unknown) {
      // Only cache 2xx responses
      if (capturedStatus >= 200 && capturedStatus < 300) {
        const toCache: CachedResponse = {
          status: capturedStatus,
          body,
          createdAt: Date.now(),
        };
        setCached(cacheKey, toCache).catch((err: any) => {
          logger.error('[Idempotency] Failed to cache response', { message: err.message });
        });
      }
      return originalJson(body);
    };

    next();
  };
}
