import { useContext } from 'react';
import { ToastContext } from './Toast';
import type { ToastContextType } from './Toast';

export type { ToastContextType };

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
