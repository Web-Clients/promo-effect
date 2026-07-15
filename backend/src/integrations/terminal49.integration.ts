/**
 * Terminal49 integration — automatic ocean container milestones.
 *
 * Terminal49 (https://terminal49.com) aggregates carrier data (Maersk, MSC,
 * CMA-CGM, Hapag, ONE, etc.) and exposes it via a JSON:API REST API + webhooks.
 * We register a container/BL for tracking, then receive webhook events
 * (vessel loaded/discharged, gate in/out, ETA changes) which we map onto the
 * existing provider-agnostic tracking pipeline (TrackingWebhookService).
 *
 * Configuration (env):
 *   TERMINAL49_API_KEY        — API token (Settings → API in the T49 dashboard)
 *   TERMINAL49_WEBHOOK_SECRET — optional HMAC secret to verify inbound webhooks
 *
 * No external dependency — uses the global fetch (Node 18+) and Node's crypto.
 */

import crypto from 'crypto';
import logger from '../utils/logger';
import type { WebhookPayload } from '../modules/tracking/tracking-webhook.service';

const T49_BASE = 'https://api.terminal49.com/v2';
const SOURCE = 'TERMINAL49';

/**
 * Terminal49 event name → our normalized eventType + which container timestamp
 * attribute carries the event time (falls back to now when absent).
 */
const EVENT_MAP: Record<string, { eventType: string; tsField?: string }> = {
  'container.transport.empty_out': { eventType: 'EMPTY_OUT', tsField: 'pol_empty_out_at' },
  'container.transport.full_in': { eventType: 'GATE_IN', tsField: 'pol_full_in_at' },
  'container.transport.vessel_loaded': { eventType: 'LOADED_ON_VESSEL', tsField: 'pol_loaded_at' },
  'container.transport.vessel_departed': {
    eventType: 'VESSEL_DEPARTURE',
    tsField: 'pol_departed_at',
  },
  'container.transport.vessel_arrived': { eventType: 'VESSEL_ARRIVAL', tsField: 'pod_arrived_at' },
  'container.transport.vessel_discharged': {
    eventType: 'DISCHARGED',
    tsField: 'pod_discharged_at',
  },
  'container.transport.transshipment_arrived': { eventType: 'TRANSSHIPMENT_ARRIVED' },
  'container.transport.transshipment_departed': { eventType: 'TRANSSHIPMENT_DEPARTED' },
  'container.transport.rail_departed': { eventType: 'RAIL_DEPARTURE' },
  'container.transport.rail_arrived': { eventType: 'RAIL_ARRIVAL' },
  'container.transport.full_out': { eventType: 'GATE_OUT', tsField: 'pod_full_out_at' },
  'container.transport.empty_in': { eventType: 'EMPTY_RETURNED', tsField: 'empty_terminated_at' },
  'container.pickup_lfd.changed': { eventType: 'LFD_CHANGED' },
  'shipment.estimated.arrival': { eventType: 'ETA_UPDATE' },
  'tracking_request.succeeded': { eventType: 'TRACKING_STARTED' },
  'tracking_request.failed': { eventType: 'TRACKING_FAILED' },
};

interface JsonApiResource {
  id?: string;
  type?: string;
  attributes?: Record<string, any>;
  relationships?: Record<string, { data?: { id?: string; type?: string } }>;
}

export class Terminal49Integration {
  private get apiKey(): string {
    return (process.env.TERMINAL49_API_KEY || '').trim();
  }

  private get webhookSecret(): string {
    return (process.env.TERMINAL49_WEBHOOK_SECRET || '').trim();
  }

  isConfigured(): boolean {
    return this.apiKey.length > 0;
  }

