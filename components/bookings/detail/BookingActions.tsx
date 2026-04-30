import React, { useState } from 'react';
import { Button } from '../../ui/Button';
import { useToast } from '../../ui/Toast';
import { api } from '../../../services/api';
import { getErrorMessage } from '../../../utils/formatters';

interface BookingActionsProps {
  bookingId: string;
  isAdmin: boolean;
  isNew: boolean;
  isSubmitting: boolean;
  isReadOnly: boolean;
  onBack: () => void;
  onPrint?: () => void;
}

/**
 * Fetches a PDF from the API (with auth) and triggers a browser download.
 */
async function downloadPdf(url: string, filename: string): Promise<void> {
  const res = await api.get(url, { responseType: 'blob' });
  const blob = new Blob([res.data as BlobPart], { type: 'application/pdf' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

const BookingActions: React.FC<BookingActionsProps> = ({
  bookingId,
  isAdmin,
  isNew,
  isSubmitting,
  isReadOnly,
  onBack,
  onPrint,
}) => {
  const { addToast } = useToast();
  const [loadingTransport, setLoadingTransport] = useState(false);
  const [loadingInvoice, setLoadingInvoice] = useState(false);

  const handleDownloadTransportOrder = async () => {
    if (loadingTransport) return;
    setLoadingTransport(true);
    try {
      await downloadPdf(
        `/bookings/${bookingId}/transport-order.pdf`,
        `comanda-transport-${bookingId}.pdf`
      );
      addToast('Comanda de transport a fost descărcată', 'success');
    } catch (err) {
      addToast(getErrorMessage(err, 'Eroare la generarea comenzii de transport'), 'error');
    } finally {
      setLoadingTransport(false);
    }
  };

  const handleDownloadPaymentInvoice = async () => {
    if (loadingInvoice) return;
    setLoadingInvoice(true);
    try {
      await downloadPdf(
        `/bookings/${bookingId}/payment-invoice.pdf`,
        `cont-plata-${bookingId}.pdf`
      );
      addToast('Contul de plată a fost descărcat', 'success');
    } catch (err) {
      addToast(getErrorMessage(err, 'Eroare la generarea contului de plată'), 'error');
    } finally {
      setLoadingInvoice(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-3 items-center justify-between print:hidden">
      {/* Left: back / cancel / save */}
      <div className="flex gap-2">
        {!isReadOnly && (
          <>
            <Button type="button" variant="secondary" onClick={onBack}>
              Anulează
            </Button>
            <Button type="submit" disabled={isSubmitting} loading={isSubmitting}>
              {isSubmitting
                ? 'Se salvează...'
                : isNew
                  ? 'Trimite Cererea'
                  : 'Salvează Modificările'}
            </Button>
          </>
        )}
        {isReadOnly && (
          <Button type="button" variant="secondary" onClick={onBack}>
            Înapoi
          </Button>
        )}
      </div>

      {/* Right: PDF buttons (only for existing bookings) */}
      {!isNew && (
        <div className="flex flex-wrap gap-2">
          {/* Print window (legacy) */}
          <Button
            type="button"
            variant="secondary"
            onClick={onPrint ?? (() => window.print())}
            className="flex items-center gap-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
              />
            </svg>
            Tipărește
          </Button>

          {/* Comanda Transport PDF */}
          <Button
            type="button"
            variant="secondary"
            onClick={handleDownloadTransportOrder}
            disabled={loadingTransport}
            loading={loadingTransport}
            className="flex items-center gap-2"
          >
            {!loadingTransport && (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            )}
            {loadingTransport ? 'Se generează...' : 'Comandă Transport'}
          </Button>

          {/* Cont de Plată PDF */}
          <Button
            type="button"
            variant="secondary"
            onClick={handleDownloadPaymentInvoice}
            disabled={loadingInvoice}
            loading={loadingInvoice}
            className="flex items-center gap-2"
          >
            {!loadingInvoice && (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z"
                />
              </svg>
            )}
            {loadingInvoice ? 'Se generează...' : 'Cont de Plată'}
          </Button>
        </div>
      )}
    </div>
  );
};

export default BookingActions;
