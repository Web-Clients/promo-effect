import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { User } from '../types';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import authService from '../services/auth';
import { getErrorMessage } from '../utils/formatters';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login = ({ onLogin }: LoginProps) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // 2FA state
  const [requires2FA, setRequires2FA] = useState(false);
  const [tempToken, setTempToken] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // If we're in 2FA step, complete login with 2FA code
      if (requires2FA && tempToken) {
        if (!twoFactorCode || twoFactorCode.length !== 6) {
          setError(t('auth.invalid2FACode'));
          setIsLoading(false);
          return;
        }

        const user = await authService.complete2FALogin(tempToken, twoFactorCode);
        onLogin(user);
        return;
      }

      // Initial login attempt
      const result = await authService.login({ email, password });

      // Check if 2FA is required
      if ('requires2FA' in result && result.requires2FA) {
        setRequires2FA(true);
        setTempToken(result.tempToken);
        setError('');
      } else if ('id' in result) {
        // Normal login success
        onLogin(result);
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err, t('auth.invalidCredentials')));
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToPassword = () => {
    setRequires2FA(false);
    setTempToken(null);
    setTwoFactorCode('');
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-800 via-primary-700 to-primary-900 flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:flex-1 flex-col justify-between p-12 text-white">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-accent-500 flex items-center justify-center">
              <svg
                className="h-7 w-7 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.125-.504 1.125-1.125V14.25m-17.25 4.5v-1.875a3.375 3.375 0 003.375-3.375h1.5a1.125 1.125 0 011.125 1.125v-1.5c0-.621.504-1.125 1.125-1.125H12m6 6v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H9.75"
                />
              </svg>
            </div>
            <div>
              <h1 className="font-heading font-bold text-2xl">Promo-Efect</h1>
              <p className="text-white/60 text-sm">{t('landing.simplifyLogistics')}</p>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <h2 className="text-4xl font-heading font-bold leading-tight">
            Simplificăm logistica
            <br />
            <span className="text-accent-400">China → Moldova</span>
          </h2>
          <p className="text-white/70 text-lg max-w-md">
            Platforma completă pentru gestionarea transportului maritim de containere. Prețuri
            transparente, urmărire în timp real.
          </p>
          <div className="flex gap-8">
            <div>
              <p className="text-3xl font-bold text-accent-400">500+</p>
              <p className="text-white/60 text-sm">Containere/An</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-accent-400">6</p>
              <p className="text-white/60 text-sm">Linii Maritime</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-accent-400">98%</p>
              <p className="text-white/60 text-sm">Livrări la Timp</p>
            </div>
          </div>
        </div>

        <p className="text-white/40 text-sm">© 2025 Promo-Efect. Toate drepturile rezervate.</p>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white dark:bg-neutral-900">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent-500 flex items-center justify-center">
                <svg
                  className="h-6 w-6 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.125-.504 1.125-1.125V14.25m-17.25 4.5v-1.875a3.375 3.375 0 003.375-3.375h1.5a1.125 1.125 0 011.125 1.125v-1.5c0-.621.504-1.125 1.125-1.125H12m6 6v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H9.75"
                  />
                </svg>
              </div>
              <span className="font-heading font-bold text-xl text-primary-800 dark:text-white">
                Promo-Efect
              </span>
            </div>
          </div>

          {/* Form Header */}
          <div>
            <h2 className="text-2xl font-bold text-primary-800 dark:text-white font-heading">
              {requires2FA ? t('auth.twoFactorVerification') : t('auth.welcomeBack')}
            </h2>
            <p className="text-neutral-500 dark:text-neutral-400 mt-2">
              {requires2FA ? t('auth.enterAuthCode') : t('auth.signInToPlatform')}
            </p>
          </div>

          {/* Login Form */}
          <form className="space-y-5" onSubmit={handleLogin}>
            {!requires2FA ? (
              <>
                <div className="space-y-1.5">
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-primary-800 dark:text-neutral-200"
                  >
                    {t('auth.email')}
                  </label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    aria-required="true"
                    aria-invalid={!!error}
                    aria-describedby={error ? 'login-error' : undefined}
                    placeholder="nume@companie.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label
                      htmlFor="password"
                      className="block text-sm font-medium text-primary-800 dark:text-neutral-200"
                    >
                      {t('auth.password')}
                    </label>
                    <Link
                      to="/forgot-password"
                      className="text-xs text-accent-600 dark:text-accent-400 hover:underline"
                    >
                      {t('auth.forgotPassword')}
                    </Link>
                  </div>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    aria-required="true"
                    aria-invalid={!!error}
                    aria-describedby={error ? 'login-error' : undefined}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    <strong>Email:</strong> {email}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="twoFactorCode"
                    className="block text-sm font-medium text-primary-800 dark:text-neutral-200"
                  >
                    {t('auth.twoFactorCode')}
                  </label>
                  <Input
                    id="twoFactorCode"
                    name="twoFactorCode"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    required
                    aria-required="true"
                    aria-invalid={!!error}
                    aria-describedby={error ? 'login-error' : undefined}
                    placeholder="123456"
                    value={twoFactorCode}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setTwoFactorCode(value);
                    }}
                    disabled={isLoading}
                    autoFocus
                    className="text-center text-2xl tracking-widest font-mono"
                  />
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                    {t('auth.openAuthApp')}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleBackToPassword}
                  className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
                >
                  {t('auth.backToPassword')}
                </button>
              </>
            )}

            {error && (
              <div
                id="login-error"
                role="alert"
                className="p-3 bg-error-50 dark:bg-error-500/20 border border-error-200 dark:border-error-500/30 rounded-lg"
              >
                <p className="text-sm text-error-700 dark:text-error-400">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              variant="accent"
              size="lg"
              className="w-full"
              disabled={isLoading}
              loading={isLoading}
            >
              {isLoading
                ? requires2FA
                  ? t('auth.verifying')
                  : t('auth.authenticating')
                : requires2FA
                  ? t('auth.verifyCode')
                  : t('auth.login')}
            </Button>
          </form>

          {!requires2FA && (
            <>
              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-neutral-200 dark:border-neutral-700"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white dark:bg-neutral-900 text-neutral-500">
                    {t('auth.noAccountLink')}
                  </span>
                </div>
              </div>

              {/* Register Link */}
              <div className="text-center">
                <Link
                  to="/register"
                  className="text-sm text-primary-600 dark:text-primary-400 hover:underline font-medium"
                >
                  {t('auth.createNewAccount')}
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
