import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { User } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Badge } from './ui/Badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/Tabs';
import { Switch } from './ui/Switch';
import { useToast } from './ui/Toast';
import authService from '../services/auth';
import { getErrorMessage } from '../utils/formatters';

const UserProfile = ({ user }: { user: User }) => {
  const { addToast } = useToast();
  const { t } = useTranslation();

  // Mock states for form inputs
  const [profile, setProfile] = useState({
    firstName: user.name.split(' ')[0],
    lastName: user.name.split(' ').slice(1).join(' '),
    phone: '+373 69 123 456',
  });
  const [notifications, setNotifications] = useState({
    email: true,
    sms: false,
    newsletter: true,
  });

  // 2FA states
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verificationCode, setVerificationCode] = useState('');
  const [showQrCode, setShowQrCode] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');

  // Check 2FA status on mount by calling /auth/me
  useEffect(() => {
    authService
      .getCurrentUser()
      .then((currentUser) => {
        const userWithTwoFactor = currentUser as typeof currentUser & {
          twoFactorEnabled?: boolean;
        };
        if (typeof userWithTwoFactor.twoFactorEnabled === 'boolean') {
          setTwoFactorEnabled(userWithTwoFactor.twoFactorEnabled);
        }
      })
      .catch((err: Error) => {
        console.error('[UserProfile] Failed to fetch 2FA status:', err);
      });
  }, []);

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    addToast(t('profile.profileUpdated'), 'success');
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    addToast(t('profile.passwordChanged'), 'success');
  };

  const handleNotificationsSave = (e: React.FormEvent) => {
    e.preventDefault();
    addToast(t('profile.notificationsSaved'), 'success');
  };

  const handleEnable2FA = async () => {
    setTwoFactorLoading(true);
    try {
      const result = await authService.enable2FA();
      setQrCodeUrl(result.qrCodeUrl);
      setBackupCodes(result.backupCodes);
      setShowQrCode(true);
      addToast(t('profile.qrGenerated'), 'success');
    } catch (error: unknown) {
      addToast(getErrorMessage(error, t('errors.saveFailed')), 'error');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const handleVerify2FA = async () => {
    if (verificationCode.length !== 6) {
      addToast(t('profile.invalidCode'), 'error');
      return;
    }

    setTwoFactorLoading(true);
    try {
      await authService.verify2FA(verificationCode);
      setTwoFactorEnabled(true);
      setShowQrCode(false);
      setVerificationCode('');
      addToast(t('profile.twoFactorActivated'), 'success');
    } catch (error: unknown) {
      addToast(getErrorMessage(error, t('profile.invalidCode')), 'error');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!disablePassword) {
      addToast(t('profile.enterPasswordFor2FA'), 'error');
      return;
    }

    setTwoFactorLoading(true);
    try {
      await authService.disable2FA(disablePassword);
      setTwoFactorEnabled(false);
      setDisablePassword('');
      setQrCodeUrl(null);
      setBackupCodes([]);
      addToast(t('profile.twoFactorDeactivated'), 'success');
    } catch (error: unknown) {
      addToast(getErrorMessage(error, t('errors.saveFailed')), 'error');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-2xl font-semibold text-neutral-800 dark:text-neutral-100">
          {t('profile.title')}
        </h3>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          {t('profile.subtitle')}
        </p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card className="p-6 text-center">
            <div className="relative inline-block">
              <div className="h-24 w-24 rounded-full bg-primary-100 dark:bg-primary-800 flex items-center justify-center text-primary-600 dark:text-primary-300 text-4xl font-bold">
                {user.name.slice(0, 2).toUpperCase()}
              </div>
            </div>
            <h2 className="mt-4 text-2xl font-bold">{user.name}</h2>
            <p className="text-neutral-500 dark:text-neutral-400">{user.email}</p>
            <Badge variant="blue" className="mt-2">
              {user.role}
            </Badge>
            <Button
              variant="secondary"
              size="sm"
              className="w-full mt-6"
              onClick={() => addToast(t('profile.notImplemented'))}
            >
              {t('profile.editProfile')}
            </Button>
            <div className="text-left mt-6 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-500">{t('profile.accountStatus')}</span>
                <Badge variant="green">{t('status.active')}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">{t('profile.memberSince')}</span>
                <span className="font-medium">20 Ian, 2024</span>
              </div>
            </div>
          </Card>
        </div>
        <div className="lg:col-span-2">
          <Tabs defaultValue="settings">
            <TabsList>
              <TabsTrigger value="settings">{t('profile.tabSettings')}</TabsTrigger>
              <TabsTrigger value="security">{t('profile.tabSecurity')}</TabsTrigger>
              <TabsTrigger value="notifications">{t('profile.tabNotifications')}</TabsTrigger>
            </TabsList>
            <TabsContent value="settings">
              <Card>
                <form onSubmit={handleProfileSave} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">{t('profile.firstName')}</label>
                      <Input
                        value={profile.firstName}
                        onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">{t('profile.lastName')}</label>
                      <Input
                        value={profile.lastName}
                        onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">{t('profile.email')}</label>
                    <Input value={user.email} disabled />
                  </div>
                  <div>
                    <label className="text-sm font-medium">{t('profile.phoneNumber')}</label>
                    <Input
                      value={profile.phone}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    />
                  </div>
                  <div className="text-right">
                    <Button type="submit">{t('profile.saveChanges')}</Button>
                  </div>
                </form>
              </Card>
            </TabsContent>
            <TabsContent value="security">
              <Card>
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">{t('profile.currentPassword')}</label>
                    <Input type="password" placeholder="••••••••" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">{t('profile.newPassword')}</label>
                    <Input type="password" placeholder="••••••••" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">{t('profile.confirmNewPassword')}</label>
                    <Input type="password" placeholder="••••••••" />
                  </div>
                  <div className="text-right">
                    <Button type="submit">{t('profile.changePassword')}</Button>
                  </div>
                </form>
                <div className="border-t my-6"></div>
                <div className="space-y-4">
                  <h4 className="text-base font-semibold mb-2">{t('profile.twoFactor')}</h4>

                  {!twoFactorEnabled && !showQrCode && (
                    <div className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-700/50 rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{t('profile.enable2FA')}</p>
                        <p className="text-xs text-neutral-500">{t('profile.enable2FADesc')}</p>
                      </div>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleEnable2FA}
                        disabled={twoFactorLoading}
                        loading={twoFactorLoading}
                      >
                        {t('profile.activate')}
                      </Button>
                    </div>
                  )}

                  {showQrCode && !twoFactorEnabled && (
                    <Card className="p-6 space-y-4">
                      <div>
                        <h5 className="font-semibold mb-2">{t('profile.step1')}</h5>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
                          {t('profile.step1Desc')}
                        </p>
                        {qrCodeUrl && (
                          <div className="flex justify-center mb-4">
                            <img
                              src={qrCodeUrl}
                              alt="2FA QR Code"
                              className="w-48 h-48 border rounded-lg"
                            />
                          </div>
                        )}
                      </div>

                      <div>
                        <h5 className="font-semibold mb-2">{t('profile.step2')}</h5>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
                          {t('profile.step2Desc')}
                        </p>
                        <div className="flex gap-2">
                          <Input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]{6}"
                            maxLength={6}
                            placeholder="123456"
                            value={verificationCode}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                              setVerificationCode(value);
                            }}
                            className="text-center text-xl tracking-widest font-mono"
                          />
                          <Button
                            variant="primary"
                            onClick={handleVerify2FA}
                            disabled={verificationCode.length !== 6 || twoFactorLoading}
                            loading={twoFactorLoading}
                          >
                            {t('profile.verify')}
                          </Button>
                        </div>
                      </div>

                      {backupCodes.length > 0 && (
                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-2">
                            ⚠️ {t('profile.backupCodesTitle')}
                          </p>
                          <p className="text-xs text-amber-700 dark:text-amber-400 mb-3">
                            {t('profile.backupCodesDesc')}
                          </p>
                          <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                            {backupCodes.map((code, idx) => (
                              <div
                                key={idx}
                                className="bg-white dark:bg-neutral-800 p-2 rounded text-center"
                              >
                                {code}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShowQrCode(false);
                          setQrCodeUrl(null);
                          setBackupCodes([]);
                          setVerificationCode('');
                        }}
                      >
                        {t('actions.cancel')}
                      </Button>
                    </Card>
                  )}

                  {twoFactorEnabled && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                        <div>
                          <p className="font-medium text-sm text-green-800 dark:text-green-300">
                            {t('profile.twoFactorEnabled')}
                          </p>
                          <p className="text-xs text-green-600 dark:text-green-400">
                            {t('profile.twoFactorEnabledDesc')}
                          </p>
                        </div>
                        <Badge variant="green">Activ</Badge>
                      </div>

                      <Card className="p-4">
                        <h5 className="font-semibold mb-3">{t('profile.disable2FA')}</h5>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
                          {t('profile.disable2FADesc')}
                        </p>
                        <div className="flex gap-2">
                          <Input
                            type="password"
                            placeholder={t('profile.currentPasswordPlaceholder')}
                            value={disablePassword}
                            onChange={(e) => setDisablePassword(e.target.value)}
                            className="flex-1"
                          />
                          <Button
                            variant="danger"
                            onClick={handleDisable2FA}
                            disabled={!disablePassword || twoFactorLoading}
                            loading={twoFactorLoading}
                          >
                            {t('profile.deactivate')}
                          </Button>
                        </div>
                      </Card>
                    </div>
                  )}
                </div>
              </Card>
            </TabsContent>
            <TabsContent value="notifications">
              <Card>
                <form onSubmit={handleNotificationsSave} className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700/50">
                    <div>
                      <p className="font-medium text-sm">{t('profile.emailAlerts')}</p>
                      <p className="text-xs text-neutral-500">{t('profile.emailAlertsDesc')}</p>
                    </div>
                    <Switch
                      checked={notifications.email}
                      onCheckedChange={(c) => setNotifications({ ...notifications, email: c })}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700/50">
                    <div>
                      <p className="font-medium text-sm">{t('profile.smsNotifications')}</p>
                      <p className="text-xs text-neutral-500">
                        {t('profile.smsNotificationsDesc')}
                      </p>
                    </div>
                    <Switch
                      checked={notifications.sms}
                      onCheckedChange={(c) => setNotifications({ ...notifications, sms: c })}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700/50">
                    <div>
                      <p className="font-medium text-sm">{t('profile.weeklyNewsletter')}</p>
                      <p className="text-xs text-neutral-500">
                        {t('profile.weeklyNewsletterDesc')}
                      </p>
                    </div>
                    <Switch
                      checked={notifications.newsletter}
                      onCheckedChange={(c) => setNotifications({ ...notifications, newsletter: c })}
                    />
                  </div>
                  <div className="text-right pt-2">
                    <Button type="submit">{t('profile.savePreferences')}</Button>
                  </div>
                </form>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
