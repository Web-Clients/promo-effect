import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { SystemSettings } from '../types';
import AdminDashboard from './AdminDashboard';
import AIEmailParser from './AIEmailParser';
import UserManagement from './UserManagement';
import ReportsPage from './ReportsPage';
import { getStoredUser } from '../services/auth';
import { Card } from './ui/Card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/Tabs';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Switch } from './ui/Switch';
import { AlertCircleIcon, CheckIcon, XIcon, CopyIcon } from './icons';
import { useToast } from './ui/Toast';
import { getGmailConfig, configureGmail, testGmail, syncGmailNow } from '../services/settings';
import type { GmailConfig } from '../services/settings';

// Mock initial settings data based on the full SystemSettings interface
const mockSettings: SystemSettings = {
  emailSettings: {
    provider: 'GMAIL',
    gmailClientId: '',
    gmailClientSecret: '',
    gmailRefreshToken: '',
    gmailUserEmail: '',
    enabled: true,
    lastSyncAt: new Date().toISOString(),
    syncInterval: 5,
  },
  trackingSettings: {
    provider: 'SEARATES',
    searatesApiKey: '',
    enabled: true,
    syncInterval: 60,
  },
  emailNotificationSettings: {
    provider: 'SMTP',
    smtpHost: 'smtp.gmail.com',
    smtpPort: 587,
    smtpUser: 'your-email@gmail.com',
    smtpPassword: '',
    senderEmail: 'notifications@promoefect.md',
    senderName: 'Promo-Efect Notifications',
    enabled: true,
  },
  smsSettings: {
    provider: 'DISABLED',
    enabled: false,
    note: 'SMS requires paid service. Use email notifications instead.',
  },
  whatsappSettings: {
    provider: 'DISABLED',
    enabled: false,
    note: 'WhatsApp requires paid service. Use email notifications instead.',
  },
  viberSettings: {
    botToken: 'viber-bot-token',
    botName: 'Promo-Efect',
    botAvatar: '',
    enabled: false,
  },
  aiSettings: {
    provider: 'ANTHROPIC_CLAUDE',
    anthropicApiKey: 'sk-ant-xxxxx',
    openaiApiKey: '',
    model: 'claude-sonnet-4-20250514',
    enabled: true,
    confidenceThreshold: 0.7,
  },
  translationSettings: {
    provider: 'NONE',
    googleTranslateApiKey: '',
    deeplApiKey: '',
    enabled: false,
  },
  ocrSettings: {
    provider: 'NONE',
    googleVisionApiKey: '',
    awsTextractAccessKey: '',
    awsTextractSecretKey: '',
    enabled: false,
  },
  oneC_Settings: {
    integrationType: 'FTP',
    ftpHost: 'ftp.yourcompany.md',
    ftpPort: 21,
    ftpUsername: 'promoefect',
    ftpPassword: 'ftp-password',
    apiEndpoint: '',
    apiKey: '',
    fileSharePath: '',
    exportFormat: 'XML',
    exportSchedule: 'DAILY',
    exportTime: '08:00',
    enabled: true,
  },
  storageSettings: {
    provider: 'LOCAL_FILESYSTEM',
    awsAccessKeyId: '',
    awsSecretAccessKey: '',
    awsRegion: '',
    awsS3Bucket: '',
    localStoragePath: '/uploads',
    azureConnectionString: '',
    azureContainerName: '',
    gcpProjectId: '',
    gcpBucketName: '',
    maxFileSizeMB: 10,
  },
  paymentSettings: {
    penaltyRateDaily: 0.005,
    gracePeriodDays: 15,
    reminderSchedule: {
      firstReminder: 3,
      secondReminder: 7,
      thirdReminder: 14,
      escalationToManager: 21,
      finalNotice: 30,
    },
    currency: 'USD',
  },
  systemSettings: {
    companyName: 'Promo-Efect SRL',
    companyEmail: 'contact@promoefect.md',
    companyPhone: '+373 69 123 456',
    companyAddress: 'str. Mihai Eminescu, 50, Chișinău, Moldova',
    companyLogo: '/logo.svg',
    timezone: 'Europe/Chisinau',
    dateFormat: 'DD/MM/YYYY',
    language: 'ro',
    maintenanceMode: false,
  },
};

