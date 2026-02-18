/**
 * Gmail IMAP Integration
 *
 * Connects to a single Gmail mailbox (efect.logistic@gmail.com)
 * via IMAP using App Password — no OAuth needed.
 *
 * Setup:
 * 1. Enable 2FA on the Gmail account
 * 2. Create App Password: Google Account → Security → App Passwords
 * 3. Set environment variables:
 *    - GMAIL_EMAIL=efect.logistic@gmail.com
 *    - GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
 */

import { ImapFlow } from 'imapflow';
import { simpleParser, ParsedMail } from 'mailparser';
import prisma from '../lib/prisma';
import { ParsedEmail, EmailAttachment } from '../modules/emails/email.service';

// ===== GMAIL IMAP SERVICE =====

export class GmailIntegration {
  private email: string;
  private appPassword: string;

  constructor() {
    this.email = process.env.GMAIL_EMAIL || '';
    this.appPassword = process.env.GMAIL_APP_PASSWORD || '';
  }

  /**
   * Check if Gmail IMAP is configured
   */
  isConfigured(): boolean {
    return !!(this.email && this.appPassword);
  }

  /**
   * Get IMAP client connected to Gmail
   */
  private async getClient(): Promise<ImapFlow> {
    if (!this.isConfigured()) {
      throw new Error('Gmail not configured. Set GMAIL_EMAIL and GMAIL_APP_PASSWORD.');
    }

    const client = new ImapFlow({
      host: 'imap.gmail.com',
      port: 993,
      secure: true,
      auth: {
        user: this.email,
        pass: this.appPassword,
      },
      logger: false, // Disable verbose IMAP logging
    });

    await client.connect();
    return client;
  }

  /**
   * Get Gmail connection status
   */
  async getStatus(): Promise<{
    configured: boolean;
    connected: boolean;
    email?: string;
    lastFetch?: Date;
  }> {
    if (!this.isConfigured()) {
      return { configured: false, connected: false };
    }

    // Try connecting to verify credentials
    let connected = false;
    try {
      const client = await this.getClient();
      connected = true;
      await client.logout();
    } catch (error) {
      connected = false;
    }

    // Get last fetch time from DB
    const settings = await prisma.adminSettings.findUnique({
      where: { id: 1 },
    });

    return {
      configured: true,
      connected,
      email: this.email,
      lastFetch: settings?.lastEmailFetchAt || undefined,
    };
  }

  /**
   * Fetch unread emails from Gmail INBOX
   */
  async fetchUnreadEmails(maxResults: number = 10): Promise<ParsedEmail[]> {
    const client = await this.getClient();
    const emails: ParsedEmail[] = [];

    try {
      // Open INBOX
      const mailbox = await client.getMailboxLock('INBOX');

      try {
        // Search for unseen (unread) messages
        const searchResult = await client.search({ seen: false });
        const messages = Array.isArray(searchResult) ? searchResult : [];

        if (messages.length === 0) {
          return [];
        }

        // Limit results
        const messageIds = messages.slice(0, maxResults);

        // Fetch each message with full content
        for (const uid of messageIds) {
          try {
            const rawMessage = await client.download(uid.toString(), undefined, { uid: true });

            if (rawMessage && rawMessage.content) {
              const parsed = await simpleParser(rawMessage.content);
              const email = this.convertToEmail(uid.toString(), parsed);
              emails.push(email);
            }
          } catch (msgError: any) {
            console.error(`[Gmail IMAP] Failed to fetch message ${uid}:`, msgError.message);
          }
        }
      } finally {
        mailbox.release();
      }

      // Update last fetch time
      await prisma.adminSettings.upsert({
        where: { id: 1 },
        update: { lastEmailFetchAt: new Date() },
        create: { id: 1, lastEmailFetchAt: new Date() },
      });

    } catch (error: any) {
      console.error('[Gmail IMAP] Fetch error:', error.message);
      throw error;
    } finally {
      await client.logout();
    }

    console.log(`[Gmail IMAP] Fetched ${emails.length} unread emails`);
    return emails;
  }

  /**
   * Convert parsed mail to our ParsedEmail format
   */
  private convertToEmail(uid: string, mail: ParsedMail): ParsedEmail {
    // Extract text body (prefer text over html)
    let body = mail.text || '';
    if (!body && mail.html) {
      // Strip HTML tags for a simple text version
      body = (mail.html as string)
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .trim();
    }

    // Extract attachments
    const attachments: EmailAttachment[] = [];
    if (mail.attachments) {
      for (const att of mail.attachments) {
        attachments.push({
          filename: att.filename || 'unnamed',
          mimeType: att.contentType || 'application/octet-stream',
          size: att.size || 0,
          data: att.content ? att.content.toString('base64') : undefined,
        });
      }
    }

    // Get sender
    const from = mail.from?.text || mail.from?.value?.[0]?.address || 'unknown';

    return {
      id: `gmail-${uid}`,
      from,
      subject: mail.subject || '(no subject)',
      date: mail.date || new Date(),
      body,
      attachments,
    };
  }

  /**
   * Mark email as read (set \Seen flag)
   */
  async markAsProcessed(messageId: string): Promise<void> {
    // Extract UID from our id format "gmail-123"
    const uid = messageId.replace('gmail-', '');

    const client = await this.getClient();

    try {
      const mailbox = await client.getMailboxLock('INBOX');
      try {
        await client.messageFlagsAdd(uid, ['\\Seen'], { uid: true });
      } finally {
        mailbox.release();
      }
    } catch (error: any) {
      console.error(`[Gmail IMAP] Failed to mark message ${uid} as read:`, error.message);
    } finally {
      await client.logout();
    }
  }

  /**
   * Disconnect Gmail (clear saved credentials from DB)
   */
  async disconnect(): Promise<void> {
    await prisma.adminSettings.updateMany({
      where: { id: 1 },
      data: {
        gmailAccessToken: null,
        gmailRefreshToken: null,
        gmailTokenExpiry: null,
        gmailEmail: null,
      },
    });
  }
}

// Export singleton
export const gmailIntegration = new GmailIntegration();
