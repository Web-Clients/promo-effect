/**
 * PDF Parser Service
 *
 * Extracts text from PDF attachments (Bill of Lading, Shipping Instructions)
 * Uses pdf-parse v1 library for text extraction (Node.js compatible)
 */

// pdf-parse v1 uses a simple default export function
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParse = require('pdf-parse');

/**
 * Extract text from a base64-encoded PDF
 */
export async function extractTextFromPDF(base64Data: string): Promise<string> {
  try {
    const buffer = Buffer.from(base64Data, 'base64');
    const data = await pdfParse(buffer);
    return data.text || '';
  } catch (error: any) {
    console.error('[PDF Parser] Failed to extract text:', error.message);
    return '';
  }
}

/**
 * Extract text from a PDF file buffer
 */
export async function extractTextFromPDFBuffer(buffer: Buffer): Promise<string> {
  try {
    const data = await pdfParse(buffer);
    return data.text || '';
  } catch (error: any) {
    console.error('[PDF Parser] Failed to extract text from buffer:', error.message);
    return '';
  }
}

export default {
  extractTextFromPDF,
  extractTextFromPDFBuffer,
};
