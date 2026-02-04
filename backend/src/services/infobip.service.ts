/**
 * Infobip Service
 * Handles sending emails and SMS through Infobip API
 *
 * Required environment variables:
 * - INFOBIP_API_KEY: Your Infobip API key
 * - INFOBIP_BASE_URL: Your Infobip base URL (e.g., xxxxx.api.infobip.com)
 * - INFOBIP_FROM_EMAIL: Sender email address (must be verified in Infobip)
 * - INFOBIP_FROM_NAME: Sender name (optional)
 * - INFOBIP_SMS_FROM: SMS sender ID (optional, default: Promo-Efect)
 */

import axios from 'axios';
import FormData from 'form-data';

interface InfobipAttachment {
  filename: string;
  content: Buffer;
  contentType?: string;
}

interface InfobipEmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  fromName?: string;
  attachments?: InfobipAttachment[];
}

interface InfobipSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

interface InfobipSmsOptions {
  to: string;
  text: string;
  from?: string;
}

class InfobipService {
  private apiKey: string = '';
  private baseUrl: string = '';
  private fromEmail: string;
  private fromName: string;
  private smsFrom: string;
  private isConfigured: boolean = false;

  constructor() {
    this.fromEmail = process.env.INFOBIP_FROM_EMAIL || process.env.SMTP_FROM_EMAIL || 'noreply@promo-efect.md';
    this.fromName = process.env.INFOBIP_FROM_NAME || process.env.SMTP_FROM_NAME || 'Promo-Efect';
    this.smsFrom = process.env.INFOBIP_SMS_FROM || 'Promo-Efect';
    this.initializeClient();
  }

  private initializeClient(): void {
    this.apiKey = process.env.INFOBIP_API_KEY || '';
    this.baseUrl = process.env.INFOBIP_BASE_URL || '';

    if (!this.apiKey || !this.baseUrl) {
      console.warn('[Infobip] Missing INFOBIP_API_KEY or INFOBIP_BASE_URL. Email sending will be logged to console.');
      this.isConfigured = false;
      return;
    }

    this.isConfigured = true;
    console.log(`[Infobip] Email service configured with base URL: ${this.baseUrl}`);
  }

  /**
   * Check if Infobip is configured
   */
  isReady(): boolean {
    return this.isConfigured;
  }

  /**
   * Send email via Infobip Email API
   */
  async sendEmail(options: InfobipEmailOptions): Promise<InfobipSendResult> {
    const { to, subject, html, text, from, fromName, attachments } = options;

    // If not configured, log to console
    if (!this.isReady()) {
      console.log('='.repeat(60));
      console.log('[Infobip] EMAIL (API not configured - logging to console)');
      console.log('='.repeat(60));
      console.log(`To: ${to}`);
      console.log(`From: ${fromName || this.fromName} <${from || this.fromEmail}>`);
      console.log(`Subject: ${subject}`);
      console.log(`Content: ${text || html?.substring(0, 200)}...`);
      console.log('='.repeat(60));
      console.log('\nTo enable Infobip email, configure in .env:');
      console.log('  INFOBIP_API_KEY=your_api_key');
      console.log('  INFOBIP_BASE_URL=xxxxx.api.infobip.com');
      console.log('  INFOBIP_FROM_EMAIL=verified@yourdomain.com');
      console.log('='.repeat(60));
      return { success: true, messageId: 'console-log' };
    }

    try {
      const senderName = fromName || this.fromName;
      const senderEmail = from || this.fromEmail;

      // Build form data (Infobip requires multipart/form-data)
      const formData = new FormData();
      formData.append('from', `${senderName} <${senderEmail}>`);
      formData.append('to', to);
      formData.append('subject', subject);
      if (text) formData.append('text', text);
      if (html) formData.append('html', html);

      // Add attachments if provided
      if (attachments && attachments.length > 0) {
        for (const attachment of attachments) {
          formData.append('attachment', attachment.content, {
            filename: attachment.filename,
            contentType: attachment.contentType || 'application/octet-stream',
          });
        }
      }

      const response = await axios.post(
        `https://${this.baseUrl}/email/3/send`,
        formData,
        {
          headers: {
            'Authorization': `App ${this.apiKey}`,
            'Accept': 'application/json',
            ...formData.getHeaders(),
          },
        }
      );

      if (response.data?.messages?.[0]?.messageId) {
        const messageId = response.data.messages[0].messageId;
        console.log(`[Infobip] Email sent successfully to ${to}, messageId: ${messageId}`);
        return { success: true, messageId };
      }

      console.log(`[Infobip] Email sent to ${to}`);
      return { success: true };
    } catch (error: any) {
      const errorMessage = error.response?.data?.requestError?.serviceException?.text
        || error.response?.data?.message
        || error.message
        || 'Unknown error';

      console.error(`[Infobip] Failed to send email to ${to}: ${errorMessage}`);

      if (error.response?.status) {
        console.error(`[Infobip] HTTP Status: ${error.response.status}`);
      }
      if (error.response?.data) {
        console.error('[Infobip] Response:', JSON.stringify(error.response.data, null, 2));
      }

      return { success: false, error: errorMessage };
    }
  }

