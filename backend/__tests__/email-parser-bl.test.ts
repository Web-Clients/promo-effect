/**
 * Email Parser BL Extraction Tests
 * Phase A2 — Task A2: validate BL regex extraction on 5 sample emails
 */

import { REGEX_PATTERNS } from '../src/modules/emails/email.types';

// Helper: extract BL numbers from a text string using REGEX_PATTERNS.blNumber
function extractBL(content: string): string[] {
  const pattern = new RegExp(REGEX_PATTERNS.blNumber.source, REGEX_PATTERNS.blNumber.flags);
  const matches = content.match(pattern);
  return matches ? matches.map((m) => m.toUpperCase()) : [];
}

// ===== 5 Sample Emails =====

const SAMPLE_EMAILS = [
  {
    name: 'MSC BL confirmation',
    content: `
Subject: Booking Confirmation MEDUKC298446
Dear Customer,
Please find attached the B/L for container FTAU1173171.
B/L Number: MEDUKC298446
Vessel: MSC AYDIN
ETD: 2026-03-10 from Shanghai
ETA Constanta: 2026-04-15
Shipping Line: MSC
    `,
    expectedBLs: ['MEDUKC298446', 'FTAU1173171'],
  },
  {
    name: 'COSCO Bill of Lading',
    content: `
Subject: COSCO Bill of Lading COSU1234567890
The Bill of Lading COSU1234567890 has been released.
Container: CCLU1234567
Route: Ningbo → Constanta
ETA: 2026-05-01
Voyage: 022E
    `,
    expectedBLs: ['COSU1234567890'],
  },
  {
    name: 'Hapag-Lloyd telex release',
    content: `
From: agent@hapaglloyd.com
B/L No: HLCUSHA230512345
Telex release confirmed for HLCUSHA230512345
Container HLXU9876543 released at Constanta.
    `,
    expectedBLs: ['HLCUSHA230512345'],
  },
  {
    name: 'Maersk arrival notice',
    content: `
ARRIVAL NOTICE
B/L Reference: MAEU1987654321
Port of Discharge: Constanta, Romania
Container: MSKU3456789
Estimated Arrival: 10.04.2026
Shipper: BETY COMPANY SRL
    `,
    expectedBLs: ['MAEU1987654321'],
  },
  {
    name: 'CMA CGM multi-container',
    content: `
CMA CGM - Shipping Instructions
BL Number: CMAUSHA2601001
Containers:
  CMAU7654321 - 40HC
  CMAU7654322 - 20DC
Voyage: FE2 123E
Port Loading: Shanghai
Port Discharge: Constanta
    `,
    expectedBLs: ['CMAUSHA2601001'],
  },
];

describe('BL Number Extraction', () => {
  SAMPLE_EMAILS.forEach(({ name, content, expectedBLs }) => {
    it(`should extract BL from: ${name}`, () => {
      const extracted = extractBL(content);

      expectedBLs.forEach((expectedBl) => {
        expect(extracted).toContain(expectedBl);
      });
    });
  });

  it('should not extract false positives from plain text', () => {
    const plainText = 'Please contact us at 123456 or email us. Your order 12345678 is ready.';
    const extracted = extractBL(plainText);
    // Should not extract short or all-number sequences
    expect(extracted.every((bl) => /[A-Z]{4,}/.test(bl))).toBe(true);
  });

  it('should handle emails with no BL number gracefully', () => {
    const noBlEmail = 'Hello, this is a general inquiry about shipping rates to Constanta.';
    const extracted = extractBL(noBlEmail);
    expect(extracted).toHaveLength(0);
  });
});
