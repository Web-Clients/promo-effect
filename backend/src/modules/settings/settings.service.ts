/**
 * Settings Service
 * Business logic for system settings management
 */

import prisma from '../../lib/prisma';

export interface SettingInput {
  category: string;
  key: string;
  value: any;
  type: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'JSON';
  description?: string;
}

export class SettingsService {
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
        pricing: adminSettings ? {
          portTaxes: adminSettings.portTaxes,
          customsTaxes: adminSettings.customsTaxes,
          terrestrialTransport: adminSettings.terrestrialTransport,
          commission: adminSettings.commission,
          weightRanges: JSON.parse(adminSettings.weightRanges),
        } : {},
        gmail: adminSettings ? {
          accessToken: (adminSettings as any).gmailAccessToken,
          refreshToken: (adminSettings as any).gmailRefreshToken,
          tokenExpiry: (adminSettings as any).gmailTokenExpiry,
          email: (adminSettings as any).gmailEmail,
          lastEmailFetchAt: (adminSettings as any).lastEmailFetchAt,
        } : {},
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
        return {
          accessToken: (settings as any).gmailAccessToken,
          refreshToken: (settings as any).gmailRefreshToken,
          tokenExpiry: (settings as any).gmailTokenExpiry,
          email: (settings as any).gmailEmail,
          lastEmailFetchAt: (settings as any).lastEmailFetchAt,
        };
      default:
        throw new Error(`Category ${category} not found`);
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
          else if (key === 'terrestrialTransport') updateData.terrestrialTransport = parseFloat(value);
          else if (key === 'commission') updateData.commission = parseFloat(value);
          else if (key === 'weightRanges') updateData.weightRanges = JSON.stringify(value);
          else throw new Error(`Key ${key} not found in category ${category}`);
          break;

        case 'GMAIL':
          if (key === 'accessToken') updateData.gmailAccessToken = value;
          else if (key === 'refreshToken') updateData.gmailRefreshToken = value;
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
        customsTaxes: 150.00,
        terrestrialTransport: 600.00,
        commission: 200.00,
        weightRanges: JSON.stringify([
          { label: '1-10 tone', min: 1, max: 10, enabled: true },
          { label: '10-20 tone', min: 10, max: 20, enabled: true },
          { label: '20-23 tone', min: 20, max: 23, enabled: true },
          { label: '23-24 tone', min: 23, max: 24, enabled: true },
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
        // TODO: Test Gmail OAuth connection
        return {
          success: true,
          message: 'Gmail integration test - to be implemented',
        };
      case 'searates':
        // TODO: Test SeaRates API connection
        return {
          success: true,
          message: 'SeaRates integration test - to be implemented',
        };
      default:
        throw new Error(`Integration type ${integrationType} not supported`);
    }
  }
}

