// ============================================
// AISStream.io WebSocket message types
// Reference: https://aisstream.io/documentation
// ============================================

export type AISMessageType =
  | 'PositionReport'
  | 'ShipStaticData'
  | 'StandardClassBPositionReport'
  | 'ExtendedClassBPositionReport'
  | 'StaticDataReport'
  | 'AidsToNavigationReport'
  | 'BaseStationReport';

export interface AISMetadata {
  MMSI: number;
  MMSI_String?: string;
  ShipName?: string;
  latitude: number;
  longitude: number;
  time_utc: string; // ISO timestamp
}

// PositionReport: lat/lng + sog + cog + heading
export interface AISPositionReport {
  Cog: number; // course over ground (degrees)
  CommunicationState?: number;
  Latitude: number;
  Longitude: number;
  NavigationalStatus?: number;
  PositionAccuracy?: boolean;
  Raim?: boolean;
  RateOfTurn?: number;
  RepeatIndicator?: number;
  Sog: number; // speed over ground (knots)
  Spare?: number;
  SpecialManoeuvreIndicator?: number;
  Timestamp: number;
  TrueHeading: number; // 511 = not available
  UserID: number; // MMSI
  Valid?: boolean;
}

// ShipStaticData: vessel identity + destination + ETA
export interface AISShipStaticData {
  AisVersion?: number;
  CallSign?: string;
  Destination?: string;
  Dimension?: {
    A?: number;
    B?: number;
    C?: number;
    D?: number;
  };
  Eta?: {
    Day?: number;
    Hour?: number;
    Minute?: number;
    Month?: number;
  };
  FixType?: number;
  ImoNumber?: number;
  MaximumStaticDraught?: number;
  MessageID?: number;
  Name?: string;
  RepeatIndicator?: number;
  ShipType?: number; // 70-79 = cargo, 80-89 = tanker
  Spare?: boolean;
  Type?: number;
  UserID: number; // MMSI
  Valid?: boolean;
}

export interface AISStreamMessage {
  Message: {
    PositionReport?: AISPositionReport;
    ShipStaticData?: AISShipStaticData;
    StandardClassBPositionReport?: AISPositionReport;
    ExtendedClassBPositionReport?: AISPositionReport;
    [key: string]: unknown;
  };
  MessageType: AISMessageType;
  MetaData: AISMetadata;
}

export interface AISStreamSubscription {
  APIKey: string;
  BoundingBoxes: Array<Array<[number, number]>>; // [[[swLat, swLng], [neLat, neLng]]]
  FilterMessageTypes?: AISMessageType[];
  FiltersShipMMSI?: string[]; // Strings of MMSI numbers
}

// ============================================
// INTERNAL CACHE & API SHAPES
// ============================================

// Normalized vessel position kept in the in-memory cache and surfaced to clients.
export interface VesselPosition {
  mmsi: string;
  shipName?: string;
  imo?: string;
  callSign?: string;
  latitude: number;
  longitude: number;
  sog: number; // speed over ground (knots)
  cog: number; // course over ground (degrees)
  heading: number; // true heading (degrees, 511 = unknown)
  navigationalStatus?: number;
  shipType?: number;
  destination?: string;
  timestamp: string; // ISO
  source: 'AISSTREAM';
}

// Tracking event shape passed to our generic webhook/event creator.
// Stays provider-agnostic so manual entry + email parser keep working.
export interface TrackingEventPayload {
  containerNumber: string;
  blNumber?: string;
  eventType: string; // GATE_IN, LOADED_ON_VESSEL, VESSEL_DEPARTURE, etc.
  eventDate: string; // ISO
  location?: string;
  portName?: string;
  unlocode?: string;
  vessel?: string;
  voyageNumber?: string;
  latitude?: number;
  longitude?: number;
  status?: string;
  details?: Record<string, unknown>;
  source: 'AISSTREAM' | 'MANUAL_ENTRY' | 'EMAIL_PARSING' | 'MAERSK_API';
}

// Returned by tracking endpoints (public + authed)
export interface ContainerTrackingView {
  containerNumber: string;
  blNumber?: string;
  status?: string;
  currentLocation?: {
    name?: string;
    latitude?: number;
    longitude?: number;
  };
  vessel?: {
    mmsi?: string;
    name?: string;
    imo?: string;
  };
  position?: VesselPosition; // live AIS position from cache, if vessel MMSI is known
  eta?: string;
  events: Array<{
    id: string;
    eventType: string;
    eventDate: string;
    location: string;
    portName?: string;
    vessel?: string;
    latitude?: number;
    longitude?: number;
    source: string;
  }>;
}
