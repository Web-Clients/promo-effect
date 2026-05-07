/**
 * Email Processing Service — orchestrator after C3 extraction.
 *
 * Handles:
 * - Gmail OAuth integration
 * - Email fetching from inbox
 * - AI parsing with Gemini
 * - Auto-creation of bookings
 *
 * Logic modules:
 *   - email-parser.ts   (regex extraction)
 *   - email-classifier.ts (telex/doc detection, AI fallback)
 *   - email-storage.ts  (queue + DB operations)
 */

import prisma from '../../lib/prisma';
import notificationService from '../../services/notification.service';
import { extractTextFromPDF } from '../../services/pdf-parser.service';
import logger from '../../utils/logger';
import {
  ParsedEmail,
  EmailAttachment,
  ExtractedBookingData,
  EmailProcessingResult,
} from './email.types';
import { parseEmailWithRegex } from './email-parser';
import { parseEmailWithAI, parseShippingDocumentWithAI } from './email-classifier';
import {
  queueEmailForProcessing,
  getPendingEmails,
  getIncomingEmails,
  markEmailProcessed,
} from './email-storage';

// Re-export types for backward compatibility
export { ParsedEmail, EmailAttachment, ExtractedBookingData, EmailProcessingResult };

// ===== EMAIL SERVICE CLASS =====

export class EmailService {
  /**
   * Parse a single email using regex (delegates to email-parser.ts).
   */
  async parseEmailWithRegex(email: ParsedEmail): Promise<ExtractedBookingData> {
    return parseEmailWithRegex(email);
  }

  /**
   * Parse email using Gemini AI (delegates to email-classifier.ts).
   */
  async parseEmailWithAI(email: ParsedEmail): Promise<ExtractedBookingData> {
    return parseEmailWithAI(email);
  }

