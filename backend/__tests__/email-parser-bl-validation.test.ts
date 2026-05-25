/**
 * Bill-of-Lading Parser Validation Tests
 *
 * Regression tests for the 4 CMA-CGM client-reported bugs (25 May 2026):
 *   Bug 1: containerNumber copied into billOfLading (both fields equal)
 *   Bug 2: shippingLine detected as "ONE" instead of "CMA-CGM"
 *   Bug 3: consigneeName extracted as "Import SRL" instead of real consignee
 *   Bug 4: portOfDischarge extracted as "Jo" / "Ergonjo" instead of "Constanta"
 *
 * These tests mock the Gemini service to return the BAD values and verify
 * that the post-processing validators in email-classifier.ts catch + repair.
 */

import { ParsedEmailData } from '../src/services/gemini.service';

// Mock the gemini service BEFORE importing the classifier.
jest.mock('../src/services/gemini.service', () => {
  const originalModule = jest.requireActual('../src/services/gemini.service');
  return {
    __esModule: true,
    ...originalModule,
    isGeminiConfigured: jest.fn().mockReturnValue(true),
    parseShippingDocumentWithGemini: jest.fn(),
    parseEmailWithGemini: jest.fn(),
  };
});

import * as geminiService from '../src/services/gemini.service';
import { parseShippingDocumentWithAI } from '../src/modules/emails/email-classifier';

// Realistic CMA-CGM PDF body fragments used as raw text for fallback regex scans.
const CMA_CGM_PDF_TEXT = `
CMA CGM
BILL OF LADING — Issued by CMA CGM S.A.

B/L No: LGP1234567
Booking No: NGP3566733

Shipper: SHENZHEN ELECTRONICS LTD
        88 NANSHAN AVENUE, SHENZHEN, CHINA

Consignee: COMAGROTEH SRL
          STR. ALBA IULIA 12, CHISINAU, MOLDOVA
          IDNO 1003600012345

Notify Party: SAME AS CONSIGNEE

Vessel: CMA CGM JACQUES SAADE        Voy.No: 0FX1WW
Port of Loading: Ningbo, China
Port of Discharge: Constanta, Romania
Place of Delivery: Chisinau

Container No(s):  CMAU1234567 / Seal M5174463

Marks & Numbers: 1441 CARTONS
Description: ELECTRONIC APPLIANCES
Gross Weight: 24350.00 KGS
Measurement: 68.000 CBM
Freight: PREPAID
`;

