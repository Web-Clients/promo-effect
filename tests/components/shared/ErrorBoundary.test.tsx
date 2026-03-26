import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { ErrorBoundary } from '../../../components/shared/ErrorBoundary';

vi.mock('react-i18next', () => ({
  withTranslation: () => (Component: React.ComponentType<Record<string, unknown>>) => {
    const Wrapped = (props: Record<string, unknown>) => (
      <Component
        {...props}
        t={(key: string) => {
          const map: Record<string, string> = {
            'errors.somethingWentWrong': 'Something went wrong',
            'errors.unexpectedError': 'Unexpected error',
            'errors.reloadPage': 'Reload page',
          };
          return map[key] || key;
        }}
        i18n={{ language: 'en' }}
        tReady={true}
      />
    );
    Wrapped.displayName = `withTranslation(${Component.displayName || Component.name})`;
    return Wrapped;
  },
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
}));

// Component that throws on render when shouldThrow is true
const ThrowingComponent = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error message');
  }
  return <div>Normal content</div>;
};

describe('ErrorBoundary', () => {
  // Suppress console.error for error boundary tests
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <div>Safe content</div>
      </ErrorBoundary>
    );
    expect(screen.getByText('Safe content')).toBeInTheDocument();
  });

  it('shows default fallback UI when child throws', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Test error message')).toBeInTheDocument();
  });

  it('shows custom fallback when provided', () => {
    render(
      <ErrorBoundary fallback={<div>Custom fallback</div>}>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByText('Custom fallback')).toBeInTheDocument();
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
  });

  it('shows reload button in default fallback', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByText('Reload page')).toBeInTheDocument();
  });

  it('does not show fallback when children render normally', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={false} />
      </ErrorBoundary>
    );
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
    expect(screen.getByText('Normal content')).toBeInTheDocument();
  });
});
