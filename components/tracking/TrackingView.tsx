/**
 * TrackingView — orchestrator after C1 extraction.
 *
 * Logic moved to: useTracking.ts
 * Sub-components (existing): StatsCards, RecentContainers, AddEventModal
 * Shared component: TrackingTimeline, ContainerMap
 */

import React, { lazy, Suspense } from 'react';
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
import { getStatusLabel } from '../../services/tracking';
import { statusVariantMap, convertToTimelineEvents } from './types';
import AddEventModal from './AddEventModal';
import StatsCards from './StatsCards';
import RecentContainers from './RecentContainers';
import { useTracking } from './useTracking';

const ContainerMap = lazy(() => import('../ContainerMap'));
const VesselPicker = lazy(() => import('./VesselPicker'));

const TrackingView: React.FC = () => {
  const {
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
    handleTrack,
    handleContainerSelect,
    handleRefresh,
    handleEventAdded,
  } = useTracking();

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
        <div className="lg:col-span-2 space-y-6">
          {/* Search Card */}
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

          {/* Error */}
          {error && (
            <div className="bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-4 rounded-lg flex items-center gap-3">
              <AlertCircleIcon className="h-5 w-5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {/* Loading skeleton */}
          {isLoading && (
            <Card className="animate-pulse">
              <div className="h-32 bg-neutral-200 dark:bg-neutral-700 rounded-lg" />
            </Card>
          )}

          {/* Result card */}
          {trackingData && !isLoading && (
            <Card>
              {/* Container header */}
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

              {/* Additional info */}
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

              {/* Map */}
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
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-2" />
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

                  {/* Operator-only: assign or change the AIS vessel on this container */}
                  <Suspense fallback={null}>
                    <VesselPicker
                      containerId={trackingData.id}
                      currentMmsi={trackingData.vesselMmsi}
                      currentName={trackingData.vesselName || vesselInfo?.name}
                      onAssigned={() => handleRefresh()}
                    />
                  </Suspense>
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
