/**
 * Email Storage — queue, retrieve, and mark emails in DB.
 * Extracted from email.service.ts (Task C3).
 */

import prisma from '../../lib/prisma';
import { extractTextFromPDF } from '../../services/pdf-parser.service';
import { storageService } from '../../services/storage.service';
import logger from '../../utils/logger';
import { ParsedEmail } from './email.types';

interface AttachmentMeta {
  filename: string;
  mimeType: string;
  size: number;
  /** Storage URL where the original binary was uploaded — used to forward to clients */
  url?: string;
}

/**
 * Save raw email to incomingEmail queue for async processing.
 * Uses upsert to avoid duplicate key errors.
 */
export async function queueEmailForProcessing(email: ParsedEmail): Promise<void> {
  // Skip entirely if this email is already queued. Gmail messages stay
  // UNREAD on purpose (so the client still sees them), so the fetcher
  // re-fetches the same 50 emails every cycle. Without this guard we
  // re-uploaded every PDF attachment on every run — which is how the
  // uploads dir ballooned to 39GB of ~99% duplicate files (one PDF had
  // 641 identical copies). The DB row was already upsert-protected; the
  // storage write was not.
  const alreadyQueued = await (prisma as any).incomingEmail.findUnique({
    where: { messageId: email.id },
    select: { id: true },
  });
  if (alreadyQueued) return;

  let pdfText = '';
  const attachmentsMeta: AttachmentMeta[] = [];

  if (email.attachments?.length) {
    for (const attachment of email.attachments) {
      const meta: AttachmentMeta = {
        filename: attachment.filename,
        mimeType: attachment.mimeType,
        size: attachment.size,
      };

      // Upload PDF binaries to storage so we can forward them later
      // (the queue table only stores extracted text, not the original PDF).
      if (attachment.mimeType === 'application/pdf' && attachment.data) {
        try {
          // EmailAttachment.data is base64-encoded (see gmail.integration.ts)
          const buf = Buffer.from(attachment.data, 'base64');
          const url = await storageService.uploadFile(
            buf,
            attachment.filename || 'attachment.pdf',
            `incoming-emails/${email.id.replace(/[^a-zA-Z0-9_-]/g, '_')}`
          );
          meta.url = url;
        } catch (err) {
          logger.warn(
            `[EmailStorage] Failed to persist PDF ${attachment.filename}, continuing with text only:`,
            err
          );
        }

        const text = await extractTextFromPDF(attachment.data);
        if (text.trim()) pdfText += `--- ${attachment.filename} ---\n${text}\n\n`;
      }

      attachmentsMeta.push(meta);
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

  const results: ParsedEmail[] = [];
  for (const q of queued) {
    const body = q.pdfText ? `${q.body}\n\n${q.pdfText}` : q.body;

    // Rehydrate attachments from storage (only those uploaded during queueing)
    const meta: AttachmentMeta[] = q.attachments ? safeParseMeta(q.attachments) : [];
    const attachments: ParsedEmail['attachments'] = [];
    for (const m of meta) {
      if (!m.url) {
        attachments.push({
          filename: m.filename,
          mimeType: m.mimeType,
          size: m.size,
        });
        continue;
      }
      try {
        const buf = await storageService.getFile(m.url);
        attachments.push({
          filename: m.filename,
          mimeType: m.mimeType,
          size: m.size,
          data: buf ? buf.toString('base64') : undefined,
        });
      } catch (err) {
        logger.warn(`[EmailStorage] Could not rehydrate attachment ${m.filename}:`, err);
        attachments.push({
          filename: m.filename,
          mimeType: m.mimeType,
          size: m.size,
        });
      }
    }

    results.push({
      id: q.messageId,
      from: q.fromAddress,
      subject: q.subject,
      date: q.receivedAt,
      body,
      attachments,
    });
  }
  return results;
}

function safeParseMeta(raw: string): AttachmentMeta[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
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
