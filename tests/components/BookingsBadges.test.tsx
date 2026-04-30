/**
 * Task F5 — BookingsBadges component test
 * Tests: TlxBadge, DocBadge, StatusBadge visual rendering
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Mock icons used inside StatusBadge — forward all props including aria-hidden
vi.mock('../../components/icons', () => ({
  CheckIcon: (props: React.SVGProps<SVGSVGElement>) => <svg data-testid="icon-check" {...props} />,
  ClockIcon: (props: React.SVGProps<SVGSVGElement>) => <svg data-testid="icon-clock" {...props} />,
  WarningIcon: (props: React.SVGProps<SVGSVGElement>) => (
    <svg data-testid="icon-warning" {...props} />
  ),
  XIcon: (props: React.SVGProps<SVGSVGElement>) => <svg data-testid="icon-x" {...props} />,
  ClipboardIcon: (props: React.SVGProps<SVGSVGElement>) => (
    <svg data-testid="icon-clipboard" {...props} />
  ),
  ArchiveIcon: (props: React.SVGProps<SVGSVGElement>) => (
    <svg data-testid="icon-archive" {...props} />
  ),
}));

import { TlxBadge, DocBadge, StatusBadge } from '../../components/bookings/BookingsBadges';

// ─── TlxBadge ────────────────────────────────────────────────────────────────

describe('TlxBadge', () => {
  it('renders "TLX" text when active=true', () => {
    render(<TlxBadge active={true} />);
    expect(screen.getByText('TLX')).toBeInTheDocument();
  });

  it('has title "Telex release confirmat" when active', () => {
    render(<TlxBadge active={true} />);
    expect(screen.getByTitle('Telex release confirmat')).toBeInTheDocument();
  });

  it('renders dash "—" when active=false', () => {
    render(<TlxBadge active={false} />);
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.queryByText('TLX')).not.toBeInTheDocument();
  });

  it('applies green classes when active', () => {
    const { container } = render(<TlxBadge active={true} />);
    const badge = container.querySelector('span');
    expect(badge?.className).toContain('bg-green-100');
    expect(badge?.className).toContain('text-green-800');
  });

  it('applies custom className', () => {
    const { container } = render(<TlxBadge active={true} className="my-custom-class" />);
    const badge = container.querySelector('span');
    expect(badge?.className).toContain('my-custom-class');
  });
});

// ─── DocBadge ────────────────────────────────────────────────────────────────

describe('DocBadge', () => {
  it('renders "DOC" text when active=true', () => {
    render(<DocBadge active={true} />);
    expect(screen.getByText('DOC')).toBeInTheDocument();
  });

  it('has title "Documente încărcate" when active', () => {
    render(<DocBadge active={true} />);
    expect(screen.getByTitle('Documente încărcate')).toBeInTheDocument();
  });

  it('renders dash "—" when active=false', () => {
    render(<DocBadge active={false} />);
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.queryByText('DOC')).not.toBeInTheDocument();
  });

  it('applies blue classes when active', () => {
    const { container } = render(<DocBadge active={true} />);
    const badge = container.querySelector('span');
    expect(badge?.className).toContain('bg-blue-100');
    expect(badge?.className).toContain('text-blue-800');
  });
});

// ─── StatusBadge ─────────────────────────────────────────────────────────────

describe('StatusBadge', () => {
  it.each([
    ['CONFIRMED', 'Confirmat'],
    ['IN_TRANSIT', 'În tranzit'],
    ['DELIVERED', 'Livrat'],
    ['CANCELLED', 'Anulat'],
    ['DRAFT', 'Ciornă'],
    ['PENDING', 'Pending'],
  ])('renders label "%s" for status %s', (status, label) => {
    render(<StatusBadge status={status} label={label} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it('renders DELIVERED badge with CheckIcon', () => {
    render(<StatusBadge status="DELIVERED" label="Livrat" />);
    expect(screen.getByTestId('icon-check')).toBeInTheDocument();
  });

  it('renders CANCELLED badge with XIcon', () => {
    render(<StatusBadge status="CANCELLED" label="Anulat" />);
    expect(screen.getByTestId('icon-x')).toBeInTheDocument();
  });

  it('renders CONFIRMED badge with ClipboardIcon', () => {
    render(<StatusBadge status="CONFIRMED" label="Confirmat" />);
    expect(screen.getByTestId('icon-clipboard')).toBeInTheDocument();
  });

  it('renders IN_TRANSIT badge with ClockIcon', () => {
    render(<StatusBadge status="IN_TRANSIT" label="În tranzit" />);
    expect(screen.getByTestId('icon-clock')).toBeInTheDocument();
  });

  it('renders DELAYED badge with WarningIcon', () => {
    render(<StatusBadge status="DELAYED" label="Întârziat" />);
    expect(screen.getByTestId('icon-warning')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <StatusBadge status="CONFIRMED" label="Test" className="my-class" />
    );
    const badge = container.querySelector('span');
    expect(badge?.className).toContain('my-class');
  });

  it('uses fallback color for unknown status', () => {
    const { container } = render(<StatusBadge status="UNKNOWN_STATUS" label="Unknown" />);
    const badge = container.querySelector('span');
    // Should fall back to DRAFT color
    expect(badge?.className).toContain('bg-neutral-100');
  });

  it('icon has aria-hidden=true (accessibility)', () => {
    render(<StatusBadge status="DELIVERED" label="Livrat" />);
    const icon = screen.getByTestId('icon-check');
    expect(icon).toHaveAttribute('aria-hidden', 'true');
  });
});
