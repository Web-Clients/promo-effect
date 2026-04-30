/**
 * Task F5 — Skeleton component tests (Phase E11)
 * Tests: Skeleton, SkeletonTableRow, SkeletonCard
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';

import { Skeleton, SkeletonTableRow, SkeletonCard } from '../../components/ui/Skeleton';

describe('Skeleton', () => {
  it('renders a div with animate-pulse class', () => {
    const { container } = render(<Skeleton />);
    const el = container.querySelector('div');
    expect(el).toBeInTheDocument();
    expect(el?.className).toContain('animate-pulse');
  });

  it('is aria-hidden', () => {
    const { container } = render(<Skeleton />);
    const el = container.querySelector('div');
    expect(el).toHaveAttribute('aria-hidden', 'true');
  });

  it('applies custom className', () => {
    const { container } = render(<Skeleton className="h-4 w-32" />);
    const el = container.querySelector('div');
    expect(el?.className).toContain('h-4');
    expect(el?.className).toContain('w-32');
  });

  it('has default neutral background', () => {
    const { container } = render(<Skeleton />);
    const el = container.querySelector('div');
    expect(el?.className).toContain('bg-neutral-200');
  });
});

describe('SkeletonTableRow', () => {
  it('renders a <tr> element', () => {
    const { container } = render(
      <table>
        <tbody>
          <SkeletonTableRow />
        </tbody>
      </table>
    );
    expect(container.querySelector('tr')).toBeInTheDocument();
  });

  it('is aria-hidden', () => {
    const { container } = render(
      <table>
        <tbody>
          <SkeletonTableRow />
        </tbody>
      </table>
    );
    expect(container.querySelector('tr')).toHaveAttribute('aria-hidden', 'true');
  });

  it('renders default 6 columns', () => {
    const { container } = render(
      <table>
        <tbody>
          <SkeletonTableRow />
        </tbody>
      </table>
    );
    const cells = container.querySelectorAll('td');
    expect(cells).toHaveLength(6);
  });

  it('renders custom number of columns', () => {
    const { container } = render(
      <table>
        <tbody>
          <SkeletonTableRow cols={12} />
        </tbody>
      </table>
    );
    const cells = container.querySelectorAll('td');
    expect(cells).toHaveLength(12);
  });

  it('each cell contains a Skeleton div', () => {
    const { container } = render(
      <table>
        <tbody>
          <SkeletonTableRow cols={3} />
        </tbody>
      </table>
    );
    const skeletons = container.querySelectorAll('td .animate-pulse');
    expect(skeletons).toHaveLength(3);
  });
});

describe('SkeletonCard', () => {
  it('renders a div container', () => {
    const { container } = render(<SkeletonCard />);
    expect(container.querySelector('div')).toBeInTheDocument();
  });

  it('is aria-hidden', () => {
    const { container } = render(<SkeletonCard />);
    // outer div should be aria-hidden
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
  });

  it('renders 3 skeleton lines', () => {
    const { container } = render(<SkeletonCard />);
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThanOrEqual(3);
  });

  it('applies custom className', () => {
    const { container } = render(<SkeletonCard className="my-class" />);
    expect(container.firstChild).toHaveClass('my-class');
  });
});
