import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import NotFoundPage from '../../../components/pages/NotFoundPage';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'errors.pageNotFound': 'Page not found',
        'errors.pageNotFoundDesc': 'The page you are looking for does not exist.',
        'errors.backToHome': 'Back to home',
      };
      return map[key] || key;
    },
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
}));

describe('NotFoundPage', () => {
  it('renders 404 heading', () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>
    );
    expect(screen.getByText('404')).toBeInTheDocument();
  });

  it('renders page not found message', () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>
    );
    expect(screen.getByText('Page not found')).toBeInTheDocument();
  });

  it('renders page description', () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>
    );
    expect(screen.getByText('The page you are looking for does not exist.')).toBeInTheDocument();
  });

  it('renders link to home', () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>
    );
    const link = screen.getByRole('link', { name: /back to home/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/');
  });

  it('renders with correct structure', () => {
    const { container } = render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>
    );
    expect(container.querySelector('h1')).toBeInTheDocument();
    expect(container.querySelector('h2')).toBeInTheDocument();
    expect(container.querySelector('a')).toBeInTheDocument();
  });
});
