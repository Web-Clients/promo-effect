import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from '../../../components/ui/Badge';

describe('Badge', () => {
  it('renders with text content', () => {
    render(<Badge>Active</Badge>);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('renders default variant by default', () => {
    render(<Badge>Default</Badge>);
    const badge = screen.getByText('Default');
    expect(badge.className).toContain('bg-neutral-200');
  });

  it('renders blue variant', () => {
    render(<Badge variant="blue">Blue</Badge>);
    const badge = screen.getByText('Blue');
    expect(badge.className).toContain('bg-blue-100');
  });

  it('renders green variant', () => {
    render(<Badge variant="green">Green</Badge>);
    const badge = screen.getByText('Green');
    expect(badge.className).toContain('bg-green-100');
  });

  it('renders red variant', () => {
    render(<Badge variant="red">Red</Badge>);
    const badge = screen.getByText('Red');
    expect(badge.className).toContain('bg-red-100');
  });

  it('renders yellow variant', () => {
    render(<Badge variant="yellow">Yellow</Badge>);
    const badge = screen.getByText('Yellow');
    expect(badge.className).toContain('bg-yellow-100');
  });

  it('renders purple variant', () => {
    render(<Badge variant="purple">Purple</Badge>);
    const badge = screen.getByText('Purple');
    expect(badge.className).toContain('bg-purple-100');
  });

  it('renders teal variant', () => {
    render(<Badge variant="teal">Teal</Badge>);
    const badge = screen.getByText('Teal');
    expect(badge.className).toContain('bg-teal-100');
  });

  it('renders orange variant', () => {
    render(<Badge variant="orange">Orange</Badge>);
    const badge = screen.getByText('Orange');
    expect(badge.className).toContain('bg-orange-100');
  });

  it('always has rounded-full class', () => {
    render(<Badge>Round</Badge>);
    const badge = screen.getByText('Round');
    expect(badge.className).toContain('rounded-full');
  });

  it('merges custom className', () => {
    render(<Badge className="my-custom-class">Custom</Badge>);
    const badge = screen.getByText('Custom');
    expect(badge.className).toContain('my-custom-class');
  });

  it('passes through additional div attributes', () => {
    render(<Badge data-testid="my-badge">Test</Badge>);
    expect(screen.getByTestId('my-badge')).toBeInTheDocument();
  });
});
