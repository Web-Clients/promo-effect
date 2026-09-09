/**
 * The first-visit walkthrough.
 *
 * Ion, 8 Sep: important things on each page pointed out with a series of steps,
 * "mai departe, mai departe". Two behaviours carry most of the value and both
 * are easy to get wrong: it must not replay forever, and it must not stop on an
 * element the reader does not have — screens differ by role, and an agent sees
 * far less than an admin.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, vars?: Record<string, unknown>) =>
      key === 'tour.stepOf' ? `Step ${vars?.current} of ${vars?.total}` : key,
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
}));

import { PageTour, hasSeenTour, markTourSeen, resetAllTours } from '../../components/ui/PageTour';

const STEPS = [
  { target: 'first', title: 'The incoterm', body: 'Pick the delivery term first.' },
  { target: 'missing', title: 'Not here', body: 'This target does not exist on the page.' },
  { target: 'second', title: 'The weight', body: 'Weight decides the inland tariff.' },
];

function Page() {
  return (
    <div>
      <button data-tour="first">Incoterm</button>
      <button data-tour="second">Weight</button>
      <PageTour id="test-page" steps={STEPS} />
    </div>
  );
}

async function advanceStart() {
  // The tour waits for the page to settle before measuring.
  await act(async () => {
    vi.advanceTimersByTime(500);
  });
}

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
});

describe('PageTour', () => {
  it('starts on a first visit', async () => {
    render(<Page />);
    await advanceStart();
    expect(screen.getByText('The incoterm')).toBeInTheDocument();
  });

  it('skips a step whose target is not on the page', async () => {
    render(<Page />);
    await advanceStart();

    // Two of the three targets exist, so the counter must say two.
    expect(screen.getByText('Step 1 of 2')).toBeInTheDocument();
    fireEvent.click(screen.getByText('tour.next'));
    expect(screen.getByText('The weight')).toBeInTheDocument();
    expect(screen.queryByText('Not here')).toBeNull();
  });

  it('walks forward and back', async () => {
    render(<Page />);
    await advanceStart();
    fireEvent.click(screen.getByText('tour.next'));
    expect(screen.getByText('The weight')).toBeInTheDocument();
    fireEvent.click(screen.getByText('tour.back'));
    expect(screen.getByText('The incoterm')).toBeInTheDocument();
  });

  it('offers "done" on the last step rather than "next"', async () => {
    render(<Page />);
    await advanceStart();
    fireEvent.click(screen.getByText('tour.next'));
    expect(screen.getByText('tour.done')).toBeInTheDocument();
    expect(screen.queryByText('tour.next')).toBeNull();
  });

  it('does not replay once finished', async () => {
    const { unmount } = render(<Page />);
    await advanceStart();
    fireEvent.click(screen.getByText('tour.next'));
    fireEvent.click(screen.getByText('tour.done'));
    expect(hasSeenTour('test-page')).toBe(true);
    unmount();

    render(<Page />);
    await advanceStart();
    expect(screen.queryByText('The incoterm')).toBeNull();
  });

  it('counts skipping as seen — nobody wants it again tomorrow', async () => {
    render(<Page />);
    await advanceStart();
    fireEvent.click(screen.getByText('tour.skip'));
    expect(hasSeenTour('test-page')).toBe(true);
  });

  it('closes on Escape', async () => {
    render(<Page />);
    await advanceStart();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByText('The incoterm')).toBeNull();
  });

  it('replays when explicitly opened, even after being seen', async () => {
    markTourSeen('test-page');
    render(
      <div>
        <button data-tour="first">Incoterm</button>
        <PageTour id="test-page" steps={STEPS} open />
      </div>
    );
    expect(screen.getByText('The incoterm')).toBeInTheDocument();
  });

  it('resetAllTours clears what has been seen', () => {
    markTourSeen('a');
    markTourSeen('b');
    resetAllTours();
    expect(hasSeenTour('a')).toBe(false);
    expect(hasSeenTour('b')).toBe(false);
  });

  it('survives storage being unavailable', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(() => hasSeenTour('x')).not.toThrow();
    expect(hasSeenTour('x')).toBe(false);
    spy.mockRestore();
  });
});
