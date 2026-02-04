import React, { useState, useEffect, useCallback, lazy, Suspense, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card } from './ui/Card';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import {
  SearchIcon, PackageIcon, TruckIcon, CheckCircleIcon,
  ClockIcon, AlertCircleIcon, PlusIcon, MapPinIcon,
  RefreshCwIcon
} from './icons';
import { TrackingTimeline } from './TrackingTimeline';
import trackingService, {
  Container,
  TrackingStats,
  TrackingEvent,
  EventType,
  TrackingEventInput,
  getStatusLabel,
  RouteData,
  VesselInfo,
  ContainerLocation,
} from '../services/tracking';

// Lazy load map component to avoid issues with SSR
const ContainerMap = lazy(() => import('./ContainerMap'));

// ============================================
// TYPES
// ============================================

interface TrackingEventForTimeline {
  id: number;
  title: string;
  description: string;
  location: string;
  timestamp: string;
  status: 'completed' | 'current' | 'pending';
}

// ============================================
// HELPER FUNCTIONS
// ============================================

const statusVariantMap: Record<string, 'blue' | 'yellow' | 'green' | 'red' | 'purple' | 'teal' | 'default'> = {
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

function getEventTypeLabel(eventType: string): string {
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

function convertToTimelineEvents(events: TrackingEvent[], currentStatus: string): TrackingEventForTimeline[] {
  if (!events || events.length === 0) return [];

  // Sort events by date (newest first for display)
  const sortedEvents = [...events].sort(
    (a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime()
  );

  const now = new Date();
  const latestEventIndex = sortedEvents.findIndex(
    (e) => new Date(e.eventDate) <= now
  );

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

// ============================================
// ADD EVENT MODAL COMPONENT
// ============================================

interface AddEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  containerId: string;
  containerNumber: string;
  eventTypes: EventType[];
  onEventAdded: () => void;
}

const AddEventModal: React.FC<AddEventModalProps> = ({
  isOpen,
  onClose,
  containerId,
  containerNumber,
  eventTypes,
  onEventAdded,
}) => {
  const [formData, setFormData] = useState<TrackingEventInput>({
    eventType: '',
    eventDate: new Date().toISOString().slice(0, 16),
    location: '',
    portName: '',
    vessel: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await trackingService.addTrackingEvent(containerId, formData);
      onEventAdded();
      onClose();
      setFormData({
        eventType: '',
        eventDate: new Date().toISOString().slice(0, 16),
        location: '',
        portName: '',
        vessel: '',
        notes: '',
      });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Eroare la adăugarea evenimentului');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-xl w-full max-w-lg">
        <div className="p-6 border-b border-neutral-200 dark:border-neutral-700">
          <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100">
            Adaugă Eveniment - {containerNumber}
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Tip Eveniment *
            </label>
            <select
              value={formData.eventType}
              onChange={(e) => setFormData({ ...formData, eventType: e.target.value })}
              className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-primary-500"
              required
            >
              <option value="">Selectează tipul</option>
              {eventTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Data și Ora *
            </label>
            <Input
              type="datetime-local"
              value={formData.eventDate}
              onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Locație *
            </label>
            <Input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="ex., Portul Shanghai"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Nume Port
              </label>
              <Input
                type="text"
                value={formData.portName || ''}
                onChange={(e) => setFormData({ ...formData, portName: e.target.value })}
                placeholder="ex., Shanghai"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Navă
              </label>
              <Input
                type="text"
                value={formData.vessel || ''}
                onChange={(e) => setFormData({ ...formData, vessel: e.target.value })}
                placeholder="ex., MSC Oscar"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Note
            </label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-primary-500 min-h-[80px]"
              placeholder="Detalii suplimentare..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Anulează
            </Button>
            <Button type="submit" loading={loading} disabled={loading}>
              <PlusIcon className="h-4 w-4 mr-2" />
              Adaugă Eveniment
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================
// STATS CARDS COMPONENT
// ============================================

interface StatsCardsProps {
  stats: TrackingStats | null;
  loading: boolean;
}

const StatsCards: React.FC<StatsCardsProps> = ({ stats, loading }) => {
  const statItems = [
    {
      label: 'Total Containere',
      value: stats?.totalContainers || 0,
      icon: PackageIcon,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-100 dark:bg-blue-900/30',
    },
    {
      label: 'În Tranzit',
      value: stats?.inTransit || 0,
      icon: TruckIcon,
      color: 'text-yellow-600 dark:text-yellow-400',
      bg: 'bg-yellow-100 dark:bg-yellow-900/30',
    },
    {
      label: 'Livrate',
      value: stats?.delivered || 0,
      icon: CheckCircleIcon,
      color: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-100 dark:bg-green-900/30',
    },
    {
      label: 'Întârziate',
      value: stats?.delayed || 0,
      icon: AlertCircleIcon,
      color: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-100 dark:bg-red-900/30',
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="animate-pulse bg-neutral-200 dark:bg-neutral-700 rounded-xl h-24" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {statItems.map((item) => (
        <div key={item.label}>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${item.bg}`}>
                <item.icon className={`h-5 w-5 ${item.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">
                  {item.value}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">{item.label}</p>
              </div>
            </div>
          </Card>
        </div>
      ))}
    </div>
  );
};

// ============================================
// RECENT CONTAINERS LIST
// ============================================

interface RecentContainersProps {
  containers: Container[];
  onSelect: (containerNumber: string) => void;
  loading: boolean;
}

const RecentContainers: React.FC<RecentContainersProps> = ({ containers, onSelect, loading }) => {
  if (loading) {
    return (
      <div className="animate-pulse space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-neutral-200 dark:bg-neutral-700 rounded-lg" />
        ))}
      </div>
    );
  }

  if (containers.length === 0) {
    return (
      <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
        <PackageIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>Nu există containere de afișat</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {containers.slice(0, 5).map((container) => (
        <div
          key={container.id}
          className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-700/50 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 cursor-pointer transition-colors"
          onClick={() => onSelect(container.containerNumber)}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
              <PackageIcon className="h-4 w-4 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <p className="font-mono font-medium text-neutral-800 dark:text-neutral-100">
                {container.containerNumber}
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {container.booking?.bookingNumber || 'N/A'} • {container.currentLocation || 'Necunoscut'}
              </p>
            </div>
          </div>
          <Badge variant={statusVariantMap[container.currentStatus] || 'default'}>
            {getStatusLabel(container.currentStatus)}
          </Badge>
        </div>
      ))}
    </div>
  );
};

// ============================================
// MAIN TRACKING VIEW COMPONENT
// ============================================

const TrackingView: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [containerNumber, setContainerNumber] = useState(searchParams.get('container') || '');
  const [trackingData, setTrackingData] = useState<Container | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Stats and list states
  const [stats, setStats] = useState<TrackingStats | null>(null);
  const [recentContainers, setRecentContainers] = useState<Container[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [listLoading, setListLoading] = useState(true);

  // Event types for modal
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [showAddEventModal, setShowAddEventModal] = useState(false);

  // Map state
  const [showMap, setShowMap] = useState(true);
  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [vesselInfo, setVesselInfo] = useState<VesselInfo | null>(null);
  const [locationInfo, setLocationInfo] = useState<ContainerLocation | null>(null);

  // Load initial data
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

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Search container
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

      // Extract extended data from SeaRates if available
      if (data._route) {
        setRouteData(data._route);
      }
      if (data._vessel) {
        setVesselInfo(data._vessel);
      }
      if (data._location) {
        setLocationInfo(data._location);
      }

      // Also try to fetch route data from public tracking endpoint
      try {
        const publicData = await trackingService.trackPublic(number.trim().toUpperCase(), { route: true });
        console.log('[TrackingView] Public tracking data received:', {
          success: publicData.success,
          hasEvents: !!publicData.data?.events?.length,
          eventsCount: publicData.data?.events?.length || 0,
          hasRoute: !!publicData.data?.route,
          routePathLength: publicData.data?.route?.path?.length || 0,
          routePinsLength: publicData.data?.route?.pins?.length || 0,
          location: publicData.data?.location,
          vessel: publicData.data?.vessel,
        });

        if (publicData.success && publicData.data) {
          // Set vessel info
          if (publicData.data.vessel) {
            setVesselInfo(publicData.data.vessel);
          }

          // Build route from events if route.path is empty
          let finalRoute = publicData.data.route;
          const events = publicData.data.events;

          if (events && events.length > 0) {
            // Sort events by date (oldest first for building route)
            const sortedEvents = [...events].sort(
              (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
            );

            // Build path from events with coordinates
            const routePoints: Array<[number, number]> = [];
            const pins: Array<{ coordinates: [number, number]; location?: string; type?: string }> = [];

            for (const event of sortedEvents) {
              if (event.location?.latitude && event.location?.longitude) {
                const coords: [number, number] = [event.location.longitude, event.location.latitude];

                // Add to path if not duplicate
                const lastPoint = routePoints[routePoints.length - 1];
                if (!lastPoint || lastPoint[0] !== coords[0] || lastPoint[1] !== coords[1]) {
                  routePoints.push(coords);
                }

                // Add pin for significant events
                if (event.type?.includes('LOAD') || event.type?.includes('DISCHARGE') ||
                    event.type?.includes('DEPARTURE') || event.type?.includes('ARRIVAL') ||
                    event.type?.includes('GATE')) {
                  const existingPin = pins.find(p =>
                    p.coordinates[0] === coords[0] && p.coordinates[1] === coords[1]
                  );
                  if (!existingPin) {
                    pins.push({
                      coordinates: coords,
                      location: event.location.name || event.location.city,
                      type: event.type?.includes('LOAD') || event.type?.includes('DEPARTURE') ? 'POL' :
                            event.type?.includes('DISCHARGE') || event.type?.includes('ARRIVAL') ? 'POD' :
                            'TRANSSHIPMENT',
                    });
                  }
                }
              }
            }

            // Use built route if original is empty
            if (!finalRoute?.path || finalRoute.path.length === 0) {
              finalRoute = {
                path: routePoints.length >= 2 ? routePoints : [],
                pins: pins.length > 0 ? pins : finalRoute?.pins || [],
              };
            }

            // Find current position from last ACTUAL event (not estimated)
            // The last actual event with coordinates is the real current position
            const actualEvents = sortedEvents
              .filter(e => e.isActual && e.location?.latitude && e.location?.longitude)
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            const lastActualEvent = actualEvents[0];

            // Check if vessel is currently at sea (departed but not arrived)
            const departureEvents = actualEvents.filter(e =>
              e.type?.includes('DEPARTURE') || e.type?.includes('LOAD')
            );
            const arrivalEvents = actualEvents.filter(e =>
              e.type?.includes('ARRIVAL') || e.type?.includes('DISCHARGE')
            );

            const lastDeparture = departureEvents[0];
            const lastArrival = arrivalEvents[0];

            // Vessel is at sea if last departure is more recent than last arrival
            const isAtSea = lastDeparture && (!lastArrival ||
              new Date(lastDeparture.date) > new Date(lastArrival.date));

            if (isAtSea && lastDeparture?.location && publicData.data.eta) {
              // Calculate estimated position between last departure and destination
              const departureCoords = lastDeparture.location;
              const destinationCoords = publicData.data.location;

              if (departureCoords?.latitude && departureCoords?.longitude &&
                  destinationCoords?.latitude && destinationCoords?.longitude) {
                const departureTime = new Date(lastDeparture.date).getTime();
                const etaTime = new Date(publicData.data.eta).getTime();
                const nowTime = Date.now();

                // Calculate progress (0 to 1)
                const totalDuration = etaTime - departureTime;
                const elapsed = nowTime - departureTime;
                const progress = Math.min(Math.max(elapsed / totalDuration, 0), 0.95); // Max 95% until arrival

                // Linear interpolation (simplified - doesn't account for actual shipping routes)
                const estimatedLat = departureCoords.latitude +
                  (destinationCoords.latitude - departureCoords.latitude) * progress;
                const estimatedLng = departureCoords.longitude +
                  (destinationCoords.longitude - departureCoords.longitude) * progress;

                setLocationInfo({
                  name: `În mare (aprox. ${Math.round(progress * 100)}% din traseu)`,
                  city: undefined,
                  country: undefined,
                  latitude: estimatedLat,
                  longitude: estimatedLng,
                });

                console.log('[TrackingView] Estimated at-sea position:', {
                  progress: `${Math.round(progress * 100)}%`,
                  from: departureCoords,
                  to: destinationCoords,
                  estimated: { lat: estimatedLat, lng: estimatedLng },
                });
              } else if (lastActualEvent?.location) {
                setLocationInfo({
                  name: lastActualEvent.location.name,
                  city: lastActualEvent.location.city,
                  country: lastActualEvent.location.country,
                  unlocode: lastActualEvent.location.unlocode,
                  latitude: lastActualEvent.location.latitude,
                  longitude: lastActualEvent.location.longitude,
                });
              }
            } else if (lastActualEvent?.location) {
              // Use last actual event location as current position
              setLocationInfo({
                name: lastActualEvent.location.name,
                city: lastActualEvent.location.city,
                country: lastActualEvent.location.country,
                unlocode: lastActualEvent.location.unlocode,
                latitude: lastActualEvent.location.latitude,
                longitude: lastActualEvent.location.longitude,
              });
            } else if (publicData.data.location) {
              // Fallback to API location if no actual events with coords
              setLocationInfo(publicData.data.location);
            }
          } else if (publicData.data.location) {
            setLocationInfo(publicData.data.location);
          }

          if (finalRoute) {
            console.log('[TrackingView] Setting final route data:', {
              pathLength: finalRoute.path?.length || 0,
              pinsCount: finalRoute.pins?.length || 0,
              firstPoints: finalRoute.path?.slice(0, 3),
            });
            setRouteData(finalRoute);
          }
        }
      } catch (publicErr) {
        // Ignore errors from public tracking - we already have local data
        console.log('[TrackingView] Public tracking fetch error (optional):', publicErr);
      }
    } catch (err: any) {
      if (err.response?.status === 404) {
        setError(`Containerul "${number}" nu a fost găsit în baza de date.`);
      } else if (err.response?.status === 403) {
        setError('Nu aveți permisiunea de a vizualiza acest container.');
      } else {
        setError(err.response?.data?.error || 'Eroare la căutarea containerului.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle URL params
  useEffect(() => {
    const queryContainer = searchParams.get('container');
    if (queryContainer) {
      setContainerNumber(queryContainer);
      performTracking(queryContainer);
    }
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
    if (trackingData) {
      performTracking(trackingData.containerNumber);
    }
    loadInitialData();
  };

  const handleEventAdded = () => {
    if (trackingData) {
      performTracking(trackingData.containerNumber);
    }
    loadInitialData();
  };

  // Convert tracking events to timeline format
  const timelineEvents = trackingData?.trackingEvents
    ? convertToTimelineEvents(trackingData.trackingEvents, trackingData.currentStatus)
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h3 className="text-2xl font-semibold text-neutral-800 dark:text-neutral-100">
            Urmărire Container
          </h3>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Monitorizați statusul și poziția containerelor în timp real
          </p>
        </div>
        <Button variant="outline" onClick={handleRefresh}>
          <RefreshCwIcon className="h-4 w-4 mr-2" />
          Actualizează
        </Button>
      </div>

      {/* Stats Cards */}
      <StatsCards stats={stats} loading={statsLoading} />

      {/* Search and Results */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Search Card */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <h4 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100 mb-4">
              Caută Container
            </h4>
            <form onSubmit={handleTrack} className="flex flex-col sm:flex-row gap-4">
              <Input
                type="text"
                value={containerNumber}
                onChange={(e) => setContainerNumber(e.target.value.toUpperCase())}
                placeholder="ex., MSCU1234567"
                className="flex-grow font-mono uppercase"
              />
              <Button type="submit" disabled={isLoading} loading={isLoading} className="sm:w-36">
                <SearchIcon className="mr-2 h-4 w-4" />
                Urmărește
              </Button>
            </form>
          </Card>

          {/* Error Message */}
          {error && (
            <div className="bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-4 rounded-lg flex items-center gap-3">
              <AlertCircleIcon className="h-5 w-5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <Card className="animate-pulse">
              <div className="h-32 bg-neutral-200 dark:bg-neutral-700 rounded-lg" />
            </Card>
          )}

          {/* Tracking Result */}
          {trackingData && !isLoading && (
            <Card>
              {/* Container Info Header */}
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 border-b border-neutral-200 dark:border-neutral-700 pb-4 mb-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1">
                  <div>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">Nr. Container</p>
                    <p className="font-semibold text-neutral-800 dark:text-neutral-100 font-mono">
                      {trackingData.containerNumber}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">Tip</p>
                    <p className="font-semibold text-neutral-800 dark:text-neutral-100">
                      {trackingData.type || 'Standard'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">Stare Curentă</p>
                    <Badge variant={statusVariantMap[trackingData.currentStatus] || 'default'}>
                      {getStatusLabel(trackingData.currentStatus)}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">ETA</p>
                    <p className="font-semibold text-neutral-800 dark:text-neutral-100">
                      {trackingData.eta
                        ? new Date(trackingData.eta).toLocaleDateString('ro-RO')
                        : 'N/A'}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddEventModal(true)}
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Adaugă Eveniment
                </Button>
              </div>

              {/* Additional Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Booking</p>
                  <p className="font-medium text-neutral-800 dark:text-neutral-100">
                    {trackingData.booking?.bookingNumber || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Client</p>
                  <p className="font-medium text-neutral-800 dark:text-neutral-100">
                    {trackingData.booking?.client?.name || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Rută</p>
                  <p className="font-medium text-neutral-800 dark:text-neutral-100">
                    {trackingData.booking
                      ? `${trackingData.booking.origin} → ${trackingData.booking.destination}`
                      : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Locație Curentă</p>
                  <p className="font-medium text-neutral-800 dark:text-neutral-100 flex items-center gap-1">
                    <MapPinIcon className="h-4 w-4 text-red-500" />
                    {trackingData.currentLocation || locationInfo?.name || 'Necunoscută'}
                  </p>
                </div>
              </div>

              {/* Map Section */}
              {(trackingData.currentLat && trackingData.currentLng) || routeData || locationInfo ? (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-lg font-semibold text-neutral-700 dark:text-neutral-200">
                      Hartă Urmărire
                    </h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowMap(!showMap)}
                    >
                      {showMap ? 'Ascunde Harta' : 'Afișează Harta'}
                    </Button>
                  </div>
                  {showMap && (
                    <Suspense fallback={
                      <div className="h-[400px] bg-neutral-100 dark:bg-neutral-800 rounded-xl flex items-center justify-center">
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-2"></div>
                          <p className="text-sm text-neutral-500">Se încarcă harta...</p>
                        </div>
                      </div>
                    }>
                      <ContainerMap
                        containerNumber={trackingData.containerNumber}
                        currentLocation={locationInfo || (trackingData.currentLat && trackingData.currentLng ? {
                          name: trackingData.currentLocation,
                          latitude: trackingData.currentLat,
                          longitude: trackingData.currentLng,
                        } : undefined)}
                        vessel={vesselInfo}
                        route={routeData || undefined}
                        originPort={trackingData.booking?.origin}
                        destinationPort={trackingData.booking?.destination}
                        status={trackingData.currentStatus}
                        eta={trackingData.eta}
                        height="400px"
                      />
                    </Suspense>
                  )}
                </div>
              ) : null}

              {/* Timeline */}
              <div>
                <h4 className="text-lg font-semibold text-neutral-700 dark:text-neutral-200 mb-5">
                  Istoric Urmărire
                </h4>
                {timelineEvents.length > 0 ? (
                  <TrackingTimeline events={timelineEvents} />
                ) : (
                  <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
                    <ClockIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Nu există evenimente de urmărire înregistrate</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => setShowAddEventModal(true)}
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Adaugă primul eveniment
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>

        {/* Recent Containers Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <h4 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100 mb-4">
              Containere Recente
            </h4>
            <RecentContainers
              containers={recentContainers}
              onSelect={handleContainerSelect}
              loading={listLoading}
            />
          </Card>
        </div>
      </div>

      {/* Add Event Modal */}
      {trackingData && (
        <AddEventModal
          isOpen={showAddEventModal}
          onClose={() => setShowAddEventModal(false)}
          containerId={trackingData.id}
          containerNumber={trackingData.containerNumber}
          eventTypes={eventTypes}
          onEventAdded={handleEventAdded}
        />
      )}
    </div>
  );
};

export default TrackingView;