import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LanguageSwitcher } from '../../../components/shared/LanguageSwitcher';

const mockChangeLanguage = vi.fn();

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      language: 'ro',
      changeLanguage: mockChangeLanguage,
    },
  }),
}));

describe('LanguageSwitcher', () => {
  it('renders 3 language buttons', () => {
    render(<LanguageSwitcher />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(3);
  });

  it('renders RO, RU, EN labels', () => {
    render(<LanguageSwitcher />);
    expect(screen.getByText('RO')).toBeInTheDocument();
    expect(screen.getByText('RU')).toBeInTheDocument();
    expect(screen.getByText('EN')).toBeInTheDocument();
  });

  it('marks current language (ro) as active', () => {
    render(<LanguageSwitcher />);
    const roButton = screen.getByText('RO');
    expect(roButton.className).toContain('bg-blue-600');
  });

  it('marks inactive languages without bg-blue-600', () => {
    render(<LanguageSwitcher />);
    const ruButton = screen.getByText('RU');
    const enButton = screen.getByText('EN');
    expect(ruButton.className).not.toContain('bg-blue-600');
    expect(enButton.className).not.toContain('bg-blue-600');
  });

  it('calls changeLanguage with "ru" when RU is clicked', async () => {
    const user = userEvent.setup();
    render(<LanguageSwitcher />);
    await user.click(screen.getByText('RU'));
    expect(mockChangeLanguage).toHaveBeenCalledWith('ru');
  });

  it('calls changeLanguage with "en" when EN is clicked', async () => {
    const user = userEvent.setup();
    render(<LanguageSwitcher />);
    await user.click(screen.getByText('EN'));
    expect(mockChangeLanguage).toHaveBeenCalledWith('en');
  });

  it('calls changeLanguage with "ro" when RO is clicked', async () => {
    const user = userEvent.setup();
    render(<LanguageSwitcher />);
    await user.click(screen.getByText('RO'));
    expect(mockChangeLanguage).toHaveBeenCalledWith('ro');
  });
});
