/**
 * Background Jobs Manager
 * 
 * Centralized management for all cron jobs
 */

import { startEmailFetcherJob, stopEmailFetcherJob } from './email-fetcher.job';
import { startContainerSyncJob, stopContainerSyncJob } from './container-sync.job';
import { startPaymentRemindersJob, stopPaymentRemindersJob } from './payment-reminders.job';
import { startDailyReportJob, stopDailyReportJob } from './daily-report.job';

/**
 * Start all background jobs
 */
export function startAllJobs() {
  console.log('🚀 Starting background jobs...');

  // Start all jobs
  startEmailFetcherJob();
  startContainerSyncJob();
  startPaymentRemindersJob();
  startDailyReportJob();

  console.log('✅ All background jobs started');
}

/**
 * Stop all background jobs
 */
export function stopAllJobs() {
  console.log('⏹️ Stopping background jobs...');

  stopEmailFetcherJob();
  stopContainerSyncJob();
  stopPaymentRemindersJob();
  stopDailyReportJob();

  console.log('✅ All background jobs stopped');
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
  ];
}

