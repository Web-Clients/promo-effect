/**
 * useConfirm — promise-based confirm/prompt dialogs.
 * Task C5.
 *
 * Usage:
 *   const { confirm, prompt, ConfirmDialogNode } = useConfirm();
 *
 *   // In JSX, render ConfirmDialogNode somewhere near root
 *   return (
 *     <div>
 *       {ConfirmDialogNode}
 *       <button onClick={async () => {
 *         const ok = await confirm({ title: 'Delete?', message: '...', variant: 'danger' });
 *         if (ok) doDelete();
 *       }}>Delete</button>
 *     </div>
 *   );
 */

import { useState, useCallback, useRef } from 'react';
import React from 'react';
import { ConfirmDialog, TextInputDialog } from '../components/ui/ConfirmDialog';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'primary';
}

interface PromptOptions {
  title: string;
  message: string;
  placeholder?: string;
  confirmText?: string;
  cancelText?: string;
}

type DialogState =
  | { type: 'confirm'; options: ConfirmOptions; resolve: (value: boolean) => void }
  | { type: 'prompt'; options: PromptOptions; resolve: (value: string | null) => void }
  | null;

export function useConfirm() {
  const [dialog, setDialog] = useState<DialogState>(null);
  const resolveRef = useRef<((value: any) => void) | null>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setDialog({ type: 'confirm', options, resolve });
    });
  }, []);

  const prompt = useCallback((options: PromptOptions): Promise<string | null> => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setDialog({ type: 'prompt', options, resolve });
    });
  }, []);

  const handleClose = useCallback(() => {
    if (dialog) {
      if (dialog.type === 'confirm') dialog.resolve(false);
      else dialog.resolve(null);
    }
    setDialog(null);
  }, [dialog]);

  const handleConfirm = useCallback(
    (value?: string) => {
      if (dialog) {
        if (dialog.type === 'confirm') dialog.resolve(true);
        else dialog.resolve(value ?? null);
      }
      setDialog(null);
    },
    [dialog]
  );

  const ConfirmDialogNode = dialog
    ? dialog.type === 'confirm'
      ? React.createElement(ConfirmDialog, {
          isOpen: true,
          onClose: handleClose,
          onConfirm: () => handleConfirm(),
          title: dialog.options.title,
          message: dialog.options.message,
          confirmText: dialog.options.confirmText,
          cancelText: dialog.options.cancelText,
          variant: dialog.options.variant,
        })
      : React.createElement(TextInputDialog, {
          isOpen: true,
          onClose: handleClose,
          onConfirm: (val: string) => handleConfirm(val),
          title: dialog.options.title,
          message: dialog.options.message,
          placeholder: dialog.options.placeholder,
          confirmText: dialog.options.confirmText,
          cancelText: dialog.options.cancelText,
        })
    : null;

  return { confirm, prompt, ConfirmDialogNode };
}
