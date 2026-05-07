import app from './app';
import prisma from './lib/prisma';
import * as Sentry from '@sentry/node';
import { validateEncryptionKey } from './utils/crypto.util';

if (process.env.SENTRY_DSN) {
  Sentry.init({ dsn: process.env.SENTRY_DSN, environment: process.env.NODE_ENV });
}
// FIX: Import exit from process to avoid type conflicts with DOM Process type.
import { exit } from 'process';
import { startAllJobs, stopAllJobs } from './jobs';
import logger from './utils/logger';

const PORT = process.env.PORT || 4000;

// Validate JWT_SECRET before starting
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  logger.error('FATAL: JWT_SECRET must be at least 32 characters');
  exit(1);
}
if (JWT_SECRET === 'your-super-secret-jwt-key-change-in-production') {
  logger.error('FATAL: JWT_SECRET is still the default placeholder. Change it!');
  exit(1);
}

// Validate CSRF_SECRET before starting
const CSRF_SECRET = process.env.CSRF_SECRET;
if (!CSRF_SECRET || CSRF_SECRET.length < 32) {
  logger.error('FATAL: CSRF_SECRET must be set and at least 32 characters');
  exit(1);
}
if (CSRF_SECRET === JWT_SECRET) {
  logger.error('FATAL: CSRF_SECRET must NOT be equal to JWT_SECRET');
  exit(1);
}

// B11/B12: Validate ENCRYPTION_KEY (AES-256-GCM key for sensitive data at rest)
try {
  validateEncryptionKey();
} catch (e: any) {
  logger.error(`FATAL: ${e.message}`);
  exit(1);
}

// B3: Validate JWT_REFRESH_SECRET (separate secret for refresh tokens)
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
if (!JWT_REFRESH_SECRET || JWT_REFRESH_SECRET.length < 32) {
  logger.error('FATAL: JWT_REFRESH_SECRET must be set and at least 32 characters');
  exit(1);
}
if (JWT_REFRESH_SECRET === JWT_SECRET) {
  logger.error('FATAL: JWT_REFRESH_SECRET must be different from JWT_SECRET');
  exit(1);
}

async function startServer() {
  try {
    // Test database connection
    await prisma.$connect();
    logger.info('Database connection established.');

    const server = app.listen(PORT, () => {
      logger.info(`Server running on http://localhost:${PORT}`);
      logger.info(`Health check available at http://localhost:${PORT}/health`);

      // Start background jobs
      if (process.env.ENABLE_BACKGROUND_JOBS !== 'false') {
        startAllJobs();
      } else {
        logger.info('Background jobs disabled (ENABLE_BACKGROUND_JOBS=false)');
      }
    });

    // Graceful shutdown — prevents Gmail mailbox locks, orphaned DB transactions, lost data
    let shutdownInProgress = false;

    const gracefulShutdown = async (signal: string) => {
      if (shutdownInProgress) return;
      shutdownInProgress = true;

      logger.info(`${signal} received, initiating graceful shutdown...`);

      try {
        // Stop accepting new HTTP requests
        server.close(() => logger.info('HTTP server closed'));

        // Stop cron jobs
        stopAllJobs();

        // Wait max 25s for in-flight jobs (k8s SIGKILL at 30s)
        await new Promise((resolve) => setTimeout(resolve, 25000));

        // Disconnect Prisma
        await prisma.$disconnect();

        logger.info('Shutdown complete');
        process.exit(0);
      } catch (err: unknown) {
        logger.error('Error during shutdown:', err);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error) {
    logger.error('Failed to start server', { error });
    await prisma.$disconnect();
    exit(1);
  }
}

startServer();
