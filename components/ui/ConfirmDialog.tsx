/**
 * ConfirmDialog — branded modal replacing window.confirm/prompt.
 * Task C5.
 *
 * Usage:
 *   <ConfirmDialog
 *     isOpen={open}
 *     onClose={() => setOpen(false)}
 *     onConfirm={handleConfirm}
 *     title="Ștergeți rezervarea?"
 *     message="Această acțiune nu poate fi anulată."
 *     variant="danger"
 *   />
 */

import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from './Button';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'primary';
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText,
  variant = 'primary',
}) => {
  const { t } = useTranslation();
  const confirmRef = useRef<HTMLDivElement>(null);

  // Focus confirm button when dialog opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        const btn = confirmRef.current?.querySelector('button');
        btn?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const resolvedConfirmText = confirmText ?? t('common.confirm', 'Confirmă');
  const resolvedCancelText = cancelText ?? t('common.cancel', 'Anulează');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4 animate-fade-in">
        {/* Icon */}
        <div
          className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4 ${
            variant === 'danger'
              ? 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400'
              : 'bg-primary-100 dark:bg-primary-500/20 text-primary-600 dark:text-primary-400'
          }`}
        >
          {variant === 'danger' ? (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          )}
        </div>

        <h2
          id="confirm-dialog-title"
          className="text-lg font-semibold text-neutral-900 dark:text-white text-center mb-2"
        >
          {title}
        </h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 text-center mb-6">{message}</p>

        <div className="flex gap-3 justify-center" ref={confirmRef}>
          <Button variant="outline" onClick={onClose} className="flex-1">
            {resolvedCancelText}
          </Button>
          <Button
            variant={variant === 'danger' ? 'danger' : 'accent'}
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="flex-1"
          >
            {resolvedConfirmText}
          </Button>
        </div>
      </div>
    </div>
  );
};

// ─── TextInputDialog — for prompt() replacements ─────────────────────────────

export interface TextInputDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (value: string) => void;
  title: string;
  message: string;
  placeholder?: string;
  confirmText?: string;
  cancelText?: string;
}

export const TextInputDialog: React.FC<TextInputDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  placeholder,
  confirmText,
  cancelText,
}) => {
  const { t } = useTranslation();
  const [value, setValueState] = React.useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setValueState('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Enter') {
        onConfirm(value);
        onClose();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose, onConfirm, value]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">{title}</h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">{message}</p>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValueState(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 mb-5"
        />
        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">
            {cancelText ?? t('common.cancel', 'Anulează')}
          </Button>
          <Button
            variant="accent"
            onClick={() => {
              onConfirm(value);
              onClose();
            }}
            className="flex-1"
          >
            {confirmText ?? t('common.confirm', 'Confirmă')}
          </Button>
        </div>
      </div>
    </div>
  );
};
