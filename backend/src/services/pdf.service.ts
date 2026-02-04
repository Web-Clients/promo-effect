import PDFDocument from 'pdfkit';
import path from 'path';
import { Invoice, Client, Booking, Payment } from '@prisma/client';

// Font paths for Romanian character support
const FONTS_DIR = path.join(__dirname, '../../fonts');
const FONT_REGULAR = path.join(FONTS_DIR, 'Roboto-Regular.ttf');
const FONT_BOLD = path.join(FONTS_DIR, 'Roboto-Bold.ttf');

// Company details for Moldova fiscal compliance
const COMPANY_INFO = {
  name: 'Promo-Efect SRL',
  cui: 'MD1234567890',  // Cod Unic de Identificare
  address: 'str. Ștefan cel Mare 123, Chișinău, MD-2001',
  phone: '+373 22 123 456',
  email: 'facturi@promo-efect.md',
  bankName: 'Moldova Agroindbank',
  bankAccount: 'MD24AG000000022510018195',
  bankSwift: 'AGRNMD2X',
};

// VAT rate for Moldova
const VAT_RATE = 0.19; // 19%

interface InvoiceWithRelations extends Invoice {
  client: Client;
  booking: Booking;
  payments: Payment[];
}

interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

/**
 * Generates a professional invoice PDF compliant with Moldova fiscal requirements
 */
