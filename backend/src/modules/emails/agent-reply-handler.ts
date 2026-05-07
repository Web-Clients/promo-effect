/**
 * Agent Reply Handler
 *
 * When the China agent replies to an order email with a PDF (Bill of Lading / conosament):
 * 1. Detect that the email subject contains a bookingId (MDPE format)
 * 2. Extract from PDF: container number, BL number, vessel, ETA, port confirmations
 * 3. Update booking: status → CONFIRMED (or LOADED), containerNumber, blNumber, eta
 * 4. Send notification to client: "Marfa dvs a fost încărcată. Container {X}, ETA {Y}"
 */

import prisma from '../../lib/prisma';
import { infobipService } from '../../services/infobip.service';
import notificationService from '../../services/notification.service';
import { extractTextFromPDF } from '../../services/pdf-parser.service';
import { parseShippingDocumentWithAI } from './email-classifier';
import { ParsedEmail } from './email.types';
import logger from '../../utils/logger';

// Matches MDPE format: MDPE + 4-digit year + 2-digit month + 4-digit sequence
// Examples: MDPE2026050001, MDPE2026120099
const BOOKING_ID_REGEX = /\b(MDPE\d{10})\b/i;

/**
 * Returns the bookingId if found in the email subject (or body as fallback).
 * Returns null if no match.
 */
export function extractBookingIdFromEmail(email: ParsedEmail): string | null {
  // Check subject first (most reliable)
  const subjectMatch = email.subject?.match(BOOKING_ID_REGEX);
  if (subjectMatch) return subjectMatch[1].toUpperCase();

  // Fallback: scan first 500 chars of body (in case subject was truncated)
  const bodyMatch = email.body?.substring(0, 500).match(BOOKING_ID_REGEX);
  if (bodyMatch) return bodyMatch[1].toUpperCase();

  return null;
}

/**
 * Process an agent reply email that contains a bookingId reference.
 * Extracts shipping data from any PDF attachments, updates the booking,
 * and notifies the Moldovan client.
 */
