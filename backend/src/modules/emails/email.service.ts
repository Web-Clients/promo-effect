/**
 * Email Processing Service
 *
 * Handles:
 * - Gmail OAuth integration
 * - Email fetching from inbox
 * - AI parsing with OpenAI GPT-4
 * - Auto-creation of bookings
 *
 * Saves Ion 10 hours/week!
 */

import prisma from '../../lib/prisma';
import notificationService from '../../services/notification.service';

// ===== EMAIL PARSING TYPES =====

export interface ParsedEmail {
  id: string;
  from: string;
  subject: string;
  date: Date;
  body: string;
  attachments: EmailAttachment[];
}

export interface EmailAttachment {
  filename: string;
  mimeType: string;
  size: number;
  data?: string; // base64 encoded
}

export interface ExtractedBookingData {
  // Container info
  containerNumber?: string;       // e.g., TEMU1234567
  blNumber?: string;              // Bill of Lading

  // Shipping info
  shippingLine?: string;          // e.g., MSC, Maersk, etc.
  vesselName?: string;            // e.g., "MSC Oscar"
  voyageNumber?: string;          // e.g., "VY123E"

  // Port info
  portOrigin?: string;            // e.g., Shanghai, Ningbo
  portDestination?: string;       // e.g., Constanta

  // Dates
  etd?: Date;                     // Estimated Time of Departure
  eta?: Date;                     // Estimated Time of Arrival
  cargoReadyDate?: Date;

  // Cargo info
  containerType?: string;         // 20ft, 40ft, 40ft_HC
  cargoWeight?: string;           // e.g., "10-20t"
  cargoDescription?: string;

  // Supplier info
  supplierName?: string;
  supplierPhone?: string;
  supplierEmail?: string;

  // Parsing metadata
  confidence: number;             // 0-100, confidence score
  extractionMethod: 'REGEX' | 'AI' | 'MANUAL';
  rawEmailId: string;
}

export interface EmailProcessingResult {
  emailId: string;
  status: 'SUCCESS' | 'NEEDS_REVIEW' | 'FAILED';
  extractedData?: ExtractedBookingData;
  bookingId?: string;             // If booking was auto-created
  containerId?: string;           // If container was found or created
  error?: string;
  processingTime: number;         // ms
}

// ===== REGEX PATTERNS FOR EMAIL PARSING =====

const REGEX_PATTERNS = {
  // Container number: 4 letters + 7 digits (e.g., TEMU1234567, MSCU1234567)
  containerNumber: /\b([A-Z]{4}[0-9]{7})\b/gi,

  // B/L number: Various formats
  blNumber: /\b(BL[A-Z0-9\-]{6,15}|[A-Z]{4}[0-9]{9,12}|MEDUEN[0-9]+)\b/gi,

  // Weight patterns
  weight: /(\d+(?:\.\d+)?)\s*(?:kg|KG|ton|t|MT|metric\s*ton)/gi,
  weightRange: /\b(\d+-\d+t|\d+\s*-\s*\d+\s*ton)\b/gi,

  // Date patterns (various formats)
  dateISO: /\b(\d{4}-\d{2}-\d{2})\b/g,
  dateEU: /\b(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})\b/g,
  dateText: /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}\b/gi,

  // Port names (Chinese ports)
  chinesePorts: /\b(Shanghai|Ningbo|Qingdao|Shenzhen|Guangzhou|Tianjin|Xiamen|Dalian|Fuzhou|Yantian)\b/gi,
  europeanPorts: /\b(Constanta|Constanța|Rotterdam|Hamburg|Piraeus|Gdansk|Felixstowe)\b/gi,

  // Shipping lines
  shippingLines: /\b(MSC|Maersk|Hapag[-\s]?Lloyd|Cosco|CMA\s*CGM|Evergreen|OOCL|Yang\s*Ming|ZIM|ONE)\b/gi,

  // Vessel name (usually "M/V" or "MV" prefix)
  vesselName: /(?:M\/V|MV|VESSEL:?|Ship:?)\s*([A-Z][A-Za-z0-9\s\-]+)/gi,

  // Voyage number
  voyageNumber: /(?:VOY|VOYAGE|VY)[\.:\s]*([A-Z0-9\-]+[EWN]?)/gi,

  // Container type
  containerType: /\b(20(?:\s*(?:ft|'|GP|DC))?|40(?:\s*(?:ft|'|GP|DC|HC|HQ))?)\b/gi,

  // Phone numbers (Chinese format)
  phoneChina: /(?:\+?86[\s\-]?)?1[3-9]\d{9}/g,
  phoneIntl: /\+\d{1,3}[\s\-]?\d{6,14}/g,

  // Email addresses
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi,
};

