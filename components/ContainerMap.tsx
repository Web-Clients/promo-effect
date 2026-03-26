import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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
}

// Component to fit map bounds to route
const FitBounds: React.FC<{ bounds: L.LatLngBoundsExpression | null }> = ({ bounds }) => {
  const map = useMap();

  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [50, 50] });
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
}) => {
  // Convert route path from [lng, lat] to [lat, lng] for Leaflet
  const routePath = useMemo(() => {
    if (!route?.path || route.path.length === 0) return [];
    return route.path.map(([lng, lat]) => [lat, lng] as [number, number]);
  }, [route?.path]);

  // Calculate map bounds
  const bounds = useMemo(() => {
    const points: [number, number][] = [];

    // Add current location
    if (currentLocation?.latitude && currentLocation?.longitude) {
      points.push([currentLocation.latitude, currentLocation.longitude]);
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
    currentLocation?.latitude && currentLocation?.longitude
      ? [currentLocation.latitude, currentLocation.longitude]
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
  const formatStatus = (s?: string) => {
    const statusMap: Record<string, string> = {
      IN_TRANSIT: 'In Transit',
      DEPARTED: 'Departed',
      ARRIVED: 'Arrived',
      DELIVERED: 'Delivered',
      GATE_IN: 'Gate In',
      GATE_OUT: 'Gate Out',
      LOADED: 'Loaded on Vessel',
      DISCHARGED: 'Discharged',
    };
    return statusMap[s || ''] || s || 'Unknown';
  };

  return (
    <div
      className={`rounded-xl overflow-hidden shadow-lg border border-neutral-200 dark:border-neutral-700 ${className}`}
    >
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
                ETA: {new Date(eta).toLocaleDateString('ro-RO')}
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
                      ? '🟢 Port of Loading'
                      : pin.type === 'POD'
                        ? '🔴 Port of Discharge'
                        : '🟡 Transshipment'}
                  </p>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Current container location */}
          {currentLocation?.latitude && currentLocation?.longitude && (
            <Marker
              position={[currentLocation.latitude, currentLocation.longitude]}
              icon={vessel?.name ? vesselIcon : containerIcon}
            >
              <Popup>
                <div className="text-sm min-w-[200px]">
                  <p className="font-bold text-blue-800 mb-2">📦 {containerNumber}</p>

                  <div className="space-y-1">
                    <p>
                      <span className="text-gray-500">Location:</span>{' '}
                      {currentLocation.name || 'Unknown'}
                    </p>
                    {currentLocation.city && (
                      <p>
                        <span className="text-gray-500">City:</span> {currentLocation.city}
                      </p>
                    )}
                    {currentLocation.country && (
                      <p>
                        <span className="text-gray-500">Country:</span> {currentLocation.country}
                      </p>
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
                        <span className="font-medium">
                          {new Date(eta).toLocaleDateString('ro-RO')}
                        </span>
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