describe('parseShippingDocumentWithAI — CMA-CGM bug regression', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('Bug 1: AI returns same value for container and BL → BL is rejected, real BL recovered from PDF text', async () => {
    const badGeminiOutput: ParsedEmailData = {
      containerNumber: 'CMAU1234567',
      billOfLading: 'CMAU1234567', // BUG: duplicate
      shippingLine: 'CMA-CGM',
      portOfLoading: 'Ningbo',
      portOfDischarge: 'Constanta',
      consigneeName: 'Comagroteh SRL',
      confidence: 88,
    };
    (geminiService.parseShippingDocumentWithGemini as jest.Mock).mockResolvedValue(badGeminiOutput);

    const result = await parseShippingDocumentWithAI(CMA_CGM_PDF_TEXT, '');

    expect(result).not.toBeNull();
    expect(result!.containerNumber).toBe('CMAU1234567');
    // The fallback regex picks up "B/L No: LGP1234567" from the PDF text.
    expect(result!.blNumber).toBe('LGP1234567');
    expect(result!.blNumber).not.toBe(result!.containerNumber);
  });

  test('Bug 1b: BL is dropped entirely when no fallback BL exists in raw text', async () => {
    const badGeminiOutput: ParsedEmailData = {
      containerNumber: 'CMAU1234567',
      billOfLading: 'CMAU1234567', // BUG
      shippingLine: 'CMA-CGM',
      portOfLoading: 'Ningbo',
      portOfDischarge: 'Constanta',
      confidence: 88,
    };
    (geminiService.parseShippingDocumentWithGemini as jest.Mock).mockResolvedValue(badGeminiOutput);

    const result = await parseShippingDocumentWithAI('no BL label in this text', '');
    expect(result).not.toBeNull();
    expect(result!.containerNumber).toBe('CMAU1234567');
    expect(result!.blNumber).toBeUndefined();
  });

  test('Bug 2: AI returns "ONE" but PDF clearly shows CMA-CGM → carrier override fires', async () => {
    const badGeminiOutput: ParsedEmailData = {
      containerNumber: 'CMAU1234567',
      billOfLading: 'LGP1234567',
      shippingLine: 'ONE', // BUG: wrong carrier
      portOfLoading: 'Ningbo',
      portOfDischarge: 'Constanta',
      consigneeName: 'Comagroteh SRL',
      confidence: 80,
    };
    (geminiService.parseShippingDocumentWithGemini as jest.Mock).mockResolvedValue(badGeminiOutput);

    const result = await parseShippingDocumentWithAI(CMA_CGM_PDF_TEXT, '');
    expect(result).not.toBeNull();
    expect(result!.shippingLine).toBe('CMA CGM');
  });

  test('Bug 2b: AI returns "cma-cgm" lowercase → normalized to canonical "CMA CGM"', async () => {
    const goodWithBadCasing: ParsedEmailData = {
      containerNumber: 'CMAU1234567',
      billOfLading: 'LGP1234567',
      shippingLine: 'cma-cgm',
      portOfLoading: 'Ningbo',
      portOfDischarge: 'Constanta',
      confidence: 88,
    };
    (geminiService.parseShippingDocumentWithGemini as jest.Mock).mockResolvedValue(
      goodWithBadCasing
    );

    const result = await parseShippingDocumentWithAI(CMA_CGM_PDF_TEXT, '');
    expect(result!.shippingLine).toBe('CMA CGM');
  });

  test('Bug 3: AI returns "Import SRL" placeholder consignee → cleared', async () => {
    const badGeminiOutput: ParsedEmailData = {
      containerNumber: 'CMAU1234567',
      billOfLading: 'LGP1234567',
      shippingLine: 'CMA-CGM',
      portOfLoading: 'Ningbo',
      portOfDischarge: 'Constanta',
      consigneeName: 'Import SRL', // BUG: placeholder
      shipperName: 'Shenzhen Electronics Ltd',
      confidence: 80,
    };
    (geminiService.parseShippingDocumentWithGemini as jest.Mock).mockResolvedValue(badGeminiOutput);

    const result = await parseShippingDocumentWithAI(CMA_CGM_PDF_TEXT, '');
    expect(result!.consigneeName).toBeUndefined();
    expect(result!.supplierName).toBe('Shenzhen Electronics Ltd');
  });

  test('Bug 3b: AI accidentally returns shipper name as consignee → cleared', async () => {
    const badGeminiOutput: ParsedEmailData = {
      containerNumber: 'CMAU1234567',
      billOfLading: 'LGP1234567',
      shippingLine: 'CMA-CGM',
      portOfLoading: 'Ningbo',
      portOfDischarge: 'Constanta',
      shipperName: 'Shenzhen Electronics Ltd',
      consigneeName: 'Shenzhen Electronics Ltd', // BUG: same as shipper
      confidence: 80,
    };
    (geminiService.parseShippingDocumentWithGemini as jest.Mock).mockResolvedValue(badGeminiOutput);

    const result = await parseShippingDocumentWithAI(CMA_CGM_PDF_TEXT, '');
    expect(result!.consigneeName).toBeUndefined();
  });

  test('Bug 3c: real consignee "Comagroteh SRL" passes through validator', async () => {
    const goodGeminiOutput: ParsedEmailData = {
      containerNumber: 'CMAU1234567',
      billOfLading: 'LGP1234567',
      shippingLine: 'CMA-CGM',
      portOfLoading: 'Ningbo',
      portOfDischarge: 'Constanta',
      shipperName: 'Shenzhen Electronics Ltd',
      consigneeName: 'Comagroteh SRL',
      confidence: 90,
    };
    (geminiService.parseShippingDocumentWithGemini as jest.Mock).mockResolvedValue(
      goodGeminiOutput
    );

    const result = await parseShippingDocumentWithAI(CMA_CGM_PDF_TEXT, '');
    expect(result!.consigneeName).toBe('Comagroteh SRL');
  });

  test('Bug 4: AI returns garbage port "Jo" → replaced by PDF text scan ("Ningbo")', async () => {
    const badGeminiOutput: ParsedEmailData = {
      containerNumber: 'CMAU1234567',
      billOfLading: 'LGP1234567',
      shippingLine: 'CMA-CGM',
      portOfLoading: 'Jo', // BUG
      portOfDischarge: 'Ergonjo', // BUG
      confidence: 70,
    };
    (geminiService.parseShippingDocumentWithGemini as jest.Mock).mockResolvedValue(badGeminiOutput);

    const result = await parseShippingDocumentWithAI(CMA_CGM_PDF_TEXT, '');
    expect(result!.portOrigin?.toLowerCase()).toBe('ningbo');
    expect(result!.portDestination?.toLowerCase()).toBe('constanta');
  });

  test('Bug 4b: AI swaps origin/destination → auto-corrected', async () => {
    const badGeminiOutput: ParsedEmailData = {
      containerNumber: 'CMAU1234567',
      billOfLading: 'LGP1234567',
      shippingLine: 'CMA-CGM',
      portOfLoading: 'Constanta', // swapped
      portOfDischarge: 'Ningbo', // swapped
      confidence: 70,
    };
    (geminiService.parseShippingDocumentWithGemini as jest.Mock).mockResolvedValue(badGeminiOutput);

    const result = await parseShippingDocumentWithAI(CMA_CGM_PDF_TEXT, '');
    expect(result!.portOrigin?.toLowerCase()).toBe('ningbo');
    expect(result!.portDestination?.toLowerCase()).toBe('constanta');
  });

  test('All-bugs-at-once: real CMA-CGM scenario with all 4 errors → all repaired', async () => {
    const allBad: ParsedEmailData = {
      containerNumber: 'CMAU1234567',
      billOfLading: 'CMAU1234567', // Bug 1
      shippingLine: 'ONE', // Bug 2
      consigneeName: 'Import SRL', // Bug 3
      shipperName: 'Shenzhen Electronics Ltd',
      portOfLoading: 'Jo', // Bug 4
      portOfDischarge: 'Ergonjo', // Bug 4
      confidence: 60,
    };
    (geminiService.parseShippingDocumentWithGemini as jest.Mock).mockResolvedValue(allBad);

    const result = await parseShippingDocumentWithAI(CMA_CGM_PDF_TEXT, '');
    expect(result).not.toBeNull();
    expect(result!.containerNumber).toBe('CMAU1234567');
    expect(result!.blNumber).toBe('LGP1234567');
    expect(result!.shippingLine).toBe('CMA CGM');
    expect(result!.consigneeName).toBeUndefined();
    expect(result!.portOrigin?.toLowerCase()).toBe('ningbo');
    expect(result!.portDestination?.toLowerCase()).toBe('constanta');
  });
});
