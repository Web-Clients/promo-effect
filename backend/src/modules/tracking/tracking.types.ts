import { Container, TrackingEvent } from '@prisma/client';

// ============================================
// TYPES
// ============================================

export interface TrackingEventInput {
  eventType: string;
  eventDate: Date;
  location: string;
  portName?: string;
  vessel?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
}

export interface ContainerFilters {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  clientId?: string;
  bookingId?: string;
}

export interface ContainerWithTracking extends Container {
  trackingEvents: TrackingEvent[];
  booking: {
    id: string;
    clientId: string;
    portOrigin: string;
    portDestination: string;
    shippingLine: string;
    status: string;
    client: {
      id: string;
      companyName: string;
    };
  };
  daysInTransit?: number;
  daysDelayed?: number;
  isDelayed?: boolean;
}

// ============================================
// TRACKING EVENT TYPES
// ============================================

export const TrackingEventTypes = {
  BOOKING_CONFIRMED: 'BOOKING_CONFIRMED',
  GATE_IN: 'GATE_IN',
  LOADED_ON_VESSEL: 'LOADED_ON_VESSEL',
  VESSEL_DEPARTURE: 'VESSEL_DEPARTURE',
  IN_TRANSIT: 'IN_TRANSIT',
  TRANSSHIPMENT: 'TRANSSHIPMENT',
  VESSEL_ARRIVAL: 'VESSEL_ARRIVAL',
  DISCHARGED: 'DISCHARGED',
  CUSTOMS_INSPECTION: 'CUSTOMS_INSPECTION',
  CUSTOMS_RELEASED: 'CUSTOMS_RELEASED',
  AVAILABLE_FOR_PICKUP: 'AVAILABLE_FOR_PICKUP',
  GATE_OUT: 'GATE_OUT',
  DELIVERED: 'DELIVERED',
  EMPTY_RETURNED: 'EMPTY_RETURNED',
} as const;

export const EventTypeLabels: Record<string, string> = {
  BOOKING_CONFIRMED: 'Rezervare Confirmată',
  GATE_IN: 'Intrare în Terminal',
  LOADED_ON_VESSEL: 'Încărcat pe Navă',
  VESSEL_DEPARTURE: 'Navă Plecată',
  IN_TRANSIT: 'În Tranzit',
  TRANSSHIPMENT: 'Transbordare',
  VESSEL_ARRIVAL: 'Sosire Navă',
  DISCHARGED: 'Descărcat',
  CUSTOMS_INSPECTION: 'Inspecție Vamală',
  CUSTOMS_RELEASED: 'Eliberat din Vamă',
  AVAILABLE_FOR_PICKUP: 'Disponibil pentru Ridicare',
  GATE_OUT: 'Ieșire din Terminal',
  DELIVERED: 'Livrat',
  EMPTY_RETURNED: 'Container Gol Returnat',
};

// Event order for validation (lower = earlier in process)
export const EventOrder: Record<string, number> = {
  BOOKING_CONFIRMED: 1,
  GATE_IN: 2,
  LOADED_ON_VESSEL: 3,
  VESSEL_DEPARTURE: 4,
  IN_TRANSIT: 5,
  TRANSSHIPMENT: 6,
  VESSEL_ARRIVAL: 7,
  DISCHARGED: 8,
  CUSTOMS_INSPECTION: 9,
  CUSTOMS_RELEASED: 10,
  AVAILABLE_FOR_PICKUP: 11,
  GATE_OUT: 12,
  DELIVERED: 13,
  EMPTY_RETURNED: 14,
};

// Status mapping based on event type
export const EventToStatus: Record<string, string> = {
  BOOKING_CONFIRMED: 'CONFIRMED',
  GATE_IN: 'GATE_IN',
  LOADED_ON_VESSEL: 'LOADED',
  VESSEL_DEPARTURE: 'DEPARTED',
  IN_TRANSIT: 'IN_TRANSIT',
  TRANSSHIPMENT: 'IN_TRANSIT',
  VESSEL_ARRIVAL: 'ARRIVED',
  DISCHARGED: 'DISCHARGED',
  CUSTOMS_INSPECTION: 'CUSTOMS',
  CUSTOMS_RELEASED: 'CUSTOMS_CLEARED',
  AVAILABLE_FOR_PICKUP: 'READY_FOR_PICKUP',
  GATE_OUT: 'GATE_OUT',
  DELIVERED: 'DELIVERED',
  EMPTY_RETURNED: 'COMPLETED',
};