export async function processAgentReply(email: ParsedEmail, bookingId: string): Promise<void> {
  logger.info(`[AgentReply] Processing reply for booking ${bookingId} from ${email.from}`);

  // 1. Load booking with client info
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      client: {
        include: { user: true },
      },
    },
  });

  if (!booking) {
    logger.warn(`[AgentReply] Booking ${bookingId} not found — skipping`);
    return;
  }

  // 2. Extract PDF text from attachments
  let pdfTexts: string[] = [];
  if (email.attachments?.length) {
    for (const attachment of email.attachments) {
      if (attachment.mimeType === 'application/pdf' && attachment.data) {
        logger.info(`[AgentReply] Extracting text from PDF: ${attachment.filename}`);
        try {
          const text = await extractTextFromPDF(attachment.data);
          if (text.trim()) {
            pdfTexts.push(`--- ${attachment.filename} ---\n${text}`);
          }
        } catch (err) {
          logger.error(`[AgentReply] Failed to extract PDF text from ${attachment.filename}:`, err);
        }
      }
    }
  }

  // 3. Parse PDF with AI (if PDFs present) or fall back to email body
  let extracted: {
    containerNumber?: string;
    blNumber?: string;
    vesselName?: string;
    eta?: Date;
    portOrigin?: string;
    portDestination?: string;
    confidence: number;
  } | null = null;

  if (pdfTexts.length > 0) {
    const emailContext = `From: ${email.from}\nSubject: ${email.subject}\nDate: ${email.date.toISOString()}\n\n${email.body.substring(0, 1000)}`;
    const pdfResult = await parseShippingDocumentWithAI(pdfTexts.join('\n\n'), emailContext);
    if (pdfResult) {
      extracted = {
        containerNumber: pdfResult.containerNumber,
        blNumber: pdfResult.blNumber,
        vesselName: pdfResult.vesselName,
        eta: pdfResult.eta,
        portOrigin: pdfResult.portOrigin,
        portDestination: pdfResult.portDestination,
        confidence: pdfResult.confidence,
      };
      logger.info(
        `[AgentReply] PDF AI extraction: confidence=${pdfResult.confidence}%, container=${pdfResult.containerNumber || 'N/A'}, BL=${pdfResult.blNumber || 'N/A'}, ETA=${pdfResult.eta || 'N/A'}`
      );
    }
  }

  // 4. Determine new booking status
  // If we got container + BL from PDF → LOADED, otherwise CONFIRMED
  const hasShippingData =
    extracted && extracted.confidence >= 60 && (extracted.containerNumber || extracted.blNumber);

  const newStatus = hasShippingData ? 'LOADED' : 'CONFIRMED';

  // 5. Build booking update payload (only fields we have new data for)
  const updateData: Record<string, unknown> = {
    status: newStatus,
  };

  if (extracted?.containerNumber && !booking.blNumber) {
    // blNumber on booking level stores primary BL
    // containerNumber is stored on Container child records
    // Nothing to update on booking.containerNumber (not a field) — handled via containers below
  }
  if (extracted?.blNumber && !booking.blNumber) {
    updateData.blNumber = extracted.blNumber.toUpperCase();
  }
  if (extracted?.eta) {
    updateData.eta = extracted.eta;
  }
  if (extracted?.vesselName && !booking.shipperName) {
    // shipperName is closest field to store vessel temporarily (legacy)
    // Leave as-is — vessel info goes to container tracking events
  }

  // 6. Update booking
  await prisma.booking.update({
    where: { id: bookingId },
    data: updateData as any,
  });
  logger.info(`[AgentReply] Booking ${bookingId} updated: status=${newStatus}`);

  // 7. If we have a containerNumber, upsert Container record
  if (extracted?.containerNumber) {
    const containerNum = extracted.containerNumber.toUpperCase();
    const existingContainer = await prisma.container.findFirst({
      where: { bookingId: bookingId },
    });

    if (existingContainer) {
      // Update existing container
      await prisma.container.update({
        where: { id: existingContainer.id },
        data: {
          containerNumber: containerNum,
          blNumber: extracted.blNumber?.toUpperCase() || existingContainer.blNumber,
          eta: extracted.eta || existingContainer.eta,
          currentStatus: 'LOADED',
        } as any,
      });
    } else {
      // Create container record
      await prisma.container.create({
        data: {
          bookingId: bookingId,
          containerNumber: containerNum,
          blNumber: extracted.blNumber?.toUpperCase(),
          type: booking.containerType || '40ft',
          eta: extracted.eta,
          currentStatus: 'LOADED',
          urgent: false,
          delayed: false,
        } as any,
      });
    }

    // Add tracking event
    await prisma.trackingEvent
      .create({
        data: {
          containerId: existingContainer?.id || containerNum, // fallback to number if no id yet
          eventType: 'LOADED',
          eventDate: new Date(),
          location: extracted.portOrigin || booking.portOrigin || 'China',
          source: 'EMAIL_PARSING',
          validated: false,
          visibility: 'PUBLIC',
        } as any,
      })
      .catch(() => {
        // Non-fatal: tracking event is best-effort
      });

    logger.info(`[AgentReply] Container ${containerNum} updated for booking ${bookingId}`);
  }

  // 8. Notify the Moldovan client
  const clientUser = booking.client?.user;
  const clientEmail = booking.client?.email || clientUser?.email;
  const clientName = booking.client?.companyName || booking.beneficiaryName || 'Client';

  if (clientEmail) {
    const containerDisplay = extracted?.containerNumber || 'N/A';
    const etaDisplay = extracted?.eta
      ? new Date(extracted.eta).toLocaleDateString('ro-RO')
      : 'În curs de confirmare';
    const blDisplay = extracted?.blNumber || booking.blNumber || 'N/A';

    const notifyHtml = buildLoadedNotificationEmail({
      bookingId,
      clientName,
      containerNumber: containerDisplay,
      blNumber: blDisplay,
      eta: etaDisplay,
      vesselName: extracted?.vesselName,
      portOrigin: extracted?.portOrigin || booking.portOrigin,
      portDestination: extracted?.portDestination || booking.portDestination,
    });

    try {
      await infobipService.sendEmail({
        to: clientEmail,
        subject: `Marfa dvs. a fost încărcată — Comanda ${bookingId}`,
        html: notifyHtml,
      });
      logger.info(`[AgentReply] Client loaded notification sent to ${clientEmail}`);
    } catch (err) {
      logger.error(`[AgentReply] Failed to send client notification email:`, err);
    }
  }

  // 9. Push notification to client user (in-app)
  if (clientUser?.id) {
    try {
      await notificationService.sendNotification({
        userId: clientUser.id,
        bookingId,
        type: 'BOOKING_LOADED',
        title: `Marfa dvs. a fost încărcată — ${bookingId}`,
        message: `Container: ${extracted?.containerNumber || 'N/A'}, ETA: ${extracted?.eta ? new Date(extracted.eta).toLocaleDateString('ro-RO') : 'în curând'}`,
        channels: { email: false, push: true, sms: false, whatsapp: false },
      });
    } catch (err) {
      logger.warn(`[AgentReply] Push notification failed (non-fatal):`, err);
    }
  }

  // 10. Notify admins/operators about the agent reply
  try {
    const operators = await prisma.user.findMany({
      where: { role: { in: ['OPERATOR', 'ADMIN', 'SUPER_ADMIN'] } },
    });
    for (const operator of operators) {
      await notificationService.sendNotification({
        userId: operator.id,
        bookingId,
        type: 'AGENT_REPLY_RECEIVED',
        title: `Răspuns agent primit: ${bookingId}`,
        message: `Agentul a răspuns la comanda ${bookingId}. Container: ${extracted?.containerNumber || 'N/A'}, BL: ${extracted?.blNumber || 'N/A'}, ETA: ${extracted?.eta ? new Date(extracted.eta).toLocaleDateString('ro-RO') : 'N/A'}. Status actualizat: ${newStatus}.`,
        channels: { email: false, push: true, sms: false, whatsapp: false },
      });
    }
  } catch (err) {
    logger.warn(`[AgentReply] Operator notification failed (non-fatal):`, err);
  }

  logger.info(`[AgentReply] Completed processing reply for booking ${bookingId}`);
}

