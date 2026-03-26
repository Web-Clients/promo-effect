// ============================================
// SEARATES API RESPONSE INTERFACES
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
