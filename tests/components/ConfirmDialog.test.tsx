/**
 * Task F5 — ConfirmDialog component tests (Phase C5)
 * Tests: render, buttons, keyboard, variant, callback behavior
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
    i18n: { language: 'ro', changeLanguage: vi.fn() },
  }),
}));

import { ConfirmDialog, TextInputDialog } from '../../components/ui/ConfirmDialog';

// ─── ConfirmDialog tests ──────────────────────────────────────────────────────

describe('ConfirmDialog', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    title: 'Ștergeți rezervarea?',
    message: 'Această acțiune nu poate fi anulată.',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('render', () => {
    it('renders when isOpen=true', () => {
      render(<ConfirmDialog {...defaultProps} />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('does NOT render when isOpen=false', () => {
      render(<ConfirmDialog {...defaultProps} isOpen={false} />);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('renders title and message', () => {
      render(<ConfirmDialog {...defaultProps} />);
      expect(screen.getByText('Ștergeți rezervarea?')).toBeInTheDocument();
      expect(screen.getByText('Această acțiune nu poate fi anulată.')).toBeInTheDocument();
    });

    it('renders default confirm and cancel button text', () => {
      render(<ConfirmDialog {...defaultProps} />);
      expect(screen.getByText('Confirmă')).toBeInTheDocument();
      expect(screen.getByText('Anulează')).toBeInTheDocument();
    });

    it('renders custom button texts', () => {
      render(<ConfirmDialog {...defaultProps} confirmText="Da, șterge" cancelText="Nu, renunță" />);
      expect(screen.getByText('Da, șterge')).toBeInTheDocument();
      expect(screen.getByText('Nu, renunță')).toBeInTheDocument();
    });

    it('has role="dialog" and aria-modal="true"', () => {
      render(<ConfirmDialog {...defaultProps} />);
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('title linked via aria-labelledby', () => {
      render(<ConfirmDialog {...defaultProps} />);
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-labelledby', 'confirm-dialog-title');
    });
  });

  describe('variant', () => {
    it('renders danger icon for variant=danger', () => {
      render(<ConfirmDialog {...defaultProps} variant="danger" />);
      // Check that there's a red icon container
      const dialog = screen.getByRole('dialog');
      expect(dialog.querySelector('.bg-red-100')).toBeInTheDocument();
    });

    it('renders primary icon for variant=primary', () => {
      render(<ConfirmDialog {...defaultProps} variant="primary" />);
      const dialog = screen.getByRole('dialog');
      expect(dialog.querySelector('.bg-primary-100')).toBeInTheDocument();
    });

    it('defaults to primary variant', () => {
      render(<ConfirmDialog {...defaultProps} />);
      const dialog = screen.getByRole('dialog');
      expect(dialog.querySelector('.bg-primary-100')).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('calls onClose when Anulează is clicked', () => {
      const onClose = vi.fn();
      render(<ConfirmDialog {...defaultProps} onClose={onClose} />);
      fireEvent.click(screen.getByText('Anulează'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onConfirm AND onClose when confirm button clicked', () => {
      const onConfirm = vi.fn();
      const onClose = vi.fn();
      render(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} onClose={onClose} />);
      fireEvent.click(screen.getByText('Confirmă'));
      expect(onConfirm).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when backdrop is clicked', () => {
      const onClose = vi.fn();
      render(<ConfirmDialog {...defaultProps} onClose={onClose} />);
      const backdrop = document.querySelector('[aria-hidden="true"]');
      fireEvent.click(backdrop!);
      expect(onClose).toHaveBeenCalled();
    });

    it('calls onClose when Escape key is pressed', () => {
      const onClose = vi.fn();
      render(<ConfirmDialog {...defaultProps} onClose={onClose} />);
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does not call onConfirm when cancel is clicked', () => {
      const onConfirm = vi.fn();
      render(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} />);
      fireEvent.click(screen.getByText('Anulează'));
      expect(onConfirm).not.toHaveBeenCalled();
    });
  });
});

// ─── TextInputDialog tests ────────────────────────────────────────────────────

describe('TextInputDialog', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    title: 'Introduceți valoarea',
    message: 'Completați câmpul de mai jos.',
    placeholder: 'Ex: 1234',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders when isOpen=true', () => {
    render(<TextInputDialog {...defaultProps} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('does NOT render when isOpen=false', () => {
    render(<TextInputDialog {...defaultProps} isOpen={false} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders title and message', () => {
    render(<TextInputDialog {...defaultProps} />);
    expect(screen.getByText('Introduceți valoarea')).toBeInTheDocument();
    expect(screen.getByText('Completați câmpul de mai jos.')).toBeInTheDocument();
  });

  it('renders input with placeholder', () => {
    render(<TextInputDialog {...defaultProps} />);
    expect(screen.getByPlaceholderText('Ex: 1234')).toBeInTheDocument();
  });

  it('calls onConfirm with entered value on confirm click', () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    render(<TextInputDialog {...defaultProps} onConfirm={onConfirm} onClose={onClose} />);

    const input = screen.getByPlaceholderText('Ex: 1234');
    fireEvent.change(input, { target: { value: 'test-value' } });

    fireEvent.click(screen.getByText('Confirmă'));
    expect(onConfirm).toHaveBeenCalledWith('test-value');
    expect(onClose).toHaveBeenCalled();
  });

  it('closes on Escape key', () => {
    const onClose = vi.fn();
    render(<TextInputDialog {...defaultProps} onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('submits on Enter key', () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    render(<TextInputDialog {...defaultProps} onConfirm={onConfirm} onClose={onClose} />);

    const input = screen.getByPlaceholderText('Ex: 1234');
    fireEvent.change(input, { target: { value: 'entered-text' } });
    fireEvent.keyDown(document, { key: 'Enter' });

    expect(onConfirm).toHaveBeenCalledWith('entered-text');
  });
});
