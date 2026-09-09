import React, { useEffect, useId, useRef, useState } from 'react';
import { cn } from '../../lib/utils';

/**
 * The small "i" next to a control that explains what it does.
 *
 * Ion, 8 Sep: "Fiecare buton să aibă butonașul «i», care dacă îl apropii
 * cursorul, o să explice ce se întâmplă, ce face funcția asta."
 *
 * Hover is not enough on its own. The people who most need the explanation are
 * often on a phone, where there is no hover at all, so this opens on click and
 * on focus as well — and closes on Escape, on blur and on an outside click.
 *
 * The tip is rendered as a real `role="tooltip"` associated by `aria-describedby`
 * rather than a `title` attribute, because a native title cannot be opened from
 * the keyboard and is invisible to touch entirely.
 */

export interface InfoTipProps {
  /** What the control does, in the user's language. Keep it to a sentence or two. */
  text: string;
  /** Which side to prefer; flips automatically when it would leave the viewport. */
  side?: 'top' | 'bottom';
  className?: string;
  /** Accessible name for the trigger, e.g. "More about the forwarding commission". */
  label?: string;
}

export function InfoTip({ text, side = 'top', className, label }: InfoTipProps) {
  const [open, setOpen] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const wrapRef = useRef<HTMLSpanElement | null>(null);
  const tipRef = useRef<HTMLSpanElement | null>(null);
  const id = useId();

  // Close on Escape and on a click elsewhere. Without the outside click a tip
  // opened by tapping stays on screen with no obvious way to dismiss it.
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };

    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
    };
  }, [open]);

  // Flip to the other side rather than rendering off-screen.
  useEffect(() => {
    if (!open || !tipRef.current) return;
    const rect = tipRef.current.getBoundingClientRect();
    const wouldClipTop = side === 'top' && rect.top < 8;
    const wouldClipBottom = side === 'bottom' && rect.bottom > window.innerHeight - 8;
    setFlipped(wouldClipTop || wouldClipBottom);
  }, [open, side]);

  const shown = side === 'top' ? (flipped ? 'bottom' : 'top') : flipped ? 'top' : 'bottom';

  return (
    <span ref={wrapRef} className={cn('relative inline-flex', className)}>
      <button
        type="button"
        aria-label={label || text}
        aria-describedby={open ? id : undefined}
        aria-expanded={open}
        onClick={(e) => {
          // Never submit the form the control lives in.
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-neutral-300 text-[10px] font-semibold leading-none text-neutral-500 transition-colors hover:border-primary-500 hover:text-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:border-neutral-600 dark:text-neutral-400 dark:hover:text-white"
      >
        i
      </button>

      {open && (
        <span
          ref={tipRef}
          role="tooltip"
          id={id}
          className={cn(
            'absolute left-1/2 z-50 w-60 -translate-x-1/2 rounded-lg bg-neutral-900 px-3 py-2 text-xs font-normal leading-snug text-white shadow-lg dark:bg-neutral-700',
            shown === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
          )}
        >
          {text}
        </span>
      )}
    </span>
  );
}

/**
 * A field label with its explanation attached.
 *
 * Most call sites want exactly this pairing, and going through one component
 * keeps the "i" in the same place on every screen instead of wherever each
 * author put it.
 */
export function LabelWithInfo({
  children,
  info,
  htmlFor,
  className,
  required,
}: {
  children: React.ReactNode;
  info: string;
  htmlFor?: string;
  className?: string;
  required?: boolean;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn(
        'mb-1 flex items-center gap-1.5 text-sm font-medium text-neutral-700 dark:text-neutral-300',
        className
      )}
    >
      <span>
        {children}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </span>
      <InfoTip text={info} />
    </label>
  );
}