export async function generateInvoicePDF(
  invoice: InvoiceWithRelations,
  lineItems?: InvoiceLineItem[]
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        info: {
          Title: `Factura ${invoice.invoiceNumber}`,
          Author: COMPANY_INFO.name,
          Subject: 'Factura fiscală',
          Creator: 'Promo-Efect Logistics Platform',
        },
      });

      const buffers: Buffer[] = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // Register custom fonts for Romanian character support (ș, ț, ă, î, â)
      doc.registerFont('Roboto', FONT_REGULAR);
      doc.registerFont('Roboto-Bold', FONT_BOLD);

      // Calculate amounts
      const subtotal = invoice.amount / (1 + VAT_RATE);
      const vatAmount = invoice.amount - subtotal;
      const totalPaid = invoice.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
      const balance = invoice.amount - totalPaid;

      // ========== HEADER ==========
      // Company Logo placeholder (can be replaced with actual logo)
      doc.fontSize(24)
         .font('Roboto-Bold')
         .fillColor('#1e40af')
         .text('PROMO-EFECT', 50, 50);
      
      doc.fontSize(10)
         .font('Roboto')
         .fillColor('#666666')
         .text('Logistics & Shipping Solutions', 50, 78);

      // Invoice title
      doc.fontSize(28)
         .font('Roboto-Bold')
         .fillColor('#111827')
         .text('FACTURĂ', 400, 50, { align: 'right' });

      // Invoice number and status
      doc.fontSize(12)
         .font('Roboto')
         .fillColor('#374151')
         .text(`Nr: ${invoice.invoiceNumber}`, 400, 85, { align: 'right' });

      // Horizontal line
      doc.moveTo(50, 130)
         .lineTo(545, 130)
         .strokeColor('#e5e7eb')
         .stroke();

      // ========== COMPANY & CLIENT INFO ==========
      let yPos = 150;

      // Company info (left side)
      doc.fontSize(10)
         .font('Roboto-Bold')
         .fillColor('#374151')
         .text('FURNIZOR:', 50, yPos);

      doc.font('Roboto')
         .fontSize(10)
         .fillColor('#111827')
         .text(COMPANY_INFO.name, 50, yPos + 15)
         .text(`CUI: ${COMPANY_INFO.cui}`, 50, yPos + 30)
         .text(COMPANY_INFO.address, 50, yPos + 45)
         .text(`Tel: ${COMPANY_INFO.phone}`, 50, yPos + 60)
         .text(`Email: ${COMPANY_INFO.email}`, 50, yPos + 75);

      // Client info (right side)
      doc.font('Roboto-Bold')
         .fillColor('#374151')
         .text('BENEFICIAR:', 300, yPos);

      doc.font('Roboto')
         .fillColor('#111827')
         .text(invoice.client.companyName, 300, yPos + 15)
         .text(invoice.client.taxId ? `CUI: ${invoice.client.taxId}` : '', 300, yPos + 30)
         .text(invoice.client.address || '', 300, yPos + 45)
         .text(`Tel: ${invoice.client.phone}`, 300, yPos + 60)
         .text(`Email: ${invoice.client.email}`, 300, yPos + 75);

      // ========== DATES ==========
      yPos = 260;
      
      doc.font('Roboto')
         .fontSize(10)
         .fillColor('#6b7280')
         .text('Data emiterii:', 50, yPos)
         .text('Data scadentă:', 50, yPos + 15);

      doc.fillColor('#111827')
         .text(formatDate(invoice.issueDate), 140, yPos)
         .text(formatDate(invoice.dueDate), 140, yPos + 15);

      if (invoice.paidDate) {
        doc.fillColor('#6b7280')
           .text('Data plății:', 50, yPos + 30);
        doc.fillColor('#10b981')
           .text(formatDate(invoice.paidDate), 140, yPos + 30);
      }

      // ========== LINE ITEMS TABLE ==========
      yPos = 320;

      // Table header
      doc.fillColor('#f3f4f6')
         .rect(50, yPos, 495, 25)
         .fill();

      doc.font('Roboto-Bold')
         .fontSize(10)
         .fillColor('#374151')
         .text('Descriere', 55, yPos + 7)
         .text('Cant.', 330, yPos + 7, { width: 50, align: 'center' })
         .text('Preț unit.', 380, yPos + 7, { width: 70, align: 'right' })
         .text('Total', 460, yPos + 7, { width: 80, align: 'right' });

      yPos += 25;

      // Line items
      const items = lineItems || generateDefaultLineItems(invoice);
      
      doc.font('Roboto').fontSize(10);

      items.forEach((item, index) => {
        const rowColor = index % 2 === 0 ? '#ffffff' : '#fafafa';
        doc.fillColor(rowColor)
           .rect(50, yPos, 495, 25)
           .fill();

        doc.fillColor('#111827')
           .text(item.description, 55, yPos + 7, { width: 265 })
           .text(item.quantity.toString(), 330, yPos + 7, { width: 50, align: 'center' })
           .text(`$${item.unitPrice.toFixed(2)}`, 380, yPos + 7, { width: 70, align: 'right' })
           .text(`$${item.total.toFixed(2)}`, 460, yPos + 7, { width: 80, align: 'right' });

        yPos += 25;
      });

      // Table border
      doc.strokeColor('#e5e7eb')
         .rect(50, 320, 495, yPos - 320)
         .stroke();

      // ========== TOTALS ==========
      yPos += 20;

      // Subtotal
      doc.font('Roboto')
         .fillColor('#6b7280')
         .text('Subtotal:', 380, yPos);
      doc.fillColor('#111827')
         .text(`$${subtotal.toFixed(2)}`, 460, yPos, { width: 80, align: 'right' });

      // VAT
      yPos += 18;
      doc.fillColor('#6b7280')
         .text(`TVA (${VAT_RATE * 100}%):`, 380, yPos);
      doc.fillColor('#111827')
         .text(`$${vatAmount.toFixed(2)}`, 460, yPos, { width: 80, align: 'right' });

      // Total line
      yPos += 5;
      doc.moveTo(380, yPos + 15)
         .lineTo(545, yPos + 15)
         .strokeColor('#e5e7eb')
         .stroke();

      // Total
      yPos += 25;
      doc.font('Roboto-Bold')
         .fontSize(12)
         .fillColor('#111827')
         .text('TOTAL:', 380, yPos);
      doc.fillColor('#1e40af')
         .text(`$${invoice.amount.toFixed(2)} ${invoice.currency}`, 460, yPos, { width: 80, align: 'right' });

      // Amount paid
      if (totalPaid > 0) {
        yPos += 20;
        doc.font('Roboto')
           .fontSize(10)
           .fillColor('#10b981')
           .text('Achitat:', 380, yPos);
        doc.text(`-$${totalPaid.toFixed(2)}`, 460, yPos, { width: 80, align: 'right' });
      }

      // Balance due
      if (balance > 0) {
        yPos += 20;
        doc.font('Roboto-Bold')
           .fontSize(11)
           .fillColor('#ef4444')
           .text('De plată:', 380, yPos);
        doc.text(`$${balance.toFixed(2)}`, 460, yPos, { width: 80, align: 'right' });
      }

      // ========== PAYMENT INFO ==========
      yPos += 50;

      doc.font('Roboto-Bold')
         .fontSize(11)
         .fillColor('#374151')
         .text('Detalii de plată:', 50, yPos);

      yPos += 18;
      doc.font('Roboto')
         .fontSize(10)
         .fillColor('#111827')
         .text(`Bancă: ${COMPANY_INFO.bankName}`, 50, yPos)
         .text(`IBAN: ${COMPANY_INFO.bankAccount}`, 50, yPos + 15)
         .text(`SWIFT: ${COMPANY_INFO.bankSwift}`, 50, yPos + 30)
         .text(`Referință: ${invoice.invoiceNumber}`, 50, yPos + 45);

      yPos += 60; // Update position after bank details

      // ========== NOTES ==========
      if (invoice.notes) {
        yPos += 20;
        doc.font('Roboto-Bold')
           .fontSize(10)
           .fillColor('#374151')
           .text('Note:', 50, yPos);

        doc.font('Roboto')
           .fillColor('#6b7280')
           .text(invoice.notes, 50, yPos + 15, { width: 495 });

        yPos += 30;
      }

      // ========== FOOTER ==========
      // Draw footer at fixed position on page 1 (A4 height = 842 points)
      const footerY = 760;

      // Draw line
      doc.moveTo(50, footerY)
         .lineTo(545, footerY)
         .strokeColor('#e5e7eb')
         .stroke();

      // Footer text line 1 - use lineBreak: false to prevent page overflow
      doc.font('Roboto')
         .fontSize(7)
         .fillColor('#9ca3af');

      doc.text(
        'Această factură a fost generată electronic și este validă fără semnătură și ștampilă conform legislației Republicii Moldova.',
        50,
        footerY + 8,
        { width: 495, align: 'center', lineBreak: false }
      );

      // Footer text line 2
      doc.text(
        `Generat de Promo-Efect Logistics Platform | ${new Date().toISOString()}`,
        50,
        footerY + 20,
        { width: 495, align: 'center', lineBreak: false }
      );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Generate default line items from booking data
 * Structure requested by client:
 * 1. Transport maritim: Shanghai - Constanta
 * 2. Expediere, formalități portuare de tranzit și transport: Constanta - Chișinău
 * 3. Taxe de verificare în port (dacă sunt)
 * 4. Storage/conectare (dacă sunt) - cu zile
 * 5. Demurrage (dacă sunt) - cu zile
 */