  /**
   * Process a single email — parse and optionally create booking.
   * This is the main orchestration method; sub-steps are delegated to modules.
   */
  async processEmail(
    email: ParsedEmail,
    autoCreateBooking: boolean = true,
    minConfidenceForAutoCreate: number = 80
  ): Promise<EmailProcessingResult> {
    const startTime = Date.now();

    try {
      // Step 0: Extract text from PDF attachments
      let pdfTexts: string[] = [];
      if (email.attachments?.length) {
        for (const attachment of email.attachments) {
          if (attachment.mimeType === 'application/pdf' && attachment.data) {
            logger.info(`[EmailService] Extracting text from PDF: ${attachment.filename}`);
            const text = await extractTextFromPDF(attachment.data);
            if (text.trim()) pdfTexts.push(`--- ${attachment.filename} ---\n${text}`);
          }
        }
      }

      // Step 1: Regex parsing (on email body + PDF text combined)
      const emailWithPdfText: ParsedEmail = {
        ...email,
        body: pdfTexts.length > 0 ? `${email.body}\n\n${pdfTexts.join('\n\n')}` : email.body,
      };
      let extractedData = await parseEmailWithRegex(emailWithPdfText);

      // Step 2a: PDF AI parsing (if PDFs present)
      if (pdfTexts.length > 0) {
        const emailContext = `From: ${email.from}\nSubject: ${email.subject}\nDate: ${email.date.toISOString()}\n\n${email.body.substring(0, 1000)}`;
        const pdfResult = await parseShippingDocumentWithAI(pdfTexts.join('\n\n'), emailContext);
        if (pdfResult && (pdfResult.confidence || 0) > extractedData.confidence) {
          extractedData = {
            containerNumber: pdfResult.containerNumber || extractedData.containerNumber,
            blNumber: pdfResult.blNumber || extractedData.blNumber,
            shippingLine: pdfResult.shippingLine || extractedData.shippingLine,
            vesselName: pdfResult.vesselName || extractedData.vesselName,
            voyageNumber: pdfResult.voyageNumber || extractedData.voyageNumber,
            portOrigin: pdfResult.portOrigin || extractedData.portOrigin,
            portDestination: pdfResult.portDestination || extractedData.portDestination,
            etd: pdfResult.etd || extractedData.etd,
            eta: pdfResult.eta || extractedData.eta,
            containerType: pdfResult.containerType || extractedData.containerType,
            cargoWeight: pdfResult.cargoWeight || extractedData.cargoWeight,
            cargoDescription: pdfResult.cargoDescription || extractedData.cargoDescription,
            // Supplier (Chinese shipper) — full details from BL
            supplierName: pdfResult.supplierName || extractedData.supplierName,
            supplierPhone: pdfResult.supplierPhone || extractedData.supplierPhone,
            supplierEmail: pdfResult.supplierEmail || extractedData.supplierEmail,
            supplierAddress: pdfResult.supplierAddress || extractedData.supplierAddress,
            supplierContact: pdfResult.supplierContact || extractedData.supplierContact,
            supplierWebsite: pdfResult.supplierWebsite || extractedData.supplierWebsite,
            // Consignee (Moldovan beneficiary) from BL
            consigneeName: pdfResult.consigneeName || extractedData.consigneeName,
            consigneeAddress: pdfResult.consigneeAddress || extractedData.consigneeAddress,
            consigneeContact: pdfResult.consigneeContact || extractedData.consigneeContact,
            consigneePhone: pdfResult.consigneePhone || extractedData.consigneePhone,
            consigneeEmail: pdfResult.consigneeEmail || extractedData.consigneeEmail,
            consigneeIDNO: pdfResult.consigneeIDNO || extractedData.consigneeIDNO,
            // Notify party
            notifyPartyName: pdfResult.notifyPartyName || extractedData.notifyPartyName,
            notifyPartyAddress: pdfResult.notifyPartyAddress || extractedData.notifyPartyAddress,
            notifyPartyEmail: pdfResult.notifyPartyEmail || extractedData.notifyPartyEmail,
            confidence: pdfResult.confidence || 85,
            extractionMethod: 'AI',
            rawEmailId: email.id,
          };
          logger.info(`[EmailService] PDF AI parsing: confidence=${pdfResult.confidence}%`);
        }
      }
      // Step 2b: Regular AI fallback when confidence is low and no PDFs
      else if (extractedData.confidence < 80) {
        const aiData = await parseEmailWithAI(email);
        if (aiData.confidence > extractedData.confidence) {
          extractedData = {
            ...extractedData,
            ...aiData,
            containerNumber: aiData.containerNumber || extractedData.containerNumber,
            blNumber: aiData.blNumber || extractedData.blNumber,
            shippingLine: aiData.shippingLine || extractedData.shippingLine,
            portOrigin: aiData.portOrigin || extractedData.portOrigin,
            extractionMethod: 'AI',
          };
        }
      }

      // Step 3: Check if container already exists
      let existingContainer = null;
      let existingBookingByBl: any = null;

      if (extractedData.containerNumber) {
        existingContainer = await prisma.container.findUnique({
          where: { containerNumber: extractedData.containerNumber.toUpperCase() },
          include: { booking: true },
        });
      }
      if (!existingContainer && extractedData.blNumber) {
        const blClean = extractedData.blNumber.toUpperCase().replace(/[\s\/]/g, '');
        existingContainer = await prisma.container.findFirst({
          where: { blNumber: { contains: blClean, mode: 'insensitive' } } as any,
          include: { booking: true },
        });
      }
      if (!existingContainer && extractedData.blNumber) {
        const blClean = extractedData.blNumber.toUpperCase().replace(/[\s\/]/g, '');
        existingBookingByBl = await prisma.booking.findFirst({
          where: {
            OR: [
              { blNumber: { contains: blClean, mode: 'insensitive' } } as any,
              { internalNotes: { contains: blClean, mode: 'insensitive' } } as any,
              { clientNotes: { contains: blClean, mode: 'insensitive' } } as any,
            ],
          },
          include: { containers: true },
        });
        if (existingBookingByBl?.containers.length > 0) {
          existingContainer = {
            ...existingBookingByBl.containers[0],
            booking: existingBookingByBl,
          } as any;
        }
      }

      // Step 4: Update existing container
      if (existingContainer) {
        const containerWithBooking = existingContainer as any;
        const hasSignificantChanges =
          (extractedData.eta &&
            existingContainer.eta &&
            Math.abs(
              new Date(extractedData.eta).getTime() - new Date(existingContainer.eta).getTime()
            ) >
              24 * 60 * 60 * 1000) ||
          (extractedData.portOrigin &&
            containerWithBooking.booking?.portOrigin !== extractedData.portOrigin);

        if (hasSignificantChanges) {
          try {
            const operators = await prisma.user.findMany({
              where: { role: { in: ['OPERATOR', 'ADMIN', 'SUPER_ADMIN'] } },
            });
            for (const operator of operators) {
              await notificationService.sendNotification({
                userId: operator.id,
                bookingId: containerWithBooking.booking?.id,
                type: 'CONTAINER_UPDATE_REVIEW',
                title: `Container ${existingContainer.containerNumber} - Modificări Semnificative`,
                message: `Containerul ${existingContainer.containerNumber} are modificări semnificative care necesită revizuire.`,
                channels: { email: true, push: false, sms: false, whatsapp: false },
              });
            }
          } catch (error) {
            logger.error(`[EmailService] Failed to send notification:`, error);
          }
        } else {
          const updateData: any = { updatedAt: new Date() };
          if (extractedData.eta) updateData.eta = new Date(extractedData.eta);
          if (extractedData.blNumber && !existingContainer.blNumber)
            updateData.blNumber = extractedData.blNumber.toUpperCase();
          if (extractedData.cargoWeight)
            updateData.weightGross =
              parseFloat(extractedData.cargoWeight.replace(/[^0-9.]/g, '')) || undefined;
          if (extractedData.cargoDescription) updateData.content = extractedData.cargoDescription;
          if (extractedData.portOrigin) updateData.currentLocation = extractedData.portOrigin;

          await prisma.container.update({ where: { id: existingContainer.id }, data: updateData });

          const bookingRecord = (existingContainer as any).booking;
          if (extractedData.blNumber && bookingRecord) {
            const blUpdateData: Record<string, unknown> = {};
            if (!(bookingRecord as any).blNumber)
              blUpdateData.blNumber = extractedData.blNumber.toUpperCase();
            if (extractedData.supplierName && !(bookingRecord as any).shipperName)
              blUpdateData.shipperName = extractedData.supplierName;
            if (extractedData.supplierName && !(bookingRecord as any).supplierName)
              blUpdateData.supplierName = extractedData.supplierName;
            if (extractedData.supplierPhone && !(bookingRecord as any).supplierPhone)
              blUpdateData.supplierPhone = extractedData.supplierPhone;
            if (extractedData.supplierEmail && !(bookingRecord as any).supplierEmail)
              blUpdateData.supplierEmail = extractedData.supplierEmail;
            if (extractedData.supplierAddress && !(bookingRecord as any).supplierAddress)
              blUpdateData.supplierAddress = extractedData.supplierAddress;
            if (extractedData.consigneeName && !(bookingRecord as any).beneficiaryName)
              blUpdateData.beneficiaryName = extractedData.consigneeName;

            if (Object.keys(blUpdateData).length > 0) {
              await prisma.booking.update({
                where: { id: bookingRecord.id },
                data: blUpdateData as any,
              });
            }
          }

          await prisma.trackingEvent.create({
            data: {
              containerId: existingContainer.id,
              eventType: 'EMAIL_UPDATE',
              eventDate: new Date(),
              location: extractedData.portOrigin || existingContainer.currentLocation || 'Unknown',
              source: 'EMAIL_PARSING',
              validated: false,
              visibility: 'INTERNAL',
            } as any,
          });
        }

        return {
          emailId: email.id,
          status: 'SUCCESS',
          extractedData,
          containerId: existingContainer.id,
          bookingId: existingContainer.bookingId,
          processingTime: Date.now() - startTime,
        };
      }

      // Step 5: Auto-create new container + booking
      const hasMinData = !!(extractedData.containerNumber || extractedData.blNumber);
      const hasContainerKey = !!(extractedData.containerNumber && extractedData.blNumber);
      const shouldAutoCreate =
        autoCreateBooking &&
        hasMinData &&
        (hasContainerKey || extractedData.confidence >= minConfidenceForAutoCreate);

      if (shouldAutoCreate) {
        // ── SUPPLIER (Chinese shipper) — find or create reusable Supplier record ──
        let supplier: { id: string } | null = null;
        if (extractedData.supplierName) {
          supplier = await prisma.supplier.findFirst({
            where: { name: { equals: extractedData.supplierName, mode: 'insensitive' } },
          });
          if (!supplier) {
            try {
              supplier = await (prisma.supplier as any).create({
                data: {
                  name: extractedData.supplierName,
                  address: extractedData.supplierAddress || null,
                  contact: extractedData.supplierContact || null,
                  phone: extractedData.supplierPhone || null,
                  email: extractedData.supplierEmail || null,
                  website: extractedData.supplierWebsite || null,
                  country: 'China',
                },
              });
              logger.info(`[EmailService] Created new Supplier: ${extractedData.supplierName}`);
            } catch (err) {
              logger.warn('[EmailService] Could not create supplier record:', err);
            }
          }
        }

        // ── BENEFICIAR (Moldovan/Romanian consignee) — find or create Client record ──
        // Priority: 1) IDNO match  2) consigneeName match  3) email.from match  4) first ACTIVE
        // CRITICAL: never use supplierEmail as fallback — that would create wrong client.
        let client: { id: string; companyName: string } | null = null;

        const consigneeName = extractedData.consigneeName;
        const consigneeIDNO = extractedData.consigneeIDNO;

        if (consigneeIDNO) {
          client = await prisma.client.findFirst({
            where: { taxId: consigneeIDNO },
          });
        }
        if (!client && consigneeName) {
          client = await prisma.client.findFirst({
            where: { companyName: { contains: consigneeName, mode: 'insensitive' } },
          });
        }
        if (!client) {
          client = await prisma.client.findFirst({ where: { email: email.from } });
        }

        // Auto-create client from BL consignee data if we have enough info
        if (!client && consigneeName) {
          const consigneeEmail =
            extractedData.consigneeEmail ||
            extractedData.notifyPartyEmail ||
            `auto-${Date.now()}@unknown.md`;
          try {
            client = await prisma.client.create({
              data: {
                companyName: consigneeName,
                contactPerson: extractedData.consigneeContact || 'Necunoscut',
                email: consigneeEmail,
                phone: extractedData.consigneePhone || '',
                address: extractedData.consigneeAddress || '',
                taxId: consigneeIDNO || null,
                status: 'ACTIVE',
              },
            });
            logger.info(`[EmailService] Auto-created Client from BL consignee: ${consigneeName}`);
          } catch (err) {
            logger.warn('[EmailService] Could not auto-create client from consignee:', err);
            // Fall back to first ACTIVE client — operator must reassign
            client = await prisma.client.findFirst({ where: { status: 'ACTIVE' } });
          }
        }

        if (!client) {
          client = await prisma.client.findFirst({ where: { status: 'ACTIVE' } });
        }

        if (client) {
          const booking = await prisma.booking.create({
            data: {
              id: require('crypto').randomUUID(),
              clientId: client.id,
              portOrigin: extractedData.portOrigin || 'TBD',
              portDestination: extractedData.portDestination || 'Constanta',
              containerType: extractedData.containerType || '40ft',
              cargoCategory: 'TBD',
              cargoWeight: extractedData.cargoWeight || 'TBD',
              cargoReadyDate: extractedData.etd || new Date(),
              shippingLine: extractedData.shippingLine || 'TBD',
              freightPrice: 0,
              portTaxes: 0,
              customsTaxes: 0,
              terrestrialTransport: 0,
              commission: 0,
              totalPrice: 0,
              supplierName: extractedData.supplierName,
              supplierPhone: extractedData.supplierPhone,
              supplierEmail: extractedData.supplierEmail || null,
              supplierAddress: extractedData.supplierAddress || null,
              supplierId: supplier?.id || null,
              blNumber: extractedData.blNumber?.toUpperCase() || null,
              shipperName: extractedData.supplierName || null,
              beneficiaryName: consigneeName || null,
              clientNotes: `Auto-created from email: ${email.subject}\n\nContainer: ${extractedData.containerNumber || 'N/A'}\nB/L: ${extractedData.blNumber || 'N/A'}`,
              status: 'DRAFT',
            } as any,
          });

          let containerId: string | undefined;
          if (extractedData.containerNumber || extractedData.blNumber) {
            const container = await prisma.container.create({
              data: {
                bookingId: booking.id,
                containerNumber:
                  extractedData.containerNumber?.toUpperCase() || `TEMP-${Date.now()}`,
                blNumber: extractedData.blNumber?.toUpperCase(),
                type: extractedData.containerType || '40ft',
                weightGross: extractedData.cargoWeight
                  ? parseFloat(extractedData.cargoWeight.replace(/[^0-9.]/g, ''))
                  : undefined,
                content: extractedData.cargoDescription,
                temperatureSetting: extractedData.containerType?.includes('Reefer') ? 2 : undefined,
                currentStatus: 'PENDING_REVIEW',
                eta: extractedData.eta ? new Date(extractedData.eta) : undefined,
                urgent: false,
                delayed: false,
              } as any,
            });
            containerId = container.id;

            await prisma.trackingEvent.create({
              data: {
                containerId: container.id,
                eventType: 'BOOKING_CONFIRMED',
                eventDate: new Date(),
                location: extractedData.portOrigin || 'Unknown',
                source: 'EMAIL_PARSING',
                validated: false,
                visibility: 'INTERNAL',
              } as any,
            });

            try {
              const operators = await prisma.user.findMany({
                where: { role: { in: ['OPERATOR', 'ADMIN', 'SUPER_ADMIN'] } },
              });
              for (const operator of operators) {
                // BOOKING_CREATED — replaces the generic NEW_CONTAINER_REVIEW
                await notificationService.sendNotification({
                  userId: operator.id,
                  bookingId: booking.id,
                  type: 'BOOKING_CREATED',
                  title: `Rezervare nouă din email: ${container.containerNumber}`,
                  message: `Rezervare creată automat din email pentru containerul ${container.containerNumber} (B/L: ${extractedData.blNumber || 'N/A'}). Client: ${client.companyName}. Confidence: ${extractedData.confidence}%. Verificați și completați datele.`,
                  channels: { email: false, push: true, sms: false, whatsapp: false },
                });
              }

              // EMAIL_PARSE_FAILED is handled later; here check for telex signal in subject/body
              const emailSubjectLower = email.subject?.toLowerCase() || '';
              const emailBodyLower = email.body?.toLowerCase() || '';
              const isTelexEmail =
                emailSubjectLower.includes('telex') ||
                emailSubjectLower.includes('tlx') ||
                emailBodyLower.includes('telex release') ||
                emailBodyLower.includes('tlx release');

              if (isTelexEmail) {
                // Mark telex on booking
                await prisma.booking.update({
                  where: { id: booking.id },
                  data: { telexReleased: true } as any,
                });

                for (const operator of operators) {
                  await notificationService.sendNotification({
                    userId: operator.id,
                    bookingId: booking.id,
                    type: 'TELEX_RELEASE',
                    title: `Telex Release primit: ${container.containerNumber}`,
                    message: `A fost primit Telex Release pentru containerul ${container.containerNumber} (B/L: ${extractedData.blNumber || 'N/A'}). Containerul poate fi ridicat.`,
                    channels: { email: false, push: true, sms: false, whatsapp: false },
                  });
                }
              }
            } catch (error) {
              logger.error(`[EmailService] Failed to send notification:`, error);
            }
          }

          await prisma.auditLog.create({
            data: {
              entityType: containerId ? 'CONTAINER' : 'BOOKING',
              entityId: containerId || booking.id,
              action: 'CREATE',
              changes: JSON.stringify({
                source: 'EMAIL_AUTO_CREATE',
                emailId: email.id,
                emailFrom: email.from,
                emailSubject: email.subject,
                confidence: extractedData.confidence,
                containerNumber: extractedData.containerNumber,
                blNumber: extractedData.blNumber,
              }),
            },
          });

          return {
            emailId: email.id,
            status: 'SUCCESS',
            extractedData,
            bookingId: booking.id,
            containerId,
            processingTime: Date.now() - startTime,
          };
        }
      }

      const status = extractedData.confidence >= 60 ? 'SUCCESS' : 'NEEDS_REVIEW';
      return { emailId: email.id, status, extractedData, processingTime: Date.now() - startTime };
    } catch (error: any) {
      logger.error('Email processing failed:', error);

      // Notify admins about failed email parsing
      try {
        const admins = await prisma.user.findMany({
          where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
        });
        for (const admin of admins) {
          await notificationService.sendNotification({
            userId: admin.id,
            type: 'EMAIL_PARSE_FAILED',
            title: `Email neprocesabil: ${email.subject?.substring(0, 60) || 'fără subiect'}`,
            message: `Emailul de la ${email.from} nu a putut fi procesat automat. Eroare: ${error.message}. Verificați manual în secțiunea Emailuri.`,
            channels: { email: false, push: true, sms: false, whatsapp: false },
          });
        }
      } catch (notifErr) {
        logger.error('[EmailService] Failed to send EMAIL_PARSE_FAILED notification:', notifErr);
      }

      return {
        emailId: email.id,
        status: 'FAILED',
        error: error.message,
        processingTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Get email processing statistics.
   */
  async getProcessingStats(): Promise<{
    totalProcessed: number;
    successCount: number;
    reviewCount: number;
    failedCount: number;
    autoCreatedBookings: number;
    averageConfidence: number;
  }> {
    const logs = await prisma.auditLog.findMany({
      where: { entityType: 'BOOKING', action: 'CREATE' },
    });
    const emailCreated = logs.filter((l) => (l.changes as any)?.source === 'EMAIL_AUTO_CREATE');
    return {
      totalProcessed: emailCreated.length,
      successCount: emailCreated.length,
      reviewCount: 0,
      failedCount: 0,
      autoCreatedBookings: emailCreated.length,
      averageConfidence: 85,
    };
  }

  // Delegated to email-storage.ts
  async queueEmailForProcessing(email: ParsedEmail): Promise<void> {
    return queueEmailForProcessing(email);
  }

  async getIncomingEmails(options?: {
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<any[]> {
    return getIncomingEmails(options);
  }

  async getPendingEmails(): Promise<ParsedEmail[]> {
    return getPendingEmails();
  }

  async markEmailProcessed(
    messageId: string,
    status: 'PROCESSED' | 'FAILED',
    error?: string
  ): Promise<void> {
    return markEmailProcessed(messageId, status, error);
  }
}

export const emailService = new EmailService();
