/**
 * Task F9 — Accessibility automated tests
 * Uses axe-core via jest-axe to assert no critical/serious violations.
 * Covers main UI components.
 */

import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render } from '@testing-library/react';
import { configureAxe, axe } from 'jest-axe';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

// Configure axe for vitest (jest-axe uses expect.extend)
import * as jestAxe from 'jest-axe';

// Module augmentation — this file is a module (has imports), so `declare
// module 'vitest'` MERGES the matcher onto the real Assertion type.
declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interface Assertion<T = any> {
    toHaveNoViolations(): T;
  }
  interface AsymmetricMatchersContaining {
    toHaveNoViolations(): void;
  }
}

// ─── Extend expect with axe matcher ──────────────────────────────────────────

beforeAll(() => {
  // jest-axe provides toHaveNoViolations
  expect.extend(jestAxe.toHaveNoViolations);
});

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
    i18n: { language: 'ro', changeLanguage: vi.fn() },
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

vi.mock('../../components/icons', () => {
  const icon = ({ className, ...rest }: any) => <svg className={className} {...rest} />;
  return {
    CheckIcon: icon,
    ClockIcon: icon,
    WarningIcon: icon,
    XIcon: icon,
    ClipboardIcon: icon,
    ArchiveIcon: icon,
    PlusIcon: icon,
    FileTextIcon: icon,
  };
});

// ─── Helper: axe check with critical/serious filter ──────────────────────────

const axeOptions = configureAxe({
  rules: {
    // Only check critical and serious violations
    region: { enabled: false }, // skip landmark rules for isolated components
  },
});

async function runAxe(html: Element) {
  const results = await axeOptions(html);
  // Filter to only critical/serious violations
  const criticalOrSerious = results.violations.filter(
    (v) => v.impact === 'critical' || v.impact === 'serious'
  );
  return { ...results, violations: criticalOrSerious };
}

// ─── ConfirmDialog accessibility ─────────────────────────────────────────────

describe('ConfirmDialog — accessibility', () => {
  it('has no critical/serious axe violations', async () => {
    const { ConfirmDialog } = await import('../../components/ui/ConfirmDialog');
    const { container } = render(
      <ConfirmDialog
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="Confirmare ștergere"
        message="Acțiunea nu poate fi anulată."
        variant="danger"
      />
    );
    const results = await runAxe(container);
    expect(results).toHaveNoViolations();
  });
});

// ─── TlxBadge / DocBadge accessibility ───────────────────────────────────────

describe('TlxBadge and DocBadge — accessibility', () => {
  it('TlxBadge active has no critical/serious violations', async () => {
    const { TlxBadge } = await import('../../components/bookings/BookingsBadges');
    const { container } = render(<TlxBadge active={true} />);
    const results = await runAxe(container);
    expect(results).toHaveNoViolations();
  });

  it('TlxBadge inactive has no critical/serious violations', async () => {
    const { TlxBadge } = await import('../../components/bookings/BookingsBadges');
    const { container } = render(<TlxBadge active={false} />);
    const results = await runAxe(container);
    expect(results).toHaveNoViolations();
  });

  it('DocBadge active has no critical/serious violations', async () => {
    const { DocBadge } = await import('../../components/bookings/BookingsBadges');
    const { container } = render(<DocBadge active={true} />);
    const results = await runAxe(container);
    expect(results).toHaveNoViolations();
  });
});

// ─── StatusBadge accessibility ────────────────────────────────────────────────

describe('StatusBadge — accessibility', () => {
  const statuses = ['CONFIRMED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED', 'DRAFT'];

  statuses.forEach((status) => {
    it(`StatusBadge ${status} has no critical/serious violations`, async () => {
      const { StatusBadge } = await import('../../components/bookings/BookingsBadges');
      const { container } = render(<StatusBadge status={status} label={status} />);
      const results = await runAxe(container);
      expect(results).toHaveNoViolations();
    });
  });
});

// ─── Skeleton accessibility ───────────────────────────────────────────────────

describe('Skeleton components — accessibility', () => {
  it('Skeleton has no critical/serious violations', async () => {
    const { Skeleton } = await import('../../components/ui/Skeleton');
    const { container } = render(<Skeleton className="h-4 w-32" />);
    const results = await runAxe(container);
    expect(results).toHaveNoViolations();
  });

  it('SkeletonCard has no critical/serious violations', async () => {
    const { SkeletonCard } = await import('../../components/ui/Skeleton');
    const { container } = render(<SkeletonCard />);
    const results = await runAxe(container);
    expect(results).toHaveNoViolations();
  });
});

// ─── ui/Badge accessibility ───────────────────────────────────────────────────

describe('ui/Badge — accessibility', () => {
  it('has no critical/serious violations in all variants', async () => {
    const { Badge } = await import('../../components/ui/Badge');
    const variants = ['default', 'blue', 'green', 'red', 'yellow'] as const;

    for (const variant of variants) {
      const { container } = render(<Badge variant={variant}>Test Badge</Badge>);
      const results = await runAxe(container);
      expect(results).toHaveNoViolations();
    }
  });
});