function generateDefaultLineItems(invoice: InvoiceWithRelations): InvoiceLineItem[] {
  const booking = invoice.booking as any; // Cast to any to access new optional fields
  const items: InvoiceLineItem[] = [];

  if (booking) {
    // 1. Maritime transport (origin -> transit port or destination)
    const transitPort = booking.portTransit || 'Constanța';
    if (booking.freightPrice > 0) {
      items.push({
        description: `Transport maritim: ${booking.portOrigin} - ${transitPort}`,
        quantity: 1,
        unitPrice: booking.freightPrice,
        total: booking.freightPrice,
      });
    }

    // 2. Forwarding, port formalities & terrestrial transport (transit -> final destination)
    const forwardingTotal = (booking.forwardingFees || 0) + (booking.terrestrialTransport || 0);
    if (forwardingTotal > 0) {
      items.push({
        description: `Expediere, formalități portuare de tranzit și transport: ${transitPort} - ${booking.portDestination}`,
        quantity: 1,
        unitPrice: forwardingTotal,
        total: forwardingTotal,
      });
    } else if (booking.terrestrialTransport > 0) {
      // Fallback if only terrestrial transport is set
      items.push({
        description: `Expediere, formalități portuare și transport: ${transitPort} - ${booking.portDestination}`,
        quantity: 1,
        unitPrice: booking.terrestrialTransport,
        total: booking.terrestrialTransport,
      });
    }

    // 3. Port verification fees (if applicable)
    if (booking.verificationFees && booking.verificationFees > 0) {
      items.push({
        description: 'Taxe de verificare în port',
        quantity: 1,
        unitPrice: booking.verificationFees,
        total: booking.verificationFees,
      });
    }

    // 4. Storage/connection fees (if applicable) - with days
    if (booking.storageFees && booking.storageFees > 0) {
      const storageDays = booking.storageDays || 1;
      items.push({
        description: `Storage/conectare (${storageDays} ${storageDays === 1 ? 'zi' : 'zile'})`,
        quantity: storageDays,
        unitPrice: booking.storageFees / storageDays,
        total: booking.storageFees,
      });
    }

    // 5. Demurrage fees (if applicable) - with days
    if (booking.demurrageFees && booking.demurrageFees > 0) {
      const demurrageDays = booking.demurrageDays || 1;
      items.push({
        description: `Demurrage (${demurrageDays} ${demurrageDays === 1 ? 'zi' : 'zile'})`,
        quantity: demurrageDays,
        unitPrice: booking.demurrageFees / demurrageDays,
        total: booking.demurrageFees,
      });
    }

    // Port taxes (if not included in forwarding)
    if (booking.portTaxes > 0 && !booking.forwardingFees) {
      items.push({
        description: 'Taxe portuare',
        quantity: 1,
        unitPrice: booking.portTaxes,
        total: booking.portTaxes,
      });
    }

    // Customs taxes
    if (booking.customsTaxes > 0) {
      items.push({
        description: 'Taxe vamale',
        quantity: 1,
        unitPrice: booking.customsTaxes,
        total: booking.customsTaxes,
      });
    }

    // Commission/service fee
    if (booking.commission > 0) {
      items.push({
        description: 'Servicii de logistică și coordonare',
        quantity: 1,
        unitPrice: booking.commission,
        total: booking.commission,
      });
    }
  } else {
    // Generic line item if no booking
    items.push({
      description: 'Servicii de logistică',
      quantity: 1,
      unitPrice: invoice.amount / (1 + VAT_RATE),
      total: invoice.amount / (1 + VAT_RATE),
    });
  }

  return items;
}

/**
 * Format date for display
 */
function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('ro-RO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export default { generateInvoicePDF };