  private headers(): Record<string, string> {
    return {
      Authorization: `Token ${this.apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  /**
   * Register a container or bill of lading for tracking. Terminal49 resolves the
   * carrier automatically from the SCAC (or guesses when omitted).
   */
  async createTrackingRequest(params: {
    requestNumber: string;
    requestType?: 'bill_of_lading' | 'container' | 'booking';
    scac?: string;
  }): Promise<{ success: boolean; id?: string; error?: string }> {
    if (!this.isConfigured()) {
      return { success: false, error: 'TERMINAL49_API_KEY not set' };
    }
    try {
      const res = await fetch(`${T49_BASE}/tracking_requests`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({
          data: {
            type: 'tracking_request',
            attributes: {
              request_type: params.requestType || 'bill_of_lading',
              request_number: params.requestNumber,
              ...(params.scac ? { scac: params.scac } : {}),
            },
          },
        }),
      });
      const body = (await res.json().catch(() => ({}))) as any;
      if (!res.ok) {
        const error = body?.errors?.[0]?.detail || `HTTP ${res.status}`;
        logger.warn(`[Terminal49] createTrackingRequest failed: ${error}`);
        return { success: false, error };
      }
      return { success: true, id: body?.data?.id };
    } catch (error: any) {
      logger.warn(`[Terminal49] createTrackingRequest error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /** Verify an inbound webhook HMAC signature. Returns true when no secret is configured. */
  verifyWebhookSignature(rawBody: string, signature?: string): boolean {
    if (!this.webhookSecret) return true; // not enforced until a secret is set
    if (!signature) return false;
    try {
      const digest = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(rawBody, 'utf8')
        .digest('hex');
      const a = Buffer.from(digest);
      const b = Buffer.from(signature);
      return a.length === b.length && crypto.timingSafeEqual(a, b);
    } catch {
      return false;
    }
  }

  /**
   * Map a Terminal49 webhook body (JSON:API) to zero or more normalized
   * WebhookPayload objects for TrackingWebhookService. Pure function — safe to
   * unit-test and to run without network access (uses the embedded `included`
   * resources shipped in the webhook).
   */
  mapWebhookToPayloads(body: any): WebhookPayload[] {
    const event: string | undefined = body?.data?.attributes?.event;
    if (!event) return [];

    const mapping = EVENT_MAP[event];
    if (!mapping) {
      logger.info(`[Terminal49] unmapped event: ${event}`);
      return [];
    }

    const included: JsonApiResource[] = Array.isArray(body?.included) ? body.included : [];
    const containers = included.filter((r) => r.type === 'container');
    const shipment = included.find((r) => r.type === 'shipment');
    const sAttr = shipment?.attributes || {};

    // Shipment-level ETA update — no specific container, applies to the BL.
    if (event === 'shipment.estimated.arrival' || containers.length === 0) {
      const eta = sAttr.pod_eta_at || sAttr.estimated_arrival_at;
      const blNumber = sAttr.bill_of_lading_number || sAttr.normalized_number;
      if (!blNumber) return [];
      return [
        {
          blNumber,
          eventType: mapping.eventType,
          eventDate: this.toISO(eta) || this.nowISO(),
          portName: sAttr.pod_name,
          location: sAttr.pod_name,
          vessel: sAttr.pod_vessel_name,
          voyageNumber: sAttr.pod_voyage_number,
          status: 'IN_TRANSIT',
          details: { eta: this.toISO(eta) },
          source: SOURCE,
        },
      ];
    }

    // Container-level milestones — one payload per container in the notification.
    return containers.map((c) => {
      const cAttr = c.attributes || {};
      const ts = mapping.tsField ? cAttr[mapping.tsField] : undefined;
      const eta = cAttr.pod_eta_at || sAttr.pod_eta_at;
      return {
        containerNumber: cAttr.number || cAttr.normalized_number,
        blNumber: sAttr.bill_of_lading_number || sAttr.normalized_number,
        eventType: mapping.eventType,
        eventDate: this.toISO(ts) || this.nowISO(),
        portName: cAttr.pod_name || sAttr.pod_name,
        location: cAttr.location_name || cAttr.pod_name || sAttr.pod_name,
        vessel: cAttr.pod_vessel_name || sAttr.pod_vessel_name,
        voyageNumber: cAttr.pod_voyage_number || sAttr.pod_voyage_number,
        status: this.containerStatus(mapping.eventType),
        details: { eta: this.toISO(eta), event },
        source: SOURCE,
      } as WebhookPayload;
    });
  }

  private containerStatus(eventType: string): string {
    switch (eventType) {
      case 'LOADED_ON_VESSEL':
      case 'VESSEL_DEPARTURE':
      case 'VESSEL_ARRIVAL':
      case 'TRANSSHIPMENT_ARRIVED':
      case 'TRANSSHIPMENT_DEPARTED':
        return 'IN_TRANSIT';
      case 'DISCHARGED':
      case 'GATE_OUT':
        return 'ARRIVED';
      case 'EMPTY_RETURNED':
        return 'DELIVERED';
      default:
        return 'IN_TRANSIT';
    }
  }

  private toISO(value?: string): string | undefined {
    if (!value) return undefined;
    const d = new Date(value);
    return isNaN(d.getTime()) ? undefined : d.toISOString();
  }

  private nowISO(): string {
    return new Date().toISOString();
  }
}

export const terminal49 = new Terminal49Integration();
export default terminal49;
