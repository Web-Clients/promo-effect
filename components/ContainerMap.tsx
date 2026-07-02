import React, { useEffect, useMemo, useRef, useState } from 'react';
import { formatDateShort } from '../utils/formatters';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getLivePositions, LiveVesselPosition, getStatusLabel } from '../services/tracking';

// Fix default marker icons for Leaflet in React
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom icons
const containerIcon = new L.DivIcon({
  className: 'custom-container-marker',
  html: `<div style="
    background: #1e40af;
    border: 3px solid white;
    border-radius: 50%;
    width: 20px;
    height: 20px;
    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    display: flex;
    align-items: center;
    justify-content: center;
  ">
    <div style="
      width: 8px;
      height: 8px;
      background: white;
      border-radius: 50%;
    "></div>
  </div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

const vesselIcon = new L.DivIcon({
  className: 'custom-vessel-marker',
  html: `<div style="
    font-size: 24px;
    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
  ">🚢</div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const portOriginIcon = new L.DivIcon({
  className: 'custom-port-origin-marker',
  html: `<div style="
    background: #10b981;
    border: 2px solid white;
    border-radius: 4px;
    width: 16px;
    height: 16px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
  "></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const portDestinationIcon = new L.DivIcon({
  className: 'custom-port-destination-marker',
  html: `<div style="
    background: #ef4444;
    border: 2px solid white;
    border-radius: 4px;
    width: 16px;
    height: 16px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
  "></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const transshipmentIcon = new L.DivIcon({
  className: 'custom-transshipment-marker',
  html: `<div style="
    background: #f59e0b;
    border: 2px solid white;
    border-radius: 50%;
    width: 12px;
    height: 12px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
  "></div>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

// Types
export interface ContainerLocation {
  name?: string;
  city?: string;
  country?: string;
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
  type?: 'POL' | 'POD' | 'TRANSSHIPMENT' | string;
}

export interface RouteData {
  path?: Array<[number, number]>; // Array of [lng, lat]
  pins?: RoutePin[];
}

export interface ContainerMapProps {
  containerNumber: string;
  currentLocation?: ContainerLocation;
  vessel?: VesselInfo;
  route?: RouteData;
  originPort?: string;
  destinationPort?: string;
  status?: string;
  eta?: string;
  className?: string;
  height?: string;
  /** Poll the backend AIS cache every 5s when set, so the vessel marker
   *  walks across the map in near-real-time. */
  livePollIntervalMs?: number;
}

// Component to fit map bounds to route — ONCE. Live polling moves the
// vessel marker every few seconds; re-fitting on each update would yank
// the viewport and make the map unusable while inspecting a vessel.
const FitBounds: React.FC<{ bounds: L.LatLngBoundsExpression | null }> = ({ bounds }) => {
  const map = useMap();
  const fitted = useRef(false);

  useEffect(() => {
    if (bounds && !fitted.current) {
      map.fitBounds(bounds, { padding: [50, 50] });
      fitted.current = true;
    }
  }, [map, bounds]);

  return null;
};

// Main Map Component
const ContainerMap: React.FC<ContainerMapProps> = ({
  containerNumber,
  currentLocation,
  vessel,
  route,
  originPort,
  destinationPort,
  status,
  eta,
  className = '',
  height = '400px',
  livePollIntervalMs = 5000,
}) => {
  // Live AIS position pulled from the backend cache and refreshed on a timer.
  const [livePos, setLivePos] = useState<LiveVesselPosition | null>(null);
  const targetMmsi = vessel?.mmsi;

  useEffect(() => {
    if (!targetMmsi) return;
    let cancelled = false;

    const tick = async () => {
      try {
        const { positions } = await getLivePositions();
        if (cancelled) return;
        const match = positions.find((p) => p.mmsi === targetMmsi);
        if (match) {
          setLivePos({
            latitude: match.latitude,
            longitude: match.longitude,
            sog: match.sog,
            cog: match.cog,
            heading: match.heading,
            shipName: match.shipName,
            destination: match.destination,
            timestamp: match.timestamp,
          });
        }
      } catch {
        // silent — keep showing last known position
      }
    };

    tick();
    const id = setInterval(tick, livePollIntervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [targetMmsi, livePollIntervalMs]);

  // Live position overrides the static currentLocation prop.
  const effectiveLocation: ContainerLocation | undefined = livePos
    ? {
        name: livePos.shipName || vessel?.name || currentLocation?.name,
        latitude: livePos.latitude,
        longitude: livePos.longitude,
      }
    : currentLocation;

  // Convert route path from [lng, lat] to [lat, lng] for Leaflet
  const routePath = useMemo(() => {
    if (!route?.path || route.path.length === 0) return [];
    return route.path.map(([lng, lat]) => [lat, lng] as [number, number]);
  }, [route?.path]);

  // Calculate map bounds
  const bounds = useMemo(() => {
    const points: [number, number][] = [];

    // Add current location
    if (effectiveLocation?.latitude && effectiveLocation?.longitude) {
      points.push([effectiveLocation.latitude, effectiveLocation.longitude]);
    }

    // Add route points
    if (routePath.length > 0) {
      points.push(...routePath);
    }

    // Add pins
    if (route?.pins) {
      route.pins.forEach((pin) => {
        if (pin.coordinates) {
          points.push([pin.coordinates[1], pin.coordinates[0]]); // [lat, lng]
        }
      });
    }

    if (points.length === 0) return null;
    if (points.length === 1) {
      // Single point - create small bounds around it
      const [lat, lng] = points[0];
      return L.latLngBounds([lat - 5, lng - 5], [lat + 5, lng + 5]);
    }

    return L.latLngBounds(points);
  }, [currentLocation, routePath, route?.pins]);

  // Default center (world view)
  const defaultCenter: [number, number] =
    effectiveLocation?.latitude && effectiveLocation?.longitude
      ? [effectiveLocation.latitude, effectiveLocation.longitude]
      : [25, 50]; // Middle of shipping routes

  // Get icon for pin type
  const getPinIcon = (type?: string) => {
    switch (type?.toUpperCase()) {
      case 'POL':
      case 'ORIGIN':
        return portOriginIcon;
      case 'POD':
      case 'DESTINATION':
        return portDestinationIcon;
      case 'TRANSSHIPMENT':
      case 'TS':
        return transshipmentIcon;
      default:
        return transshipmentIcon;
    }
  };

  // Format status for display
  const formatStatus = (s?: string) => (s ? getStatusLabel(s) : '—');

  return (
    <div
      className={`rounded-xl overflow-hidden shadow-lg border border-neutral-200 dark:border-neutral-700 ${className}`}
    >
      {/* Smooth glide for the vessel marker between 5s live updates */}
      <style>{`.leaflet-marker-icon{transition:transform 1500ms ease-out;}`}</style>
      {/* Map Header */}
      <div className="bg-white dark:bg-neutral-800 px-4 py-3 border-b border-neutral-200 dark:border-neutral-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-lg">🗺️</span>
            <div>
              <h4 className="font-semibold text-neutral-800 dark:text-neutral-100">
                {containerNumber}
              </h4>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {originPort && destinationPort
                  ? `${originPort} → ${destinationPort}`
                  : currentLocation?.name || 'Location tracking'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <span
              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                status === 'DELIVERED'
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                  : status === 'IN_TRANSIT'
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
              }`}
            >
              {formatStatus(status)}
            </span>
            {eta && (
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                ETA: {formatDateShort(eta)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div style={{ height }}>
        <MapContainer
          center={defaultCenter}
          zoom={3}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {/* Marine overlay: seamarks, lighthouses, traffic separation schemes */}
          <TileLayer
            attribution='&copy; <a href="https://www.openseamap.org">OpenSeaMap</a>'
            url="https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png"
            opacity={0.85}
          />

          {/* Fit bounds to show all points */}
          {bounds && <FitBounds bounds={bounds} />}

          {/* Route polyline - solid line for actual route */}
          {routePath.length > 1 && (
            <>
              {/* Background line for better visibility */}
              <Polyline
                positions={routePath}
                pathOptions={{
                  color: '#ffffff',
                  weight: 5,
                  opacity: 0.8,
                }}
              />
              {/* Main route line */}
              <Polyline
                positions={routePath}
                pathOptions={{
                  color: '#1e40af',
                  weight: 3,
                  opacity: 1,
                }}
              />
            </>
          )}

          {/* Route pins (ports) */}
          {route?.pins?.map((pin, index) => (
            <Marker
              key={`pin-${index}`}
              position={[pin.coordinates[1], pin.coordinates[0]]}
              icon={getPinIcon(pin.type)}
            >
              <Popup>
                <div className="text-sm">
                  <p className="font-semibold">{pin.location || 'Port'}</p>
                  <p className="text-gray-600 text-xs">
                    {pin.type === 'POL'
                      ? '🟢 Port de încărcare'
                      : pin.type === 'POD'
                        ? '🔴 Port de descărcare'
                        : '🟡 Transbordare'}
                  </p>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Current container location */}
          {effectiveLocation?.latitude && effectiveLocation?.longitude && (
            <Marker
              position={[effectiveLocation.latitude, effectiveLocation.longitude]}
              icon={vessel?.name ? vesselIcon : containerIcon}
            >
              <Popup>
                <div className="text-sm min-w-[200px]">
                  <p className="font-bold text-blue-800 mb-2">📦 {containerNumber}</p>

                  <div className="space-y-1">
                    <p>
                      <span className="text-gray-500">Locație:</span>{' '}
                      {effectiveLocation.name || 'Necunoscută'}
                    </p>
                    {livePos && (
                      <>
                        <p className="text-xs text-emerald-600 font-medium">● AIS live</p>
                        <p className="text-xs">
                          <span className="text-gray-500">Viteză:</span>{' '}
                          {livePos.sog != null ? `${livePos.sog.toFixed(1)} nd` : '—'}
                        </p>
                        <p className="text-xs">
                          <span className="text-gray-500">Direcție:</span>{' '}
                          {livePos.cog != null ? `${livePos.cog.toFixed(0)}°` : '—'}
                        </p>
                        {livePos.destination && (
                          <p className="text-xs">
                            <span className="text-gray-500">Destinație:</span> {livePos.destination}
                          </p>
                        )}
                      </>
                    )}
                  </div>

                  {vessel?.name && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <p className="font-semibold">🚢 {vessel.name}</p>
                      {vessel.imo && <p className="text-xs text-gray-500">IMO: {vessel.imo}</p>}
                    </div>
                  )}

                  {eta && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <p className="text-xs">
                        <span className="text-gray-500">ETA:</span>{' '}
                        <span className="font-medium">{formatDateShort(eta)}</span>
                      </p>
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

      {/* Map Legend */}
      <div className="bg-white dark:bg-neutral-800 px-4 py-2 border-t border-neutral-200 dark:border-neutral-700">
        <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-600 dark:text-neutral-400">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span>Origine (POL)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            <span>Destinație (POD)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <span>Transbordare</span>
          </div>
          {vessel?.name ? (
            <div className="flex items-center gap-1">
              <span>🚢</span>
              <span>Poziție curentă ({vessel.name})</span>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-blue-800 rounded-full"></div>
              <span>Poziție curentă</span>
            </div>
          )}
          {routePath.length > 1 && (
            <div className="flex items-center gap-1">
              <div className="w-6 h-0.5 bg-blue-800"></div>
              <span>Rută ({routePath.length} puncte)</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default React.memo(ContainerMap);
