import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Badge } from './ui/Badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/Tabs';
import { Switch } from './ui/Switch';
import { useToast } from './ui/Toast';
import authService from '../services/auth';

const UserProfile = ({ user }: { user: User }) => {
  const { addToast } = useToast();

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
      .then((currentUser: any) => {
        if (typeof currentUser.twoFactorEnabled === 'boolean') {
          setTwoFactorEnabled(currentUser.twoFactorEnabled);
        }
      })
      .catch((err: Error) => {
        console.error('[UserProfile] Failed to fetch 2FA status:', err);
      });
  }, []);

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    addToast('Profilul a fost actualizat cu succes!', 'success');
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    addToast('Parola a fost schimbată cu succes!', 'success');
  };

  const handleNotificationsSave = (e: React.FormEvent) => {
    e.preventDefault();
    addToast('Preferințele de notificare au fost salvate!', 'success');
  };

  const handleEnable2FA = async () => {
    setTwoFactorLoading(true);
    try {
      const result = await authService.enable2FA();
      setQrCodeUrl(result.qrCodeUrl);
      setBackupCodes(result.backupCodes);
      setShowQrCode(true);
      addToast('QR cod generat! Scanează-l cu aplicația de autentificare.', 'success');
    } catch (error: any) {
      addToast(error.message || 'Eroare la activarea 2FA', 'error');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const handleVerify2FA = async () => {
    if (verificationCode.length !== 6) {
      addToast('Introdu un cod valid de 6 cifre', 'error');
      return;
    }

    setTwoFactorLoading(true);
    try {
      await authService.verify2FA(verificationCode);
      setTwoFactorEnabled(true);
      setShowQrCode(false);
      setVerificationCode('');
      addToast('2FA activat cu succes!', 'success');
    } catch (error: any) {
      addToast(error.message || 'Cod invalid. Încearcă din nou.', 'error');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!disablePassword) {
      addToast('Introdu parola pentru a dezactiva 2FA', 'error');
      return;
    }

    setTwoFactorLoading(true);
    try {
      await authService.disable2FA(disablePassword);
      setTwoFactorEnabled(false);
      setDisablePassword('');
      setQrCodeUrl(null);
      setBackupCodes([]);
      addToast('2FA dezactivat cu succes', 'success');
    } catch (error: any) {
      addToast(error.message || 'Eroare la dezactivarea 2FA', 'error');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-2xl font-semibold text-neutral-800 dark:text-neutral-100">
          Profilul Meu
        </h3>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          Gestionează informațiile contului tău.
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
              onClick={() => addToast('Funcționalitate neimplementată.')}
            >
              Editează Profilul
            </Button>
            <div className="text-left mt-6 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-500">Status Cont:</span>
                <Badge variant="green">Activ</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Membru din:</span>
                <span className="font-medium">20 Ian, 2024</span>
              </div>
            </div>
          </Card>
        </div>
        <div className="lg:col-span-2">
          <Tabs defaultValue="settings">
            <TabsList>
              <TabsTrigger value="settings">Setări Profil</TabsTrigger>
              <TabsTrigger value="security">Securitate</TabsTrigger>
              <TabsTrigger value="notifications">Notificări</TabsTrigger>
            </TabsList>
            <TabsContent value="settings">
              <Card>
                <form onSubmit={handleProfileSave} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Nume</label>
                      <Input
                        value={profile.firstName}
                        onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Prenume</label>
                      <Input
                        value={profile.lastName}
                        onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Email</label>
                    <Input value={user.email} disabled />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Număr de Telefon</label>
                    <Input
                      value={profile.phone}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    />
                  </div>
                  <div className="text-right">
                    <Button type="submit">Salvează Modificările</Button>
                  </div>
                </form>
              </Card>
            </TabsContent>
            <TabsContent value="security">
              <Card>
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Parola Curentă</label>
                    <Input type="password" placeholder="••••••••" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Parola Nouă</label>
                    <Input type="password" placeholder="••••••••" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Confirmă Parola Nouă</label>
                    <Input type="password" placeholder="••••••••" />
                  </div>
                  <div className="text-right">
                    <Button type="submit">Schimbă Parola</Button>
                  </div>
                </form>
                <div className="border-t my-6"></div>
                <div className="space-y-4">
                  <h4 className="text-base font-semibold mb-2">Autentificare cu 2 Factori (2FA)</h4>

                  {!twoFactorEnabled && !showQrCode && (
                    <div className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-700/50 rounded-lg">
                      <div>
                        <p className="font-medium text-sm">Activează 2FA</p>
                        <p className="text-xs text-neutral-500">
                          Adaugă un strat suplimentar de securitate contului tău.
                        </p>
                      </div>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleEnable2FA}
                        disabled={twoFactorLoading}
                        loading={twoFactorLoading}
                      >
                        Activează
                      </Button>
                    </div>
                  )}

                  {showQrCode && !twoFactorEnabled && (
                    <Card className="p-6 space-y-4">
                      <div>
                        <h5 className="font-semibold mb-2">Pasul 1: Scanează QR codul</h5>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
                          Deschide aplicația de autentificare (Google Authenticator, Microsoft
                          Authenticator, etc.) și scanează acest QR cod:
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
                        <h5 className="font-semibold mb-2">Pasul 2: Verifică codul</h5>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
                          Introdu codul de 6 cifre din aplicația de autentificare pentru a activa
                          2FA:
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
                            Verifică
                          </Button>
                        </div>
                      </div>

                      {backupCodes.length > 0 && (
                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-2">
                            ⚠️ Salvează aceste coduri de backup într-un loc sigur!
                          </p>
                          <p className="text-xs text-amber-700 dark:text-amber-400 mb-3">
                            Poți folosi aceste coduri pentru a te autentifica dacă pierzi accesul la
                            aplicația de autentificare.
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
                        Anulează
                      </Button>
                    </Card>
                  )}

                  {twoFactorEnabled && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                        <div>
                          <p className="font-medium text-sm text-green-800 dark:text-green-300">
                            2FA este activat
                          </p>
                          <p className="text-xs text-green-600 dark:text-green-400">
                            Contul tău este protejat cu autentificare cu doi factori.
                          </p>
                        </div>
                        <Badge variant="green">Activ</Badge>
                      </div>

                      <Card className="p-4">
                        <h5 className="font-semibold mb-3">Dezactivează 2FA</h5>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
                          Pentru a dezactiva 2FA, introdu parola ta actuală:
                        </p>
                        <div className="flex gap-2">
                          <Input
                            type="password"
                            placeholder="Parola ta actuală"
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
                            Dezactivează
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
                      <p className="font-medium text-sm">Alerte pe Email</p>
                      <p className="text-xs text-neutral-500">
                        Primește notificări importante direct pe email.
                      </p>
                    </div>
                    <Switch
                      checked={notifications.email}
                      onCheckedChange={(c) => setNotifications({ ...notifications, email: c })}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700/50">
                    <div>
                      <p className="font-medium text-sm">Notificări SMS</p>
                      <p className="text-xs text-neutral-500">Primește alerte urgente prin SMS.</p>
                    </div>
                    <Switch
                      checked={notifications.sms}
                      onCheckedChange={(c) => setNotifications({ ...notifications, sms: c })}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700/50">
                    <div>
                      <p className="font-medium text-sm">Newsletter Săptămânal</p>
                      <p className="text-xs text-neutral-500">
                        Primește un sumar al activității și noutăți.
                      </p>
                    </div>
                    <Switch
                      checked={notifications.newsletter}
                      onCheckedChange={(c) => setNotifications({ ...notifications, newsletter: c })}
                    />
                  </div>
                  <div className="text-right pt-2">
                    <Button type="submit">Salvează Preferințele</Button>
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
