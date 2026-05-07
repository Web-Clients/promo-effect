/**
 * Settings Service
 * Business logic for system settings management
 */

import prisma from '../../lib/prisma';
import { encrypt, decrypt } from '../../utils/crypto.util';
import { gmailIntegration } from '../../integrations/gmail.integration';
import { EmailService } from '../emails/email.service';
import logger from '../../utils/logger';

export interface SettingInput {
  category: string;
  key: string;
  value: any;
  type: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'JSON';
  description?: string;
}

export interface GmailConfig {
  email: string | null;
  hasPassword: boolean;
  lastFetchAt: Date | null;
  lastFetchResult: string | null;
}

export class SettingsService {
  private emailService = new EmailService();

  /**
   * Get all settings grouped by category
   */
  async findAll() {
    // Получаем настройки из AdminSettings (legacy)
    const adminSettings = await prisma.adminSettings.findUnique({
      where: { id: 1 },
    });

    if (!adminSettings) {
      await this.createDefaultSettings();
    }

    // Получаем настройки из новой таблицы Settings
    const flexibleSettings = await (prisma as any).setting.findMany({
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
    });

    // Группируем по категориям
    const settingsByCategory: Record<string, any> = {};

    flexibleSettings.forEach((setting: any) => {
      if (!settingsByCategory[setting.category]) {
        settingsByCategory[setting.category] = {};
      }

      // Парсим значение в зависимости от типа
      let value: any = setting.value;
      try {
        if (setting.type === 'JSON') {
          value = JSON.parse(setting.value);
        } else if (setting.type === 'NUMBER') {
          value = parseFloat(setting.value);
        } else if (setting.type === 'BOOLEAN') {
          value = setting.value === 'true';
        }
      } catch (e) {
        // Если парсинг не удался, оставляем как строку
      }

      settingsByCategory[setting.category][setting.key] = value;
    });

    return {
      data: {
        // Legacy settings из AdminSettings
        pricing: adminSettings
          ? {
              portTaxes: adminSettings.portTaxes,
              customsTaxes: adminSettings.customsTaxes,
              terrestrialTransport: adminSettings.terrestrialTransport,
              commission: adminSettings.commission,
              weightRanges: JSON.parse(adminSettings.weightRanges),
            }
          : {},
        gmail: adminSettings
          ? {
              // Never return actual password — only hasPassword boolean
              email: (adminSettings as any).gmailEmail || null,
              hasPassword: !!(adminSettings as any).gmailAccessToken,
              lastFetchAt: (adminSettings as any).lastEmailFetchAt || null,
              lastFetchResult: (adminSettings as any).lastEmailFetchResult || null,
            }
          : {},
        // Новые настройки из таблицы Settings
        ...settingsByCategory,
      },
    };
  }

  /**
   * Get settings by category
   */
  async findByCategory(category: string) {
    const settings = await prisma.adminSettings.findUnique({
      where: { id: 1 },
    });

    if (!settings) {
      throw new Error('Settings not found');
    }

    switch (category.toLowerCase()) {
      case 'pricing':
        return {
          portTaxes: settings.portTaxes,
          customsTaxes: settings.customsTaxes,
          terrestrialTransport: settings.terrestrialTransport,
          commission: settings.commission,
          weightRanges: JSON.parse(settings.weightRanges),
        };
      case 'gmail':
        return await this.getGmailConfig();
      default:
        throw new Error(`Category ${category} not found`);
    }
  }

  // ── Gmail IMAP methods ──────────────────────────────────────────────────

  /**
   * Get current Gmail IMAP config (never returns the actual password)
   */
  async getGmailConfig(): Promise<GmailConfig> {
    const settings = await prisma.adminSettings.findUnique({ where: { id: 1 } });
    return {
      email: (settings as any)?.gmailEmail || null,
      hasPassword: !!(settings as any)?.gmailAccessToken,
      lastFetchAt: (settings as any)?.lastEmailFetchAt || null,
      lastFetchResult: (settings as any)?.lastEmailFetchResult || null,
    };
  }

