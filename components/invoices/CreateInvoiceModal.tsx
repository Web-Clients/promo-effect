import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { XIcon } from '../icons';
import { CreateInvoiceData } from '../../services/invoices';
import { Client } from '../../services/clients';
import { BookingResponse } from '../../services/bookings';

export interface CreateInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateInvoiceData) => Promise<void>;
  isLoading: boolean;
  clients: Client[];
  bookings: BookingResponse[];
}

const CreateInvoiceModal: React.FC<CreateInvoiceModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
  clients,
  bookings,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLButtonElement>(null);

  // Close on Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
      // Focus trap: keep Tab cycling within the modal
      if (e.key === 'Tab' && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Move focus into modal when it opens
      setTimeout(() => firstFocusableRef.current?.focus(), 0);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleKeyDown]);

  const [formData, setFormData] = useState<CreateInvoiceData>({
    bookingId: '',
    clientId: '',
    dueDate: '',
    notes: '',
    discount: 0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'discount' ? parseFloat(value) || 0 : value,
    }));
  };

  // Set default due date (30 days from now)
  useEffect(() => {
    if (isOpen && !formData.dueDate) {
      const defaultDue = new Date();
      defaultDue.setDate(defaultDue.getDate() + 30);
      setFormData((prev) => ({
        ...prev,
        dueDate: defaultDue.toISOString().split('T')[0],
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-invoice-title"
    >
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        ref={modalRef}
        className="relative bg-white dark:bg-neutral-800 rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between p-4 border-b dark:border-neutral-700">
          <h3
            id="create-invoice-title"
            className="text-lg font-semibold text-neutral-900 dark:text-neutral-100"
          >
            Factură Nouă
          </h3>
          <button
            ref={firstFocusableRef}
            onClick={onClose}
            className="text-neutral-500 hover:text-neutral-700"
            aria-label="Închide modal"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Client *
            </label>
            <select
              name="clientId"
              value={formData.clientId}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100"
            >
              <option value="">Selectează client</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.companyName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Booking *
            </label>
            <select
              name="bookingId"
              value={formData.bookingId}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100"
            >
              <option value="">Selectează booking</option>
              {bookings
                .filter((b) => !formData.clientId || b.clientId === formData.clientId)
                .map((booking) => (
                  <option key={booking.id} value={booking.id}>
                    {booking.id} - {booking.portOrigin} → {booking.portDestination}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Data Scadentă *
            </label>
            <Input
              type="date"
              name="dueDate"
              value={formData.dueDate}
              onChange={handleChange}
              required
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Discount (%)
            </label>
            <Input
              type="number"
              name="discount"
              value={formData.discount || ''}
              onChange={handleChange}
              min="0"
              max="100"
              step="0.1"
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Note
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100"
              placeholder="Note adiționale pentru factură..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t dark:border-neutral-700">
            <Button type="button" variant="secondary" onClick={onClose}>
              Anulează
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Se creează...' : 'Creează Factură'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateInvoiceModal;