// ===== SHIPPING LINE NORMALIZATION =====

const SHIPPING_LINE_MAP: Record<string, string> = {
  'msc': 'MSC',
  'maersk': 'Maersk',
  'hapag-lloyd': 'Hapag-Lloyd',
  'hapag lloyd': 'Hapag-Lloyd',
  'cosco': 'Cosco',
  'cma cgm': 'CMA CGM',
  'cmacgm': 'CMA CGM',
  'evergreen': 'Evergreen',
  'oocl': 'OOCL',
  'yang ming': 'Yangming',
  'yangming': 'Yangming',
  'zim': 'ZIM',
  'one': 'ONE',
};

// ===== EMAIL SERVICE CLASS =====

export class EmailService {

  /**
   * Parse a single email and extract booking data using regex
   */
  async parseEmailWithRegex(email: ParsedEmail): Promise<ExtractedBookingData> {
    const content = `${email.subject}\n${email.body}`;
    const extracted: ExtractedBookingData = {
      confidence: 0,
      extractionMethod: 'REGEX',
      rawEmailId: email.id,
    };

    let matchCount = 0;

    // Extract container number
    const containerMatches = content.match(REGEX_PATTERNS.containerNumber);
    if (containerMatches && containerMatches.length > 0) {
      extracted.containerNumber = containerMatches[0].toUpperCase();
      matchCount++;
    }

    // Extract B/L number
    const blMatches = content.match(REGEX_PATTERNS.blNumber);
    if (blMatches && blMatches.length > 0) {
      extracted.blNumber = blMatches[0].toUpperCase();
      matchCount++;
    }

    // Extract shipping line
    const lineMatches = content.match(REGEX_PATTERNS.shippingLines);
    if (lineMatches && lineMatches.length > 0) {
      const rawLine = lineMatches[0].toLowerCase().replace(/\s+/g, ' ');
      extracted.shippingLine = SHIPPING_LINE_MAP[rawLine] || lineMatches[0];
      matchCount++;
    }

    // Extract ports
    const chinaPortMatches = content.match(REGEX_PATTERNS.chinesePorts);
    if (chinaPortMatches && chinaPortMatches.length > 0) {
      extracted.portOrigin = chinaPortMatches[0];
      matchCount++;
    }

    const euPortMatches = content.match(REGEX_PATTERNS.europeanPorts);
    if (euPortMatches && euPortMatches.length > 0) {
      extracted.portDestination = euPortMatches[0];
      matchCount++;
    }

    // Extract vessel name
    const vesselMatches = REGEX_PATTERNS.vesselName.exec(content);
    if (vesselMatches) {
      extracted.vesselName = vesselMatches[1].trim();
      matchCount++;
    }

    // Extract voyage number
    const voyageMatches = REGEX_PATTERNS.voyageNumber.exec(content);
    if (voyageMatches) {
      extracted.voyageNumber = voyageMatches[1].trim();
      matchCount++;
    }

    // Extract container type
    const containerTypeMatches = content.match(REGEX_PATTERNS.containerType);
    if (containerTypeMatches && containerTypeMatches.length > 0) {
      const type = containerTypeMatches[0].toLowerCase();
      if (type.includes('40') && (type.includes('hc') || type.includes('hq'))) {
        extracted.containerType = '40ft_HC';
      } else if (type.includes('40')) {
        extracted.containerType = '40ft';
      } else {
        extracted.containerType = '20ft';
      }
      matchCount++;
    }

    // Extract dates (look for ETD/ETA keywords)
    const dateMatches = content.match(REGEX_PATTERNS.dateISO);
    if (dateMatches) {
      // Try to determine if it's ETD or ETA based on context
      const etdContext = /ETD|departure|sailing|depart/i;
      const etaContext = /ETA|arrival|arrive/i;

      dateMatches.forEach(dateStr => {
        const contextBefore = content.substring(
          Math.max(0, content.indexOf(dateStr) - 30),
          content.indexOf(dateStr)
        );

        if (etdContext.test(contextBefore) && !extracted.etd) {
          extracted.etd = new Date(dateStr);
          matchCount++;
        } else if (etaContext.test(contextBefore) && !extracted.eta) {
          extracted.eta = new Date(dateStr);
          matchCount++;
        }
      });
    }

    // Extract supplier contact
    const emailMatches = content.match(REGEX_PATTERNS.email);
    if (emailMatches) {
      // Filter out common addresses
      const supplierEmail = emailMatches.find(e =>
        !e.includes('promo-efect') &&
        !e.includes('gmail.com') &&
        !e.includes('yahoo.com')
      );
      if (supplierEmail) {
        extracted.supplierEmail = supplierEmail;
        matchCount++;
      }
    }

    const phoneMatches = content.match(REGEX_PATTERNS.phoneChina);
    if (phoneMatches && phoneMatches.length > 0) {
      extracted.supplierPhone = phoneMatches[0];
      matchCount++;
    }

    // Calculate confidence score (0-100)
    // Key fields weighted more heavily
    const weights = {
      containerNumber: 20,
      blNumber: 15,
      shippingLine: 10,
      portOrigin: 10,
      portDestination: 10,
      containerType: 10,
      etd: 5,
      eta: 5,
      vesselName: 5,
      voyageNumber: 5,
      supplierEmail: 3,
      supplierPhone: 2,
    };

    let totalWeight = 0;
    let earnedWeight = 0;

    Object.entries(weights).forEach(([field, weight]) => {
      totalWeight += weight;
      if (extracted[field as keyof ExtractedBookingData]) {
        earnedWeight += weight;
      }
    });

    extracted.confidence = Math.round((earnedWeight / totalWeight) * 100);

    return extracted;
  }

