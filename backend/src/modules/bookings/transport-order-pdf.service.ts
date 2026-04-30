import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';

// Company info — update with real fiscal data
const COMPANY_INFO = {
  name: 'Promo-Efect SRL',
  idno: '1234567890',
  address: 'str. Ștefan cel Mare 123, Chișinău, MD-2001',
  phone: '+373 22 123 456',
  email: 'office@promo-efect.md',
  bankName: 'Moldova Agroindbank',
  iban: 'MD24AG000000022510018195',
  swift: 'AGRNMD2X',
};

// Font paths (optional — will fall back to built-in Helvetica if missing)
const FONTS_DIR = path.join(__dirname, '../../fonts');
const FONT_REGULAR = path.join(FONTS_DIR, 'Roboto-Regular.ttf');
const FONT_BOLD = path.join(FONTS_DIR, 'Roboto-Bold.ttf');
const hasCustomFonts = fs.existsSync(FONT_REGULAR) && fs.existsSync(FONT_BOLD);

function formatDate(d?: Date | string | null): string {
  if (!d) return '—';
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

export interface TransportOrderData {
  bookingId: string;
  blNumber?: string | null;
  portOrigin?: string | null;
  portDestination?: string | null;
  containerType?: string | null;
  containerNumber?: string | null;
  shippingLine?: string | null;
  incoterm?: string | null;
  eta?: Date | string | null;
  shipperName?: string | null;
  beneficiaryName?: string | null;
  beneficiaryAddress?: string | null;
  beneficiaryPhone?: string | null;
  beneficiaryEmail?: string | null;
  createdAt?: Date | string | null;
}

/**
 * Generates a "Comandă Transport" PDF for a booking.
 */
export async function generateTransportOrderPDF(data: TransportOrderData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        info: {
          Title: `Comanda Transport ${data.bookingId}`,
          Author: COMPANY_INFO.name,
          Subject: 'Comanda de Transport',
          Creator: 'Promo-Efect Logistics Platform',
        },
      });

      // Register fonts if available
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

      const pageW = 595 - 100; // A4 width minus margins
      let y = 50;

      // ── HEADER ────────────────────────────────────────────────
      doc.font(B).fontSize(20).fillColor('#1e40af').text('PROMO-EFECT', 50, y);
      doc
        .font(R)
        .fontSize(9)
        .fillColor('#6b7280')
        .text('Logistics & Shipping Solutions', 50, y + 24);

      doc
        .font(B)
        .fontSize(16)
        .fillColor('#111827')
        .text('COMANDĂ TRANSPORT', 0, y, {
          align: 'right',
          width: pageW + 50,
        });

      doc
        .font(R)
        .fontSize(9)
        .fillColor('#374151')
        .text(`Nr: ${data.bookingId}`, 0, y + 20, { align: 'right', width: pageW + 50 })
        .text(`Data: ${formatDate(data.createdAt || new Date())}`, 0, y + 32, {
          align: 'right',
          width: pageW + 50,
        });

      y = 110;
      doc.moveTo(50, y).lineTo(545, y).strokeColor('#e5e7eb').stroke();
      y += 15;

      // ── FURNIZOR + BENEFICIAR ─────────────────────────────────
      doc.font(B).fontSize(9).fillColor('#374151').text('FURNIZOR (Expeditor):', 50, y);
      doc
        .font(R)
        .fontSize(9)
        .fillColor('#111827')
        .text(data.shipperName || COMPANY_INFO.name, 50, y + 12)
        .text(COMPANY_INFO.address, 50, y + 24)
        .text(`Tel: ${COMPANY_INFO.phone}`, 50, y + 36);

      doc.font(B).fontSize(9).fillColor('#374151').text('BENEFICIAR:', 300, y);
      doc
        .font(R)
        .fontSize(9)
        .fillColor('#111827')
        .text(data.beneficiaryName || '—', 300, y + 12)
        .text(data.beneficiaryAddress || '', 300, y + 24)
        .text(data.beneficiaryPhone ? `Tel: ${data.beneficiaryPhone}` : '', 300, y + 36)
        .text(data.beneficiaryEmail ? `Email: ${data.beneficiaryEmail}` : '', 300, y + 48);

      y += 75;
      doc.moveTo(50, y).lineTo(545, y).strokeColor('#e5e7eb').stroke();
      y += 15;

      // ── DETALII BOOKING ────────────────────────────────────────
      doc.font(B).fontSize(11).fillColor('#111827').text('Detalii Expediere', 50, y);
      y += 18;

      const details: [string, string][] = [
        ['Număr Booking / Referință', data.bookingId],
        ['Bill of Lading (BL)', data.blNumber || '—'],
        ['Port Origine', data.portOrigin || '—'],
        ['Port Destinație', data.portDestination || '—'],
        ['Linie Maritimă', data.shippingLine || '—'],
        ['Tip Container', data.containerType || '—'],
        ['Număr Container', data.containerNumber || '—'],
        ['Data Estimată Sosire (ETA)', formatDate(data.eta)],
        ['Incoterm', data.incoterm || 'FOB'],
      ];

      details.forEach(([label, value]) => {
        doc
          .font(B)
          .fontSize(9)
          .fillColor('#6b7280')
          .text(label + ':', 50, y, { width: 180 });
        doc.font(R).fontSize(9).fillColor('#111827').text(value, 240, y, { width: 300 });
        y += 16;
      });

      y += 10;
      doc.moveTo(50, y).lineTo(545, y).strokeColor('#e5e7eb').stroke();
      y += 20;

      // ── CONDIȚII ────────────────────────────────────────────────
      doc.font(B).fontSize(11).fillColor('#111827').text('Condiții de Transport', 50, y);
      y += 15;

      const conditions = [
        '1. Expeditorul confirmă că marfa respectă toate cerințele legale pentru export/import.',
        '2. Proprietatea mărfii se transferă conform termenilor Incoterm specificați.',
        '3. Asigurarea mărfii este responsabilitatea importatorului, dacă nu este specificat altfel.',
        '4. Eventualele taxe suplimentare (demurrage, storage) vor fi notificate și facturate separat.',
        '5. Această comandă este valabilă în conformitate cu condițiile generale Promo-Efect SRL.',
      ];

      doc.font(R).fontSize(8).fillColor('#374151');
      conditions.forEach((c) => {
        doc.text(c, 50, y, { width: pageW });
        y += 14;
      });

      y += 20;

      // ── SEMNĂTURI ────────────────────────────────────────────────
      if (y > 650) {
        doc.addPage();
        y = 50;
      }

      doc.font(B).fontSize(9).fillColor('#374151').text('Expeditor:', 50, y);
      doc.font(B).fontSize(9).fillColor('#374151').text('Beneficiar:', 300, y);

      y += 60;
      doc.moveTo(50, y).lineTo(200, y).strokeColor('#9ca3af').stroke();
      doc.moveTo(300, y).lineTo(450, y).strokeColor('#9ca3af').stroke();

      y += 8;
      doc
        .font(R)
        .fontSize(8)
        .fillColor('#9ca3af')
        .text('Semnătură și ștampilă', 50, y)
        .text('Semnătură și ștampilă', 300, y);

      // ── FOOTER ─────────────────────────────────────────────────
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
          { width: pageW + 50, align: 'center', lineBreak: false }
        );
      doc.text(`Generat automat pe ${new Date().toLocaleDateString('ro-RO')}`, 50, footerY + 20, {
        width: pageW + 50,
        align: 'center',
        lineBreak: false,
      });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
