import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Card } from '../../ui/Card';

// Port coordinates lookup (common origin/destination ports)
const PORT_COORDS: Record<string, [number, number]> = {
  Shanghai: [31.2304, 121.4737],
  Ningbo: [29.8683, 121.544],
  Shenzhen: [22.5431, 114.0579],
  Guangzhou: [23.1291, 113.2644],
  Tianjin: [39.3434, 117.3616],
  Qingdao: [36.0986, 120.3719],
  Constanta: [44.1766, 28.6354],
  Constanța: [44.1766, 28.6354],
  Chisinau: [47.0105, 28.8638],
  Chișinău: [47.0105, 28.8638],
  Hamburg: [53.5753, 9.9294],
  Rotterdam: [51.9225, 4.4792],
};

function getCoords(portName: string): [number, number] | null {
  if (!portName) return null;
  // Exact match
  if (PORT_COORDS[portName]) return PORT_COORDS[portName];
  // Case-insensitive partial match
  const key = Object.keys(PORT_COORDS).find(
    (k) => k.toLowerCase() === portName.toLowerCase() || portName.toLowerCase().includes(k.toLowerCase())
  );
  return key ? PORT_COORDS[key] : null;
}

// Port marker icon
const portIcon = new L.DivIcon({
  className: '',
  html: `<div style="
    width: 14px; height: 14px;
    background: #1e40af;
    border: 2px solid #fff;
    border-radius: 50%;
    box-shadow: 0 1px 4px rgba(0,0,0,0.4);
  "></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

// Current position (container) icon
const containerIcon = new L.DivIcon({
  className: '',
  html: `<div style="
    font-size: 24px;
    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
    transform: translateX(-50%) translateY(-50%);
  ">🚢</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

// Final destination icon
const destIcon = new L.DivIcon({
  className: '',
  html: `<div style="
    width: 14px; height: 14px;
    background: #16a34a;
    border: 2px solid #fff;
    border-radius: 50%;
    box-shadow: 0 1px 4px rgba(0,0,0,0.4);
  "></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

// Auto-fit bounds
const FitBounds: React.FC<{ positions: [number, number][] }> = ({ positions }) => {
  const map = useMap();
  useEffect(() => {
    if (positions.length >= 2) {
      const bounds = L.latLngBounds(positions);
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [map, positions]);
  return null;
};

export interface BookingRouteMapProps {
  portOrigin?: string | null;
  portDestination?: string | null;
  finalDestination?: string | null; // e.g. "Chișinău"
  currentLat?: number | null;
  currentLng?: number | null;
}

const BookingRouteMap: React.FC<BookingRouteMapProps> = ({
  portOrigin,
  portDestination,
  finalDestination,
  currentLat,
  currentLng,
}) => {
  const originCoords = portOrigin ? getCoords(portOrigin) : null;
  const destCoords = portDestination ? getCoords(portDestination) : null;
  const finalCoords = finalDestination ? getCoords(finalDestination) : null;
  const hasCurrentPos = currentLat != null && currentLng != null;

  const routePoints: [number, number][] = [];
  if (originCoords) routePoints.push(originCoords);
  if (hasCurrentPos) routePoints.push([currentLat!, currentLng!]);
  if (destCoords) routePoints.push(destCoords);
  if (finalCoords) routePoints.push(finalCoords);

  // Default center: middle of route, or Europe
  const defaultCenter: [number, number] =
    originCoords && destCoords
      ? [
          (originCoords[0] + destCoords[0]) / 2,
          (originCoords[1] + destCoords[1]) / 2,
        ]
      : [47.0, 28.0];

  const noData = routePoints.length < 2;

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-base font-semibold text-neutral-700 dark:text-neutral-200">
          Hartă Traseu Container
        </h4>
        {!hasCurrentPos && (
          <span className="text-xs text-neutral-400 dark:text-neutral-500 bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded">
            Poziție nedisponibilă
          </span>
        )}
      </div>

      {noData ? (
        <div className="flex items-center justify-center h-48 bg-neutral-50 dark:bg-neutral-800 rounded-lg text-sm text-neutral-400">
          Date de traseu insuficiente
        </div>
      ) : (
        <div className="rounded-lg overflow-hidden" style={{ height: 320 }}>
          <MapContainer
            center={defaultCenter}
            zoom={3}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Fit bounds automatically */}
            {routePoints.length >= 2 && <FitBounds positions={routePoints} />}

            {/* Route polyline */}
            {routePoints.length >= 2 && (
              <Polyline
                positions={routePoints}
                pathOptions={{ color: '#1e40af', weight: 3, dashArray: '8 4', opacity: 0.8 }}
              />
            )}

            {/* Origin port marker */}
            {originCoords && (
              <Marker position={originCoords} icon={portIcon}>
                <Popup>
                  <strong>Port Origine</strong>
                  <br />
                  {portOrigin}
                </Popup>
              </Marker>
            )}

            {/* Current container position */}
            {hasCurrentPos && (
              <Marker position={[currentLat!, currentLng!]} icon={containerIcon}>
                <Popup>
                  <strong>Poziție Curentă Container</strong>
                  <br />
                  {currentLat!.toFixed(4)}, {currentLng!.toFixed(4)}
                </Popup>
              </Marker>
            )}

            {/* Destination port marker */}
            {destCoords && (
              <Marker position={destCoords} icon={portIcon}>
                <Popup>
                  <strong>Port Destinație</strong>
                  <br />
                  {portDestination}
                </Popup>
              </Marker>
            )}

            {/* Final destination marker */}
            {finalCoords && finalDestination !== portDestination && (
              <Marker position={finalCoords} icon={destIcon}>
                <Popup>
                  <strong>Destinație Finală</strong>
                  <br />
                  {finalDestination}
                </Popup>
              </Marker>
            )}
          </MapContainer>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 text-xs text-neutral-500 dark:text-neutral-400 flex-wrap">
        {portOrigin && (
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-700 border border-white shadow-sm" />
            <span>{portOrigin}</span>
          </div>
        )}
        {portDestination && (
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-700 border border-white shadow-sm" />
            <span>{portDestination}</span>
          </div>
        )}
        {finalDestination && finalDestination !== portDestination && (
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-green-600 border border-white shadow-sm" />
            <span>{finalDestination}</span>
          </div>
        )}
        {hasCurrentPos && (
          <div className="flex items-center gap-1.5">
            <span>🚢</span>
            <span>Poziție curentă</span>
          </div>
        )}
      </div>
    </Card>
  );
};

export default BookingRouteMap;
