/**
 * AISStream.io WebSocket Integration
 *
 * Replaces SeaRates as the source of vessel position data.
 * Free, unlimited AIS data over a single persistent WebSocket connection.
 *
 * Docs: https://aisstream.io/documentation
 * Endpoint: wss://stream.aisstream.io/v0/stream
 *
 * Architecture:
 *  - One singleton WebSocket per backend process.
 *  - Subscribes to a global bounding box but filters by MMSI list pulled
 *    from active containers. Refreshes the subscription whenever the MMSI
 *    set changes.
 *  - Position updates are kept in an in-memory Map<mmsi, VesselPosition>.
 *    Periodically (every 60s) the latest positions are flushed to the
 *    Container table (vesselLat/Lng/Sog/Cog/Heading/PosAt).
 *  - Ship static data (vessel name, IMO) is opportunistically merged into
 *    the cache when AISStream emits a ShipStaticData message.
 */

import WebSocket from 'ws';
import prisma from '../lib/prisma';
import logger from '../utils/logger';
import { AISStreamMessage, AISStreamSubscription, VesselPosition } from './aisstream.types';

const AISSTREAM_URL = 'wss://stream.aisstream.io/v0/stream';
const GLOBAL_BBOX: Array<Array<[number, number]>> = [
  [
    [-90, -180],
    [90, 180],
  ],
];

const RECONNECT_DELAYS_MS = [1_000, 2_000, 5_000, 10_000, 30_000, 60_000];
const FLUSH_INTERVAL_MS = 60_000; // persist cache → DB every 60s
const RESUBSCRIBE_DEBOUNCE_MS = 2_000;
const POSITION_STALE_MS = 1000 * 60 * 60 * 6; // drop cached positions older than 6h

export class AISStreamIntegration {
  private apiKey: string;
  private ws: WebSocket | null = null;
  private positionCache: Map<string, VesselPosition> = new Map();
  private subscribedMmsis: Set<string> = new Set();
  private reconnectAttempt = 0;
  private flushTimer: NodeJS.Timeout | null = null;
  private resubscribeTimer: NodeJS.Timeout | null = null;
  private connecting = false;
  private started = false;

  constructor() {
    this.apiKey = process.env.AISSTREAM_API_KEY || '';
  }

  isConfigured(): boolean {
    return this.apiKey.length > 10;
  }

  getApiKeyInfo(): string {
    if (!this.apiKey) return 'Not configured';
    return `${this.apiKey.slice(0, 6)}...${this.apiKey.slice(-4)}`;
  }

  /**
   * Boot the WebSocket + the periodic flush job. Idempotent.
   */
  async start(): Promise<void> {
    if (this.started) return;
    this.started = true;

    if (!this.isConfigured()) {
      logger.warn('[AISStream] AISSTREAM_API_KEY not set — vessel tracking disabled');
      return;
    }

    await this.refreshSubscribedMmsis();
    this.connect();
    this.flushTimer = setInterval(() => {
      this.flushCacheToDb().catch((err) => logger.error('[AISStream] flushCacheToDb error:', err));
    }, FLUSH_INTERVAL_MS);
  }

