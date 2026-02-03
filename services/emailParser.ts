/**
 * Email Parser Service
 * Frontend service for AI-powered email parsing API calls
 */

import api from './api';

// Parsed email data from AI
export interface ParsedEmailData {
  containerNumber?: string;
  billOfLading?: string;
  vesselName?: string;
  departureDate?: string;
  eta?: string;
  portOfLoading?: string;
  portOfDischarge?: string;
  shippingLine?: string;
  cargoDescription?: string;
  weight?: string;
  voyageNumber?: string;
  containerType?: string;
  supplierName?: string;
  supplierPhone?: string;
  supplierEmail?: string;
  confidence?: number;
  error?: string;
}

// Result from full email processing
export interface EmailProcessingResult {
  emailId: string;
  status: 'SUCCESS' | 'NEEDS_REVIEW' | 'FAILED';
  extractedData?: ParsedEmailData;
  bookingId?: string;
  containerId?: string;
  error?: string;
  processingTime: number;
}

// AI status response
export interface AIStatusResponse {
  available: boolean;
  reason: string;
}

// Incoming email from queue
export interface IncomingEmail {
  id: string;
  messageId: string;
  from: string;
  subject: string;
  body: string;
  receivedAt: string;
  status: 'PENDING' | 'PROCESSING' | 'PROCESSED' | 'FAILED';
  processedAt?: string;
  bookingId?: string;
  extractedData?: ParsedEmailData;
  createdAt: string;
}

// Email processing statistics
export interface EmailProcessingStats {
  totalProcessed: number;
  successCount: number;
  reviewCount: number;
  failedCount: number;
  autoCreatedBookings: number;
  averageConfidence: number;
}

class EmailParserService {
  /**
   * Check if Gemini AI parsing is available
   */
  async checkAIStatus(): Promise<AIStatusResponse> {
    const response = await api.get<AIStatusResponse>('/admin/emails/ai-status');
    return response.data;
  }

  /**
   * Parse email content using Gemini AI
   * Returns extracted shipping/logistics data
   */
  async parseWithAI(emailContent: string): Promise<{ success: boolean; data?: ParsedEmailData; confidence?: number; error?: string }> {
    const response = await api.post<{ success: boolean; data?: ParsedEmailData; confidence?: number; error?: string }>(
      '/admin/emails/parse-with-ai',
      { emailContent }
    );
    return response.data;
  }

  /**
   * Parse email without creating booking
   * Uses both regex and AI parsing
   */
  async parseEmail(email: { from?: string; subject: string; body: string; date?: string }): Promise<EmailProcessingResult> {
    const response = await api.post<EmailProcessingResult>('/admin/emails/parse', email);
    return response.data;
  }

  /**
   * Process email and optionally create booking
   */
  async processEmail(
    email: { from?: string; subject: string; body: string; date?: string },
    autoCreate: boolean = true,
    minConfidence: number = 80
  ): Promise<EmailProcessingResult> {
    const response = await api.post<EmailProcessingResult>('/admin/emails/process', {
      ...email,
      autoCreate,
      minConfidence,
    });
    return response.data;
  }

  /**
   * Get list of incoming emails with filtering
   */
  async getIncomingEmails(options: {
    status?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ success: boolean; count: number; emails: IncomingEmail[] }> {
    const params = new URLSearchParams();
    if (options.status) params.append('status', options.status);
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.offset) params.append('offset', options.offset.toString());

    const response = await api.get<{ success: boolean; count: number; emails: IncomingEmail[] }>(
      `/admin/emails?${params.toString()}`
    );
    return response.data;
  }

  /**
   * Get pending emails in queue
   */
  async getPendingEmails(): Promise<{ pending: number; emails: IncomingEmail[] }> {
    const response = await api.get<{ pending: number; emails: IncomingEmail[] }>('/admin/emails/queue');
    return response.data;
  }

  /**
   * Process all pending emails in queue
   */
  async processQueue(autoCreate: boolean = true, minConfidence: number = 80): Promise<{
    summary: {
      total: number;
      success: number;
      needsReview: number;
      failed: number;
      bookingsCreated: number;
    };
    results: EmailProcessingResult[];
  }> {
    const response = await api.post('/admin/emails/process-queue', {
      autoCreate,
      minConfidence,
    });
    return response.data;
  }

  /**
   * Get email processing statistics
   */
  async getStats(): Promise<EmailProcessingStats> {
    const response = await api.get<EmailProcessingStats>('/admin/emails/stats');
    return response.data;
  }

  /**
   * Fetch emails from Gmail
   */
  async fetchFromGmail(maxResults: number = 10): Promise<{ success: boolean; fetched: number; message: string }> {
    const response = await api.post<{ success: boolean; fetched: number; message: string }>(
      '/admin/emails/fetch',
      { maxResults }
    );
    return response.data;
  }

  /**
   * Get Gmail connection status
   */
  async getGmailStatus(): Promise<{
    configured: boolean;
    connected: boolean;
    email?: string;
    expiresAt?: string;
    lastFetchAt?: string;
  }> {
    const response = await api.get('/admin/gmail/status');
    return response.data;
  }

  /**
   * Get Gmail auth URL
   */
  async getGmailAuthUrl(): Promise<{ authUrl: string; message: string }> {
    const response = await api.get<{ authUrl: string; message: string }>('/admin/gmail/auth');
    return response.data;
  }

  /**
   * Setup email forwarding address
   */
  async setupForwarding(): Promise<{
    success: boolean;
    data: {
      forwardAddress: string;
      instructions: {
        gmail: string[];
        outlook: string[];
        generic: string[];
      };
      webhookUrl: string;
      autoProcessing: {
        enabled: boolean;
        minConfidence: number;
        autoCreateContainers: boolean;
      };
    };
  }> {
    const response = await api.post('/admin/email/forward-setup');
    return response.data;
  }
}

const emailParserService = new EmailParserService();
export default emailParserService;
