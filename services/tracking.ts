import api from './api';

// ============================================
// TRACKING SERVICE - Frontend API
// ============================================

export interface TrackingEvent {
  id: string;
  containerId: string;
  eventType: string;
  eventDate: string;
  location: string;
  portName?: string;
  vessel?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
  createdAt: string;
}

export interface ContainerLocation {
  name?: string;
  city?: string;
  country?: string;
  unlocode?: string;
  latitude?: number;
  longitude?: number;
}

export interface VesselInfo {
  name?: string;
  imo?: string;
  mmsi?: string;
  callSign?: string;
}

export interface RoutePin {
  coordinates: [number, number]; // [lng, lat]
  location?: string;
  type?: string;
}

export interface RouteData {
  path?: Array<[number, number]>; // Array of [lng, lat]
  pins?: RoutePin[];
}

export interface LiveVesselPosition {
  latitude: number;
  longitude: number;
  sog: number; // speed over ground, knots
  cog: number; // course over ground, degrees
  heading: number | null; // null when not available (AIS 511)
  shipName?: string;
  destination?: string;
  timestamp: string;
}

export interface Container {
  id: string;
  bookingId: string;
  containerNumber: string;
  blNumber?: string;
  type?: string;
  sealNumber?: string;
  currentStatus: string;
  currentLocation?: string;
  currentLat?: number;
  currentLng?: number;
  eta?: string;
  actualArrival?: string;
  apiSource?: string;
  lastSyncAt?: string;
  // Vessel identifiers (operator-entered or extracted from email)
  vesselMmsi?: string;
  vesselImo?: string;
  vesselName?: string;
  vesselSog?: number;
  vesselCog?: number;
  vesselHeading?: number | null;
  vesselPosAt?: string;
  createdAt: string;
  updatedAt: string;
  booking?: {
    id: string;
    bookingNumber: string;
    origin: string;
    destination: string;
    client?: {
      id: string;
      name: string;
    };
  };
  trackingEvents?: TrackingEvent[];
  // Live AIS position from AISStream cache (merged in by search endpoint)
  livePosition?: LiveVesselPosition;
}

