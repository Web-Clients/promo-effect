import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Button } from './ui/Button';
import authService from '../services/auth';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (token) {
      handleVerify();
    }
  }, [token]);

  const handleVerify = async () => {
    if (!token) {
      setError('Token de verificare lipsă');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await authService.verifyEmail(token);
      setIsSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Verificare email eșuată. Token-ul poate fi expirat.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-800 via-primary-700 to-primary-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl shadow-xl p-8 text-center">
          <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-6">
            <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-primary-800 dark:text-white mb-2">
            Link invalid
          </h2>
          <p className="text-neutral-600 dark:text-neutral-400 mb-6">
            Link-ul de verificare este invalid sau lipsă.
          </p>
          <Link to="/login">
            <Button variant="primary" className="w-full">
              Mergi la autentificare
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-800 via-primary-700 to-primary-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl shadow-xl p-8 text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6">
            <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-primary-800 dark:text-white mb-2">
            Email verificat cu succes!
          </h2>
          <p className="text-neutral-600 dark:text-neutral-400 mb-6">
            Adresa ta de email a fost confirmată. Acum te poți autentifica în platformă.
          </p>
          <Link to="/login">
            <Button variant="primary" className="w-full">
              Mergi la autentificare
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-800 via-primary-700 to-primary-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl shadow-xl p-8 text-center">
        {isLoading ? (
          <>
            <div className="mx-auto w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mb-6" />
            <h2 className="text-2xl font-bold text-primary-800 dark:text-white mb-2">
              Se verifică email-ul...
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400">
              Te rugăm să aștepți
            </p>
          </>
        ) : error ? (
          <>
            <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-primary-800 dark:text-white mb-2">
              Verificare eșuată
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400 mb-6">
              {error}
            </p>
            <div className="space-y-3">
              <button
                onClick={handleVerify}
                className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Încearcă din nou
              </button>
              <Link to="/login">
                <Button variant="ghost" className="w-full">
                  Mergi la autentificare
                </Button>
              </Link>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};

export default VerifyEmail;

