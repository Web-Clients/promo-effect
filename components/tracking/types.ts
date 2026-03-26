import { TrackingEvent } from '../../services/tracking';

// ============================================
// TYPES
// ============================================

export interface TrackingEventForTimeline {
  id: number;
  title: string;
  description: string;
  location: string;
  timestamp: string;
  status: 'completed' | 'current' | 'pending';
}

// ============================================
// HELPER MAPS & FUNCTIONS
// ============================================

export const statusVariantMap: Record<
  string,
  'blue' | 'yellow' | 'green' | 'red' | 'purple' | 'teal' | 'default'
> = {
  PENDING: 'default',
  PICKED_UP: 'blue',
  IN_TRANSIT: 'yellow',
  AT_PORT: 'purple',
  CUSTOMS: 'teal',
  DELIVERED: 'green',
  DELAYED: 'red',
  ON_HOLD: 'red',
  CANCELLED: 'default',
};

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

export function convertToTimelineEvents(
  events: TrackingEvent[],
  _currentStatus: string
): TrackingEventForTimeline[] {
  if (!events || events.length === 0) return [];

  // Sort events by date (newest first for display)
  const sortedEvents = [...events].sort(
    (a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime()
  );

  const now = new Date();
  const latestEventIndex = sortedEvents.findIndex((e) => new Date(e.eventDate) <= now);

  return sortedEvents.map((event, index) => {
    let status: 'completed' | 'current' | 'pending' = 'pending';

    if (new Date(event.eventDate) < now) {
      status = index === latestEventIndex ? 'current' : 'completed';
    }

    return {
      id: parseInt(event.id) || index + 1,
      title: getEventTypeLabel(event.eventType),
      description: event.notes || `${event.eventType} - ${event.location}`,
      location: event.portName || event.location,
      timestamp: event.eventDate,
      status,
    };
  });
}