  /**
   * Send bulk emails
   */
  async sendBulkEmails(
    recipients: string[],
    subject: string,
    html: string,
    text?: string
  ): Promise<{ total: number; successful: number; failed: number; results: InfobipSendResult[] }> {
    const results: InfobipSendResult[] = [];

    for (const recipient of recipients) {
      const result = await this.sendEmail({ to: recipient, subject, html, text });
      results.push(result);
    }

    return {
      total: recipients.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results,
    };
  }

  /**
   * Send SMS via Infobip SMS API
   */
  async sendSMS(options: InfobipSmsOptions): Promise<InfobipSendResult> {
    const { to, text, from } = options;

    // If not configured, log to console
    if (!this.isReady()) {
      console.log('='.repeat(60));
      console.log('[Infobip] SMS (API not configured - logging to console)');
      console.log('='.repeat(60));
      console.log(`To: ${to}`);
      console.log(`From: ${from || this.smsFrom}`);
      console.log(`Text: ${text}`);
      console.log('='.repeat(60));
      return { success: true, messageId: 'console-log' };
    }

    try {
      // Format phone number (ensure it has country code)
      const formattedPhone = this.formatPhoneNumber(to);

      const payload = {
        messages: [
          {
            destinations: [{ to: formattedPhone }],
            from: from || this.smsFrom,
            text: text,
          },
        ],
      };

      const response = await axios.post(
        `https://${this.baseUrl}/sms/2/text/advanced`,
        payload,
        {
          headers: {
            'Authorization': `App ${this.apiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        }
      );

      if (response.data?.messages?.[0]?.messageId) {
        const messageId = response.data.messages[0].messageId;
        const status = response.data.messages[0].status;
        console.log(`[Infobip] SMS sent to ${formattedPhone}, messageId: ${messageId}, status: ${status?.name || 'PENDING'}`);
        return { success: true, messageId };
      }

      console.log(`[Infobip] SMS sent to ${formattedPhone}`);
      return { success: true };
    } catch (error: any) {
      const errorMessage = error.response?.data?.requestError?.serviceException?.text
        || error.response?.data?.message
        || error.message
        || 'Unknown error';

      console.error(`[Infobip] Failed to send SMS to ${to}: ${errorMessage}`);

      if (error.response?.status) {
        console.error(`[Infobip] HTTP Status: ${error.response.status}`);
      }
      if (error.response?.data) {
        console.error('[Infobip] Response:', JSON.stringify(error.response.data, null, 2));
      }

      return { success: false, error: errorMessage };
    }
  }

  /**
   * Format phone number to E.164 format (with country code)
   */
  private formatPhoneNumber(phone: string): string {
    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '');

    // If starts with 0, assume Moldova and add country code
    if (cleaned.startsWith('0')) {
      cleaned = '373' + cleaned.substring(1);
    }

    // If doesn't start with country code, assume Moldova
    if (!cleaned.startsWith('373') && cleaned.length <= 8) {
      cleaned = '373' + cleaned;
    }

    return cleaned;
  }
}

// Singleton instance
export const infobipService = new InfobipService();
export default infobipService;
