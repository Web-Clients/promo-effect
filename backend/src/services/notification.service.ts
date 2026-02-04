/**
 * Notification Service
 * Handles sending notifications through multiple channels (Email, SMS, WhatsApp, Push)
 * Uses Infobip for email and SMS delivery
 */

import prisma from '../lib/prisma';
import { infobipService } from './infobip.service';

export interface NotificationChannel {
  email?: boolean;
  sms?: boolean;
  whatsapp?: boolean;
  push?: boolean;
}

export interface SendNotificationOptions {
  userId: string;
  bookingId?: string;
  type: string;
  title: string;
  message: string;
  channels: NotificationChannel;
  template?: string;
  templateData?: Record<string, any>;
}

export class NotificationService {
  /**
   * Send notification through specified channels
   */
  async sendNotification(options: SendNotificationOptions) {
    const { userId, bookingId, type, title, message, channels, template, templateData } = options;

    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        agentProfile: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Parse notification preferences if exists
    // Default: SMS enabled for users with phone numbers
    let userPreferences: NotificationChannel = {
      email: true,
      sms: true,  // SMS enabled by default
      whatsapp: false,
      push: true,
    };

    // Check if notificationPreferences exists (it's optional in schema)
    const notificationPrefs = (user as any).notificationPreferences;
    if (notificationPrefs) {
      try {
        const prefs = typeof notificationPrefs === 'string' 
          ? JSON.parse(notificationPrefs) 
          : notificationPrefs;
        userPreferences = {
          email: prefs.email !== false,
          sms: prefs.sms !== false,  // SMS enabled unless explicitly disabled
          whatsapp: prefs.whatsapp === true,
          push: prefs.push !== false,
        };
      } catch (e) {
        // Use defaults if parsing fails
      }
    }

    // Determine which channels to use (intersection of requested and user preferences)
    const channelsToUse: NotificationChannel = {
      email: channels.email && userPreferences.email,
      sms: channels.sms && userPreferences.sms,
      whatsapp: channels.whatsapp && userPreferences.whatsapp,
      push: channels.push && userPreferences.push,
    };

    // Create notification record
    const channelsString = Object.entries(channelsToUse)
      .filter(([_, enabled]) => enabled)
      .map(([channel]) => channel)
      .join(',');

    const notification = await prisma.notification.create({
      data: {
        userId,
        bookingId,
        type,
        title,
        message,
        channels: channelsString || 'email',
        sent: false,
        read: false,
      },
    });

    const results: Record<string, { success: boolean; error?: string }> = {};

    // Send through each enabled channel
    if (channelsToUse.email) {
      try {
        await this.sendEmail(user.email, title, message, template, templateData);
        results.email = { success: true };
      } catch (error: any) {
        results.email = { success: false, error: error.message };
      }
    }

    if (channelsToUse.sms && user.phone) {
      try {
        await this.sendSMS(user.phone, message);
        results.sms = { success: true };
      } catch (error: any) {
        results.sms = { success: false, error: error.message };
      }
    }

    if (channelsToUse.whatsapp && user.phone) {
      try {
        await this.sendWhatsApp(user.phone, message);
        results.whatsapp = { success: true };
      } catch (error: any) {
        results.whatsapp = { success: false, error: error.message };
      }
    }

    if (channelsToUse.push) {
      try {
        // TODO: Implement push notifications (FCM, OneSignal, etc.)
        results.push = { success: true };
      } catch (error: any) {
        results.push = { success: false, error: error.message };
      }
    }

    // Update notification status
    const allSuccessful = Object.values(results).every((r) => r.success);
    const anySuccessful = Object.values(results).some((r) => r.success);

    await prisma.notification.update({
      where: { id: notification.id },
      data: {
        sent: anySuccessful,
        sentAt: anySuccessful ? new Date() : null,
      },
    });

    return {
      notificationId: notification.id,
      channels: results,
      success: anySuccessful,
    };
  }

  /**
   * Send email notification via Infobip
   */
  private async sendEmail(
    to: string,
    subject: string,
    message: string,
    template?: string,
    templateData?: Record<string, any>
  ) {
    const result = await infobipService.sendEmail({
      to,
      subject,
      html: this.formatEmailMessage(message),
      text: message,
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to send email');
    }

    console.log(`[NotificationService] ✅ Email notification sent to ${to}`);
  }

  /**
   * Send SMS notification via Infobip
   */
  private async sendSMS(to: string, message: string) {
    const result = await infobipService.sendSMS({
      to,
      text: message,
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to send SMS');
    }

    console.log(`[NotificationService] ✅ SMS notification sent to ${to}`);
  }

  /**
   * Send WhatsApp notification
   * NOTE: WhatsApp requires paid service (Twilio, etc.). Currently disabled.
   * For free alternative, consider email notifications or push notifications.
   */
  private async sendWhatsApp(to: string, message: string) {
    // WhatsApp requires paid service - log instead
    console.log(`[NotificationService] 💬 WhatsApp notification (WhatsApp service not configured - FREE alternative needed):`);
    console.log(`  To: ${to}`);
    console.log(`  Message: ${message}`);
    console.log(`  Note: WhatsApp requires paid service. Consider using email notifications instead.`);
    throw new Error('WhatsApp notifications require paid service. Please use email notifications instead.');
  }

  /**
   * Format email message with HTML
   */
  private formatEmailMessage(message: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #0066CC; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Promo-Efect</h1>
            </div>
            <div class="content">
              ${message.replace(/\n/g, '<br>')}
            </div>
            <div class="footer">
              <p>Promo-Efect SRL | Logistică Maritimă</p>
              <p>Acest email a fost trimis automat. Vă rugăm să nu răspundeți.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Format phone number (E.164 format)
   * Kept for future use if free SMS service is added
   */
  private formatPhoneNumber(phone: string): string {
    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '');

    // If starts with 0, replace with country code
    if (cleaned.startsWith('0')) {
      cleaned = '373' + cleaned.substring(1); // Moldova country code
    }

    // If doesn't start with country code, add it
    if (!cleaned.startsWith('373')) {
      cleaned = '373' + cleaned;
    }

    return '+' + cleaned;
  }

  /**
   * Send bulk notifications to multiple users
   */
  async sendBulkNotifications(
    userIds: string[],
    type: string,
    title: string,
    message: string,
    channels: NotificationChannel
  ) {
    const results = [];

    for (const userId of userIds) {
      try {
        const result = await this.sendNotification({
          userId,
          type,
          title,
          message,
          channels,
        });
        results.push({ userId, ...result });
      } catch (error: any) {
        results.push({
          userId,
          success: false,
          error: error.message,
        });
      }
    }

    return {
      total: userIds.length,
      successful: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    };
  }

  /**
   * Send scheduled notification (for future use)
   */
  async scheduleNotification(
    userId: string,
    scheduledFor: Date,
    type: string,
    title: string,
    message: string,
    channels: NotificationChannel
  ) {
    // Create notification with scheduledFor in the future
    // This will be picked up by a background job
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        channels: Object.entries(channels)
          .filter(([_, enabled]) => enabled)
          .map(([channel]) => channel)
          .join(','),
        sent: false,
        read: false,
      },
    });

    // TODO: Add to background job queue for scheduled sending

    return {
      notificationId: notification.id,
      scheduledFor,
      message: 'Notification scheduled',
    };
  }
}

export const notificationService = new NotificationService();
export default notificationService;