// ─────────────────────────────────────────────────────────────
// EMAIL TEMPLATE: Client loaded notification
// ─────────────────────────────────────────────────────────────

interface LoadedNotificationParams {
  bookingId: string;
  clientName: string;
  containerNumber: string;
  blNumber: string;
  eta: string;
  vesselName?: string;
  portOrigin?: string;
  portDestination?: string;
}

function buildLoadedNotificationEmail(p: LoadedNotificationParams): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 620px; margin: 0 auto; padding: 20px;">
    <div style="background: #1a7a1a; color: white; padding: 24px; text-align: center; border-radius: 4px 4px 0 0;">
      <h1 style="margin: 0; font-size: 20px;">Marfa dvs. a fost încărcată</h1>
      <p style="margin: 6px 0 0; opacity: 0.85; font-size: 14px;">Comanda: <strong>${p.bookingId}</strong></p>
    </div>
    <div style="padding: 24px; background: #f9f9f9; border: 1px solid #e0e0e0;">
      <p>Stimate <strong>${p.clientName}</strong>,</p>
      <p>Vă informăm că marfa aferentă comenzii <strong>${p.bookingId}</strong> a fost încărcată și este în drum spre destinație.</p>

      <h3 style="color:#1a7a1a; border-bottom:2px solid #1a7a1a; padding-bottom:4px;">Detalii Transport</h3>
      <table style="width:100%; border-collapse:collapse; margin-bottom:16px;">
        <tr style="background:#e8f4e8;">
          <td style="padding:8px 12px; font-weight:bold; width:45%; border:1px solid #ccc;">Nr. Container</td>
          <td style="padding:8px 12px; border:1px solid #ccc; font-family:monospace; font-size:15px;"><strong>${p.containerNumber}</strong></td>
        </tr>
        <tr>
          <td style="padding:8px 12px; font-weight:bold; border:1px solid #ccc;">Nr. Conosament (B/L)</td>
          <td style="padding:8px 12px; border:1px solid #ccc; font-family:monospace;">${p.blNumber}</td>
        </tr>
        ${p.vesselName ? `<tr style="background:#e8f4e8;"><td style="padding:8px 12px; font-weight:bold; border:1px solid #ccc;">Navă</td><td style="padding:8px 12px; border:1px solid #ccc;">${p.vesselName}</td></tr>` : ''}
        ${p.portOrigin ? `<tr><td style="padding:8px 12px; font-weight:bold; border:1px solid #ccc;">Port plecare</td><td style="padding:8px 12px; border:1px solid #ccc;">${p.portOrigin}</td></tr>` : ''}
        ${p.portDestination ? `<tr style="background:#e8f4e8;"><td style="padding:8px 12px; font-weight:bold; border:1px solid #ccc;">Port destinație</td><td style="padding:8px 12px; border:1px solid #ccc;">${p.portDestination}</td></tr>` : ''}
        <tr style="background:#003d7a; color:white; font-weight:bold;">
          <td style="padding:10px 12px; border:1px solid #003d7a;">ETA (estimat)</td>
          <td style="padding:10px 12px; border:1px solid #003d7a;">${p.eta}</td>
        </tr>
      </table>

      <p>Puteți urmări statusul transportului în contul dvs. de pe platforma Promo-Efect.</p>
      <p>La sosirea mărfii la port, vă vom notifica cu detaliile pentru ridicare.</p>

      <p>Cu stimă,<br><strong>Echipa Promo Effect</strong><br>
      <a href="https://promo-efect.md">promo-efect.md</a></p>
    </div>
    <div style="text-align:center; padding:16px; font-size:12px; color:#888;">
      Promo-Efect SRL | Logistică Maritimă<br>
      Acest email a fost generat automat.
    </div>
  </div>
</body>
</html>`;
}
