import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { XIcon } from '../icons';
import { Invoice, PaymentInput } from '../../services/invoices';

export interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: PaymentInput) => Promise<void>;
  isLoading: boolean;
  invoice: Invoice | null;
}

const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
  invoice,
}) => {
  const [formData, setFormData] = useState<PaymentInput>({
    amount: 0,
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'BANK_TRANSFER',
    reference: '',
    notes: '',
  });

  useEffect(() => {
    if (invoice && isOpen) {
      const balance = invoice.balance ?? invoice.amount - (invoice.amountPaid || 0);
      setFormData((prev) => ({
        ...prev,
        amount: balance,
      }));
    }
  }, [invoice, isOpen]);

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
      [name]: name === 'amount' ? parseFloat(value) || 0 : value,
    }));
  };

  if (!isOpen || !invoice) return null;

  const balance = invoice.balance ?? invoice.amount - (invoice.amountPaid || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-neutral-800 rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-4 border-b dark:border-neutral-700">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            Înregistrare Plată
          </h3>
          <button onClick={onClose} className="text-neutral-500 hover:text-neutral-700">
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              <span className="font-medium">Factură:</span> {invoice.invoiceNumber}
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              <span className="font-medium">Total:</span> ${invoice.amount.toFixed(2)}
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              <span className="font-medium">De plată:</span> ${balance.toFixed(2)}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Sumă *
            </label>
            <Input
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              required
              min="0.01"
              max={balance}
              step="0.01"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Data Plății *
            </label>
            <Input
              type="date"
              name="paymentDate"
              value={formData.paymentDate}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Metodă de Plată *
            </label>
            <select
              name="paymentMethod"
              value={formData.paymentMethod}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100"
            >
              <option value="BANK_TRANSFER">Transfer Bancar</option>
              <option value="CASH">Numerar</option>
              <option value="CARD">Card</option>
              <option value="OTHER">Altele</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Referință
            </label>
            <Input
              type="text"
              name="reference"
              value={formData.reference}
              onChange={handleChange}
              placeholder="Nr. tranzacție, chitanță, etc."
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
              rows={2}
              className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t dark:border-neutral-700">
            <Button type="button" variant="secondary" onClick={onClose}>
              Anulează
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Se procesează...' : 'Înregistrează Plata'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PaymentModal;
