import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/utils';
import { AlertCircleIcon, XIcon, CheckIcon } from '../icons';

export type ToastVariant = 'info' | 'success' | 'warning' | 'error';

interface ToastMessage {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastContextType {
  addToast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

let toastCount = 0;

// FIX: Changed to use React.PropsWithChildren to solve typing issue at call site.
export const ToastProvider = ({ children }: React.PropsWithChildren) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((message: string, variant: ToastVariant = 'info') => {
    const id = toastCount++;
    setToasts((prevToasts) => [...prevToasts, { id, message, variant }]);
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {typeof document !== 'undefined' &&
        createPortal(<ToastContainer toasts={toasts} removeToast={removeToast} />, document.body)}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

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
    <div className="fixed top-5 right-5 z-[100] space-y-2 w-full max-w-sm">
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
  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      className={cn(
        'flex items-start p-4 rounded-lg shadow-lg text-sm transition-all',
        // FIX: The `cn` utility does not support passing an object for conditional classes. Changed to a class map lookup to provide a valid string argument.
        VARIANT_CLASSES[variant]
      )}
    >
      <Icon className="h-5 w-5 mr-3 mt-0.5 flex-shrink-0" aria-hidden="true" />
      <div className="flex-1">{message}</div>
      <button
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="ml-3 p-1 rounded-full hover:bg-black/10"
      >
        <XIcon className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
};
