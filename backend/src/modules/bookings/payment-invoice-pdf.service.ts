import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';

// Company fiscal data Moldova
const COMPANY_INFO = {
  name: 'Promo-Efect SRL',
  idno: '1234567890',
  tva: 'MD1234567890',
  address: 'str. Ștefan cel Mare 123, Chișinău, MD-2001',
  phone: '+373 22 123 456',
  email: 'facturi@promo-efect.md',
  bankName: 'Moldova Agroindbank',
  iban: 'MD24AG000000022510018195',
  swift: 'AGRNMD2X',
};

// Font paths (optional)
const FONTS_DIR = path.join(__dirname, '../../fonts');
const FONT_REGULAR = path.join(FONTS_DIR, 'Roboto-Regular.ttf');
const FONT_BOLD = path.join(FONTS_DIR, 'Roboto-Bold.ttf');
const hasCustomFonts = fs.existsSync(FONT_REGULAR) && fs.existsSync(FONT_BOLD);

function formatDate(d?: Date | string | null): string {
  if (!d)
    return new Date().toLocaleDateString('ro-RO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  try {
    return new Date(d).toLocaleDateString('ro-RO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return String(d);
  }
}

export interface PaymentInvoiceLine {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface PaymentInvoiceData {
  bookingId: string;
  invoiceNumber: string;
  issueDate?: Date | string | null;
  // Beneficiar
  clientName?: string | null;
  clientIdno?: string | null;
  clientAddress?: string | null;
  clientPhone?: string | null;
  clientEmail?: string | null;
  // Items
  items: PaymentInvoiceLine[];
  currency?: string;
  vatRate?: number; // e.g. 0 for 0%, 0.20 for 20%
}

/**
 * Generates a "Factură de Plată" PDF compliant with Moldova fiscal requirements.
 */
export async function generatePaymentInvoicePDF(data: PaymentInvoiceData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        info: {
          Title: `Factura de Plata ${data.invoiceNumber}`,
          Author: COMPANY_INFO.name,
          Subject: 'Factură de Plată',
          Creator: 'Promo-Efect Logistics Platform',
        },
      });

      if (hasCustomFonts) {
        doc.registerFont('Regular', FONT_REGULAR);
        doc.registerFont('Bold', FONT_BOLD);
      }

      const R = hasCustomFonts ? 'Regular' : 'Helvetica';
      const B = hasCustomFonts ? 'Bold' : 'Helvetica-Bold';

      const buffers: Buffer[] = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      const pageW = 495; // usable width (595 - 2*50)
      const vatRate = data.vatRate ?? 0;
      const currency = data.currency || 'USD';
      const issueDate = formatDate(data.issueDate);

      const subtotal = data.items.reduce((s, i) => s + i.total, 0);
      const vatAmount = subtotal * vatRate;
      const total = subtotal + vatAmount;

      let y = 50;

      // ── HEADER ──────────────────────────────────────────────────
      doc.font(B).fontSize(20).fillColor('#1e40af').text('PROMO-EFECT', 50, y);
      doc
        .font(R)
        .fontSize(9)
        .fillColor('#6b7280')
        .text('Logistics & Shipping Solutions', 50, y + 24);

      doc
        .font(B)
        .fontSize(18)
        .fillColor('#111827')
        .text('FACTURĂ DE PLATĂ', 0, y, {
          align: 'right',
          width: pageW + 50,
        });

      doc
        .font(R)
        .fontSize(9)
        .fillColor('#374151')
        .text(`Nr: ${data.invoiceNumber}`, 0, y + 22, { align: 'right', width: pageW + 50 })
        .text(`Data: ${issueDate}`, 0, y + 34, { align: 'right', width: pageW + 50 });

      y = 110;
      doc.moveTo(50, y).lineTo(545, y).strokeColor('#e5e7eb').stroke();
      y += 15;

      // ── FURNIZOR + CLIENT ────────────────────────────────────────
      doc.font(B).fontSize(9).fillColor('#374151').text('FURNIZOR:', 50, y);
      doc
        .font(R)
        .fontSize(9)
        .fillColor('#111827')
        .text(COMPANY_INFO.name, 50, y + 12)
        .text(`IDNO: ${COMPANY_INFO.idno}`, 50, y + 24)
        .text(COMPANY_INFO.address, 50, y + 36)
        .text(`Tel: ${COMPANY_INFO.phone}`, 50, y + 48)
        .text(`Email: ${COMPANY_INFO.email}`, 50, y + 60);

      doc.font(B).fontSize(9).fillColor('#374151').text('CUMPĂRĂTOR:', 300, y);
      doc
        .font(R)
        .fontSize(9)
        .fillColor('#111827')
        .text(data.clientName || '—', 300, y + 12)
        .text(data.clientIdno ? `IDNO: ${data.clientIdno}` : '', 300, y + 24)
        .text(data.clientAddress || '', 300, y + 36)
        .text(data.clientPhone ? `Tel: ${data.clientPhone}` : '', 300, y + 48)
        .text(data.clientEmail ? `Email: ${data.clientEmail}` : '', 300, y + 60);

      y += 85;
      doc.moveTo(50, y).lineTo(545, y).strokeColor('#e5e7eb').stroke();
      y += 15;

      // ── BOOKING REFERENCE ────────────────────────────────────────
      doc
        .font(R)
        .fontSize(8)
        .fillColor('#6b7280')
        .text(`Referință rezervare: ${data.bookingId}`, 50, y);
      y += 16;

      // ── TABEL SERVICII ────────────────────────────────────────────
      const colDesc = 50;
      const colQty = 320;
      const colUnit = 370;
      const colTotal = 460;
      const tableRight = 545;

      // Header row
      doc.fillColor('#1e40af').rect(50, y, pageW, 22).fill();
      doc
        .font(B)
        .fontSize(8)
        .fillColor('#ffffff')
        .text('Descriere serviciu', colDesc + 5, y + 6, { width: 260 })
        .text('Cant.', colQty, y + 6, { width: 45, align: 'center' })
        .text('Preț unit.', colUnit, y + 6, { width: 80, align: 'right' })
        .text(`Total ${currency}`, colTotal, y + 6, {
          width: tableRight - colTotal - 5,
          align: 'right',
        });

      y += 22;

      // Item rows
      data.items.forEach((item, idx) => {
        const rowBg = idx % 2 === 0 ? '#ffffff' : '#f9fafb';
        doc.fillColor(rowBg).rect(50, y, pageW, 22).fill();
        doc
          .font(R)
          .fontSize(8)
          .fillColor('#111827')
          .text(item.description, colDesc + 5, y + 6, { width: 260 })
          .text(String(item.quantity), colQty, y + 6, { width: 45, align: 'center' })
          .text(item.unitPrice.toFixed(2), colUnit, y + 6, { width: 80, align: 'right' })
          .text(item.total.toFixed(2), colTotal, y + 6, {
            width: tableRight - colTotal - 5,
            align: 'right',
          });
        y += 22;
      });

      // Table border
      doc
        .strokeColor('#d1d5db')
        .rect(50, y - data.items.length * 22 - 22, pageW, data.items.length * 22 + 22)
        .stroke();

      y += 10;

      // ── TOTALS ────────────────────────────────────────────────────
      const totalsX = 350;

      const addTotalRow = (label: string, value: string, bold = false) => {
        doc
          .font(bold ? B : R)
          .fontSize(9)
          .fillColor(bold ? '#111827' : '#6b7280');
        doc.text(label, totalsX, y, { width: 100 });
        doc.font(bold ? B : R).fillColor(bold ? '#1e40af' : '#111827');
        doc.text(value, 460, y, { width: 80, align: 'right' });
        y += 16;
      };

      addTotalRow('Subtotal:', `${subtotal.toFixed(2)} ${currency}`);

      if (vatRate > 0) {
        addTotalRow(`TVA (${(vatRate * 100).toFixed(0)}%):`, `${vatAmount.toFixed(2)} ${currency}`);
      } else {
        addTotalRow('TVA:', '0% (scutit)');
      }

      // Separator
      doc.moveTo(totalsX, y).lineTo(545, y).strokeColor('#d1d5db').stroke();
      y += 6;

      addTotalRow(`TOTAL DE ACHITAT:`, `${total.toFixed(2)} ${currency}`, true);

      y += 15;
      doc.moveTo(50, y).lineTo(545, y).strokeColor('#e5e7eb').stroke();
      y += 20;

      // ── DETALII PLATĂ ────────────────────────────────────────────
      doc.font(B).fontSize(9).fillColor('#374151').text('Detalii de plată:', 50, y);
      y += 14;
      doc
        .font(R)
        .fontSize(9)
        .fillColor('#111827')
        .text(`Bancă: ${COMPANY_INFO.bankName}`, 50, y)
        .text(`IBAN: ${COMPANY_INFO.iban}`, 50, y + 14)
        .text(`SWIFT/BIC: ${COMPANY_INFO.swift}`, 50, y + 28)
        .text(`Referință plată: ${data.invoiceNumber} / ${data.bookingId}`, 50, y + 42);

      y += 70;

      // ── NOTE LEGALE ─────────────────────────────────────────────
      if (y < 680) {
        doc
          .font(R)
          .fontSize(7)
          .fillColor('#9ca3af')
          .text(
            vatRate === 0
              ? 'Servicii scutite de TVA conform Codului Fiscal al Republicii Moldova.'
              : `TVA calculat conform Codului Fiscal al Republicii Moldova, cota ${(vatRate * 100).toFixed(0)}%.`,
            50,
            y,
            { width: pageW }
          );
      }

      // ── FOOTER ──────────────────────────────────────────────────
      const footerY = 770;
      doc.moveTo(50, footerY).lineTo(545, footerY).strokeColor('#e5e7eb').stroke();
      doc
        .font(R)
        .fontSize(7)
        .fillColor('#9ca3af')
        .text(
          `${COMPANY_INFO.name} | IDNO: ${COMPANY_INFO.idno} | IBAN: ${COMPANY_INFO.iban} | ${COMPANY_INFO.bankName}`,
          50,
          footerY + 8,
          { width: pageW, align: 'center', lineBreak: false }
        )
        .text(`Generat automat pe ${new Date().toLocaleDateString('ro-RO')}`, 50, footerY + 20, {
          width: pageW,
          align: 'center',
          lineBreak: false,
        });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
