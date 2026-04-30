import React, { createContext, useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/utils';
import { AlertCircleIcon, XIcon, CheckIcon } from '../icons';

export type ToastVariant = 'info' | 'success' | 'warning' | 'error';

interface ToastMessage {
  id: number;
  message: string;
  variant: ToastVariant;
}

export interface ToastContextType {
  addToast: (message: string, variant?: ToastVariant) => void;
}

export const ToastContext = createContext<ToastContextType | null>(null);

let toastCount = 0;

/** Duration (ms) per variant for auto-dismiss */
const TOAST_DURATIONS: Record<ToastVariant, number> = {
  error: 7000,
  warning: 6000,
  info: 5000,
  success: 4000,
};

// FIX: Changed to use React.PropsWithChildren to solve typing issue at call site.
export const ToastProvider = ({ children }: React.PropsWithChildren) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: number) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback((message: string, variant: ToastVariant = 'info') => {
    const id = toastCount++;
    setToasts((prevToasts) => [...prevToasts, { id, message, variant }]);
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {typeof document !== 'undefined' &&
        createPortal(<ToastContainer toasts={toasts} removeToast={removeToast} />, document.body)}
    </ToastContext.Provider>
  );
};

// Re-export useToast from separate file (fixes react-refresh/only-export-components)
export { useToast } from './useToast';

const ICONS: Record<ToastVariant, React.ComponentType<{ className?: string }>> = {
  info: AlertCircleIcon,
  success: CheckIcon,
  warning: AlertCircleIcon,
  error: AlertCircleIcon,
};

const ToastContainer = ({
  toasts,
  removeToast,
}: {
  toasts: ToastMessage[];
  removeToast: (id: number) => void;
}) => {
  return (
    <div
      className="fixed top-5 right-5 z-[100] space-y-2 w-full max-w-sm"
      aria-live="polite"
      aria-label="Notificări"
    >
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} onDismiss={() => removeToast(toast.id)} />
      ))}
    </div>
  );
};

interface ToastProps extends ToastMessage {
  onDismiss: () => void;
}

const VARIANT_CLASSES: Record<ToastVariant, string> = {
  info: 'bg-blue-50 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200',
  success: 'bg-green-50 text-green-800 dark:bg-green-900/50 dark:text-green-200',
  warning: 'bg-yellow-50 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200',
  error: 'bg-red-50 text-red-800 dark:bg-red-900/50 dark:text-red-200',
};

// FIX: Changed Toast to be a React.FC to correctly handle the 'key' prop.
const Toast: React.FC<ToastProps> = ({ message, variant, onDismiss }) => {
  const Icon = ICONS[variant];
  const duration = TOAST_DURATIONS[variant];
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isPausedRef = useRef(false);
  const startTimeRef = useRef<number>(Date.now());
  const remainingRef = useRef<number>(duration);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    startTimeRef.current = Date.now();
    timerRef.current = setTimeout(() => {
      onDismiss();
    }, remainingRef.current);
  }, [onDismiss]);

  const pauseTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    remainingRef.current -= Date.now() - startTimeRef.current;
    isPausedRef.current = true;
  };

  const resumeTimer = () => {
    if (!isPausedRef.current) return;
    isPausedRef.current = false;
    startTimer();
  };

  useEffect(() => {
    startTimer();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [startTimer]);

  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      onMouseEnter={pauseTimer}
      onMouseLeave={resumeTimer}
      onFocus={pauseTimer}
      onBlur={resumeTimer}
      className={cn(
        'flex items-start p-4 rounded-lg shadow-lg text-sm transition-all',
        VARIANT_CLASSES[variant]
      )}
    >
      <Icon className="h-5 w-5 mr-3 mt-0.5 flex-shrink-0" aria-hidden="true" />
      <div className="flex-1">{message}</div>
      <button
        onClick={onDismiss}
        aria-label="Închide notificarea"
        className="ml-3 p-1 rounded-full hover:bg-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
      >
        <XIcon className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
};
