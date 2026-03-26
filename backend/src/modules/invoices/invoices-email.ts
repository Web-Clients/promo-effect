import { infobipService } from '../../services/infobip.service';

/**
 * Send invoice email with PDF attachment via Infobip
 */
export async function sendInvoiceEmail(
  invoice: any,
  pdfBuffer: Buffer,
  pdfUrl: string | null
): Promise<void> {
  try {
    const client = invoice.client;
    const totalAmount = (invoice as any).totalAmount || invoice.amount;
    const dueDate = new Date(invoice.dueDate).toLocaleDateString('ro-RO');

    const textContent = `
Bună ziua ${client.companyName},

Vă trimitem factura ${invoice.invoiceNumber} în valoare de ${totalAmount} ${invoice.currency}.

Detalii factură:
- Număr: ${invoice.invoiceNumber}
- Data emiterii: ${new Date(invoice.issueDate).toLocaleDateString('ro-RO')}
- Data scadență: ${dueDate}
- Suma totală: ${totalAmount} ${invoice.currency}

${pdfUrl ? `Factura PDF este disponibilă la: ${pdfUrl}` : 'Factura PDF este atașată acestui email.'}

Vă rugăm să efectuați plata până la data scadență.

Mulțumim,
Echipa Promo-Efect SRL
    `.trim();

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Factură ${invoice.invoiceNumber}</h2>
        <p>Bună ziua ${client.companyName},</p>
        <p>Vă trimitem factura <strong>${invoice.invoiceNumber}</strong> în valoare de <strong>${totalAmount} ${invoice.currency}</strong>.</p>

        <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3>Detalii factură:</h3>
          <ul>
            <li><strong>Număr:</strong> ${invoice.invoiceNumber}</li>
            <li><strong>Data emiterii:</strong> ${new Date(invoice.issueDate).toLocaleDateString('ro-RO')}</li>
            <li><strong>Data scadență:</strong> ${dueDate}</li>
            <li><strong>Suma totală:</strong> ${totalAmount} ${invoice.currency}</li>
          </ul>
        </div>

        ${
          pdfUrl
            ? `<p>Factura PDF este disponibilă la: <a href="${pdfUrl}">${pdfUrl}</a></p>`
            : '<p>Factura PDF este atașată acestui email.</p>'
        }

        <p>Vă rugăm să efectuați plata până la data scadență.</p>

        <p>Mulțumim,<br>Echipa Promo-Efect SRL</p>
      </div>
    `;

    const result = await infobipService.sendEmail({
      to: client.email,
      subject: `Factură ${invoice.invoiceNumber} - Promo-Efect SRL`,
      text: textContent,
      html: htmlContent,
      attachments: pdfUrl
        ? undefined
        : [
            {
              filename: `${invoice.invoiceNumber}.pdf`,
              content: pdfBuffer,
              contentType: 'application/pdf',
            },
          ],
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to send invoice email');
    }

    console.log(
      `[InvoicesService] Invoice email sent to ${client.email} for invoice ${invoice.invoiceNumber}`
    );
  } catch (error: any) {
    console.error('[InvoicesService] Failed to send invoice email:', error);
    throw error;
  }
}
