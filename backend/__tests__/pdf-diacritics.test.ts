/**
 * Romanian diacritics in generated PDFs.
 *
 * Ion, 8 Sep 2026: "Factura generată e cu diacriticile greșite." The cause was
 * not the template. `backend/fonts/` did not exist — not in the repository and
 * not on the server — while three PDF services expected Roboto-Regular.ttf and
 * Roboto-Bold.ttf there. Two of them silently fell back to PDFKit's built-in
 * Helvetica, which is WinAnsi-encoded and has no ș, ț, ă, î or â. The third
 * registered the font unconditionally and would throw outright.
 *
 * The first test below is the one that matters operationally: it fails if the
 * fonts ever go missing from a build again, instead of letting a deploy ship
 * mangled invoices to the client's customers.
 */

import fs from 'fs';
import path from 'path';
import { generateInvoicePDF } from '../src/services/pdf.service';

const FONTS_DIR = path.join(__dirname, '../fonts');
const ROMANIAN = 'Recepție mărfuri: transport Constanța – Chișinău, taxă vamală și comision';

describe('PDF fonts', () => {
  it('ships the fonts the PDF services expect', () => {
    // If this fails, every generated invoice loses its diacritics.
    expect(fs.existsSync(path.join(FONTS_DIR, 'Roboto-Regular.ttf'))).toBe(true);
    expect(fs.existsSync(path.join(FONTS_DIR, 'Roboto-Bold.ttf'))).toBe(true);
  });

  it('the shipped fonts are real TrueType files, not placeholders', () => {
    for (const name of ['Roboto-Regular.ttf', 'Roboto-Bold.ttf']) {
      const buf = fs.readFileSync(path.join(FONTS_DIR, name));
      expect(buf.length).toBeGreaterThan(50_000);
      // TrueType magic: 0x00010000, or 'true' on some Apple builds.
      const magic = buf.subarray(0, 4);
      const isTrueType =
        magic.equals(Buffer.from([0x00, 0x01, 0x00, 0x00])) || magic.toString() === 'true';
      expect(isTrueType).toBe(true);
    }
  });
});

describe('generateInvoicePDF', () => {
  const invoice = {
    id: 'inv-1',
    invoiceNumber: 'PE-2026-0001',
    issueDate: new Date('2026-09-08'),
    dueDate: new Date('2026-09-22'),
    amount: 2475,
    currency: 'USD',
    status: 'ISSUED',
    notes: 'Plata în termen de 14 zile. Mărfuri perisabile — descărcare la Chișinău.',
    client: {
      id: 'c1',
      companyName: 'Întreprinderea Mărfuri Grele SRL',
      address: 'str. Ștefan cel Mare 1, Chișinău',
      email: 'client@example.md',
      phone: '+373 69 000 000',
      taxId: '1234567890123',
    },
    booking: { id: 'b1', bookingNumber: 'PE-0001' },
    payments: [],
  } as never;

  const lineItems = [{ description: ROMANIAN, quantity: 1, unitPrice: 2475, total: 2475 }];

  it('renders Romanian text without throwing', async () => {
    const pdf = await generateInvoicePDF(invoice, lineItems);
    expect(Buffer.isBuffer(pdf)).toBe(true);
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('embeds Roboto rather than falling back to Helvetica', async () => {
    const pdf = await generateInvoicePDF(invoice, lineItems);
    const raw = pdf.toString('latin1');
    expect(raw).toMatch(/Roboto/);
  });
});
