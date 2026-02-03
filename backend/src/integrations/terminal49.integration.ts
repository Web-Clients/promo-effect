/**
 * Terminal49 Integration
 * 
 * Handles integration with Terminal49 API for container tracking
 * Terminal49 is a universal aggregator for all shipping lines
 * 
 * Documentation: https://docs.terminal49.com
 */

import axios, { AxiosInstance } from 'axios';

export interface Terminal49Container {
  id: string;
  containerNumber: string;
  blNumber?: string;
  shippingLine?: string;
  status?: string;
  location?: {
    name?: string;
    city?: string;
    country?: string;
    unlocode?: string;
    latitude?: number;
    longitude?: number;
  };
  vessel?: {
    name?: string;
    imo?: string;
  };
  voyage?: string;
  eta?: string;
  ata?: string;
  events?: Terminal49Event[];
}

export interface Terminal49Event {
  id: string;
  type: string;
  occurredAt: string;
  location?: {
    name?: string;
    city?: string;
    country?: string;
    unlocode?: string;
    latitude?: number;
    longitude?: number;
  };
  vessel?: {
    name?: string;
    imo?: string;
  };
  voyage?: string;
  description?: string;
  metadata?: any;
}

export interface Terminal49TrackingResponse {
  data: Terminal49Container;
  included?: any[];
}

export class Terminal49Integration {
  private apiKey: string;
  private baseUrl: string = 'https://api.terminal49.com/v1';
  private client: AxiosInstance;

  constructor() {
    this.apiKey = process.env.TERMINAL49_API_KEY || '';
    
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000, // 10 seconds
    });
  }

  /**
   * Check if Terminal49 is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Get container tracking by container number
   */
  async getContainerTracking(containerNumber: string): Promise<Terminal49Container | null> {
    if (!this.isConfigured()) {
      console.warn('Terminal49 API key not configured');
      return null;
    }

    try {
      const response = await this.client.get<Terminal49TrackingResponse>(
        `/containers/${containerNumber}`,
        {
          params: {
            include: 'events,location,vessel',
          },
        }
      );

      return response.data.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        console.log(`Container ${containerNumber} not found in Terminal49`);
        return null;
      }

      console.error(`Terminal49 API error for container ${containerNumber}:`, error.message);
      throw error;
    }
  }

  /**
   * Get container tracking by B/L number
   */
  async getContainerByBL(blNumber: string): Promise<Terminal49Container | null> {
    if (!this.isConfigured()) {
      console.warn('Terminal49 API key not configured');
      return null;
    }

    try {
      const response = await this.client.get<Terminal49TrackingResponse>(
        `/bill-of-ladings/${blNumber}/containers`,
        {
          params: {
            include: 'events,location,vessel',
          },
        }
      );

      // Terminal49 returns array of containers for a B/L
      const containers = response.data.data as any;
      return Array.isArray(containers) && containers.length > 0 ? containers[0] : null;
    } catch (error: any) {
      if (error.response?.status === 404) {
        console.log(`B/L ${blNumber} not found in Terminal49`);
        return null;
      }

      console.error(`Terminal49 API error for B/L ${blNumber}:`, error.message);
      throw error;
    }
  }

  /**
   * Subscribe to container updates (webhook subscription)
   * This creates a webhook subscription in Terminal49
   */
  async subscribeToContainer(containerNumber: string, webhookUrl: string): Promise<boolean> {
    if (!this.isConfigured()) {
      return false;
    }

    try {
      await this.client.post('/webhooks/subscriptions', {
        containerNumber,
        webhookUrl,
        events: [
          'container.status_changed',
          'container.location_changed',
          'container.eta_changed',
          'container.event_added',
        ],
      });

      return true;
    } catch (error: any) {
      console.error(`Failed to subscribe to container ${containerNumber}:`, error.message);
      return false;
    }
  }

  /**
   * Map Terminal49 event type to our internal event type
   */
  mapEventType(terminal49Type: string): string {
    const typeMap: Record<string, string> = {
      'container.loaded': 'LOADED_ON_VESSEL',
      'container.departed': 'VESSEL_DEPARTURE',
      'container.arrived': 'VESSEL_ARRIVAL',
      'container.discharged': 'DISCHARGED',
      'container.gate_in': 'GATE_IN',
      'container.gate_out': 'GATE_OUT',
      'container.customs_hold': 'CUSTOMS_INSPECTION',
      'container.customs_released': 'CUSTOMS_RELEASED',
      'container.delivered': 'DELIVERED',
      'container.in_transit': 'IN_TRANSIT',
    };

    return typeMap[terminal49Type] || terminal49Type.toUpperCase();
  }

  /**
   * Verify webhook signature from Terminal49
   * Terminal49 signs webhooks with HMAC-SHA256
   */
  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    if (!signature || !secret) {
      return false;
    }

    try {
      const crypto = require('crypto');
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

      // Terminal49 sends signature as "sha256=<hash>"
      const receivedHash = signature.replace('sha256=', '');
      
      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature),
        Buffer.from(receivedHash)
      );
    } catch (error) {
      console.error('Webhook signature verification error:', error);
      return false;
    }
  }

  /**
   * Parse Terminal49 webhook payload
   */
  parseWebhookPayload(payload: any): {
    containerNumber?: string;
    blNumber?: string;
    eventType: string;
    eventDate: string;
    location?: string;
    portName?: string;
    vessel?: string;
    voyageNumber?: string;
    latitude?: number;
    longitude?: number;
    status?: string;
    details?: any;
    source: string;
  } {
    const event = payload.event || payload;
    const container = payload.container || {};

    return {
      containerNumber: container.containerNumber || container.number,
      blNumber: container.blNumber || container.billOfLading,
      eventType: this.mapEventType(event.type || payload.type),
      eventDate: event.occurredAt || event.occurred_at || new Date().toISOString(),
      location: event.location?.name || container.location?.name,
      portName: event.location?.name || container.location?.name,
      vessel: event.vessel?.name || container.vessel?.name,
      voyageNumber: event.voyage || container.voyage,
      latitude: event.location?.latitude || container.location?.latitude,
      longitude: event.location?.longitude || container.location?.longitude,
      status: container.status || event.status,
      details: {
        terminal49EventId: event.id,
        description: event.description,
        metadata: event.metadata,
      },
      source: 'TERMINAL49',
    };
  }
}

// Export singleton instance
export const terminal49Integration = new Terminal49Integration();