const Select = ({ ...props }) => (
  <select
    {...props}
    className="w-full mt-1 p-2 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
  />
);

// ── Gmail status badge ────────────────────────────────────────────────

function GmailStatusBadge({ config }: { config: GmailConfig | null }) {
  if (!config) return null;

  if (!config.email && !config.hasPassword) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-400">
        Neconfigurat
      </span>
    );
  }
  if (!config.hasPassword) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
        Parola lipsă
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
      Configurat
    </span>
  );
}

function formatRelative(dateStr: string | null | undefined): string {
  if (!dateStr) return 'niciodată';
  const d = new Date(dateStr);
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'acum câteva secunde';
  if (diffMin < 60) return `acum ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `acum ${diffH} ore`;
  const diffD = Math.floor(diffH / 24);
  return `acum ${diffD} zile`;
}

// ── Main component ────────────────────────────────────────────────────

const VALID_TABS = [
  'email',
  'tracking',
  'notifications',
  'integrations',
  'system',
  'admin',
  'emailParser',
  'users',
  'reports',
] as const;
type TabValue = (typeof VALID_TABS)[number];

const AdminSettingsPage = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = ((): TabValue => {
    const p = searchParams.get('tab');
    return (VALID_TABS as readonly string[]).includes(p ?? '') ? (p as TabValue) : 'email';
  })();
  const [tab, setTab] = useState<TabValue>(initialTab);

  // Keep state in sync if URL changes externally (e.g. nav click)
  useEffect(() => {
    const p = searchParams.get('tab');
    if (p && (VALID_TABS as readonly string[]).includes(p) && p !== tab) {
      setTab(p as TabValue);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);
  const currentUser = getStoredUser();
  const [settings, setSettings] = useState<SystemSettings>(mockSettings);
  const [testResults, setTestResults] = useState<Record<string, 'success' | 'error' | 'pending'>>(
    {}
  );
  const { addToast } = useToast();

  // Gmail IMAP state
  const [gmailConfig, setGmailConfig] = useState<GmailConfig | null>(null);
  const [gmailEmail, setGmailEmail] = useState('');
  const [gmailPassword, setGmailPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [gmailSaving, setGmailSaving] = useState(false);
  const [gmailTesting, setGmailTesting] = useState(false);
  const [gmailSyncing, setGmailSyncing] = useState(false);
  const [gmailConnectionStatus, setGmailConnectionStatus] = useState<
    'connected' | 'disconnected' | null
  >(null);

  // Load Gmail config on mount
  useEffect(() => {
    getGmailConfig()
      .then((cfg) => {
        setGmailConfig(cfg);
        if (cfg.email) setGmailEmail(cfg.email);
      })
      .catch(() => {
        // Non-critical — ignore
      });
  }, []);

  const updateSettings = (path: string, value: unknown) => {
    setSettings((prev) => {
      const keys = path.split('.');
      const newState = JSON.parse(JSON.stringify(prev)) as Record<string, unknown>;
      let current: Record<string, unknown> = newState;
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]] as Record<string, unknown>;
      }
      current[keys[keys.length - 1]] = value;
      return newState as typeof prev;
    });
  };

  const testConnection = async (service: string) => {
    setTestResults((prev) => ({ ...prev, [service]: 'pending' }));
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const success = Math.random() > 0.3;
    if (success) {
      setTestResults((prev) => ({ ...prev, [service]: 'success' }));
      addToast(t('adminSettings.connectionSuccess', { service }), 'success');
    } else {
      setTestResults((prev) => ({ ...prev, [service]: 'error' }));
      addToast(t('adminSettings.connectionFailed', { service }), 'error');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    addToast(t('adminSettings.copiedToClipboard'), 'success');
  };

  const saveSettings = () => {
    addToast(t('adminSettings.saved'), 'success');
  };

  // ── Gmail handlers ────────────────────────────────────────────────

  const handleGmailSave = async () => {
    if (!gmailEmail || !gmailPassword) {
      addToast(t('adminSettings.gmailFillRequired'), 'error');
      return;
    }
    setGmailSaving(true);
    try {
      const updated = await configureGmail({ email: gmailEmail, appPassword: gmailPassword });
      setGmailConfig(updated);
      setGmailPassword('');
      addToast(t('adminSettings.gmailSaved'), 'success');
    } catch (err: any) {
      addToast(err?.message || t('adminSettings.gmailSaveError'), 'error');
    } finally {
      setGmailSaving(false);
    }
  };

  const handleGmailTest = async () => {
    setGmailTesting(true);
    setGmailConnectionStatus(null);
    try {
      const result = await testGmail();
      setGmailConnectionStatus(result.success ? 'connected' : 'disconnected');
      addToast(
        result.success ? `Conectat: ${result.message}` : `Conexiune eșuată: ${result.message}`,
        result.success ? 'success' : 'error'
      );
    } catch (err: any) {
      setGmailConnectionStatus('disconnected');
      addToast(err?.message || 'Testare conexiune eșuată.', 'error');
    } finally {
      setGmailTesting(false);
    }
  };

  const handleGmailSync = async () => {
    setGmailSyncing(true);
    addToast(t('settings.gmail.syncStarted'), 'info');
    try {
      const result = await syncGmailNow();
      // Refresh config to get updated lastFetchAt
      const updated = await getGmailConfig();
      setGmailConfig(updated);

      if (result.success) {
        addToast(
          `Sincronizare completă: ${result.fetched} email-uri preluate, ${result.processed} procesate.`,
          'success'
        );
      } else {
        addToast(`Sincronizare parțial eșuată: ${result.errors.slice(0, 2).join('; ')}`, 'error');
      }
    } catch (err: any) {
      addToast(err?.message || 'Eroare la sincronizare.', 'error');
    } finally {
      setGmailSyncing(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-800 dark:text-neutral-100">
          Setări Sistem
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          Gestionați toate integrările și configurările sistemului.
        </p>
      </div>

      <Tabs
        value={tab}
        onValueChange={(v) => {
          const next = v as TabValue;
          setTab(next);
          const params = new URLSearchParams(searchParams);
          params.set('tab', next);
          setSearchParams(params, { replace: true });
        }}
      >
        <TabsList>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="tracking">Urmărire</TabsTrigger>
          <TabsTrigger value="notifications">Notificări</TabsTrigger>
          <TabsTrigger value="integrations">Integrări</TabsTrigger>
          <TabsTrigger value="system">Sistem</TabsTrigger>
          <TabsTrigger value="admin">{t('adminSettingsTabs.stats')}</TabsTrigger>
          <TabsTrigger value="users">{t('adminSettingsTabs.users')}</TabsTrigger>
          <TabsTrigger value="reports">{t('adminSettingsTabs.reports')}</TabsTrigger>
          <TabsTrigger value="emailParser">{t('nav.aiParser')}</TabsTrigger>
        </TabsList>

        {/* ── Email / Gmail IMAP tab ─────────────────────────────── */}
        <TabsContent value="email">
          <Card>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold">Integrare Gmail IMAP</h2>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
                  Conectați-vă contul Gmail folosind App Password (IMAP).
                </p>
              </div>
              <GmailStatusBadge config={gmailConfig} />
            </div>

            <div className="space-y-5">
              {/* Email field */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Adresă Gmail
                </label>
                <Input
                  type="email"
                  placeholder="efect.logistic@gmail.com"
                  value={gmailEmail}
                  onChange={(e) => setGmailEmail(e.target.value)}
                />
              </div>

              {/* App Password field with show/hide */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  App Password
                  {gmailConfig?.hasPassword && (
                    <span className="ml-2 text-xs text-green-600 dark:text-green-400">
                      (parolă salvată — lăsați gol pentru a păstra)
                    </span>
                  )}
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="xxxx xxxx xxxx xxxx"
                    value={gmailPassword}
                    onChange={(e) => setGmailPassword(e.target.value)}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-2 flex items-center text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      // Eye-off icon
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      // Eye icon
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>

                {/* Hint */}
                <p className="mt-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                  Generează parola la{' '}
                  <a
                    href="https://myaccount.google.com/apppasswords"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-600 dark:text-primary-400 underline hover:no-underline"
                  >
                    myaccount.google.com/apppasswords
                  </a>{' '}
                  (necesită 2FA activat pe contul Google). Format: 16 caractere, cu sau fără spații.
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2 pt-1">
                <Button onClick={handleGmailSave} disabled={gmailSaving} loading={gmailSaving}>
                  Salvează
                </Button>
                <Button
                  variant="outline"
                  onClick={handleGmailTest}
                  disabled={gmailTesting}
                  loading={gmailTesting}
                >
                  {gmailConnectionStatus === 'connected' && (
                    <CheckIcon className="mr-1.5 h-4 w-4 text-green-600" />
                  )}
                  {gmailConnectionStatus === 'disconnected' && (
                    <XIcon className="mr-1.5 h-4 w-4 text-red-500" />
                  )}
                  Testează Conexiunea
                </Button>
                <Button
                  variant="outline"
                  onClick={handleGmailSync}
                  disabled={gmailSyncing || !gmailConfig?.hasPassword}
                  loading={gmailSyncing}
                >
                  Sincronizează Acum
                </Button>
              </div>

              {/* Status section */}
              {gmailConfig && (
                <div className="mt-4 p-4 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-neutral-500 dark:text-neutral-400">Status:</span>
                    {gmailConnectionStatus === 'connected' ? (
                      <span className="text-green-600 dark:text-green-400 font-medium">
                        Conectat
                      </span>
                    ) : gmailConnectionStatus === 'disconnected' ? (
                      <span className="text-red-500 dark:text-red-400 font-medium">Deconectat</span>
                    ) : gmailConfig.hasPassword && gmailConfig.email ? (
                      <span className="text-neutral-600 dark:text-neutral-300 font-medium">
                        Configurat (netestformat)
                      </span>
                    ) : (
                      <span className="text-neutral-400 dark:text-neutral-500 font-medium">
                        Neconfigurat
                      </span>
                    )}
                  </div>

                  {gmailConfig.email && (
                    <div className="flex items-center gap-2">
                      <span className="text-neutral-500 dark:text-neutral-400">Email:</span>
                      <span className="font-mono text-neutral-700 dark:text-neutral-300">
                        {gmailConfig.email}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <span className="text-neutral-500 dark:text-neutral-400">
                      Ultima sincronizare:
                    </span>
                    <span className="text-neutral-700 dark:text-neutral-300">
                      {formatRelative(gmailConfig.lastFetchAt)}
                    </span>
                  </div>

                  {gmailConfig.lastFetchResult &&
                    (() => {
                      try {
                        const r = JSON.parse(gmailConfig.lastFetchResult);
                        return (
                          <div className="flex items-center gap-2">
                            <span className="text-neutral-500 dark:text-neutral-400">
                              Ultimul rezultat:
                            </span>
                            <span className="text-neutral-700 dark:text-neutral-300">
                              {r.emailsFetched} email-uri preluate, {r.emailsProcessed} procesate
                              {r.bookingsCreated !== undefined
                                ? `, ${r.bookingsCreated} rezervări create`
                                : ''}
                            </span>
                          </div>
                        );
                      } catch {
                        return (
                          <div className="flex items-center gap-2">
                            <span className="text-neutral-500 dark:text-neutral-400">
                              Ultimul rezultat:
                            </span>
                            <span className="text-neutral-700 dark:text-neutral-300 truncate max-w-xs">
                              {gmailConfig.lastFetchResult}
                            </span>
                          </div>
                        );
                      }
                    })()}
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="tracking">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Urmărire Containere</h2>
              <Switch
                checked={settings.trackingSettings.enabled}
                onCheckedChange={(checked) => updateSettings('trackingSettings.enabled', checked)}
              />
            </div>

            <div className="space-y-4">
              <label className="text-sm font-medium">Furnizor Urmărire</label>
              <Select
                value={settings.trackingSettings.provider}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  updateSettings('trackingSettings.provider', e.target.value)
                }
              >
                <option value="SEARATES">SeaRates (Recomandat)</option>
              </Select>

              <label className="text-sm font-medium">Cheie API SeaRates</label>
              <Input
                type="password"
                value={settings.trackingSettings.searatesApiKey}
                onChange={(e) => updateSettings('trackingSettings.searatesApiKey', e.target.value)}
              />

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h4 className="font-medium mb-2 text-sm text-blue-800 dark:text-blue-300">
                  URL Webhook (Configurați în SeaRates):
                </h4>
                <div className="flex items-center gap-2">
                  <code className="bg-white dark:bg-neutral-800 px-2 py-1 rounded text-sm text-neutral-700 dark:text-neutral-200 line-clamp-1">{`${window.location.origin}/api/v1/tracking/webhook`}</code>
                  <Button
                    onClick={() =>
                      copyToClipboard(`${window.location.origin}/api/v1/tracking/webhook`)
                    }
                    variant="ghost"
                    size="icon"
                  >
                    <CopyIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => testConnection('tracking')}
                  disabled={testResults.tracking === 'pending'}
                  loading={testResults.tracking === 'pending'}
                >
                  Testează Conexiunea
                </Button>
                <Button onClick={saveSettings}>Salvează Setările</Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <div className="space-y-4">
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Notificări Email</h3>
                <Switch
                  checked={settings.emailNotificationSettings.enabled}
                  onCheckedChange={(checked) =>
                    updateSettings('emailNotificationSettings.enabled', checked)
                  }
                />
              </div>
              <div className="space-y-4">
                <label className="text-sm font-medium">Furnizor</label>
                <Select
                  value={settings.emailNotificationSettings.provider}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    updateSettings('emailNotificationSettings.provider', e.target.value)
                  }
                >
                  <option value="SMTP">SMTP (Gmail/Outlook/Custom)</option>
                  <option value="GMAIL">Gmail</option>
                  <option value="OUTLOOK">Outlook</option>
                  <option value="CUSTOM_SMTP">Custom SMTP</option>
                </Select>
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Notificări SMS</h3>
                <Switch
                  checked={settings.smsSettings.enabled}
                  onCheckedChange={(checked) => updateSettings('smsSettings.enabled', checked)}
                />
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="integrations">
          <div className="space-y-4">
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Analiză AI Email</h3>
                <Switch
                  checked={settings.aiSettings.enabled}
                  onCheckedChange={(checked) => updateSettings('aiSettings.enabled', checked)}
                />
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Integrare Contabilitate 1C</h3>
                <Switch
                  checked={settings.oneC_Settings.enabled}
                  onCheckedChange={(checked) => updateSettings('oneC_Settings.enabled', checked)}
                />
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded p-3 text-sm text-yellow-800 dark:text-yellow-300">
                <AlertCircleIcon className="inline mr-2 h-5 w-5" />
                <strong>Important:</strong> Această integrare necesită coordonare cu administratorul
                sistemului 1C.
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="system">
          <Card>
            <h2 className="text-xl font-semibold mb-4">Configurare Sistem</h2>
            <div className="space-y-4">
              <label className="text-sm font-medium">Nume Companie</label>
              <Input
                type="text"
                value={settings.systemSettings.companyName}
                onChange={(e) => updateSettings('systemSettings.companyName', e.target.value)}
              />

              <div className="flex items-center gap-2 p-4 border border-neutral-200 dark:border-neutral-700 rounded-lg">
                <Switch
                  id="maintenance-mode"
                  checked={settings.systemSettings.maintenanceMode}
                  onCheckedChange={(checked) =>
                    updateSettings('systemSettings.maintenanceMode', checked)
                  }
                />
                <div>
                  <label htmlFor="maintenance-mode" className="font-medium text-sm">
                    Mod Mentenanță
                  </label>
                  <p className="text-xs text-neutral-500">
                    Când este activat, doar administratorii pot accesa sistemul.
                  </p>
                </div>
              </div>

              <Button onClick={saveSettings}>Salvează Setările</Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="admin">
          <AdminDashboard />
        </TabsContent>

        <TabsContent value="users">
          {currentUser ? (
            <UserManagement currentUser={{ id: currentUser.id, role: String(currentUser.role) }} />
          ) : (
            <Card>
              <p className="text-sm text-neutral-500">Sesiune indisponibilă.</p>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="reports">
          <ReportsPage />
        </TabsContent>

        <TabsContent value="emailParser">
          <AIEmailParser />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminSettingsPage;
