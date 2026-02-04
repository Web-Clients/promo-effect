/**
 * SeaRates API v3 Integration
 *
 * Container tracking using SeaRates Tracking API v3
 * Documentation: https://docs.searates.com/reference/tracking/tracking-by-container
 *
 * Base URL: https://tracking.searates.com
 * Authentication: API Key as query parameter
 */

import axios, { AxiosInstance } from 'axios';

// ============================================
// RESPONSE INTERFACES
// ============================================

export interface SeaRatesMetadata {
  type: 'CT' | 'BL' | 'BK';
  number: string;
  sealine: string;
  sealine_name?: string;
  status: string;
  api_calls?: {
    total: number;
    used: number;
    remaining: number;
  };
  unique_shipments?: {
    total: number;
    used: number;
    remaining: number;
  };
}

export interface SeaRatesLocation {
  id: number;
  name: string;
  state?: string;
  city?: string;
  country: string;
  country_code?: string;
  locode?: string;
  lat?: number;
  lng?: number;
  timezone?: string;
}

export interface SeaRatesFacility {
  id: number;
  name: string;
  type?: string;
  country?: string;
  country_code?: string;
  locode?: string;
  bic_code?: string;
  smdg_code?: string;
  lat?: number;
  lng?: number;
}

export interface SeaRatesVessel {
  id: number;
  name: string;
  imo?: number;
  call_sign?: string;
  mmsi?: number;
  flag?: string;
}

// Raw event from API (location/facility/vessel are IDs, not objects)
export interface SeaRatesContainerEvent {
  order_id?: number;
  time_type?: string; // 'A' (actual) or 'E' (estimated)
  event_type?: string;
  event_code?: string;
  event_name?: string;
  description?: string;
  status?: string;
  location: number | SeaRatesLocation; // Can be ID or object
  facility?: number | SeaRatesFacility; // Can be ID or object
  date?: string;
  actual_date?: string;
  expected_date?: string;
  actual?: boolean;
  vessel?: number | SeaRatesVessel; // Can be ID or object
  voyage?: string;
  transport_type?: string;
  type?: string;
}

export interface SeaRatesContainerTransport {
  transport_type?: string;
  vessel?: SeaRatesVessel;
  voyage?: string;
  mode?: string;
  pol?: SeaRatesLocation;
  pod?: SeaRatesLocation;
  atd?: string; // Actual Time Departure
  ata?: string; // Actual Time Arrival
  etd?: string; // Estimated Time Departure
  eta?: string; // Estimated Time Arrival
  predicted_eta?: string;
}

export interface SeaRatesContainerData {
  number: string;
  iso_code?: string;
  size_type?: string;
  status?: string;
  is_empty?: boolean;
  events?: SeaRatesContainerEvent[];
  transports?: SeaRatesContainerTransport[];
}

export interface SeaRatesRoutePoint {
  path: Array<[number, number]>; // [lng, lat] pairs
  timestamp?: string;
  speed?: number;
}

export interface SeaRatesRouteData {
  type?: string;
  route?: {
    path?: Array<[number, number]>;
    points?: SeaRatesRoutePoint[];
  };
  pins?: Array<{
    coordinates: [number, number];
    location?: SeaRatesLocation;
    type?: string;
  }>;
}

export interface SeaRatesApiResponse {
  status: 'success' | 'error';
  message: string;
  data?: {
    metadata: SeaRatesMetadata;
    locations?: SeaRatesLocation[];
    facilities?: SeaRatesFacility[];
    route?: any;
    vessels?: SeaRatesVessel[];
    containers?: SeaRatesContainerData[];
    route_data?: SeaRatesRouteData;
  };
  errors?: Array<{
    code: string;
    message: string;
  }>;
}

// Internal interface for simplified container data
export interface SeaRatesContainer {
  containerNumber: string;
  blNumber?: string;
  bookingNumber?: string;
  shippingLine?: string;
  shippingLineName?: string;
  status?: string;
  sizeType?: string;
  isEmpty?: boolean;
  originPort?: string;
  destinationPort?: string;
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
    mmsi?: string;
    callSign?: string;
  };
  voyage?: string;
  eta?: string;
  predictedEta?: string;
  ata?: string;
  etd?: string;
  atd?: string;
  events?: SeaRatesEvent[];
  route?: {
    path?: Array<[number, number]>;
    pins?: Array<{
      coordinates: [number, number];
      location?: string;
      type?: string;
    }>;
  };
  rawData?: any;
}

