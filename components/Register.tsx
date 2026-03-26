import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import authService from '../services/auth';

const Register = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    phone: '',
    company: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Password strength indicators
  const [passwordChecks, setPasswordChecks] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false,
  });

  useEffect(() => {
    setPasswordChecks({
      length: formData.password.length >= 8,
      uppercase: /[A-Z]/.test(formData.password),
      lowercase: /[a-z]/.test(formData.password),
      number: /[0-9]/.test(formData.password),
      special: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(formData.password),
    });
  }, [formData.password]);

  const isPasswordValid = Object.values(passwordChecks).every(Boolean);
  const passwordsMatch =
    formData.password === formData.confirmPassword && formData.password.length > 0;
  const isFormValid = formData.email && formData.name && isPasswordValid && passwordsMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isPasswordValid) {
      setError(t('auth.passwordRequirements'));
      return;
    }

    if (!passwordsMatch) {
      setError(t('auth.passwordsNotMatch'));
      return;
    }

    setIsLoading(true);

    try {
      await authService.register({
        email: formData.email,
        password: formData.password,
        name: formData.name,
        phone: formData.phone || undefined,
        company: formData.company || undefined,
      });
      setIsSuccess(true);
    } catch (err: any) {
      setError(err.message || t('errors.saveFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-800 via-primary-700 to-primary-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl shadow-xl p-8 text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6">
            <svg
              className="w-8 h-8 text-green-600 dark:text-green-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
              />
            </svg>
          </div>

          <h2 className="text-2xl font-bold text-primary-800 dark:text-white mb-2">
            {t('auth.checkYourEmail')}
          </h2>
          <p className="text-neutral-600 dark:text-neutral-400 mb-6">
            {t('auth.verificationSent')}{' '}
            <span className="font-medium text-primary-700 dark:text-primary-400">
              {formData.email}
            </span>
            .
            <br />
            {t('auth.checkInboxConfirm')}
          </p>

          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6">
            <p className="text-sm text-amber-800 dark:text-amber-300">
              <strong>{t('auth.note')}:</strong> {t('auth.checkSpam')}
            </p>
          </div>

          <div className="space-y-3">
            <Link to="/login">
              <Button variant="primary" className="w-full">
                {t('auth.goToLogin')}
              </Button>
            </Link>
            <button
              onClick={() => {
                setIsSuccess(false);
                setFormData({
                  email: '',
                  password: '',
                  confirmPassword: '',
                  name: '',
                  phone: '',
                  company: '',
                });
              }}
              className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
            >
              {t('auth.registerAnotherAccount')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-800 via-primary-700 to-primary-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl shadow-xl p-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3">
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
            <span className="font-heading font-bold text-2xl text-primary-800 dark:text-white">
              Promo-Efect
            </span>
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-primary-800 dark:text-white mb-2">
            {t('auth.createAccount')}
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400">{t('auth.fillFormToStart')}</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div
              id="register-error"
              role="alert"
              className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4"
            >
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <div className="space-y-2">
            <label
              htmlFor="reg-name"
              className="block text-sm font-medium text-primary-800 dark:text-neutral-200"
            >
              {t('auth.fullName')}{' '}
              <span className="text-red-500" aria-hidden="true">
                *
              </span>
            </label>
            <Input
              id="reg-name"
              type="text"
              placeholder="Ion Popescu"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              aria-required="true"
              aria-invalid={!!error && !formData.name}
              aria-describedby={error ? 'register-error' : undefined}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="reg-email"
              className="block text-sm font-medium text-primary-800 dark:text-neutral-200"
            >
              {t('auth.email')}{' '}
              <span className="text-red-500" aria-hidden="true">
                *
              </span>
            </label>
            <Input
              id="reg-email"
              type="email"
              placeholder="nume@companie.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              aria-required="true"
              aria-invalid={!!error && !formData.email}
              aria-describedby={error ? 'register-error' : undefined}
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="reg-phone"
              className="block text-sm font-medium text-primary-800 dark:text-neutral-200"
            >
              {t('auth.phone')}
            </label>
            <Input
              id="reg-phone"
              type="tel"
              placeholder="+373123456789"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="reg-company"
              className="block text-sm font-medium text-primary-800 dark:text-neutral-200"
            >
              {t('auth.company')}
            </label>
            <Input
              id="reg-company"
              type="text"
              placeholder="Numele companiei"
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="reg-password"
              className="block text-sm font-medium text-primary-800 dark:text-neutral-200"
            >
              {t('auth.passwordLabel')}{' '}
              <span className="text-red-500" aria-hidden="true">
                *
              </span>
            </label>
            <Input
              id="reg-password"
              type="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              aria-required="true"
              aria-invalid={formData.password.length > 0 && !isPasswordValid}
              aria-describedby="password-requirements"
            />

            {/* Password strength indicators */}
            <div
              id="password-requirements"
              className="grid grid-cols-2 gap-2 mt-3"
              aria-label="Password requirements"
            >
              <PasswordCheck passed={passwordChecks.length} label={t('auth.minChars')} />
              <PasswordCheck passed={passwordChecks.uppercase} label={t('auth.uppercase')} />
              <PasswordCheck passed={passwordChecks.lowercase} label={t('auth.lowercase')} />
              <PasswordCheck passed={passwordChecks.number} label={t('auth.number')} />
              <PasswordCheck passed={passwordChecks.special} label={t('auth.specialChar')} />
            </div>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="reg-confirm-password"
              className="block text-sm font-medium text-primary-800 dark:text-neutral-200"
            >
              {t('auth.confirmPasswordLabel')}{' '}
              <span className="text-red-500" aria-hidden="true">
                *
              </span>
            </label>
            <Input
              id="reg-confirm-password"
              type="password"
              placeholder="••••••••"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              required
              aria-required="true"
              aria-invalid={formData.confirmPassword.length > 0 && !passwordsMatch}
              aria-describedby={
                formData.confirmPassword.length > 0 ? 'confirm-password-status' : undefined
              }
            />
            {formData.confirmPassword && (
              <div
                id="confirm-password-status"
                role="status"
                aria-live="polite"
                className={`flex items-center gap-2 text-sm ${passwordsMatch ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
              >
                {passwordsMatch ? (
                  <>
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4.5 12.75l6 6 9-13.5"
                      />
                    </svg>
                    {t('auth.passwordsMatch')}
                  </>
                ) : (
                  <>
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    {t('auth.passwordsNotMatch')}
                  </>
                )}
              </div>
            )}
          </div>

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            disabled={isLoading || !isFormValid}
            loading={isLoading}
          >
            {isLoading ? t('auth.creatingAccount') : t('auth.createAccountBtn')}
          </Button>

          <div className="text-center">
            <Link
              to="/login"
              className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
            >
              {t('auth.alreadyHaveAccount')}
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

// Helper component for password requirements
const PasswordCheck = ({ passed, label }: { passed: boolean; label: string }) => (
  <div
    className={`flex items-center gap-2 text-xs ${passed ? 'text-green-600 dark:text-green-400' : 'text-neutral-400 dark:text-neutral-500'}`}
  >
    {passed ? (
      <svg
        className="w-4 h-4"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
      </svg>
    ) : (
      <svg
        className="w-4 h-4"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )}
    {label}
  </div>
);

export default Register;
