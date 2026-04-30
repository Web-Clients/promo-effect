/**
 * Background Jobs Manager
 *
 * Centralized management for all cron jobs
 */

import { startEmailFetcherJob, stopEmailFetcherJob } from './email-fetcher.job';
import { startContainerSyncJob, stopContainerSyncJob } from './container-sync.job';
import { startPaymentRemindersJob, stopPaymentRemindersJob } from './payment-reminders.job';
import { startDailyReportJob, stopDailyReportJob } from './daily-report.job';
import { startAuthCleanupJob, stopAuthCleanupJob } from './auth-cleanup.job';
import logger from '../../utils/logger';

/**
 * Start all background jobs
 */
export function startAllJobs() {
  logger.info('🚀 Starting background jobs...');

  // Start all jobs
  startEmailFetcherJob();
  startContainerSyncJob();
  startPaymentRemindersJob();
  startDailyReportJob();
  startAuthCleanupJob(); // B7: cleanup expired reset tokens + B1: cleanup revoked sessions

  logger.info('✅ All background jobs started');
}

/**
 * Stop all background jobs
 */
export function stopAllJobs() {
  logger.info('⏹️ Stopping background jobs...');

  stopEmailFetcherJob();
  stopContainerSyncJob();
  stopPaymentRemindersJob();
  stopDailyReportJob();
  stopAuthCleanupJob();

  logger.info('✅ All background jobs stopped');
}

/**
 * Job status interface
 */
export interface JobStatus {
  name: string;
  schedule: string;
  lastRun?: Date;
  nextRun?: Date;
  enabled: boolean;
}

/**
 * Get status of all jobs
 */
export function getJobsStatus(): JobStatus[] {
  return [
    {
      name: 'Email Fetcher',
      schedule: 'Every 15 minutes (*/15 * * * *)',
      enabled: true,
    },
    {
      name: 'Container Sync',
      schedule: 'Every 30 minutes (*/30 * * * *)',
      enabled: true,
    },
    {
      name: 'Payment Reminders',
      schedule: 'Daily at 10:00 AM (0 10 * * *)',
      enabled: true,
    },
    {
      name: 'Daily Report',
      schedule: 'Daily at 6:00 PM (0 18 * * *)',
      enabled: true,
    },
    {
      name: 'Auth Cleanup',
      schedule: 'Daily at 03:00 AM (0 3 * * *)',
      enabled: true,
    },
  ];
}
