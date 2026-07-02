/**
 * Settings Service — frontend API calls for Admin Settings
 */

import api from './api';

// ── Types ──────────────────────────────────────────────────────────────

export interface GmailConfig {
  email: string | null;
  hasPassword: boolean;
  lastFetchAt: string | null;
  lastFetchResult: string | null;
}

export interface GmailTestResult {
  success: boolean;
  message: string;
  email?: string;
  lastFetchAt?: string | null;
  timestamp: string;
}

export interface GmailSyncResult {
  success: boolean;
  fetched: number;
  processed: number;
  errors: string[];
  timestamp: string;
}

// ── General settings (flexible key-value store) ────────────────────────

/**
 * Get all settings grouped by category.
 * Backend returns { success, data: <grouped by category> }, so we unwrap
 * `res.data.data`. Shape example:
 *   { SYSTEM: { companyName: '...', maintenanceMode: false }, TRACKING: {...}, ... }
 */
export async function getAllSettings(): Promise<Record<string, Record<string, unknown>>> {
  const response = await api.get<{
    success: boolean;
    data: Record<string, Record<string, unknown>>;
  }>('/v1/settings');
  return response.data.data;
}

/**
 * Upsert a single setting key under a category. Backend auto-detects the
 * storage type (STRING/NUMBER/BOOLEAN/JSON) from the value.
 * NOTE: sensitive values (e.g. API keys) are stored as-is (STRING) today;
 * ideally these should be encrypted server-side in a future iteration.
 */
export async function updateSetting(category: string, key: string, value: unknown): Promise<void> {
  await api.put(`/v1/settings/${category}/${key}`, { value });
}

// ── Gmail IMAP ─────────────────────────────────────────────────────────

/**
 * Get current Gmail IMAP config from backend (never returns password)
 */
export async function getGmailConfig(): Promise<GmailConfig> {
  const response = await api.get<{ success: boolean; data: GmailConfig }>('/v1/settings/gmail');
  return response.data.data;
}

/**
 * Save Gmail email + App Password
 */
export async function configureGmail(payload: {
  email: string;
  appPassword: string;
}): Promise<GmailConfig> {
  const response = await api.post<{ success: boolean; data: GmailConfig }>(
    '/v1/settings/gmail/configure',
    payload
  );
  return response.data.data;
}

/**
 * Test IMAP connection with current credentials
 */
export async function testGmail(): Promise<GmailTestResult> {
  const response = await api.post<GmailTestResult>('/v1/settings/gmail/test');
  return response.data;
}

/**
 * Trigger immediate email fetch + classifier pipeline
 */
export async function syncGmailNow(): Promise<GmailSyncResult> {
  const response = await api.post<GmailSyncResult>('/v1/settings/gmail/sync-now');
  return response.data;
}
