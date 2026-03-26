import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '../../../components/ui/Button';

describe('Button', () => {
  it('renders with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick handler', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click</Button>);
    await user.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it('renders as disabled when loading', () => {
    render(<Button loading>Loading</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('renders as disabled when disabled prop is set', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('does not call onClick when disabled', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(
      <Button disabled onClick={handleClick}>
        Disabled
      </Button>
    );
    await user.click(screen.getByRole('button'));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('applies primary variant by default', () => {
    render(<Button>Primary</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('bg-primary-800');
  });

  it('applies secondary variant classes', () => {
    render(<Button variant="secondary">Secondary</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('bg-neutral-100');
  });

  it('applies danger variant classes', () => {
    render(<Button variant="danger">Delete</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('bg-error-500');
  });

  it('applies ghost variant classes', () => {
    render(<Button variant="ghost">Ghost</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('hover:bg-neutral-100');
  });

  it('applies outline variant classes', () => {
    render(<Button variant="outline">Outline</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('border-2');
  });

  it('applies accent variant classes', () => {
    render(<Button variant="accent">Accent</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('bg-accent-500');
  });

  it('applies size sm classes', () => {
    render(<Button size="sm">Small</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('px-3');
  });

  it('applies size lg classes', () => {
    render(<Button size="lg">Large</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('px-6');
  });

  it('shows spinner when loading', () => {
    const { container } = render(<Button loading>Loading</Button>);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    // SVGAnimatedString in jsdom — check the attribute directly
    expect(svg?.getAttribute('class')).toContain('animate-spin');
  });

  it('passes through additional HTML button attributes', () => {
    render(
      <Button type="submit" data-testid="my-btn">
        Submit
      </Button>
    );
    const btn = screen.getByTestId('my-btn');
    expect(btn).toHaveAttribute('type', 'submit');
  });
});