  /**
   * Cleanly close the connection (used on shutdown).
   */
  stop(): void {
    this.started = false;
    if (this.flushTimer) clearInterval(this.flushTimer);
    this.flushTimer = null;
    if (this.resubscribeTimer) clearTimeout(this.resubscribeTimer);
    this.resubscribeTimer = null;
    if (this.ws) {
      this.ws.removeAllListeners();
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Pull MMSI list from all active containers (non-DELIVERED/CANCELLED)
   * and replace the subscription set.
   */
  async refreshSubscribedMmsis(): Promise<void> {
    const containers = await prisma.container.findMany({
      where: {
        vesselMmsi: { not: null },
        currentStatus: { notIn: ['DELIVERED', 'CANCELLED'] },
      },
      select: { vesselMmsi: true },
    });

    const next = new Set<string>();
    for (const c of containers) {
      if (c.vesselMmsi) next.add(c.vesselMmsi);
    }

    const changed =
      next.size !== this.subscribedMmsis.size ||
      [...next].some((m) => !this.subscribedMmsis.has(m));

    this.subscribedMmsis = next;

    if (changed) {
      this.scheduleResubscribe();
    }
  }

  /**
   * Add a single MMSI to the subscription set without a full DB scan.
   * Called when an operator assigns a vessel to a container.
   */
  trackMmsi(mmsi: string): void {
    if (!mmsi) return;
    if (this.subscribedMmsis.has(mmsi)) return;
    this.subscribedMmsis.add(mmsi);
    this.scheduleResubscribe();
  }

  untrackMmsi(mmsi: string): void {
    if (this.subscribedMmsis.delete(mmsi)) {
      this.scheduleResubscribe();
    }
  }

  getPosition(mmsi: string): VesselPosition | null {
    return this.positionCache.get(mmsi) || null;
  }

  getAllPositions(): VesselPosition[] {
    return [...this.positionCache.values()];
  }

  /**
   * One-shot connectivity check. Opens a temp WebSocket, waits for the
   * subscription ack (first message) or a timeout, then closes.
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.isConfigured()) {
      return { success: false, message: 'AISSTREAM_API_KEY not configured' };
    }

    return new Promise((resolve) => {
      let settled = false;
      const ws = new WebSocket(AISSTREAM_URL);
      const timeout = setTimeout(() => {
        if (settled) return;
        settled = true;
        ws.terminate();
        resolve({ success: false, message: 'Timed out waiting for AISStream response' });
      }, 10_000);

      ws.on('open', () => {
        const sub: AISStreamSubscription = {
          APIKey: this.apiKey,
          BoundingBoxes: GLOBAL_BBOX,
          FilterMessageTypes: ['PositionReport'],
        };
        ws.send(JSON.stringify(sub));
      });

      ws.on('message', () => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        ws.close();
        resolve({ success: true, message: 'AISStream connection successful' });
      });

      ws.on('error', (err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        resolve({ success: false, message: `AISStream error: ${err.message}` });
      });
    });
  }

  // ============================================
  // INTERNAL: WebSocket lifecycle
  // ============================================

  private connect(): void {
    if (this.connecting || this.ws) return;
    this.connecting = true;

    const ws = new WebSocket(AISSTREAM_URL);
    this.ws = ws;

    ws.on('open', () => {
      this.connecting = false;
      this.reconnectAttempt = 0;
      logger.info('[AISStream] WebSocket connected');
      this.sendSubscription();
    });

    ws.on('message', (raw) => {
      try {
        const msg: AISStreamMessage = JSON.parse(raw.toString());
        this.handleMessage(msg);
      } catch (err) {
        logger.warn('[AISStream] Failed to parse message:', err);
      }
    });

    ws.on('close', (code, reason) => {
      this.connecting = false;
      this.ws = null;
      logger.warn(`[AISStream] WebSocket closed code=${code} reason=${reason.toString()}`);
      if (this.started) this.scheduleReconnect();
    });

    ws.on('error', (err) => {
      logger.error('[AISStream] WebSocket error:', err.message);
      // close handler will fire next, which schedules reconnect
    });
  }

  private scheduleReconnect(): void {
    const delay =
      RECONNECT_DELAYS_MS[Math.min(this.reconnectAttempt, RECONNECT_DELAYS_MS.length - 1)];
    this.reconnectAttempt++;
    logger.info(`[AISStream] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempt})`);
    setTimeout(() => {
      if (this.started) this.connect();
    }, delay);
  }

  private scheduleResubscribe(): void {
    if (this.resubscribeTimer) clearTimeout(this.resubscribeTimer);
    this.resubscribeTimer = setTimeout(() => {
      this.resubscribeTimer = null;
      this.sendSubscription();
    }, RESUBSCRIBE_DEBOUNCE_MS);
  }

  private sendSubscription(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    // AISStream requires at least one MMSI OR a bounding box. We always
    // send the global bbox + the MMSI filter so we receive only vessels
    // we care about (otherwise the stream is firehose-volume).
    const sub: AISStreamSubscription = {
      APIKey: this.apiKey,
      BoundingBoxes: GLOBAL_BBOX,
      FilterMessageTypes: ['PositionReport', 'ShipStaticData'],
    };

    if (this.subscribedMmsis.size > 0) {
      sub.FiltersShipMMSI = [...this.subscribedMmsis];
    } else {
      // No active containers with MMSI yet — subscribe to a tiny placeholder
      // MMSI so AISStream doesn't flood us with the whole world.
      sub.FiltersShipMMSI = ['000000000'];
    }

    try {
      this.ws.send(JSON.stringify(sub));
      logger.info(`[AISStream] Subscribed to ${this.subscribedMmsis.size} MMSI(s)`);
    } catch (err) {
      logger.error('[AISStream] Failed to send subscription:', err);
    }
  }

  // ============================================
  // INTERNAL: message handling
  // ============================================

  private handleMessage(msg: AISStreamMessage): void {
    const mmsi = String(msg.MetaData?.MMSI ?? '');
    if (!mmsi || mmsi === '0') return;

    const existing = this.positionCache.get(mmsi);

    if (msg.MessageType === 'PositionReport' && msg.Message.PositionReport) {
      const p = msg.Message.PositionReport;
      const next: VesselPosition = {
        mmsi,
        shipName: existing?.shipName || msg.MetaData?.ShipName?.trim(),
        imo: existing?.imo,
        callSign: existing?.callSign,
        latitude: p.Latitude,
        longitude: p.Longitude,
        sog: p.Sog,
        cog: p.Cog,
        heading: p.TrueHeading,
        navigationalStatus: p.NavigationalStatus,
        shipType: existing?.shipType,
        destination: existing?.destination,
        timestamp: msg.MetaData?.time_utc || new Date().toISOString(),
        source: 'AISSTREAM',
      };
      this.positionCache.set(mmsi, next);
      return;
    }

    if (msg.MessageType === 'ShipStaticData' && msg.Message.ShipStaticData) {
      const s = msg.Message.ShipStaticData;
      const next: VesselPosition = existing
        ? { ...existing }
        : {
            mmsi,
            latitude: 0,
            longitude: 0,
            sog: 0,
            cog: 0,
            heading: 0,
            timestamp: msg.MetaData?.time_utc || new Date().toISOString(),
            source: 'AISSTREAM',
          };
      if (s.Name) next.shipName = s.Name.trim();
      if (s.ImoNumber) next.imo = String(s.ImoNumber);
      if (s.CallSign) next.callSign = s.CallSign.trim();
      if (s.ShipType !== undefined) next.shipType = s.ShipType;
      if (s.Destination) next.destination = s.Destination.trim();
      this.positionCache.set(mmsi, next);
      return;
    }

    // Class B position reports — same shape as PositionReport for our needs
    const classB =
      msg.Message.StandardClassBPositionReport || msg.Message.ExtendedClassBPositionReport;
    if (classB) {
      const next: VesselPosition = {
        ...(existing || {
          mmsi,
          shipName: msg.MetaData?.ShipName?.trim(),
          source: 'AISSTREAM' as const,
        }),
        mmsi,
        latitude: classB.Latitude,
        longitude: classB.Longitude,
        sog: classB.Sog,
        cog: classB.Cog,
        heading: classB.TrueHeading,
        timestamp: msg.MetaData?.time_utc || new Date().toISOString(),
        source: 'AISSTREAM',
      };
      this.positionCache.set(mmsi, next);
    }
  }

  // ============================================
  // INTERNAL: persist cache → DB
  // ============================================

  private async flushCacheToDb(): Promise<void> {
    if (this.positionCache.size === 0) return;

    const now = Date.now();
    const toFlush: VesselPosition[] = [];
    for (const pos of this.positionCache.values()) {
      const age = now - new Date(pos.timestamp).getTime();
      if (age < POSITION_STALE_MS) toFlush.push(pos);
      else this.positionCache.delete(pos.mmsi);
    }

    if (toFlush.length === 0) return;

    for (const pos of toFlush) {
      try {
        await prisma.container.updateMany({
          where: { vesselMmsi: pos.mmsi },
          data: {
            vesselName: pos.shipName || undefined,
            vesselImo: pos.imo || undefined,
            vesselSog: pos.sog,
            vesselCog: pos.cog,
            vesselHeading: pos.heading >= 511 ? null : pos.heading,
            vesselPosAt: new Date(pos.timestamp),
            currentLat: pos.latitude,
            currentLng: pos.longitude,
            lastSyncAt: new Date(),
            apiSource: 'AISSTREAM',
          },
        });
      } catch (err) {
        logger.error(`[AISStream] flush error for MMSI ${pos.mmsi}:`, err);
      }
    }

    logger.info(`[AISStream] Flushed ${toFlush.length} vessel positions to DB`);
  }
}

export const aisstreamIntegration = new AISStreamIntegration();
