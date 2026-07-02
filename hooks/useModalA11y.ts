import { RefObject, useCallback, useEffect, useRef } from 'react';

/**
 * Accessible modal behavior extracted from CreateInvoiceModal.
 *
 * On open: saves the previously focused element and moves focus to the first
 * focusable element inside `ref`. While open: closes on Escape and traps Tab
 * within `ref`. On close: restores focus to the previously focused element.
 *
 * Purely additive — it does not render anything or alter modal logic.
 */
export function useModalA11y(
  ref: RefObject<HTMLElement | null>,
  isOpen: boolean,
  onClose: () => void
) {
  // Element that had focus before the modal opened, restored on close.
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
      // Focus trap: keep Tab cycling within the modal
      if (e.key === 'Tab' && ref.current) {
        const focusable = ref.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    },
    [ref, onClose]
  );

  useEffect(() => {
    if (isOpen) {
      // Save the element that had focus so we can restore it on close.
      previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
      document.addEventListener('keydown', handleKeyDown);
      // Move focus into the modal when it opens
      setTimeout(() => {
        const focusable = ref.current?.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        focusable?.[0]?.focus();
      }, 0);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      // Restore focus to whatever was focused before the modal opened.
      if (isOpen) {
        previouslyFocusedRef.current?.focus();
      }
    };
  }, [isOpen, handleKeyDown, ref]);
}
