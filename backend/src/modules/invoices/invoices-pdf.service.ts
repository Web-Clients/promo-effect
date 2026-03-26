import prisma from '../../lib/prisma';
import { generateInvoicePDF } from '../../services/pdf.service';
import { storageService } from '../../services/storage.service';
import notificationService from '../../services/notification.service';

// ============================================
// PDF GENERATION SERVICE
// ============================================

/**
 * Load full invoice data needed for PDF generation
 */
async function loadInvoiceForPDF(id: string) {
  return prisma.invoice.findUnique({
    where: { id },
    include: {
      client: true,
      booking: true,
      payments: true,
    },
  });
}

/**
 * Generate PDF buffer for a given invoice object
 */
export async function buildInvoicePDFBuffer(invoice: any): Promise<Buffer> {
  return generateInvoicePDF(invoice);
}

/**
 * Upload PDF buffer to storage and return URL (or null on failure)
 */
export async function uploadInvoicePDF(
  pdfBuffer: Buffer,
  invoiceNumber: string
): Promise<string | null> {
  try {
    return await storageService.uploadFile(pdfBuffer, `${invoiceNumber}.pdf`, 'invoices');
  } catch (error) {
    console.error('[InvoicesPdfService] Failed to save PDF to storage:', error);
    return null;
  }
}

/**
 * Generate and return PDF for an invoice by ID.
 * Used by the download/preview endpoint.
 */
export async function generateInvoicePDFById(
  id: string,
  userRole?: string,
  userClientId?: string
): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
  const invoice = await loadInvoiceForPDF(id);

  if (!invoice) {
    throw new Error('Invoice not found');
  }

  // Permission check
  if (userRole === 'CLIENT' && userClientId && invoice.clientId !== userClientId) {
    throw new Error('Access denied');
  }

  const pdfBuffer = await buildInvoicePDFBuffer(invoice);

  return {
    buffer: pdfBuffer,
    filename: `${invoice.invoiceNumber}.pdf`,
    contentType: 'application/pdf',
  };
}

// ============================================
// NOTIFICATION HELPERS
// ============================================

/**
 * Send invoice-sent notification to client users
 */
export async function notifyInvoiceSent(invoice: any, pdfUrl: string | null): Promise<void> {
  try {
    const clientRecord = await (prisma.client as any).findUnique({
      where: { id: invoice.clientId },
      include: { user: true },
    });
    const clientUsers = clientRecord?.user
      ? [clientRecord.user]
      : await prisma.user.findMany({ where: { role: 'CLIENT' }, take: 5 });

    for (const user of clientUsers) {
      try {
        await notificationService.sendNotification({
          userId: user.id,
          bookingId: invoice.bookingId,
          type: 'INVOICE_SENT',
          title: `Factură ${invoice.invoiceNumber}`,
          message: `Factura ${invoice.invoiceNumber} în valoare de ${invoice.totalAmount || invoice.amount} ${invoice.currency} a fost emisă. Data scadență: ${new Date(invoice.dueDate).toLocaleDateString('ro-RO')}.`,
          channels: { email: true, sms: false, whatsapp: false, push: true },
          templateData: {
            invoiceNumber: invoice.invoiceNumber,
            amount: invoice.totalAmount || invoice.amount,
            currency: invoice.currency,
            dueDate: new Date(invoice.dueDate).toLocaleDateString('ro-RO'),
            clientName: invoice.client.companyName,
            pdfUrl: pdfUrl || undefined,
          },
        });
      } catch (error) {
        console.error(
          `[InvoicesPdfService] Failed to send notification to user ${user.id}:`,
          error
        );
      }
    }
  } catch (error) {
    console.error('[InvoicesPdfService] Failed to send invoice notifications:', error);
  }
}

/**
 * Send payment-received notification to client
 */
export async function notifyPaymentReceived(
  updatedInvoice: any,
  paymentData: { amount: number; paymentMethod: string; paymentDate: Date | string },
  totalPaid: number,
  totalAmount: number,
  isFullyPaid: boolean,
  currency: string
): Promise<void> {
  try {
    const clientEmail = updatedInvoice.client?.email;
    if (!clientEmail) return;

    const clientUser = await prisma.user.findFirst({ where: { email: clientEmail } });
    if (!clientUser && !updatedInvoice.clientId) return;

    await notificationService.sendNotification({
      userId: clientUser?.id || updatedInvoice.clientId,
      bookingId: updatedInvoice.bookingId || undefined,
      type: isFullyPaid ? 'INVOICE_PAID' : 'PAYMENT_RECEIVED',
      title: isFullyPaid
        ? `Factură ${updatedInvoice.invoiceNumber} - Plătită Complet`
        : `Plată Primită pentru Factura ${updatedInvoice.invoiceNumber}`,
      message: isFullyPaid
        ? `Factura ${updatedInvoice.invoiceNumber} a fost plătită complet.\n\nSuma plătită: ${paymentData.amount.toFixed(2)} ${currency}\nMetodă de plată: ${paymentData.paymentMethod}\nData plății: ${new Date(paymentData.paymentDate).toLocaleDateString('ro-RO')}\n\nMulțumim pentru plată!`
        : `Am primit o plată pentru factura ${updatedInvoice.invoiceNumber}.\n\nSuma plătită: ${paymentData.amount.toFixed(2)} ${currency}\nTotal plătit: ${totalPaid.toFixed(2)} ${currency}\nRest de plată: ${(totalAmount - totalPaid).toFixed(2)} ${currency}\nMetodă de plată: ${paymentData.paymentMethod}\nData plății: ${new Date(paymentData.paymentDate).toLocaleDateString('ro-RO')}`,
      channels: { email: true, push: false, sms: false, whatsapp: false },
    });
  } catch (error) {
    console.error('[InvoicesPdfService] Failed to send payment notification email:', error);
  }
}
