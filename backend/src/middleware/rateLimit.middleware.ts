/**
 * Rate Limiting Middleware
 * Protects API endpoints from abuse and DDoS attacks
 */

import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';

/**
 * General API rate limiter
 * 1000 requests per 15 minutes per IP
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.',
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Skip rate limiting for authenticated admin users
  skip: (req: Request) => {
    const user = (req as any).user;
    return user && ['ADMIN', 'SUPER_ADMIN'].includes(user.role);
  },
});

/**
 * Strict rate limiter for authentication endpoints
 * 5 failed attempts per 15 minutes per IP
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    success: false,
    error: 'Too many login attempts, please try again after 15 minutes.',
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
});

/**
 * Registration rate limiter
 * 3 registrations per hour per IP
 */
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 registrations per hour
  message: {
    success: false,
    error: 'Too many registration attempts, please try again later.',
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Password reset rate limiter
 * 3 requests per hour per IP
 */
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 requests per hour
  message: {
    success: false,
    error: 'Too many password reset attempts, please try again later.',
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

/**
 * Email parsing rate limiter
 * 20 requests per hour per user
 */
export const emailParseLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Limit to 20 requests per hour
  message: {
    success: false,
    error: 'Too many email parsing requests, please try again later.',
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Use user ID if authenticated, otherwise IP (with IPv6 support)
    const user = (req as any).user;
    if (user) {
      return user.userId;
    }
    // Use ipKeyGenerator helper for IPv6 support
    // ipKeyGenerator takes IP string (req.ip) and returns processed IP key
    return ipKeyGenerator(req.ip || req.socket.remoteAddress || 'unknown');
  },
});

/**
 * Webhook rate limiter (more lenient for external services)
 * 1000 requests per hour per IP
 */
export const webhookLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1000, // Allow more requests for webhooks
  message: {
    success: false,
    error: 'Too many webhook requests, please try again later.',
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Report generation rate limiter
 * 10 reports per hour per user
 */
export const reportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit to 10 reports per hour
  message: {
    success: false,
    error: 'Too many report generation requests, please try again later.',
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const user = (req as any).user;
    if (user) {
      return user.userId;
    }
    // Use ipKeyGenerator helper for IPv6 support
    // ipKeyGenerator takes IP string (req.ip) and returns processed IP key
    return ipKeyGenerator(req.ip || req.socket.remoteAddress || 'unknown');
  },
});

/**
 * B6: Backup code verification rate limiter
 * 5 attempts per 15 minutes per user/IP.
 * After 5 failures: lock account for 1 hour + audit log.
 */
export const backupCodeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: {
    success: false,
    error: 'Too many backup code attempts. Account locked for 1 hour.',
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Only count failures toward the limit
  keyGenerator: (req: Request) => {
    const user = (req as any).user;
    if (user?.userId) return `backup_code:${user.userId}`;
    return `backup_code_ip:${ipKeyGenerator(req.ip || req.socket.remoteAddress || 'unknown')}`;
  },
  handler: async (req: Request, res: Response, _next: NextFunction, options: any) => {
    // B6: Lock account and audit-log after 5 failures
    const userId = (req as any).user?.userId;
    if (userId) {
      try {
        await prisma.user.update({
          where: { id: userId },
          data: { backupCodes: null }, // clear backup codes (force re-enable 2FA)
        });
        await prisma.auditLog.create({
          data: {
            userId,
            action: 'BACKUP_CODE_LOCKOUT',
            entityType: 'User',
            entityId: userId,
            ipAddress: req.ip || req.socket.remoteAddress || undefined,
            userAgent: req.headers['user-agent'] || undefined,
            changes: JSON.stringify({
              reason: '5 consecutive backup code failures within 15 minutes',
              lockedAt: new Date(),
            }),
          },
        });
      } catch (auditErr) {
        // Non-critical — log but don't block the 429 response
        console.error('[backupCodeLimiter] Failed to lock account / write audit log:', auditErr);
      }
    }

    res.status(options.statusCode).json(options.message);
  },
});
