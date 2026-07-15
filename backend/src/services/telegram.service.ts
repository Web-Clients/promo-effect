/**
 * Telegram Service
 * Sends operational alerts to a Telegram chat via the Bot API.
 * No external dependency — uses the global fetch (Node 18+).
 *
 * Configuration (env):
 *   TELEGRAM_BOT_TOKEN      — bot token from @BotFather
 *   TELEGRAM_ADMIN_CHAT_ID  — chat/group id that receives ops alerts
 *
 * The bot must be added to the target group (or the user must have started
 * the bot) before it can post there.
 */

import logger from '../utils/logger';

const API_BASE = 'https://api.telegram.org';

export interface TelegramSendResult {
  success: boolean;
  error?: string;
}

export class TelegramService {
  private get token(): string {
    return (process.env.TELEGRAM_BOT_TOKEN || '').trim();
  }

  private get adminChatId(): string {
    return (process.env.TELEGRAM_ADMIN_CHAT_ID || '').trim();
  }

  /** True when a bot token is present (needed for any send). */
  isConfigured(): boolean {
    return this.token.length > 0;
  }

  /** True when both token and a default admin chat are present. */
  isAdminChatConfigured(): boolean {
    return this.isConfigured() && this.adminChatId.length > 0;
  }

  /**
   * Send a message to an explicit chat id.
   * Text is sent as plain text (no parse_mode) to avoid Markdown/HTML escaping
   * pitfalls with dynamic content.
   */
  async sendMessage(chatId: string, text: string): Promise<TelegramSendResult> {
    if (!this.isConfigured()) {
      return { success: false, error: 'TELEGRAM_BOT_TOKEN not set' };
    }
    if (!chatId) {
      return { success: false, error: 'chatId is empty' };
    }

    try {
      const res = await fetch(`${API_BASE}/bot${this.token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: text.slice(0, 4000), // Telegram hard limit is 4096
          disable_web_page_preview: true,
        }),
      });

      const body = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        description?: string;
      };

      if (!res.ok || !body.ok) {
        const error = body.description || `HTTP ${res.status}`;
        logger.warn(`[TelegramService] send failed: ${error}`);
        return { success: false, error };
      }

      return { success: true };
    } catch (error: any) {
      logger.warn(`[TelegramService] send error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /** Send an alert to the configured admin/ops chat. No-op if not configured. */
  async sendAdminAlert(text: string): Promise<TelegramSendResult> {
    if (!this.isAdminChatConfigured()) {
      return { success: false, error: 'TELEGRAM_ADMIN_CHAT_ID not set' };
    }
    const result = await this.sendMessage(this.adminChatId, text);
    if (result.success) {
      logger.info('[TelegramService] ✅ admin alert sent');
    }
    return result;
  }

  /** Verify the token by calling getMe. Used by admin health checks. */
  async testConnection(): Promise<{ ok: boolean; username?: string; error?: string }> {
    if (!this.isConfigured()) {
      return { ok: false, error: 'TELEGRAM_BOT_TOKEN not set' };
    }
    try {
      const res = await fetch(`${API_BASE}/bot${this.token}/getMe`);
      const body = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        result?: { username?: string };
        description?: string;
      };
      if (!res.ok || !body.ok) {
        return { ok: false, error: body.description || `HTTP ${res.status}` };
      }
      return { ok: true, username: body.result?.username };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  }
}

export const telegramService = new TelegramService();
export default telegramService;
