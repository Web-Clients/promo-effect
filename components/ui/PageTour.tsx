import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';

/**
 * A short walk through a page, the first time someone lands on it.
 *
 * Ion, 8 Sep: "Fiecare pagină când o să intre, de fiecare dată lucrurile
 * importante să le identifice cu o serie de pași care trebuie să apese, mai
 * departe, mai departe."
 *
 * Design decisions worth stating:
 *
 * Steps point at `data-tour` attributes rather than CSS classes, so restyling a
 * screen cannot silently break its tour.
 *
 * A step whose target is not on the page is skipped rather than shown against
 * nothing. Screens differ by role — an agent does not see what an admin sees —
 * and a tour that stops on an element the reader does not have is worse than no
 * tour.
 *
 * "Seen" is stored per tour id in localStorage. It is a convenience, not a
 * record: a private window or a second device replays the tour, which is the
 * right failure. Storage access is wrapped because some browsers throw on it
 * outright rather than returning null.
 */

export interface TourStep {
  /** Value of the target's `data-tour` attribute. */
  target: string;
  title: string;
  body: string;
}

export interface PageTourProps {
  /** Stable id for this page's tour; also the storage key. */
  id: string;
  steps: TourStep[];
  /** Force it open regardless of whether it has been seen (the "?" button). */
  open?: boolean;
  onClose?: () => void;
}

const STORAGE_PREFIX = 'tour.seen.';

export function hasSeenTour(id: string): boolean {
  try {
    return localStorage.getItem(STORAGE_PREFIX + id) === '1';
  } catch {
    // Storage blocked: treat as unseen and simply do not persist.
    return false;
  }
}

export function markTourSeen(id: string): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + id, '1');
  } catch {
    /* nothing to do; the tour just replays next time */
  }
}

/** Reset every tour — used by "show me again" in the profile. */
export function resetAllTours(): void {
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith(STORAGE_PREFIX)) localStorage.removeItem(key);
    }
  } catch {
    /* ignore */
  }
}

interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

function boxOf(el: Element): Box {
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

export function PageTour({ id, steps, open, onClose }: PageTourProps) {
  const { t } = useTranslation();
  const [active, setActive] = useState(false);
  const [index, setIndex] = useState(0);
  const [box, setBox] = useState<Box | null>(null);

  // Only steps whose target is actually on this page, in order.
  const visibleSteps = useMemo(() => {
    if (typeof document === 'undefined') return steps;
    return steps.filter((s) => document.querySelector(`[data-tour="${s.target}"]`));
  }, [steps, active, open]);

  const finish = useCallback(() => {
    markTourSeen(id);
    setActive(false);
    setIndex(0);
    onClose?.();
  }, [id, onClose]);

  // Start on first visit, or whenever the caller forces it open.
  useEffect(() => {
    if (open) {
      setIndex(0);
      setActive(true);
      return;
    }
    if (hasSeenTour(id)) return;
    // Let the page finish rendering before measuring anything.
    const timer = window.setTimeout(() => setActive(true), 400);
    return () => window.clearTimeout(timer);
  }, [id, open]);

  const step = active ? visibleSteps[index] : undefined;

  // Track the target's position; it moves when the page scrolls or reflows.
  useEffect(() => {
    if (!step) {
      setBox(null);
      return;
    }
    const el = document.querySelector(`[data-tour="${step.target}"]`);
    if (!el) {
      setBox(null);
      return;
    }

    el.scrollIntoView({ block: 'center', behavior: 'smooth' });

    const measure = () => setBox(boxOf(el));
    measure();

    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener('scroll', measure, true);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('scroll', measure, true);
      window.removeEventListener('resize', measure);
    };
  }, [step]);

  const next = useCallback(() => {
    if (index >= visibleSteps.length - 1) finish();
    else setIndex((i) => i + 1);
  }, [index, visibleSteps.length, finish]);

  const back = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);

  useEffect(() => {
    if (!step) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish();
      else if (e.key === 'ArrowRight' || e.key === 'Enter') next();
      else if (e.key === 'ArrowLeft') back();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [step, next, back, finish]);

  if (!step || typeof document === 'undefined') return null;

  // Place the card under the target, or above it when there is no room below.
  const PAD = 8;
  const CARD_H = 170;
  const below = box ? box.top + box.height + PAD : 80;
  const roomBelow = box ? window.innerHeight - below > CARD_H : true;
  const cardTop = box ? (roomBelow ? below : Math.max(PAD, box.top - CARD_H - PAD)) : 80;
  const cardLeft = box ? Math.max(PAD, Math.min(box.left, window.innerWidth - 340 - PAD)) : PAD;

  return createPortal(
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label={step.title}>
      {/* Dim everything, then lift the target back out with a ring. */}
      <div className="absolute inset-0 bg-black/50" onClick={finish} />

      {box && (
        <div
          aria-hidden
          className="pointer-events-none absolute rounded-lg ring-4 ring-accent-400 transition-all duration-200"
          style={{
            top: box.top - 4,
            left: box.left - 4,
            width: box.width + 8,
            height: box.height + 8,
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
          }}
        />
      )}

      <div
        className="absolute w-[340px] max-w-[calc(100vw-16px)] rounded-xl bg-white p-4 shadow-2xl dark:bg-neutral-800"
        style={{ top: cardTop, left: cardLeft }}
      >
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-neutral-400">
          {t('tour.stepOf', { current: index + 1, total: visibleSteps.length })}
        </p>
        <h3 className="font-semibold text-primary-800 dark:text-white">{step.title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
          {step.body}
        </p>

        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            onClick={finish}
            className="text-xs text-neutral-500 underline-offset-2 hover:underline"
          >
            {t('tour.skip')}
          </button>
          <div className="flex gap-2">
            {index > 0 && (
              <button
                onClick={back}
                className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-600 dark:text-neutral-200 dark:hover:bg-neutral-700"
              >
                {t('tour.back')}
              </button>
            )}
            <button
              onClick={next}
              className="rounded-lg bg-accent-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-600"
            >
              {index >= visibleSteps.length - 1 ? t('tour.done') : t('tour.next')}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