  /**
   * Parse email using Gemini AI (fallback when regex confidence < 80%)
   */
  async parseEmailWithAI(email: ParsedEmail): Promise<ExtractedBookingData> {
    try {
      // Import Gemini service dynamically
      const geminiService = await import('../../services/gemini.service');

      if (!geminiService.isGeminiConfigured()) {
        console.warn('Gemini API key not configured, skipping AI parsing');
        return {
          confidence: 0,
          extractionMethod: 'AI',
          rawEmailId: email.id,
        };
      }

      // Prepare email content for Gemini
      const emailContent = `
From: ${email.from}
Subject: ${email.subject}
Date: ${email.date.toISOString()}
Body:
${email.body.substring(0, 5000)}
      `.trim();

      // Parse with Gemini
      const geminiResult = await geminiService.parseEmailWithGemini(emailContent);

      if (geminiResult.error) {
        console.warn('Gemini parsing failed:', geminiResult.error);
        return {
          confidence: 0,
          extractionMethod: 'AI',
          rawEmailId: email.id,
        };
      }

      // Map Gemini result to ExtractedBookingData format
      const extracted: ExtractedBookingData = {
        containerNumber: geminiResult.containerNumber,
        blNumber: geminiResult.billOfLading,
        shippingLine: geminiResult.shippingLine,
        vesselName: geminiResult.vesselName,
        voyageNumber: undefined, // Gemini doesn't extract this yet
        portOrigin: geminiResult.portOfLoading,
        portDestination: geminiResult.portOfDischarge,
        etd: geminiResult.departureDate ? new Date(geminiResult.departureDate) : undefined,
        eta: geminiResult.eta ? new Date(geminiResult.eta) : undefined,
        containerType: undefined, // Will be inferred from other data
        cargoWeight: geminiResult.weight,
        cargoDescription: geminiResult.cargoDescription,
        supplierName: undefined,
        supplierPhone: undefined,
        supplierEmail: undefined,
        confidence: geminiResult.confidence || 75,
        extractionMethod: 'AI',
        rawEmailId: email.id,
      };

      return extracted;
    } catch (error) {
      console.error('AI parsing failed:', error);
      return {
        confidence: 0,
        extractionMethod: 'AI',
        rawEmailId: email.id,
      };
    }
  }