  /**
   * Save Gmail IMAP credentials to DB (appPassword is AES-encrypted at rest)
   */
  async setGmailConfig(
    { email, appPassword }: { email: string; appPassword: string },
    userId: string
  ): Promise<GmailConfig> {
    const encryptedPassword = encrypt(appPassword);

    await prisma.adminSettings.upsert({
      where: { id: 1 },
      update: {
        gmailEmail: email,
        gmailAccessToken: encryptedPassword,
        updatedBy: userId,
      },
      create: {
        id: 1,
        gmailEmail: email,
        gmailAccessToken: encryptedPassword,
        updatedBy: userId,
      },
    });

    // Invalidate credential cache so next call picks up new values
    gmailIntegration.invalidateCache();

    logger.info(`[Settings] Gmail IMAP config updated by user ${userId}: email=${email}`);

    return this.getGmailConfig();
  }

  /**
   * Test Gmail IMAP connection — actually connects via IMAP, returns real result
   */
  async testGmailConnection(): Promise<{
    success: boolean;
    message: string;
    email?: string;
    lastFetchAt?: Date | null;
  }> {
    try {
      const status = await gmailIntegration.getStatus();

      if (!status.configured) {
        return {
          success: false,
          message: 'Gmail IMAP not configured. Please enter email and App Password.',
        };
      }

      return {
        success: status.connected,
        message: status.connected
          ? `Connected successfully to ${status.email}`
          : 'IMAP connection failed — check email address and App Password.',
        email: status.email,
        lastFetchAt: status.lastFetch || null,
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Connection error: ${error.message}`,
      };
    }
  }

  /**
   * Trigger an immediate Gmail sync:
   * fetch up to 20 emails, run email-classifier pipeline on each
   */
  async triggerGmailSync(): Promise<{
    success: boolean;
    fetched: number;
    processed: number;
    errors: string[];
  }> {
    const errors: string[] = [];

    try {
      const configured = await gmailIntegration.isConfiguredAsync();
      if (!configured) {
        return {
          success: false,
          fetched: 0,
          processed: 0,
          errors: ['Gmail not configured'],
        };
      }

      // Fetch emails
      const emails = await gmailIntegration.fetchUnreadEmails(20);
      const fetched = emails.length;

      if (fetched === 0) {
        return { success: true, fetched: 0, processed: 0, errors: [] };
      }

      // Queue all fetched emails for processing
      let queued = 0;
      for (const email of emails) {
        try {
          await this.emailService.queueEmailForProcessing(email);
          queued++;
        } catch (err: any) {
          errors.push(`Queue error for ${email.id}: ${err.message}`);
        }
      }

      // Process pending queue
      const pending = await this.emailService.getPendingEmails();
      let processed = 0;

      for (const email of pending) {
        try {
          const result = await this.emailService.processEmail(email, true, 80);
          await this.emailService.markEmailProcessed(
            email.id,
            result.status === 'FAILED' ? 'FAILED' : 'PROCESSED',
            result.error
          );
          processed++;
        } catch (err: any) {
          errors.push(`Process error for ${email.id}: ${err.message}`);
          try {
            await this.emailService.markEmailProcessed(email.id, 'FAILED', err.message);
          } catch (_) {
            // ignore secondary error
          }
        }
      }

      // Persist result
      const fetchResult = {
        emailsFetched: fetched,
        emailsProcessed: processed,
        processingFailed: errors.length,
        timestamp: new Date().toISOString(),
        trigger: 'manual',
      };
      await prisma.adminSettings.upsert({
        where: { id: 1 },
        update: {
          lastEmailFetchAt: new Date(),
          lastEmailFetchResult: JSON.stringify(fetchResult),
        },
        create: {
          id: 1,
          lastEmailFetchAt: new Date(),
          lastEmailFetchResult: JSON.stringify(fetchResult),
        },
      });

      return { success: true, fetched, processed, errors };
    } catch (error: any) {
      logger.error('[Settings] triggerGmailSync failed:', error.message);
      return {
        success: false,
        fetched: 0,
        processed: 0,
        errors: [error.message],
      };
    }
  }

  /**
   * Update setting by category and key
   */
  async update(category: string, key: string, value: any, userId: string) {
    // Сначала проверяем, есть ли настройка в новой таблице Settings
    const existingSetting = await (prisma as any).setting.findUnique({
      where: {
        category_key: {
          category: category.toUpperCase(),
          key,
        },
      },
    });

    // Если настройка в legacy AdminSettings, обновляем там
    const legacyCategories = ['PRICING', 'GMAIL'];
    if (legacyCategories.includes(category.toUpperCase()) && !existingSetting) {
      const settings = await prisma.adminSettings.findUnique({
        where: { id: 1 },
      });

      if (!settings) {
        await this.createDefaultSettings();
      }

      const updateData: any = { updatedBy: userId };

      switch (category.toUpperCase()) {
        case 'PRICING':
          if (key === 'portTaxes') updateData.portTaxes = parseFloat(value);
          else if (key === 'customsTaxes') updateData.customsTaxes = parseFloat(value);
          else if (key === 'terrestrialTransport')
            updateData.terrestrialTransport = parseFloat(value);
          else if (key === 'commission') updateData.commission = parseFloat(value);
          else if (key === 'weightRanges') updateData.weightRanges = JSON.stringify(value);
          else throw new Error(`Key ${key} not found in category ${category}`);
          break;

        case 'GMAIL':
          // accessToken = encrypted appPassword, refreshToken not used for IMAP
          if (key === 'accessToken') updateData.gmailAccessToken = value ? encrypt(value) : value;
          else if (key === 'refreshToken')
            updateData.gmailRefreshToken = value ? encrypt(value) : value;
          else if (key === 'tokenExpiry') updateData.gmailTokenExpiry = new Date(value);
          else if (key === 'email') updateData.gmailEmail = value;
          else if (key === 'lastEmailFetchAt') updateData.lastEmailFetchAt = new Date(value);
          else throw new Error(`Key ${key} not found in category ${category}`);
          break;
      }

      return await prisma.adminSettings.update({
        where: { id: 1 },
        data: updateData,
      });
    }

    // Обновляем или создаем в новой таблице Settings
    const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
    const type = existingSetting?.type || this.detectType(value);

    const updated = await (prisma as any).setting.upsert({
      where: {
        category_key: {
          category: category.toUpperCase(),
          key,
        },
      },
      update: {
        value: stringValue,
        type,
        updatedBy: userId,
      },
      create: {
        category: category.toUpperCase(),
        key,
        value: stringValue,
        type,
        updatedBy: userId,
      },
    });

    return updated;
  }

  /**
   * Detect type of value
   */
  private detectType(value: any): string {
    if (typeof value === 'boolean') return 'BOOLEAN';
    if (typeof value === 'number') return 'NUMBER';
    if (typeof value === 'object') return 'JSON';
    return 'STRING';
  }

  /**
   * Create default settings
   */
  private async createDefaultSettings() {
    return await prisma.adminSettings.upsert({
      where: { id: 1 },
      update: {},
      create: {
        id: 1,
        portTaxes: 221.67,
        customsTaxes: 150.0,
        terrestrialTransport: 600.0,
        commission: 200.0,
        weightRanges: JSON.stringify([
          {
            label: '1-18 tone',
            min: 1,
            max: 18,
            enabled: true,
            freightSurcharge: 0,
            landSurcharge: 0,
          },
          {
            label: '18-23 tone',
            min: 18,
            max: 23,
            enabled: true,
            freightSurcharge: 0,
            landSurcharge: 0,
          },
          {
            label: '23-24 tone',
            min: 23,
            max: 24,
            enabled: true,
            freightSurcharge: 0,
            landSurcharge: 0,
          },
          {
            label: '24-25 tone',
            min: 24,
            max: 25,
            enabled: true,
            freightSurcharge: 0,
            landSurcharge: 0,
          },
          {
            label: '25-26 tone',
            min: 25,
            max: 26,
            enabled: true,
            freightSurcharge: 0,
            landSurcharge: 0,
          },
          {
            label: '26-27 tone',
            min: 26,
            max: 27,
            enabled: true,
            freightSurcharge: 0,
            landSurcharge: 0,
          },
          {
            label: '27-28 tone',
            min: 27,
            max: 28,
            enabled: true,
            freightSurcharge: 0,
            landSurcharge: 0,
          },
        ]),
      },
    });
  }

  /**
   * Test integration (Gmail, SeaRates, etc.)
   */
  async testIntegration(integrationType: string) {
    switch (integrationType.toLowerCase()) {
      case 'gmail':
        return this.testGmailConnection();
      case 'searates':
        return this.testSearatesConnection();
      default:
        throw new Error(`Integration type ${integrationType} not supported`);
    }
  }

  async testSearatesConnection(): Promise<{ success: boolean; message: string }> {
    const apiKey = process.env.SEARATES_API_KEY;
    if (!apiKey) {
      return { success: false, message: 'SeaRates API key not configured' };
    }
    return { success: true, message: 'SeaRates API key is configured' };
  }
}
