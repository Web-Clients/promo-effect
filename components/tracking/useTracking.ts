/**
 * useTracking — logic hook for TrackingView.
 * Task C1 extraction: splits 208-line performTracking into focused helpers.
 */

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import trackingService, {
  Container,
  TrackingStats,
  EventType,
  RouteData,
  VesselInfo,
  ContainerLocation,
} from '../../services/tracking';
import { getErrorMessage } from '../../utils/formatters';

// ─── Route building helpers (extracted from performTracking) ─────────────────

function buildRouteFromEvents(events: any[]): {
  routePoints: Array<[number, number]>;
  pins: any[];
} {
  const sorted = [...events].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const routePoints: Array<[number, number]> = [];
  const pins: Array<{ coordinates: [number, number]; location?: string; type?: string }> = [];

  for (const event of sorted) {
    if (!event.location?.latitude || !event.location?.longitude) continue;
    const coords: [number, number] = [event.location.longitude, event.location.latitude];

    const last = routePoints[routePoints.length - 1];
    if (!last || last[0] !== coords[0] || last[1] !== coords[1]) {
      routePoints.push(coords);
    }

    const isSignificant =
      event.type?.includes('LOAD') ||
      event.type?.includes('DISCHARGE') ||
      event.type?.includes('DEPARTURE') ||
      event.type?.includes('ARRIVAL') ||
      event.type?.includes('GATE');

    if (isSignificant) {
      const dup = pins.find(
        (p) => p.coordinates[0] === coords[0] && p.coordinates[1] === coords[1]
      );
      if (!dup) {
        pins.push({
          coordinates: coords,
          location: event.location.name || event.location.city,
          type:
            event.type?.includes('LOAD') || event.type?.includes('DEPARTURE')
              ? 'POL'
              : event.type?.includes('DISCHARGE') || event.type?.includes('ARRIVAL')
                ? 'POD'
                : 'TRANSSHIPMENT',
        });
      }
    }
  }

  return { routePoints, pins };
}

function estimateCurrentLocation(actualEvents: any[], publicData: any): ContainerLocation | null {
  const departureEvents = actualEvents.filter(
    (e) => e.type?.includes('DEPARTURE') || e.type?.includes('LOAD')
  );
  const arrivalEvents = actualEvents.filter(
    (e) => e.type?.includes('ARRIVAL') || e.type?.includes('DISCHARGE')
  );

  const lastDeparture = departureEvents[0];
  const lastArrival = arrivalEvents[0];
  const isAtSea =
    lastDeparture && (!lastArrival || new Date(lastDeparture.date) > new Date(lastArrival.date));

  if (isAtSea && lastDeparture?.location && publicData.eta) {
    const departureCoords = lastDeparture.location;
    const destinationCoords = publicData.location;

    if (
      departureCoords?.latitude &&
      departureCoords?.longitude &&
      destinationCoords?.latitude &&
      destinationCoords?.longitude
    ) {
      const departureTime = new Date(lastDeparture.date).getTime();
      const etaTime = new Date(publicData.eta).getTime();
      const nowTime = Date.now();
      const totalDuration = etaTime - departureTime;
      const elapsed = nowTime - departureTime;
      const progress = Math.min(Math.max(elapsed / totalDuration, 0), 0.95);

      return {
        name: `În mare (aprox. ${Math.round(progress * 100)}% din traseu)`,
        city: undefined,
        country: undefined,
        latitude:
          departureCoords.latitude +
          (destinationCoords.latitude - departureCoords.latitude) * progress,
        longitude:
          departureCoords.longitude +
          (destinationCoords.longitude - departureCoords.longitude) * progress,
      };
    }
  }

  const lastActual = actualEvents[0];
  if (lastActual?.location) {
    return {
      name: lastActual.location.name,
      city: lastActual.location.city,
      country: lastActual.location.country,
      unlocode: lastActual.location.unlocode,
      latitude: lastActual.location.latitude,
      longitude: lastActual.location.longitude,
    };
  }

  return publicData.location ?? null;
}

function mergeRouteWithEvents(
  existingRoute: RouteData | null,
  events: any[],
  pins: any[],
  routePoints: Array<[number, number]>
): RouteData {
  if (!existingRoute?.path || existingRoute.path.length === 0) {
    return {
      path: routePoints.length >= 2 ? routePoints : [],
      pins: pins.length > 0 ? pins : existingRoute?.pins || [],
    };
  }
  return existingRoute;
}

// ─── Main hook ────────────────────────────────────────────────────────────────