export interface ContainerListResponse {
  containers: Container[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface TrackingStats {
  totalContainers: number;
  inTransit: number;
  delivered: number;
  delayed: number;
  pending: number;
  avgTransitDays?: number;
}

export interface MapDataItem {
  id: string;
  containerNumber: string;
  currentStatus: string;
  currentLocation: string;
  latitude: number;
  longitude: number;
  bookingNumber?: string;
  clientName?: string;
}

export interface EventType {
  value: string;
  label: string;
}

export interface TrackingEventInput {
  eventType: string;
  eventDate: string;
  location: string;
  portName?: string;
  vessel?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
}

export interface RoutePoint {
  lat: number;
  lng: number;
  location: string;
  eventType: string;
  eventDate: string;
}

// ============================================
// API FUNCTIONS
// ============================================

/**
 * Get tracking statistics
 */
export async function getTrackingStats(): Promise<TrackingStats> {
  const response = await api.get('/tracking/stats');
  return response.data;
}

/**
 * Get list of event types
 */
export async function getEventTypes(): Promise<EventType[]> {
  const response = await api.get('/tracking/event-types');
  return response.data;
}

/**
 * Get map data for visualization
 */
export async function getMapData(): Promise<MapDataItem[]> {
  const response = await api.get('/tracking/map-data');
  return response.data;
}

/**
 * Get containers list with filters
 */
export async function getContainers(params?: {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  clientId?: string;
  bookingId?: string;
}): Promise<ContainerListResponse> {
  const response = await api.get('/tracking/containers', { params });
  return response.data;
}

/**
 * Get container by ID with tracking history
 */
export async function getContainerById(id: string): Promise<Container> {
  const response = await api.get(`/tracking/containers/${id}`);
  return response.data;
}

/**
 * Search container by container number
 */
export async function searchContainer(containerNumber: string): Promise<Container> {
  const response = await api.get(`/tracking/search/${encodeURIComponent(containerNumber)}`);
  return response.data;
}

/**
 * Get container route for map path
 */
export async function getContainerRoute(containerId: string): Promise<RoutePoint[]> {
  const response = await api.get(`/tracking/containers/${containerId}/route`);
  return response.data;
}

/**
 * Add tracking event to container
 */
export async function addTrackingEvent(
  containerId: string,
  eventData: TrackingEventInput
): Promise<TrackingEvent> {
  const response = await api.post(`/tracking/containers/${containerId}/events`, eventData);
  return response.data;
}

/**
 * Update tracking event
 */
export async function updateTrackingEvent(
  eventId: string,
  eventData: Partial<TrackingEventInput>
): Promise<TrackingEvent> {
  const response = await api.put(`/tracking/events/${eventId}`, eventData);
  return response.data;
}

/**
 * Delete tracking event
 */
export async function deleteTrackingEvent(eventId: string): Promise<{ message: string }> {
  const response = await api.delete(`/tracking/events/${eventId}`);
  return response.data;
}

/**
 * Pull the latest cached AIS position for the container's vessel into the DB.
 * Cheap — no outbound HTTP, just reads the in-memory cache fed by the
 * AISStream WebSocket.
 */
export async function refreshTracking(containerId: string): Promise<{
  success: boolean;
  message: string;
  eventsFound: number;
  lastSyncAt: string;
}> {
  const response = await api.post(`/tracking/containers/${containerId}/refresh-tracking`);
  return response.data;
}

/**
 * Track container via the public endpoint (no auth required).
 */
export async function trackPublic(containerNumber: string): Promise<PublicTrackingResult> {
  const response = await api.get(`/tracking/public/${encodeURIComponent(containerNumber)}`);
  return response.data;
}

/**
 * Read AISStream provider status (configured / cached positions count).
 */
export async function getApiStatus(): Promise<ApiStatusResponse> {
  const response = await api.get('/tracking/api-status');
  return response.data;
}

/**
 * Test AISStream WebSocket connectivity (admin only).
 */
export async function testConnection(): Promise<ApiTestResult> {
  const response = await api.get('/tracking/test-connection');
  return response.data;
}

/**
 * Snapshot of every vessel position currently in the backend AIS cache.
 * Used by the live map view.
 */
export async function getLivePositions(): Promise<{
  count: number;
  positions: Array<LiveVesselPosition & { mmsi: string; imo?: string }>;
  fetchedAt: string;
}> {
  const response = await api.get('/tracking/search/positions/live');
  return response.data;
}

/**
 * Assign the AIS MMSI for the vessel carrying this container. The next
 * sync cycle picks up live positions automatically.
 */
export async function setContainerVessel(
  containerId: string,
  vessel: { mmsi: string; imo?: string; name?: string }
): Promise<Container> {
  const response = await api.patch(`/tracking/containers/${containerId}/vessel`, vessel);
  return response.data;
}

// ============================================
// PUBLIC / EXTERNAL TRACKING TYPES (AISStream-backed)
// ============================================

export interface PublicTrackingResult {
  success: boolean;
  source: 'AISSTREAM';
  data: {
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
    livePosition?: LiveVesselPosition | null;
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
  };
  fetchedAt: string;
}

export interface ApiStatusResponse {
  provider: 'AISStream.io';
  version: string;
  baseUrl: string;
  configured: boolean;
  status: 'active' | 'inactive' | 'error';
  cachedPositions?: number;
  features: {
    livePositions: boolean;
    shipStaticData: boolean;
    eventStream: boolean;
  };
}

export interface ApiTestResult {
  service: 'AISStream.io';
  baseUrl: string;
  configured: boolean;
  apiKeyInfo: string;
  connectionTest: {
    success: boolean;
    message: string;
  };
  cachedPositions?: number;
  timestamp: string;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get status color for UI
 */
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    PENDING: 'gray',
    PICKED_UP: 'blue',
    IN_TRANSIT: 'yellow',
    AT_PORT: 'purple',
    CUSTOMS: 'orange',
    DELIVERED: 'green',
    DELAYED: 'red',
    ON_HOLD: 'red',
    CANCELLED: 'gray',
  };
  return colors[status] || 'gray';
}

/**
 * Get status label for display
 */
export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    PENDING: 'În așteptare',
    PICKED_UP: 'Ridicat',
    IN_TRANSIT: 'În tranzit',
    AT_PORT: 'La port',
    CUSTOMS: 'La vamă',
    DELIVERED: 'Livrat',
    DELAYED: 'Întârziat',
    ON_HOLD: 'Suspendat',
    CANCELLED: 'Anulat',
  };
  return labels[status] || status;
}

/**
 * Format event type for display
 */
export function getEventTypeLabel(eventType: string): string {
  const labels: Record<string, string> = {
    BOOKING_CREATED: 'Rezervare creată',
    PICKED_UP: 'Container ridicat',
    GATE_IN_ORIGIN: 'Gate In - Origine',
    LOADED_ON_VESSEL: 'Încărcat pe navă',
    DEPARTED_ORIGIN: 'Plecare din origine',
    TRANSHIPMENT_ARRIVAL: 'Sosire transbordare',
    TRANSHIPMENT_DEPARTURE: 'Plecare transbordare',
    ARRIVED_DESTINATION: 'Sosire la destinație',
    DISCHARGED: 'Descărcat',
    CUSTOMS_CLEARANCE: 'Vămuire',
    GATE_OUT: 'Gate Out',
    DELIVERED: 'Livrat',
    EXCEPTION: 'Excepție',
    HOLD: 'Suspendat',
    RELEASED: 'Eliberat',
  };
  return labels[eventType] || eventType;
}

export default {
  getTrackingStats,
  getEventTypes,
  getMapData,
  getContainers,
  getContainerById,
  searchContainer,
  getContainerRoute,
  addTrackingEvent,
  updateTrackingEvent,
  deleteTrackingEvent,
  refreshTracking,
  trackPublic,
  getApiStatus,
  testConnection,
  getLivePositions,
  setContainerVessel,
  getStatusColor,
  getStatusLabel,
  getEventTypeLabel,
};
