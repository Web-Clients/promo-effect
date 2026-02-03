/**
 * Payment Reminders Background Job
 * 
 * Sends payment reminders for overdue invoices
 * 
 * Schedule: Daily at 10:00 AM (0 10 * * *)
 */

import cron from 'node-cron';
import prisma from '../lib/prisma';
import notificationService from '../services/notification.service';

let isRunning = false;

/**
 * Start the payment reminders job
 */
export function startPaymentRemindersJob() {
  // Run daily at 10:00 AM
  cron.schedule('0 10 * * *', async () => {
    if (isRunning) {
      console.log('[Payment Reminders] Previous job still running, skipping...');
      return;
    }

    isRunning = true;
    const startTime = Date.now();

    try {
      console.log('[Payment Reminders] Starting scheduled payment reminders...');

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Find overdue invoices
      const overdueInvoices = await prisma.invoice.findMany({
        where: {
          status: {
            in: ['ISSUED', 'SENT', 'UNPAID', 'OVERDUE'],
          },
          dueDate: {
            lt: today,
          },
        },
        include: {
          booking: {
            include: {
              client: true,
            },
          },
        },
      });

      console.log(`[Payment Reminders] Found ${overdueInvoices.length} overdue invoices`);

      if (overdueInvoices.length === 0) {
        console.log('[Payment Reminders] No overdue invoices');
        isRunning = false;
        return;
      }

      let sent = 0;
      let failed = 0;

      for (const invoice of overdueInvoices) {
        try {
          // Calculate days overdue
          const daysOverdue = Math.floor(
            (today.getTime() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24)
          );

          // Check if reminder was already sent today
          const remindersSent = (invoice as any).remindersSent || [];
          const lastReminderDate = remindersSent.length > 0 
            ? new Date(remindersSent[remindersSent.length - 1].date)
            : null;

          const todayStr = today.toISOString().split('T')[0];
          const lastReminderStr = lastReminderDate ? lastReminderDate.toISOString().split('T')[0] : null;

          // Skip if reminder already sent today
          if (lastReminderStr === todayStr) {
            console.log(`[Payment Reminders] Reminder already sent today for invoice ${invoice.invoiceNumber}`);
            continue;
          }

          // Get client ID from invoice
          const clientId = invoice.booking?.clientId || invoice.clientId;
          
          // Find users associated with client (users with CLIENT role and matching email/company)
          // For now, we'll use the clientId directly or find users by role
          let userIds: string[] = [];
          
          // Try to find users by clientId if there's a relation, otherwise use clientId as userId
          // This is a simplified approach - in production, you'd have a proper User-Client relation
          if (clientId) {
            // For now, we'll send to the clientId if it's a user ID, or find users
            // This is a temporary solution until proper User-Client relation is established
            const users = await prisma.user.findMany({
              where: {
                role: 'CLIENT',
              },
              take: 5, // Limit to avoid too many notifications
            });
            userIds = users.map(u => u.id);
            
            // If no users found, use clientId as fallback (if it's a valid UUID)
            if (userIds.length === 0 && clientId) {
              // Check if clientId is a valid UUID format
              const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
              if (uuidRegex.test(clientId)) {
                userIds = [clientId];
              }
            }
          }

          // Send reminder to each user
          for (const userId of userIds) {
            try {
              await notificationService.sendNotification({
                userId,
                bookingId: invoice.bookingId || undefined,
                type: 'INVOICE_OVERDUE',
                title: `Factură Depășită: ${invoice.invoiceNumber}`,
                message: `Factura ${invoice.invoiceNumber} este depășită cu ${daysOverdue} zile. Suma datorată: ${(invoice as any).totalAmount || invoice.amount} ${invoice.currency}.`,
                channels: {
                  email: true,
                  sms: daysOverdue > 7, // SMS only if more than 7 days overdue
                  whatsapp: daysOverdue > 14, // WhatsApp only if more than 14 days overdue
                  push: true,
                },
                templateData: {
                  invoiceNumber: invoice.invoiceNumber,
                  amount: (invoice as any).totalAmount || invoice.amount,
                  currency: invoice.currency,
                  daysOverdue,
                  dueDate: invoice.dueDate.toISOString(),
                },
              });

              sent++;
            } catch (error) {
              console.error(`[Payment Reminders] Failed to send notification to user ${userId}:`, error);
              failed++;
            }
          }

          // Update invoice remindersSent
          const updatedReminders = [
            ...remindersSent,
            {
              date: today.toISOString(),
              type: 'OVERDUE_REMINDER',
              daysOverdue,
            },
          ];

          await prisma.invoice.update({
            where: { id: invoice.id },
            data: {
              remindersSent: updatedReminders as any,
              status: 'OVERDUE',
            } as any,
          });

          console.log(`[Payment Reminders] Sent reminder for invoice ${invoice.invoiceNumber} (${daysOverdue} days overdue)`);

        } catch (error) {
          failed++;
          console.error(`[Payment Reminders] Error processing invoice ${invoice.id}:`, error);
        }
      }

      const duration = Date.now() - startTime;
      console.log(`[Payment Reminders] Completed in ${duration}ms: ${sent} reminders sent, ${failed} failed`);

    } catch (error) {
      console.error('[Payment Reminders] Fatal error:', error);
    } finally {
      isRunning = false;
    }
  });

  console.log('✅ Payment Reminders job started (runs daily at 10:00 AM)');
}

/**
 * Stop the payment reminders job
 */
export function stopPaymentRemindersJob() {
  console.log('⏹️ Payment Reminders job stopped');
}

