/**
 * Daily Report Background Job
 * 
 * Generates and sends daily reports to admins
 * 
 * Schedule: Daily at 6:00 PM (0 18 * * *)
 */

import cron from 'node-cron';
import prisma from '../lib/prisma';
import notificationService from '../services/notification.service';

let isRunning = false;

/**
 * Start the daily report job
 */
export function startDailyReportJob() {
  // Run daily at 6:00 PM
  cron.schedule('0 18 * * *', async () => {
    if (isRunning) {
      console.log('[Daily Report] Previous job still running, skipping...');
      return;
    }

    isRunning = true;
    const startTime = Date.now();

    try {
      console.log('[Daily Report] Starting daily report generation...');

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      // Get statistics for yesterday
      const [
        newContainers,
        containersInTransit,
        containersDelivered,
        containersDelayed,
        newInvoices,
        invoicesPaid,
        totalRevenue,
        activeClients,
      ] = await Promise.all([
        // New containers created yesterday
        prisma.container.count({
          where: {
            createdAt: {
              gte: yesterday,
              lt: today,
            },
          },
        }),

        // Containers currently in transit
        prisma.container.count({
          where: {
            currentStatus: 'IN_TRANZIT',
          },
        }),

        // Containers delivered yesterday
        prisma.container.count({
          where: {
            currentStatus: 'DELIVERED',
            updatedAt: {
              gte: yesterday,
              lt: today,
            },
          },
        }),

        // Containers delayed
        prisma.container.count({
          where: {
            delayed: true as any, // Temporary type assertion until Prisma client is regenerated
            currentStatus: {
              notIn: ['DELIVERED', 'CANCELLED'],
            },
          } as any,
        }),

        // New invoices created yesterday
        prisma.invoice.count({
          where: {
            createdAt: {
              gte: yesterday,
              lt: today,
            },
          },
        }),

        // Invoices paid yesterday
        prisma.payment.count({
          where: {
            paidAt: {
              gte: yesterday,
              lt: today,
            },
          },
        }),

        // Total revenue from payments yesterday
        prisma.payment.aggregate({
          where: {
            paidAt: {
              gte: yesterday,
              lt: today,
            },
          },
          _sum: {
            amount: true,
          },
        }),

        // Active clients (with bookings that have containers in last 30 days)
        prisma.client.count({
          where: {
            bookings: {
              some: {
                containers: {
                  some: {
                    createdAt: {
                      gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                    },
                  },
                },
              },
            },
          },
        }),
      ]);

      const revenue = totalRevenue._sum.amount || 0;

      // Generate report message
      const reportMessage = `
📊 Raport Zilnic - ${yesterday.toLocaleDateString('ro-RO')}

📦 CONTAINERE:
• Noi adăugate: ${newContainers}
• În tranzit: ${containersInTransit}
• Livrate: ${containersDelivered}
• Întârziate: ${containersDelayed}

💰 FINANCIAR:
• Facturi noi: ${newInvoices}
• Plăți primite: ${invoicesPaid}
• Venit total: ${revenue.toFixed(2)} MDL

👥 CLIENȚI:
• Clienți activi: ${activeClients}

---
Generat automat de Promo-Efect Platform
      `.trim();

      // Find all admin users
      const adminUsers = await prisma.user.findMany({
        where: {
          role: 'ADMIN',
          emailVerified: true,
        },
      });

      console.log(`[Daily Report] Sending report to ${adminUsers.length} admins`);

      let sent = 0;
      let failed = 0;

      for (const admin of adminUsers) {
        try {
          await notificationService.sendNotification({
            userId: admin.id,
            type: 'DAILY_REPORT',
            title: `Raport Zilnic - ${yesterday.toLocaleDateString('ro-RO')}`,
            message: reportMessage,
            channels: {
              email: true,
              sms: false,
              whatsapp: false,
              push: false,
            },
            templateData: {
              date: yesterday.toISOString(),
              newContainers,
              containersInTransit,
              containersDelivered,
              containersDelayed,
              newInvoices,
              invoicesPaid,
              revenue,
              activeClients,
            },
          });

          sent++;
        } catch (error) {
          failed++;
          console.error(`[Daily Report] Failed to send to admin ${admin.id}:`, error);
        }
      }

      const duration = Date.now() - startTime;
      console.log(`[Daily Report] Completed in ${duration}ms: ${sent} sent, ${failed} failed`);

    } catch (error) {
      console.error('[Daily Report] Fatal error:', error);
    } finally {
      isRunning = false;
    }
  });

  console.log('✅ Daily Report job started (runs daily at 6:00 PM)');
}

/**
 * Stop the daily report job
 */
export function stopDailyReportJob() {
  console.log('⏹️ Daily Report job stopped');
}

