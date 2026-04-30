/**
 * ContactRepModal
 * A25: Shown when isPriceMissing=true (calculator found no price for the combination).
 * Submits form to POST /api/price-requests.
 */

import React, { useState } from 'react';
import api from '../../services/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  context?: {
    portOrigin?: string;
    portDestination?: string;
    containerType?: string;
    cargoWeight?: string;
    incoterm?: string;
    finalDestination?: string;
  };
}

interface FormData {
  name: string;
  email: string;
  phone: string;
  message: string;
}

export const ContactRepModal = ({ isOpen, onClose, context }: Props) => {
  const [form, setForm] = useState<FormData>({ name: '', email: '', phone: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      await api.post('/api/price-requests', {
        ...form,
        ...context,
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Eroare la trimitere. Încercați din nou.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-700 p-6 z-10">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {success ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-primary-800 dark:text-white mb-2">
              Cerere trimisă!
            </h3>
            <p className="text-neutral-500 dark:text-neutral-400 text-sm mb-4">
              Reprezentantul nostru vă va contacta în curând cu o ofertă personalizată.
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-accent-500 text-white rounded-lg font-medium hover:bg-accent-600 transition-colors"
            >
              Închide
            </button>
          </div>
        ) : (
          <>
            <div className="mb-5">
              <h3 className="text-lg font-bold text-primary-800 dark:text-white">
                Contactează reprezentant
              </h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                Pentru această combinație nu avem preț în baza noastră de date. Completați
                formularul și vă contactăm cu o ofertă.
              </p>
            </div>

            {/* Context summary */}
            {context && (context.portOrigin || context.containerType) && (
              <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/30 rounded-lg text-xs text-amber-700 dark:text-amber-400">
                Combinație:{' '}
                {[
                  context.portOrigin,
                  context.portDestination,
                  context.containerType,
                  context.incoterm,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-primary-800 dark:text-neutral-200 mb-1">
                  Nume <span className="text-error-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-primary-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent-500/30 focus:border-accent-500"
                  placeholder="Numele și prenumele"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-primary-800 dark:text-neutral-200 mb-1">
                  Email <span className="text-error-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-primary-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent-500/30 focus:border-accent-500"
                  placeholder="email@companie.md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-primary-800 dark:text-neutral-200 mb-1">
                  Telefon
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-primary-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent-500/30 focus:border-accent-500"
                  placeholder="+373 XX XXX XXX"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-primary-800 dark:text-neutral-200 mb-1">
                  Mesaj
                </label>
                <textarea
                  rows={3}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-primary-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent-500/30 focus:border-accent-500 resize-none"
                  placeholder="Detalii suplimentare despre marfă..."
                />
              </div>

              {error && (
                <div className="p-3 bg-error-50 dark:bg-error-500/20 border border-error-200 dark:border-error-500/30 rounded-lg">
                  <p className="text-sm text-error-700 dark:text-error-400">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 bg-accent-500 hover:bg-accent-600 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors"
              >
                {isSubmitting ? 'Se trimite...' : 'Trimite cererea'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default ContactRepModal;