export function useTracking() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [containerNumber, setContainerNumber] = useState(searchParams.get('container') || '');
  const [trackingData, setTrackingData] = useState<Container | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [stats, setStats] = useState<TrackingStats | null>(null);
  const [recentContainers, setRecentContainers] = useState<Container[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [listLoading, setListLoading] = useState(true);

  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [showAddEventModal, setShowAddEventModal] = useState(false);

  const [showMap, setShowMap] = useState(true);
  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [vesselInfo, setVesselInfo] = useState<VesselInfo | null>(null);
  const [locationInfo, setLocationInfo] = useState<ContainerLocation | null>(null);

  // ── Load initial data ───────────────────────────────────────────────────────

  const loadInitialData = useCallback(async () => {
    try {
      setStatsLoading(true);
      setListLoading(true);
      const [statsData, containersData, typesData] = await Promise.all([
        trackingService.getTrackingStats(),
        trackingService.getContainers({ limit: 10 }),
        trackingService.getEventTypes(),
      ]);
      setStats(statsData);
      setRecentContainers(containersData.containers);
      setEventTypes(typesData);
    } catch (err) {
      console.error('Failed to load tracking data:', err);
    } finally {
      setStatsLoading(false);
      setListLoading(false);
    }
  }, []);

  // ── Enrich with public tracking data ───────────────────────────────────────

  const enrichFromPublicTracking = async (number: string, localData: Container) => {
    try {
      const publicData = await trackingService.trackPublic(number, { route: true });
      if (!publicData.success || !publicData.data) return;

      if (publicData.data.vessel) setVesselInfo(publicData.data.vessel);

      const events = publicData.data.events || [];
      const { routePoints, pins } = buildRouteFromEvents(events);
      const finalRoute = mergeRouteWithEvents(publicData.data.route, events, pins, routePoints);

      if (events.length > 0) {
        const sorted = [...events].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        const actualEvents = sorted.filter(
          (e) => e.isActual && e.location?.latitude && e.location?.longitude
        );
        const location = estimateCurrentLocation(actualEvents, publicData.data);
        if (location) setLocationInfo(location);
      } else if (publicData.data.location) {
        setLocationInfo(publicData.data.location);
      }

      if (finalRoute) setRouteData(finalRoute);
    } catch {
      // Ignore — local data is sufficient
    }
  };

  // ── Core search ─────────────────────────────────────────────────────────────

  const performTracking = async (number: string) => {
    if (!number.trim()) {
      setError('Vă rugăm să introduceți un număr de container.');
      return;
    }

    setIsLoading(true);
    setError('');
    setTrackingData(null);
    setRouteData(null);
    setVesselInfo(null);
    setLocationInfo(null);

    try {
      const data = await trackingService.searchContainer(number.trim().toUpperCase());
      setTrackingData(data);

      if (data._route) setRouteData(data._route);
      if (data._vessel) setVesselInfo(data._vessel);
      if (data._location) setLocationInfo(data._location);

      await enrichFromPublicTracking(number.trim().toUpperCase(), data);
    } catch (err: unknown) {
      const httpErr = err as { response?: { status?: number } };
      if (httpErr.response?.status === 404) {
        setError(`Containerul "${number}" nu a fost găsit în baza de date.`);
      } else if (httpErr.response?.status === 403) {
        setError('Nu aveți permisiunea de a vizualiza acest container.');
      } else {
        setError(getErrorMessage(err, 'Eroare la căutarea containerului.'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ── URL sync ────────────────────────────────────────────────────────────────

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    const queryContainer = searchParams.get('container');
    if (queryContainer) {
      setContainerNumber(queryContainer);
      performTracking(queryContainer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (!containerNumber.trim()) {
      setError('Vă rugăm să introduceți un număr de container.');
      return;
    }
    setSearchParams({ container: containerNumber.trim().toUpperCase() });
  };

  const handleContainerSelect = (number: string) => {
    setContainerNumber(number);
    setSearchParams({ container: number });
  };

  const handleRefresh = () => {
    if (trackingData) performTracking(trackingData.containerNumber);
    loadInitialData();
  };

  const handleEventAdded = () => {
    if (trackingData) performTracking(trackingData.containerNumber);
    loadInitialData();
  };

  return {
    // State
    containerNumber,
    setContainerNumber,
    trackingData,
    isLoading,
    error,
    stats,
    recentContainers,
    statsLoading,
    listLoading,
    eventTypes,
    showAddEventModal,
    setShowAddEventModal,
    showMap,
    setShowMap,
    routeData,
    vesselInfo,
    locationInfo,
    // Handlers
    handleTrack,
    handleContainerSelect,
    handleRefresh,
    handleEventAdded,
  };
}
