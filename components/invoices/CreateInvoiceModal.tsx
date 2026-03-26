import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { XIcon } from '../icons';
import { CreateInvoiceData } from '../../services/invoices';
import { Client } from '../../services/clients';

export interface CreateInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateInvoiceData) => Promise<void>;
  isLoading: boolean;
  clients: Client[];
  bookings: any[];
}

const CreateInvoiceModal: React.FC<CreateInvoiceModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
  clients,
  bookings,
}) => {
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
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-neutral-800 rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b dark:border-neutral-700">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            Factură Nouă
          </h3>
          <button onClick={onClose} className="text-neutral-500 hover:text-neutral-700">
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
