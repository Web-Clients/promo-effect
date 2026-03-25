import React, { useState } from 'react';
import { SystemSettings } from '../types';
import { Card } from './ui/Card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/Tabs';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Switch } from './ui/Switch';
import { AlertCircleIcon, CheckIcon, XIcon, CopyIcon } from './icons';
import { useToast } from './ui/Toast';

// Mock initial settings data based on the full SystemSettings interface
const mockSettings: SystemSettings = {
  emailSettings: {
    provider: 'GMAIL',
    gmailClientId: 'xxxxx.apps.googleusercontent.com',
    gmailClientSecret: 'secret-key-123',
    gmailRefreshToken: '',
    gmailUserEmail: 'contact@promoefect.md',
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

const AdminSettingsPage = () => {
  const [settings, setSettings] = useState<SystemSettings>(mockSettings);
  const [testResults, setTestResults] = useState<Record<string, 'success' | 'error' | 'pending'>>(
    {}
  );
  const { addToast } = useToast();

  const updateSettings = (path: string, value: any) => {
    setSettings((prev) => {
      const keys = path.split('.');
      const newState = JSON.parse(JSON.stringify(prev)); // Deep copy
      let current = newState;
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      return newState;
    });
  };

  const testConnection = async (service: string) => {
    setTestResults((prev) => ({ ...prev, [service]: 'pending' }));
    await new Promise((resolve) => setTimeout(resolve, 1500)); // Simulate API call
    const success = Math.random() > 0.3; // Simulate success/failure
    if (success) {
      setTestResults((prev) => ({ ...prev, [service]: 'success' }));
      addToast(`Conexiunea ${service} a fost testată cu succes!`, 'success');
    } else {
      setTestResults((prev) => ({ ...prev, [service]: 'error' }));
      addToast(`Conexiunea ${service} a eșuat.`, 'error');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    addToast('Copiat în clipboard!', 'success');
  };

  const saveSettings = () => {
    addToast('Setările au fost salvate!', 'success');
    console.log('Saving settings:', settings);
  };

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

      <Tabs defaultValue="email">
        <TabsList>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="tracking">Urmărire</TabsTrigger>
          <TabsTrigger value="notifications">Notificări</TabsTrigger>
          <TabsTrigger value="integrations">Integrări</TabsTrigger>
          <TabsTrigger value="system">Sistem</TabsTrigger>
        </TabsList>

        <TabsContent value="email">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Integrare Email</h2>
              <Switch
                checked={settings.emailSettings.enabled}
                onCheckedChange={(checked) => updateSettings('emailSettings.enabled', checked)}
              />
            </div>

            <div className="space-y-4">
              <label className="text-sm font-medium">Furnizor</label>
              <Select
                value={settings.emailSettings.provider}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  updateSettings('emailSettings.provider', e.target.value)
                }
              >
                <option value="GMAIL">Gmail API</option>
                <option value="OUTLOOK">Outlook API</option>
                <option value="CUSTOM_SMTP">Custom SMTP</option>
              </Select>

              <label className="text-sm font-medium">Email Utilizator Gmail</label>
              <Input
                type="email"
                value={settings.emailSettings.gmailUserEmail}
                onChange={(e) => updateSettings('emailSettings.gmailUserEmail', e.target.value)}
              />

              <label className="text-sm font-medium">Interval Sincronizare (minute)</label>
              <Input
                type="number"
                min="1"
                value={settings.emailSettings.syncInterval}
                onChange={(e) =>
                  updateSettings('emailSettings.syncInterval', parseInt(e.target.value))
                }
              />

              <div className="flex gap-2">
                <Button
                  onClick={() => testConnection('email')}
                  disabled={testResults.email === 'pending'}
                  loading={testResults.email === 'pending'}
                >
                  {testResults.email === 'success' && <CheckIcon className="mr-2" />}
                  {testResults.email === 'error' && <XIcon className="mr-2" />}
                  Testează Conexiunea
                </Button>
                <Button onClick={saveSettings}>Salvează Setările</Button>
              </div>
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
      </Tabs>
    </div>
  );
};

export default AdminSettingsPage;