export interface SeaRatesEvent {
  id: string;
  type: string;
  eventCode?: string;
  eventName?: string;
  status?: string;
  occurredAt: string;
  isActual: boolean;
  location?: {
    name?: string;
    city?: string;
    country?: string;
    unlocode?: string;
    latitude?: number;
    longitude?: number;
  };
  facility?: {
    name?: string;
    type?: string;
    code?: string;
  };
  vessel?: {
    name?: string;
    imo?: string;
  };
  voyage?: string;
  description?: string;
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
  source: string;
}

// ============================================
// SEARATES INTEGRATION CLASS
// ============================================

export class SeaRatesIntegration {
  private apiKey: string;
  private baseUrl: string = 'https://tracking.searates.com';
  private client: AxiosInstance;

  constructor() {
    this.apiKey = process.env.SEARATES_API_KEY || '';

    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 seconds (tracking can take time)
    });

    // Add response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        console.log(`[SeaRates] API Response: ${response.status} for ${response.config.url}`);
        return response;
      },
      (error) => {
        console.error(`[SeaRates] API Error: ${error.response?.status || error.message}`);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Check if SeaRates is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey && this.apiKey.length > 10;
  }

  /**
   * Get API key info (for debugging - masked)
   */
  getApiKeyInfo(): string {
    if (!this.apiKey) return 'Not configured';
    return `${this.apiKey.substring(0, 6)}...${this.apiKey.substring(this.apiKey.length - 4)}`;
  }

  /**
   * Get container tracking by container number (CT)
   * Main tracking method using SeaRates API v3
   */
  async getContainerTracking(
    containerNumber: string,
    options: {
      sealine?: string;
      forceUpdate?: boolean;
      includeRoute?: boolean;
      includeAis?: boolean;
    } = {}
  ): Promise<SeaRatesContainer | null> {
    if (!this.isConfigured()) {
      console.warn('[SeaRates] API key not configured');
      return null;
    }

    const { sealine = 'auto', forceUpdate = false, includeRoute = true, includeAis = false } = options;

    try {
      console.log(`[SeaRates] Tracking container: ${containerNumber}`);

      const response = await this.client.get<SeaRatesApiResponse>('/tracking', {
        params: {
          api_key: this.apiKey,
          number: containerNumber.toUpperCase(),
          type: 'CT',
          sealine,
          force_update: forceUpdate,
          route: includeRoute,
          ais: includeAis,
        },
      });

      if (response.data.status !== 'success') {
        console.error(`[SeaRates] API error: ${response.data.message}`);
        if (response.data.errors) {
          console.error('[SeaRates] Errors:', response.data.errors);
        }
        return null;
      }

      return this.parseApiResponse(response.data, containerNumber);
    } catch (error: any) {
      if (error.response?.status === 404 || error.response?.data?.message?.includes('not found')) {
        console.log(`[SeaRates] Container ${containerNumber} not found`);
        return null;
      }

      if (error.response?.status === 429) {
        console.error('[SeaRates] Rate limit exceeded');
        throw new Error('SeaRates API rate limit exceeded. Please try again later.');
      }

      if (error.response?.status === 401 || error.response?.status === 403) {
        console.error('[SeaRates] Authentication error - check API key');
        throw new Error('SeaRates API authentication failed. Please check API key.');
      }

      console.error(`[SeaRates] API error for container ${containerNumber}:`, error.message);
      throw error;
    }
  }

  /**
   * Get container tracking by Bill of Lading number (BL)
   */
  async getContainerByBL(
    blNumber: string,
    options: {
      sealine?: string;
      forceUpdate?: boolean;
      includeRoute?: boolean;
    } = {}
  ): Promise<SeaRatesContainer | null> {
    if (!this.isConfigured()) {
      console.warn('[SeaRates] API key not configured');
      return null;
    }

    const { sealine = 'auto', forceUpdate = false, includeRoute = true } = options;

    try {
      console.log(`[SeaRates] Tracking B/L: ${blNumber}`);

      const response = await this.client.get<SeaRatesApiResponse>('/tracking', {
        params: {
          api_key: this.apiKey,
          number: blNumber.toUpperCase(),
          type: 'BL',
          sealine,
          force_update: forceUpdate,
          route: includeRoute,
        },
      });

      if (response.data.status !== 'success') {
        console.error(`[SeaRates] API error: ${response.data.message}`);
        return null;
      }

      return this.parseApiResponse(response.data, blNumber, 'BL');
    } catch (error: any) {
      if (error.response?.status === 404) {
        console.log(`[SeaRates] B/L ${blNumber} not found`);
        return null;
      }

      console.error(`[SeaRates] API error for B/L ${blNumber}:`, error.message);
      throw error;
    }
  }

  /**
   * Get container tracking by Booking number (BK)
   */
  async getContainerByBooking(
    bookingNumber: string,
    options: {
      sealine?: string;
      forceUpdate?: boolean;
    } = {}
  ): Promise<SeaRatesContainer | null> {
    if (!this.isConfigured()) {
      return null;
    }

    const { sealine = 'auto', forceUpdate = false } = options;

    try {
      console.log(`[SeaRates] Tracking Booking: ${bookingNumber}`);

      const response = await this.client.get<SeaRatesApiResponse>('/tracking', {
        params: {
          api_key: this.apiKey,
          number: bookingNumber.toUpperCase(),
          type: 'BK',
          sealine,
          force_update: forceUpdate,
          route: true,
        },
      });

      if (response.data.status !== 'success') {
        return null;
      }

      return this.parseApiResponse(response.data, bookingNumber, 'BK');
    } catch (error: any) {
      console.error(`[SeaRates] API error for Booking ${bookingNumber}:`, error.message);
      return null;
    }
  }

  /**
   * Parse SeaRates API response into our internal format
   */
  private parseApiResponse(
    apiResponse: SeaRatesApiResponse,
    number: string,
    type: 'CT' | 'BL' | 'BK' = 'CT'
  ): SeaRatesContainer | null {
    if (!apiResponse.data) {
      return null;
    }

    const { metadata, containers, vessels, route_data, locations, facilities } = apiResponse.data;

    // Get first container (or create from metadata)
    const containerData = containers?.[0];

    // Create lookup maps for resolving ID references
    const locationMap = new Map<number, any>();
    const facilityMap = new Map<number, any>();
    const vesselMap = new Map<number, any>();

    if (locations) {
      for (const loc of locations) {
        locationMap.set(loc.id, loc);
      }
    }
    if (facilities) {
      for (const fac of facilities) {
        facilityMap.set(fac.id, fac);
      }
    }
    if (vessels) {
      for (const ves of vessels) {
        vesselMap.set(ves.id, ves);
      }
    }

    // Helper to resolve location by ID or object
    const resolveLocation = (locRef: any) => {
      if (!locRef) return undefined;
      const loc = typeof locRef === 'number' ? locationMap.get(locRef) : locRef;
      if (!loc) return undefined;
      return {
        name: loc.name,
        city: loc.city || loc.state,
        country: loc.country,
        unlocode: loc.locode,
        latitude: loc.lat,
        longitude: loc.lng,
      };
    };

    // Helper to resolve facility by ID or object
    const resolveFacility = (facRef: any) => {
      if (!facRef) return undefined;
      const fac = typeof facRef === 'number' ? facilityMap.get(facRef) : facRef;
      if (!fac) return undefined;
      return {
        name: fac.name,
        type: fac.type,
        code: fac.bic_code || fac.smdg_code,
      };
    };

    // Helper to resolve vessel by ID or object
    const resolveVessel = (vesRef: any) => {
      if (!vesRef) return undefined;
      const ves = typeof vesRef === 'number' ? vesselMap.get(vesRef) : vesRef;
      if (!ves) return undefined;
      return {
        name: ves.name,
        imo: ves.imo,
        mmsi: ves.mmsi,
        callSign: ves.call_sign,
      };
    };

    // Find latest vessel info
    const vesselInfo = vessels?.[0] || containerData?.transports?.[0]?.vessel;

    // Find latest transport for ETA/ETD
    const latestTransport = containerData?.transports?.[containerData.transports.length - 1];

    // Parse events
    const events: SeaRatesEvent[] = [];
    if (containerData?.events) {
      for (const event of containerData.events) {
        const eventLocation = resolveLocation(event.location);
        const eventFacility = resolveFacility(event.facility);
        const eventVessel = resolveVessel(event.vessel);

        events.push({
          id: `${event.order_id || Date.now()}-${event.event_code || 'unknown'}`,
          type: this.mapEventType(event.event_code || event.event_type || event.status || 'UNKNOWN'),
          eventCode: event.event_code,
          eventName: event.event_name || event.description,
          status: event.status,
          occurredAt: event.actual_date || event.date || event.expected_date || new Date().toISOString(),
          isActual: event.actual !== undefined ? event.actual : event.time_type === 'A',
          location: eventLocation,
          facility: eventFacility,
          vessel: eventVessel,
          voyage: event.voyage,
          description: event.description || event.event_name,
        });
      }
    }

    // Sort events by date (newest first)
    events.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());

    // Get current location from latest event or first location in route
    const latestEvent = events[0];
    const routeInfo = apiResponse.data.route;

    // Try to get origin and destination from route
    let originPort: string | undefined;
    let destinationPort: string | undefined;

    if (routeInfo) {
      if (routeInfo.prepol?.location) {
        const originLoc = resolveLocation(routeInfo.prepol.location);
        originPort = originLoc?.name;
      } else if (routeInfo.pol?.location) {
        const polLoc = resolveLocation(routeInfo.pol.location);
        originPort = polLoc?.name;
      }

      if (routeInfo.postpod?.location) {
        const destLoc = resolveLocation(routeInfo.postpod.location);
        destinationPort = destLoc?.name;
      } else if (routeInfo.pod?.location) {
        const podLoc = resolveLocation(routeInfo.pod.location);
        destinationPort = podLoc?.name;
      }
    }

    const currentLocation = latestEvent?.location || (locations?.[0] ? {
      name: locations[0].name,
      city: locations[0].city || locations[0].state,
      country: locations[0].country,
      unlocode: locations[0].locode,
      latitude: locations[0].lat,
      longitude: locations[0].lng,
    } : undefined);

    // Parse route data
    let route: SeaRatesContainer['route'] = undefined;
    if (route_data) {
      route = {
        path: route_data.route?.path || [],
        pins: route_data.pins?.map(pin => ({
          coordinates: pin.coordinates,
          location: pin.location?.name,
          type: pin.type,
        })) || [],
      };
    }

    return {
      containerNumber: containerData?.number || (type === 'CT' ? number : ''),
      blNumber: type === 'BL' ? number : undefined,
      bookingNumber: type === 'BK' ? number : undefined,
      shippingLine: metadata.sealine,
      shippingLineName: metadata.sealine_name,
      status: containerData?.status || metadata.status,
      sizeType: containerData?.size_type || containerData?.iso_code,
      isEmpty: containerData?.is_empty,
      originPort,
      destinationPort,
      location: currentLocation,
      vessel: vesselInfo ? {
        name: vesselInfo.name,
        imo: vesselInfo.imo?.toString(),
        mmsi: vesselInfo.mmsi?.toString(),
        callSign: vesselInfo.call_sign,
      } : undefined,
      voyage: latestTransport?.voyage,
      eta: latestTransport?.eta || latestTransport?.predicted_eta,
      predictedEta: latestTransport?.predicted_eta,
      ata: latestTransport?.ata,
      etd: latestTransport?.etd,
      atd: latestTransport?.atd,
      events,
      route,
      rawData: apiResponse.data,
    };
  }

  /**
   * Map SeaRates event types to our internal event types
   */
  mapEventType(searatesType: string): string {
    const typeMap: Record<string, string> = {
      // Container events
      'CONTAINER_LOADED': 'LOADED_ON_VESSEL',
      'CONTAINER_DISCHARGED': 'DISCHARGED',
      'LOADED': 'LOADED_ON_VESSEL',
      'LOAD': 'LOADED_ON_VESSEL',
      'DISCHARGED': 'DISCHARGED',
      'DISCHARGE': 'DISCHARGED',

      // Gate events
      'GATE_IN': 'GATE_IN',
      'GATE_OUT': 'GATE_OUT',
      'GATE-IN': 'GATE_IN',
      'GATE-OUT': 'GATE_OUT',

      // Vessel events
      'VESSEL_DEPARTURE': 'VESSEL_DEPARTURE',
      'VESSEL_DEPARTED': 'VESSEL_DEPARTURE',
      'DEPARTED': 'VESSEL_DEPARTURE',
      'DEPARTURE': 'VESSEL_DEPARTURE',
      'VESSEL_ARRIVAL': 'VESSEL_ARRIVAL',
      'VESSEL_ARRIVED': 'VESSEL_ARRIVAL',
      'ARRIVED': 'VESSEL_ARRIVAL',
      'ARRIVAL': 'VESSEL_ARRIVAL',

      // Transit
      'IN_TRANSIT': 'IN_TRANSIT',
      'IN-TRANSIT': 'IN_TRANSIT',
      'TRANSSHIPMENT': 'TRANSSHIPMENT',
      'TRANSHIPMENT': 'TRANSSHIPMENT',

      // Customs
      'CUSTOMS_HOLD': 'CUSTOMS_INSPECTION',
      'CUSTOMS_RELEASED': 'CUSTOMS_RELEASED',
      'CUSTOMS_RELEASE': 'CUSTOMS_RELEASED',
      'RELEASED': 'CUSTOMS_RELEASED',

      // Delivery
      'DELIVERED': 'DELIVERED',
      'DELIVERY': 'DELIVERED',
      'AVAILABLE_FOR_PICKUP': 'AVAILABLE_FOR_PICKUP',
      'AVAILABLE': 'AVAILABLE_FOR_PICKUP',
      'PICKUP': 'AVAILABLE_FOR_PICKUP',

      // Empty return
      'EMPTY_RETURN': 'EMPTY_RETURNED',
      'EMPTY_RETURNED': 'EMPTY_RETURNED',

      // Generic status mappings
      'BOOKED': 'BOOKING_CONFIRMED',
      'CONFIRMED': 'BOOKING_CONFIRMED',
    };

    const upperType = searatesType.toUpperCase().replace(/\s+/g, '_');
    return typeMap[upperType] || upperType;
  }

  /**
   * Test API connection
   */
  async testConnection(): Promise<{ success: boolean; message: string; apiCalls?: any }> {
    if (!this.isConfigured()) {
      return {
        success: false,
        message: 'SeaRates API key not configured',
      };
    }

    try {
      // Test with a known container number format
      // MSCU is MSC, a common shipping line
      const response = await this.client.get<SeaRatesApiResponse>('/tracking', {
        params: {
          api_key: this.apiKey,
          number: 'MSCU0000000', // Test container that won't exist
          type: 'CT',
          sealine: 'auto',
        },
      });

      // Even a "not found" response means the API is working
      if (response.data.status === 'success' || response.data.status === 'error') {
        return {
          success: true,
          message: 'SeaRates API connection successful',
          apiCalls: response.data.data?.metadata?.api_calls,
        };
      }

      return {
        success: true,
        message: 'SeaRates API is responding',
      };
    } catch (error: any) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        return {
          success: false,
          message: 'SeaRates API authentication failed. Please check API key.',
        };
      }

      if (error.response?.status === 429) {
        return {
          success: false,
          message: 'SeaRates API rate limit exceeded',
        };
      }

      return {
        success: false,
        message: `SeaRates API error: ${error.message}`,
      };
    }
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
      console.error('[SeaRates] Webhook signature verification error:', error);
      return false;
    }
  }

  /**
   * Get available shipping lines info
   */
  async getShippingLines(): Promise<Array<{ code: string; name: string }>> {
    // Common shipping lines supported by SeaRates
    // This is a static list; SeaRates supports 100+ lines
    return [
      { code: 'MAEU', name: 'Maersk' },
      { code: 'MSCU', name: 'MSC - Mediterranean Shipping Company' },
      { code: 'CMDU', name: 'CMA CGM' },
      { code: 'COSU', name: 'COSCO' },
      { code: 'HLCU', name: 'Hapag-Lloyd' },
      { code: 'EGLV', name: 'Evergreen' },
      { code: 'OOLU', name: 'OOCL' },
      { code: 'ONEY', name: 'ONE - Ocean Network Express' },
      { code: 'YMLU', name: 'Yang Ming' },
      { code: 'ZIMU', name: 'ZIM' },
      { code: 'HDMU', name: 'HMM - Hyundai Merchant Marine' },
    ];
  }

  /**
   * Parse webhook payload (for future webhook integration)
   */
  parseWebhookPayload(payload: any): SeaRatesWebhookPayload {
    const event = payload.event || payload;
    const container = payload.container || payload.data?.containers?.[0] || {};

    return {
      containerNumber: container.number || payload.number,
      blNumber: payload.bl_number || payload.blNumber,
      eventType: this.mapEventType(event.type || event.event_type || event.status || 'UNKNOWN'),
      eventDate: event.date || event.occurred_at || event.actual_date || new Date().toISOString(),
      location: event.location?.name || container.location?.name,
      portName: event.location?.name || event.facility?.name,
      vessel: event.vessel?.name || container.vessel?.name,
      voyageNumber: event.voyage || container.voyage,
      latitude: event.location?.lat || container.location?.lat,
      longitude: event.location?.lng || container.location?.lng,
      status: container.status || event.status || payload.status,
      source: 'SEARATES',
      details: {
        eventCode: event.event_code,
        eventName: event.event_name,
        facility: event.facility,
        isActual: event.time_type === 'A',
      },
    };
  }
}

// Export singleton instance
export const searatesIntegration = new SeaRatesIntegration();

