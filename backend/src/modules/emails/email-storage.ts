/**
 * Email Storage — queue, retrieve, and mark emails in DB.
 * Extracted from email.service.ts (Task C3).
 */

import prisma from '../../lib/prisma';
import { extractTextFromPDF } from '../../services/pdf-parser.service';
import { ParsedEmail } from './email.types';

/**
 * Save raw email to incomingEmail queue for async processing.
 * Uses upsert to avoid duplicate key errors.
 */
export async function queueEmailForProcessing(email: ParsedEmail): Promise<void> {
  let pdfText = '';
  const attachmentsMeta: Array<{ filename: string; mimeType: string; size: number }> = [];

  if (email.attachments?.length) {
    for (const attachment of email.attachments) {
      attachmentsMeta.push({
        filename: attachment.filename,
        mimeType: attachment.mimeType,
        size: attachment.size,
      });
      if (attachment.mimeType === 'application/pdf' && attachment.data) {
        const text = await extractTextFromPDF(attachment.data);
        if (text.trim()) pdfText += `--- ${attachment.filename} ---\n${text}\n\n`;
      }
    }
  }

  await (prisma as any).incomingEmail.upsert({
    where: { messageId: email.id },
    update: {},
    create: {
      messageId: email.id,
      fromAddress: email.from,
      subject: email.subject,
      body: email.body,
      receivedAt: email.date,
      status: 'PENDING',
      attachments: attachmentsMeta.length > 0 ? JSON.stringify(attachmentsMeta) : null,
      pdfText: pdfText || null,
    },
  });
}

/**
 * Fetch all emails with PENDING status from the queue (max 10).
 */
export async function getPendingEmails(): Promise<ParsedEmail[]> {
  const queued = await (prisma as any).incomingEmail.findMany({
    where: { status: 'PENDING' },
    orderBy: { receivedAt: 'desc' },
    take: 10,
  });

  return queued.map((q: any) => {
    const body = q.pdfText ? `${q.body}\n\n${q.pdfText}` : q.body;
    return {
      id: q.messageId,
      from: q.fromAddress,
      subject: q.subject,
      date: q.receivedAt,
      body,
      attachments: [],
    };
  });
}

/**
 * Get incoming emails with filtering and pagination (for admin UI).
 */
export async function getIncomingEmails(
  options: { status?: string; limit?: number; offset?: number } = {}
): Promise<any[]> {
  const { status, limit = 50, offset = 0 } = options;
  const where = status ? { status } : {};

  const emails = await (prisma as any).incomingEmail.findMany({
    where,
    orderBy: { receivedAt: 'desc' },
    take: limit,
    skip: offset,
  });

  return emails.map((email: any) => ({
    id: email.id,
    messageId: email.messageId,
    from: email.fromAddress,
    subject: email.subject,
    body: email.body.substring(0, 500) + (email.body.length > 500 ? '...' : ''),
    receivedAt: email.receivedAt,
    status: email.status,
    processedAt: email.processedAt,
    bookingId: email.bookingId,
    extractedData: email.extractedData ? JSON.parse(email.extractedData) : null,
    createdAt: email.createdAt,
  }));
}

/**
 * Mark an email as PROCESSED or FAILED after handling.
 */
export async function markEmailProcessed(
  messageId: string,
  status: 'PROCESSED' | 'FAILED',
  _error?: string
): Promise<void> {
  await (prisma as any).incomingEmail.update({
    where: { messageId },
    data: { status, processedAt: new Date() },
  });
}
