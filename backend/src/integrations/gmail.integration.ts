/**
 * Gmail IMAP Integration
 *
 * Connects to a single Gmail mailbox (efect.logistic@gmail.com)
 * via IMAP using App Password — no OAuth needed.
 *
 * Setup:
 * 1. Enable 2FA on the Gmail account
 * 2. Create App Password: Google Account → Security → App Passwords
 * 3. Set environment variables OR configure via Admin Settings UI:
 *    - GMAIL_EMAIL=efect.logistic@gmail.com
 *    - GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
 *
 * Priority: DB (AdminSettings) > env vars
 */

import { ImapFlow } from 'imapflow';
import { simpleParser, ParsedMail } from 'mailparser';
import prisma from '../lib/prisma';
import { ParsedEmail, EmailAttachment } from '../modules/emails/email.service';
import { decrypt } from '../utils/crypto.util';
import logger from '../utils/logger';

// ===== GMAIL IMAP SERVICE =====

/** Cached credentials loaded from DB or env */
interface GmailCredentials {
  email: string;
  appPassword: string;
  loadedAt: number; // ms timestamp
}

export class GmailIntegration {
  /** In-memory cache of credentials, refreshed every 60 seconds */
  private credCache: GmailCredentials | null = null;
  private readonly CACHE_TTL_MS = 60_000;

  // ── Credential loading ──────────────────────────────────────────────────

  /**
   * Load credentials: DB first, then env vars.
   * Result is cached for CACHE_TTL_MS to avoid a DB hit on every call.
   */
  private async loadCredentials(): Promise<{ email: string; appPassword: string }> {
    const now = Date.now();

    if (this.credCache && now - this.credCache.loadedAt < this.CACHE_TTL_MS) {
      return { email: this.credCache.email, appPassword: this.credCache.appPassword };
    }

    // Try DB first
    try {
      const settings = await prisma.adminSettings.findUnique({ where: { id: 1 } });
      if (settings?.gmailEmail && (settings as any).gmailAccessToken) {
        const appPassword = decrypt((settings as any).gmailAccessToken);
        if (appPassword) {
          this.credCache = { email: settings.gmailEmail, appPassword, loadedAt: now };
          return { email: settings.gmailEmail, appPassword };
        }
      }
    } catch (err: any) {
      logger.warn(
        '[Gmail IMAP] Could not load credentials from DB, falling back to env:',
        err.message
      );
    }

    // Fall back to env vars
    const email = process.env.GMAIL_EMAIL || '';
    const appPassword = process.env.GMAIL_APP_PASSWORD || '';
    this.credCache = { email, appPassword, loadedAt: now };
    return { email, appPassword };
  }

  /** Invalidate credential cache (call after saving new config to DB) */
  invalidateCache(): void {
    this.credCache = null;
  }

  // ── Public API ──────────────────────────────────────────────────────────

  /**
   * Check if Gmail IMAP is configured (uses cached/loaded creds).
   */
  async isConfiguredAsync(): Promise<boolean> {
    const { email, appPassword } = await this.loadCredentials();
    return !!(email && appPassword);
  }

  /**
   * Synchronous check — only works if credentials are already cached.
   * Falls back to env vars for backward compat with the cron job.
   */
  isConfigured(): boolean {
    if (this.credCache) {
      return !!(this.credCache.email && this.credCache.appPassword);
    }
    // Fallback: env vars
    return !!(process.env.GMAIL_EMAIL && process.env.GMAIL_APP_PASSWORD);
  }

  /**
   * Get IMAP client connected to Gmail
   */
  private async getClient(): Promise<ImapFlow> {
    const { email, appPassword } = await this.loadCredentials();

    if (!email || !appPassword) {
      throw new Error(
        'Gmail not configured. Set GMAIL_EMAIL and GMAIL_APP_PASSWORD (via UI or env).'
      );
    }

    const client = new ImapFlow({
      host: 'imap.gmail.com',
      port: 993,
      secure: true,
      auth: {
        user: email,
        pass: appPassword,
      },
      logger: false,
      greetingTimeout: 30000,
      connectionTimeout: 30000,
      socketTimeout: 60000,
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
    const { email, appPassword } = await this.loadCredentials();

    if (!email || !appPassword) {
      return { configured: false, connected: false };
    }

    // Try connecting to verify credentials
    let connected = false;
    try {
      const client = await this.getClient();
      connected = true;
      await Promise.race([
        client.logout(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('logout timeout')), 5000)),
      ]).catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'unknown';
        logger.warn(`[Gmail IMAP] Logout timeout/error: ${msg}`);
      });
    } catch (_error) {
      connected = false;
    }

    // Get last fetch time from DB
    const settings = await prisma.adminSettings.findUnique({
      where: { id: 1 },
    });

    return {
      configured: true,
      connected,
      email,
      lastFetch: settings?.lastEmailFetchAt || undefined,
    };
  }

  /**
   * Fetch recent emails from Gmail INBOX (last 7 days, regardless of read status)
   *
   * NOTE: We do NOT filter by seen/unseen — clients often read emails on their phone
   * before the parser runs, making all emails "seen". Instead we search by date and
   * rely on the DB unique constraint on messageId to skip already-processed emails.
   */
  async fetchUnreadEmails(maxResults: number = 10): Promise<ParsedEmail[]> {
    const client = await this.getClient();
    const emails: ParsedEmail[] = [];

    try {
      // Open INBOX
      const mailbox = await client.getMailboxLock('INBOX');

      try {
        // Search for emails from the last 7 days (regardless of read status)
        // Use { uid: true } to get UIDs (not sequence numbers) — needed for consistent download
        const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const searchResult = await client.search({ since }, { uid: true });
        const messages = Array.isArray(searchResult) ? searchResult : [];

        if (messages.length === 0) {
          return [];
        }

        // Take most recent N emails (last in the array = most recent)
        const messageIds = messages.slice(-maxResults);

        // Fetch each message with full content using UIDs
        const MAX_EMAIL_SIZE = 50 * 1024 * 1024; // 50 MB

        for (const uid of messageIds) {
          try {
            const rawMessage = await client.download(uid.toString(), undefined, { uid: true });

            if (rawMessage.meta?.expectedSize && rawMessage.meta.expectedSize > MAX_EMAIL_SIZE) {
              logger.warn(
                `[Gmail IMAP] Email ${uid} too large (${rawMessage.meta.expectedSize} bytes), skipping`
              );
              continue;
            }

            if (rawMessage && rawMessage.content) {
              const parsed = await simpleParser(rawMessage.content);
              const email = this.convertToEmail(uid.toString(), parsed);
              emails.push(email);
            }
          } catch (msgError: any) {
            logger.error(`[Gmail IMAP] Failed to fetch message ${uid}:`, msgError.message);
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
      logger.error('[Gmail IMAP] Fetch error:', error.message);
      throw error;
    } finally {
      await Promise.race([
        client.logout(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('logout timeout')), 5000)),
      ]).catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'unknown';
        logger.warn(`[Gmail IMAP] Logout timeout/error: ${msg}`);
      });
    }

    logger.info(`[Gmail IMAP] Fetched ${emails.length} unread emails`);
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
      logger.error(`[Gmail IMAP] Failed to mark message ${uid} as read:`, error.message);
    } finally {
      await Promise.race([
        client.logout(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('logout timeout')), 5000)),
      ]).catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'unknown';
        logger.warn(`[Gmail IMAP] Logout timeout/error: ${msg}`);
      });
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
    this.invalidateCache();
  }
}

// Export singleton
export const gmailIntegration = new GmailIntegration();
