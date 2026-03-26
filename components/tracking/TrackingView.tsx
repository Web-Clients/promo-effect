import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import {
  SearchIcon,
  ClockIcon,
  AlertCircleIcon,
  PlusIcon,
  MapPinIcon,
  RefreshCwIcon,
} from '../icons';
import { TrackingTimeline } from '../TrackingTimeline';
import trackingService, {
  Container,
  TrackingStats,
  EventType,
  RouteData,
  VesselInfo,
  ContainerLocation,
  getStatusLabel,
} from '../../services/tracking';
import { statusVariantMap, convertToTimelineEvents } from './types';
import AddEventModal from './AddEventModal';
import StatsCards from './StatsCards';
import RecentContainers from './RecentContainers';
import { getErrorMessage } from '../../utils/formatters';

// Lazy load map component to avoid issues with SSR
const ContainerMap = lazy(() => import('../ContainerMap'));

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
        const publicData = await trackingService.trackPublic(number.trim().toUpperCase(), {
          route: true,
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
            const pins: Array<{ coordinates: [number, number]; location?: string; type?: string }> =
              [];

            for (const event of sortedEvents) {
              if (event.location?.latitude && event.location?.longitude) {
                const coords: [number, number] = [
                  event.location.longitude,
                  event.location.latitude,
                ];

                // Add to path if not duplicate
                const lastPoint = routePoints[routePoints.length - 1];
                if (!lastPoint || lastPoint[0] !== coords[0] || lastPoint[1] !== coords[1]) {
                  routePoints.push(coords);
                }

                // Add pin for significant events
                if (
                  event.type?.includes('LOAD') ||
                  event.type?.includes('DISCHARGE') ||
                  event.type?.includes('DEPARTURE') ||
                  event.type?.includes('ARRIVAL') ||
                  event.type?.includes('GATE')
                ) {
                  const existingPin = pins.find(
                    (p) => p.coordinates[0] === coords[0] && p.coordinates[1] === coords[1]
                  );
                  if (!existingPin) {
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
            }

            // Use built route if original is empty
            if (!finalRoute?.path || finalRoute.path.length === 0) {
              finalRoute = {
                path: routePoints.length >= 2 ? routePoints : [],
                pins: pins.length > 0 ? pins : finalRoute?.pins || [],
              };
            }

            // Find current position from last ACTUAL event (not estimated)
            const actualEvents = sortedEvents
              .filter((e) => e.isActual && e.location?.latitude && e.location?.longitude)
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            const lastActualEvent = actualEvents[0];

            // Check if vessel is currently at sea (departed but not arrived)
            const departureEvents = actualEvents.filter(
              (e) => e.type?.includes('DEPARTURE') || e.type?.includes('LOAD')
            );
            const arrivalEvents = actualEvents.filter(
              (e) => e.type?.includes('ARRIVAL') || e.type?.includes('DISCHARGE')
            );

            const lastDeparture = departureEvents[0];
            const lastArrival = arrivalEvents[0];

            // Vessel is at sea if last departure is more recent than last arrival
            const isAtSea =
              lastDeparture &&
              (!lastArrival || new Date(lastDeparture.date) > new Date(lastArrival.date));

            if (isAtSea && lastDeparture?.location && publicData.data.eta) {
              // Calculate estimated position between last departure and destination
              const departureCoords = lastDeparture.location;
              const destinationCoords = publicData.data.location;

              if (
                departureCoords?.latitude &&
                departureCoords?.longitude &&
                destinationCoords?.latitude &&
                destinationCoords?.longitude
              ) {
                const departureTime = new Date(lastDeparture.date).getTime();
                const etaTime = new Date(publicData.data.eta).getTime();
                const nowTime = Date.now();

                // Calculate progress (0 to 1)
                const totalDuration = etaTime - departureTime;
                const elapsed = nowTime - departureTime;
                const progress = Math.min(Math.max(elapsed / totalDuration, 0), 0.95); // Max 95% until arrival

                // Linear interpolation (simplified)
                const estimatedLat =
                  departureCoords.latitude +
                  (destinationCoords.latitude - departureCoords.latitude) * progress;
                const estimatedLng =
                  departureCoords.longitude +
                  (destinationCoords.longitude - departureCoords.longitude) * progress;

                setLocationInfo({
                  name: `În mare (aprox. ${Math.round(progress * 100)}% din traseu)`,
                  city: undefined,
                  country: undefined,
                  latitude: estimatedLat,
                  longitude: estimatedLng,
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
            setRouteData(finalRoute);
          }
        }
      } catch {
        // Ignore errors from public tracking - we already have local data
      }
    } catch (err: unknown) {
      const httpErr = err as { response?: { status?: number; data?: { error?: string } } };
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
                <Button variant="outline" size="sm" onClick={() => setShowAddEventModal(true)}>
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
                    <Button variant="ghost" size="sm" onClick={() => setShowMap(!showMap)}>
                      {showMap ? 'Ascunde Harta' : 'Afișează Harta'}
                    </Button>
                  </div>
                  {showMap && (
                    <Suspense
                      fallback={
                        <div className="h-[400px] bg-neutral-100 dark:bg-neutral-800 rounded-xl flex items-center justify-center">
                          <div className="text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-2"></div>
                            <p className="text-sm text-neutral-500">Se încarcă harta...</p>
                          </div>
                        </div>
                      }
                    >
                      <ContainerMap
                        containerNumber={trackingData.containerNumber}
                        currentLocation={
                          locationInfo ||
                          (trackingData.currentLat && trackingData.currentLng
                            ? {
                                name: trackingData.currentLocation,
                                latitude: trackingData.currentLat,
                                longitude: trackingData.currentLng,
                              }
                            : undefined)
                        }
                        vessel={vesselInfo ?? undefined}
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
