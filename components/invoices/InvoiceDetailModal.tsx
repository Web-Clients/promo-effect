import React from 'react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { XIcon, DownloadIcon, SendIcon, CheckIcon } from '../icons';
import { Invoice } from '../../services/invoices';
import { statusVariantMap, statusTextMap } from './types';

export interface InvoiceDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  onSend: (id: string) => void;
  onMarkPaid: (invoice: Invoice) => void;
  onDownload: (id: string) => void;
  onCancel: (id: string) => void;
}

const InvoiceDetailModal: React.FC<InvoiceDetailModalProps> = ({
  isOpen,
  onClose,
  invoice,
  onSend,
  onMarkPaid,
  onDownload,
  onCancel,
}) => {
  if (!isOpen || !invoice) return null;

  const balance = invoice.balance ?? invoice.amount - (invoice.amountPaid || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-neutral-800 rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b dark:border-neutral-700">
          <div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              {invoice.invoiceNumber}
            </h3>
            <Badge variant={statusVariantMap[invoice.status]}>
              {statusTextMap[invoice.status]}
            </Badge>
          </div>
          <button onClick={onClose} className="text-neutral-500 hover:text-neutral-700">
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-6">
          {/* Client Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-2">
                Client
              </h4>
              <p className="font-medium text-neutral-900 dark:text-neutral-100">
                {invoice.client.companyName}
              </p>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                {invoice.client.email}
              </p>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                {invoice.client.phone}
              </p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-2">
                Booking
              </h4>
              <p className="font-medium text-neutral-900 dark:text-neutral-100">
                {invoice.bookingId}
              </p>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                {invoice.booking?.portOrigin} → {invoice.booking?.portDestination}
              </p>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <h4 className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                Data Emiterii
              </h4>
              <p className="text-neutral-900 dark:text-neutral-100">
                {new Date(invoice.issueDate).toLocaleDateString('ro-RO')}
              </p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                Data Scadentă
              </h4>
              <p className="text-neutral-900 dark:text-neutral-100">
                {new Date(invoice.dueDate).toLocaleDateString('ro-RO')}
              </p>
            </div>
            {invoice.paidDate && (
              <div>
                <h4 className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                  Data Plății
                </h4>
                <p className="text-green-600 dark:text-green-400">
                  {new Date(invoice.paidDate).toLocaleDateString('ro-RO')}
                </p>
              </div>
            )}
          </div>

          {/* Amounts */}
          <div className="bg-neutral-50 dark:bg-neutral-900 rounded-lg p-4">
            <div className="flex justify-between mb-2">
              <span className="text-neutral-600 dark:text-neutral-400">Subtotal:</span>
              <span className="text-neutral-900 dark:text-neutral-100">
                ${(invoice.subtotal || invoice.amount / 1.19).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-neutral-600 dark:text-neutral-400">TVA (19%):</span>
              <span className="text-neutral-900 dark:text-neutral-100">
                ${(invoice.taxAmount || invoice.amount - invoice.amount / 1.19).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between font-semibold text-lg border-t dark:border-neutral-700 pt-2 mt-2">
              <span className="text-neutral-900 dark:text-neutral-100">Total:</span>
              <span className="text-blue-600 dark:text-blue-400">
                ${invoice.amount.toFixed(2)} {invoice.currency}
              </span>
            </div>
            {invoice.amountPaid && invoice.amountPaid > 0 && (
              <>
                <div className="flex justify-between mt-2">
                  <span className="text-green-600 dark:text-green-400">Achitat:</span>
                  <span className="text-green-600 dark:text-green-400">
                    -${invoice.amountPaid.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span className="text-red-600 dark:text-red-400">De plată:</span>
                  <span className="text-red-600 dark:text-red-400">${balance.toFixed(2)}</span>
                </div>
              </>
            )}
          </div>

          {/* Payments History */}
          {invoice.payments && invoice.payments.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-2">
                Istoric Plăți
              </h4>
              <div className="space-y-2">
                {invoice.payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex justify-between items-center bg-green-50 dark:bg-green-900/20 rounded-lg p-3"
                  >
                    <div>
                      <p className="font-medium text-green-700 dark:text-green-300">
                        ${payment.amount.toFixed(2)}
                      </p>
                      <p className="text-sm text-green-600 dark:text-green-400">
                        {payment.method} • {new Date(payment.paidAt).toLocaleDateString('ro-RO')}
                      </p>
                      {payment.reference && (
                        <p className="text-xs text-green-500">Ref: {payment.reference}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {invoice.notes && (
            <div>
              <h4 className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-2">
                Note
              </h4>
              <p className="text-neutral-600 dark:text-neutral-400 whitespace-pre-wrap">
                {invoice.notes}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-4 border-t dark:border-neutral-700">
            <Button variant="secondary" onClick={() => onDownload(invoice.id)}>
              <DownloadIcon className="h-4 w-4 mr-2" />
              Descarcă PDF
            </Button>

            {invoice.status === 'DRAFT' && (
              <Button onClick={() => onSend(invoice.id)}>
                <SendIcon className="h-4 w-4 mr-2" />
                Trimite
              </Button>
            )}

            {['DRAFT', 'UNPAID', 'SENT', 'OVERDUE'].includes(invoice.status) && balance > 0 && (
              <Button variant="secondary" onClick={() => onMarkPaid(invoice)}>
                <CheckIcon className="h-4 w-4 mr-2" />
                Înregistrează Plată
              </Button>
            )}

            {['DRAFT', 'UNPAID'].includes(invoice.status) && (
              <Button
                variant="ghost"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => onCancel(invoice.id)}
              >
                <XIcon className="h-4 w-4 mr-2" />
                Anulează
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceDetailModal;
