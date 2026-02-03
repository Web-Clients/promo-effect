/**
 * SeaRates Web Integration
 * 
 * Handles integration with SeaRates for container tracking via web integrations
 * SeaRates provides web integrations to access container tracking data directly
 * 
 * Documentation: https://www.searates.com/integrations
 */

import axios, { AxiosInstance } from 'axios';

export interface SeaRatesContainer {
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
  events?: SeaRatesEvent[];
}

export interface SeaRatesEvent {
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

export interface SeaRatesWebhookPayload {
  containerNumber: string;
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
}

export class SeaRatesIntegration {
  private apiKey: string;
  private webhookSecret: string;
  private baseUrl: string = process.env.SEARATES_API_URL || 'https://api.searates.com/v1';
  private client: AxiosInstance;

  constructor() {
    this.apiKey = process.env.SEARATES_API_KEY || '';
    this.webhookSecret = process.env.SEARATES_WEBHOOK_SECRET || '';
    
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 15000, // 15 seconds
    });
  }

  /**
   * Check if SeaRates is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Get container tracking by container number
   * SeaRates web integration provides direct access to container data
   */
  async getContainerTracking(containerNumber: string): Promise<SeaRatesContainer | null> {
    if (!this.isConfigured()) {
      console.warn('SeaRates API key not configured');
      return null;
    }

    try {
      const response = await this.client.get<{ data: SeaRatesContainer }>(
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
        console.log(`Container ${containerNumber} not found in SeaRates`);
        return null;
      }

      console.error(`SeaRates API error for container ${containerNumber}:`, error.message);
      throw error;
    }
  }

  /**
   * Get container tracking by B/L number
   */
  async getContainerByBL(blNumber: string): Promise<SeaRatesContainer | null> {
    if (!this.isConfigured()) {
      console.warn('SeaRates API key not configured');
      return null;
    }

    try {
      const response = await this.client.get<{ data: SeaRatesContainer[] }>(
        `/bill-of-ladings/${blNumber}/containers`,
        {
          params: {
            include: 'events,location,vessel',
          },
        }
      );

      const containers = response.data.data;
      return Array.isArray(containers) && containers.length > 0 ? containers[0] : null;
    } catch (error: any) {
      if (error.response?.status === 404) {
        console.log(`B/L ${blNumber} not found in SeaRates`);
        return null;
      }

      console.error(`SeaRates API error for B/L ${blNumber}:`, error.message);
      throw error;
    }
  }

  /**
   * Subscribe to container updates via webhook
   * SeaRates web integration allows webhook subscriptions
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
      console.error(`Failed to subscribe to container ${containerNumber} in SeaRates:`, error.message);
      return false;
    }
  }

  /**
   * Map SeaRates event type to our internal event type
   */
  mapEventType(searatesType: string): string {
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
      'container.transshipment': 'TRANSSHIPMENT',
      'container.available_for_pickup': 'AVAILABLE_FOR_PICKUP',
    };

    return typeMap[searatesType] || searatesType.toUpperCase();
  }

  /**
   * Verify webhook signature from SeaRates
   * SeaRates signs webhooks with HMAC-SHA256
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

      // SeaRates sends signature as "sha256=<hash>" or just the hash
      const receivedHash = signature.replace('sha256=', '');
      
      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature),
        Buffer.from(receivedHash)
      );
    } catch (error) {
      console.error('SeaRates webhook signature verification error:', error);
      return false;
    }
  }

  /**
   * Parse SeaRates webhook payload
   * SeaRates web integration sends data in specific format
   */
  parseWebhookPayload(payload: any): SeaRatesWebhookPayload {
    const event = payload.event || payload;
    const container = payload.container || {};

    return {
      containerNumber: container.containerNumber || container.number || payload.containerNumber,
      blNumber: container.blNumber || container.billOfLading || payload.blNumber,
      eventType: this.mapEventType(event.type || payload.type || event.eventType),
      eventDate: event.occurredAt || event.occurred_at || event.eventDate || new Date().toISOString(),
      location: event.location?.name || container.location?.name || event.location,
      portName: event.location?.name || container.location?.name || event.portName,
      vessel: event.vessel?.name || container.vessel?.name || event.vessel,
      voyageNumber: event.voyage || container.voyage || event.voyageNumber,
      latitude: event.location?.latitude || container.location?.latitude || event.latitude,
      longitude: event.location?.longitude || container.location?.longitude || event.longitude,
      status: container.status || event.status || payload.status,
      details: {
        searatesEventId: event.id || payload.id,
        description: event.description || payload.description,
        metadata: event.metadata || payload.metadata,
      },
    };
  }

  /**
   * Get multiple containers tracking (batch request)
   * Useful for syncing multiple containers at once
   */
  async getMultipleContainers(containerNumbers: string[]): Promise<SeaRatesContainer[]> {
    if (!this.isConfigured() || containerNumbers.length === 0) {
      return [];
    }

    try {
      const response = await this.client.post<{ data: SeaRatesContainer[] }>(
        '/containers/batch',
        {
          containerNumbers,
        }
      );

      return response.data.data || [];
    } catch (error: any) {
      console.error('SeaRates batch API error:', error.message);
      return [];
    }
  }
}

// Export singleton instance
export const searatesIntegration = new SeaRatesIntegration();