  /**
   * Process a single email - parse and optionally create booking
   */
  async processEmail(
    email: ParsedEmail,
    autoCreateBooking: boolean = true,
    minConfidenceForAutoCreate: number = 80
  ): Promise<EmailProcessingResult> {
    const startTime = Date.now();

    try {
      // Step 1: Try regex parsing first
      let extractedData = await this.parseEmailWithRegex(email);

      // Step 2: If confidence < 80%, try AI parsing
      if (extractedData.confidence < 80) {
        const aiData = await this.parseEmailWithAI(email);

        // Merge results, preferring higher confidence fields
        if (aiData.confidence > extractedData.confidence) {
          extractedData = {
            ...extractedData,
            ...aiData,
            // Keep regex results for fields where AI returned null
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
      if (extractedData.containerNumber) {
        existingContainer = await prisma.container.findUnique({
          where: { containerNumber: extractedData.containerNumber.toUpperCase() },
          include: { booking: true },
        });
      } else if (extractedData.blNumber) {
        existingContainer = await prisma.container.findFirst({
          where: { blNumber: extractedData.blNumber.toUpperCase() } as any,
          include: { booking: true },
        });
      }

      // Step 4: If container exists, update it with new data
      if (existingContainer) {
        const containerWithBooking = existingContainer as any;
        // Compare extracted data with existing data
        const hasSignificantChanges = 
          (extractedData.eta && existingContainer.eta && 
           Math.abs(new Date(extractedData.eta).getTime() - new Date(existingContainer.eta).getTime()) > 24 * 60 * 60 * 1000) ||
          (extractedData.portOrigin && containerWithBooking.booking?.portOrigin !== extractedData.portOrigin);

        if (hasSignificantChanges) {
          // Notify operator for review
          try {
            const operators = await prisma.user.findMany({
              where: {
                role: { in: ['OPERATOR', 'ADMIN', 'SUPER_ADMIN'] },
              },
            });

            for (const operator of operators) {
              await notificationService.sendNotification({
                userId: operator.id,
                bookingId: containerWithBooking.booking?.id,
                type: 'CONTAINER_UPDATE_REVIEW',
                title: `Container ${existingContainer.containerNumber} - Modificări Semnificative`,
                message: `Containerul ${existingContainer.containerNumber} are modificări semnificative care necesită revizuire:\n\n- ETA modificat: ${extractedData.eta ? new Date(extractedData.eta).toLocaleDateString('ro-RO') : 'N/A'}\n- Port origine: ${extractedData.portOrigin || 'N/A'}\n\nVă rugăm să verificați și să validați modificările.`,
                channels: { email: true, push: false, sms: false, whatsapp: false },
              });
            }
          } catch (error) {
            console.error(`[EmailService] Failed to send notification about container ${existingContainer.containerNumber}:`, error);
          }
          console.log(`[EmailService] Container ${existingContainer.containerNumber} has significant changes, needs review`);
        } else {
          // Update minor changes automatically
          await prisma.container.update({
            where: { id: existingContainer.id },
            data: {
              eta: extractedData.eta ? new Date(extractedData.eta) : existingContainer.eta,
              currentLocation: extractedData.portOrigin || existingContainer.currentLocation,
              updatedAt: new Date(),
            } as any,
          });

          // Create tracking event
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

      // Step 5: Container doesn't exist - create new container and booking
      if (autoCreateBooking && extractedData.confidence >= minConfidenceForAutoCreate) {
        // Check minimum required fields
        if (extractedData.portOrigin && (extractedData.containerNumber || extractedData.blNumber)) {
          // Find or create client based on email
          let client = await prisma.client.findFirst({
            where: { email: email.from },
          });

          if (!client) {
            // Try to find client by supplier email or name
            if (extractedData.supplierEmail) {
              client = await prisma.client.findFirst({
                where: { email: extractedData.supplierEmail },
              });
            }

            // If still not found, use default client
            if (!client) {
              client = await prisma.client.findFirst({
                where: { status: 'ACTIVE' },
              });
            }
          }

          if (client) {
            // Create booking from extracted data
            const booking = await prisma.booking.create({
              data: {
                id: undefined, // Let Prisma generate ID
                clientId: client.id,
                portOrigin: extractedData.portOrigin,
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
                supplierEmail: extractedData.supplierEmail || email.from,
                clientNotes: `Auto-created from email: ${email.subject}\n\nContainer: ${extractedData.containerNumber || 'N/A'}\nB/L: ${extractedData.blNumber || 'N/A'}`,
                status: 'DRAFT', // Admin will review
              } as any,
            });

            // Create container if we have container number or B/L
            let containerId: string | undefined;
            if (extractedData.containerNumber || extractedData.blNumber) {
              const container = await prisma.container.create({
                data: {
                  bookingId: booking.id,
                  containerNumber: extractedData.containerNumber?.toUpperCase() || `TEMP-${Date.now()}`,
                  blNumber: extractedData.blNumber?.toUpperCase(),
                  type: extractedData.containerType || '40ft',
                  weightGross: extractedData.cargoWeight ? parseFloat(extractedData.cargoWeight.replace(/[^0-9.]/g, '')) : undefined,
                  content: extractedData.cargoDescription,
                  temperatureSetting: extractedData.containerType?.includes('Reefer') ? 2 : undefined,
                  currentStatus: 'PENDING_REVIEW', // Needs operator validation
                  eta: extractedData.eta ? new Date(extractedData.eta) : undefined,
                  urgent: false,
                  delayed: false,
                } as any,
              });
              containerId = container.id;

              // Create initial tracking event
              await prisma.trackingEvent.create({
                data: {
                  containerId: container.id,
                  eventType: 'BOOKING_CONFIRMED',
                  eventDate: new Date(),
                  location: extractedData.portOrigin || 'Unknown',
                  source: 'EMAIL_PARSING',
                  validated: false, // Needs operator validation
                  visibility: 'INTERNAL',
                } as any,
              });

              // Send notification to operators about new container needing review
              try {
                const operators = await prisma.user.findMany({
                  where: {
                    role: { in: ['OPERATOR', 'ADMIN', 'SUPER_ADMIN'] },
                  },
                });

                for (const operator of operators) {
                  await notificationService.sendNotification({
                    userId: operator.id,
                    bookingId: booking.id,
                    type: 'NEW_CONTAINER_REVIEW',
                    title: `Container Nou Creat din Email: ${container.containerNumber}`,
                    message: `Un nou container a fost creat automat din email și necesită revizuire:\n\n- Container: ${container.containerNumber}\n- Booking: ${booking.id}\n- Client: ${client.companyName}\n- Port origine: ${extractedData.portOrigin || 'N/A'}\n- ETA: ${extractedData.eta ? new Date(extractedData.eta).toLocaleDateString('ro-RO') : 'N/A'}\n- Confidence: ${extractedData.confidence}%\n\nVă rugăm să verificați și să validați datele.`,
                    channels: { email: true, push: false, sms: false, whatsapp: false },
                  });
                }
              } catch (error) {
                console.error(`[EmailService] Failed to send notification about new container ${container.containerNumber}:`, error);
              }
              console.log(`[EmailService] Created container ${container.containerNumber} from email, needs review`);
            }

            // Log to audit
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
      }

      // Return result without auto-creating
      const status = extractedData.confidence >= 60 ? 'SUCCESS' : 'NEEDS_REVIEW';

      return {
        emailId: email.id,
        status,
        extractedData,
        processingTime: Date.now() - startTime,
      };

    } catch (error: any) {
      console.error('Email processing failed:', error);
      return {
        emailId: email.id,
        status: 'FAILED',
        error: error.message,
        processingTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Get email processing statistics
   */
  async getProcessingStats(): Promise<{
    totalProcessed: number;
    successCount: number;
    reviewCount: number;
    failedCount: number;
    autoCreatedBookings: number;
    averageConfidence: number;
  }> {
    // This would query from a email_processing_log table
    // For now, return mock stats
    const logs = await prisma.auditLog.findMany({
      where: {
        entityType: 'BOOKING',
        action: 'CREATE',
      },
    });

    const emailCreated = logs.filter(l => {
      const changes = l.changes as any;
      return changes?.source === 'EMAIL_AUTO_CREATE';
    });

    return {
      totalProcessed: emailCreated.length,
      successCount: emailCreated.length,
      reviewCount: 0,
      failedCount: 0,
      autoCreatedBookings: emailCreated.length,
      averageConfidence: 85,
    };
  }

  /**
   * Save raw email to queue for processing
   */
  async queueEmailForProcessing(email: ParsedEmail): Promise<void> {
    await (prisma as any).incomingEmail.create({
      data: {
        messageId: email.id,
        fromAddress: email.from,
        subject: email.subject,
        body: email.body,
        receivedAt: email.date,
        status: 'PENDING',
      },
    });
  }

  /**
   * Get incoming emails with filtering and pagination
   */
  async getIncomingEmails(options: {
    status?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<any[]> {
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
      body: email.body.substring(0, 500) + (email.body.length > 500 ? '...' : ''), // Preview only
      receivedAt: email.receivedAt,
      status: email.status,
      processedAt: email.processedAt,
      bookingId: email.bookingId,
      extractedData: email.extractedData ? JSON.parse(email.extractedData) : null,
      createdAt: email.createdAt,
    }));
  }

  /**
   * Get pending emails from queue
   */
  async getPendingEmails(): Promise<ParsedEmail[]> {
    const queued = await (prisma as any).incomingEmail.findMany({
      where: { status: 'PENDING' },
      orderBy: { receivedAt: 'desc' },
      take: 10,
    });

    return queued.map((q: any) => ({
      id: q.messageId,
      from: q.fromAddress,
      subject: q.subject,
      date: q.receivedAt,
      body: q.body,
      attachments: [],
    }));
  }

  /**
   * Mark email as processed in queue
   */
  async markEmailProcessed(messageId: string, status: 'PROCESSED' | 'FAILED', error?: string): Promise<void> {
    await (prisma as any).incomingEmail.update({
      where: { messageId },
      data: {
        status,
        processedAt: new Date(),
      },
    });
  }
}

// Export singleton instance
export const emailService = new EmailService();
