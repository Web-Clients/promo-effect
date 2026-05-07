/**
 * PDF Parser Service
 *
 * Extracts text from PDF attachments (Bill of Lading, Shipping Instructions)
 * Uses pdf-parse v1 library for text extraction (Node.js compatible)
 */

// pdf-parse v1 uses a simple default export function
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParse = require('pdf-parse');
import logger from '../utils/logger';

/**
 * Check if a pdf-parse error indicates a password-protected PDF.
 */
function isPasswordProtectedError(error: any): boolean {
  const msg = (error?.message || '').toLowerCase();
  return (
    msg.includes('password') ||
    msg.includes('encrypted') ||
    msg.includes('protect') ||
    msg.includes('decrypt')
  );
}

/**
 * Extract text from a base64-encoded PDF
 */
export async function extractTextFromPDF(base64Data: string): Promise<string> {
  try {
    const buffer = Buffer.from(base64Data, 'base64');
    const data = await pdfParse(buffer);
    return data.text || '';
  } catch (error: any) {
    if (isPasswordProtectedError(error)) {
      logger.warn('[PDF Parser] PDF is password-protected — skipping text extraction');
      return '';
    }
    logger.error('[PDF Parser] Failed to extract text:', error.message);
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
    if (isPasswordProtectedError(error)) {
      logger.warn('[PDF Parser] PDF is password-protected — skipping text extraction');
      return '';
    }
    logger.error('[PDF Parser] Failed to extract text from buffer:', error.message);
    return '';
  }
}

export default {
  extractTextFromPDF,
  extractTextFromPDFBuffer,
};
