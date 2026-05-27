import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import trackingService, { FleetContainer, AmbientVessel } from '../services/tracking';
import { formatDateShort } from '../utils/formatters';

const POLL_MS = 5000;

/**
 * Container marker — distinct, branded, with rotation by heading/cog
 * so the operator can tell at a glance which way the vessel is heading.
 */
function containerIcon(rotation: number, isLive: boolean): L.DivIcon {
  const color = isLive ? '#0d9488' : '#64748b';
  const ring = isLive ? '#5eead4' : '#cbd5e1';
  return new L.DivIcon({
    className: '',
    html: `<div style="transform: rotate(${rotation}deg); filter: drop-shadow(0 2px 4px rgba(0,0,0,.3));">
      <svg width="34" height="34" viewBox="0 0 34 34" xmlns="http://www.w3.org/2000/svg">
        <circle cx="17" cy="17" r="14" fill="${color}" stroke="${ring}" stroke-width="2"/>
        <path d="M17 5 L23 18 L17 15 L11 18 Z" fill="white"/>
      </svg>
    </div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
}

function statusColor(status?: string | null): string {
  switch (status) {
    case 'DELIVERED':
      return 'bg-emerald-100 text-emerald-800';
    case 'IN_TRANSIT':
    case 'LOADED':
      return 'bg-blue-100 text-blue-800';
    case 'PENDING_REVIEW':
      return 'bg-amber-100 text-amber-800';
    case 'DELAYED':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-neutral-100 text-neutral-700';
  }
}

const FitToFleet: React.FC<{ points: Array<[number, number]> }> = ({ points }) => {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 5);
      return;
    }
    map.fitBounds(L.latLngBounds(points), { padding: [60, 60] });
  }, [map, points]);
  return null;
};

const FleetMap: React.FC = () => {
  const [fleet, setFleet] = useState<FleetContainer[]>([]);
  const [ambient, setAmbient] = useState<AmbientVessel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [showAmbient, setShowAmbient] = useState(true);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const load = async () => {
    try {
      const data = await trackingService.getFleetLive();
      setFleet(data.fleet);
      setAmbient(data.ambient);
      setFetchedAt(data.fetchedAt);
      setError(null);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Eroare la încărcarea flotei');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    pollRef.current = setInterval(load, POLL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const liveCount = fleet.filter((c) => c.position?.source === 'AIS_LIVE').length;
  const lastKnownCount = fleet.filter((c) => c.position?.source === 'LAST_KNOWN').length;
  const noPositionCount = fleet.filter((c) => !c.position).length;

  const fleetPoints = useMemo(
    () =>
      fleet
        .filter((c) => c.position)
        .map((c) => [c.position!.latitude, c.position!.longitude] as [number, number]),
    [fleet]
  );

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col">
      {/* HUD */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-3 border-b border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-neutral-800 dark:text-neutral-100">
            🚢 Hartă Flotă — Live
          </h1>
          <div className="flex items-center gap-3 text-xs">
            <span className="px-2 py-1 rounded bg-emerald-50 text-emerald-700 font-medium">
              ● {liveCount} LIVE AIS
            </span>
            <span className="px-2 py-1 rounded bg-slate-100 text-slate-700 font-medium">
              ● {lastKnownCount} ultima poziție cunoscută
            </span>
            {noPositionCount > 0 && (
              <span className="px-2 py-1 rounded bg-amber-50 text-amber-700 font-medium">
                ● {noPositionCount} fără poziție
              </span>
            )}
            <span className="px-2 py-1 rounded bg-sky-50 text-sky-700 font-medium">
              ● {ambient.length} nave globale în zonă
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-neutral-600 dark:text-neutral-400">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showAmbient}
              onChange={(e) => setShowAmbient(e.target.checked)}
              className="rounded"
            />
            <span>Afișează tot traficul AIS</span>
          </label>
          {fetchedAt && <span>Actualizat: {new Date(fetchedAt).toLocaleTimeString('ro-RO')}</span>}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 px-6 py-2 text-sm border-b border-red-200">
          {error}
        </div>
      )}

      {/* Map */}
      <div className="flex-1 relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center z-[500] bg-white/50 dark:bg-neutral-900/50">
            <div className="text-sm text-neutral-600">Se încarcă flota...</div>
          </div>
        )}
        <MapContainer
          center={[38, 28]}
          zoom={4}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <TileLayer
            attribution='&copy; <a href="https://www.openseamap.org">OpenSeaMap</a>'
            url="https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png"
            opacity={0.85}
          />

          {fleetPoints.length > 0 && <FitToFleet points={fleetPoints} />}

          {/* Background: every active AIS vessel in the trade-route bbox */}
          {showAmbient &&
            ambient.map((v) => (
              <CircleMarker
                key={`amb-${v.mmsi}`}
                center={[v.lat, v.lng]}
                radius={2}
                pathOptions={{
                  color: '#0ea5e9',
                  fillColor: '#0ea5e9',
                  fillOpacity: 0.6,
                  weight: 0,
                }}
              >
                <Popup>
                  <div className="text-xs">
                    <div className="font-semibold">{v.name || '(navă fără nume)'}</div>
                    <div className="text-neutral-500">MMSI {v.mmsi}</div>
                    <div className="text-neutral-500">
                      {v.sog?.toFixed(1)} kn · cog {v.cog?.toFixed(0)}°
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            ))}

          {/* Foreground: user's containers */}
          {fleet
            .filter((c) => c.position)
            .map((c) => {
              const isLive = c.position!.source === 'AIS_LIVE';
              const rotation = c.position!.heading ?? c.position!.cog ?? 0;
              return (
                <Marker
                  key={c.containerId}
                  position={[c.position!.latitude, c.position!.longitude]}
                  icon={containerIcon(rotation, isLive)}
                >
                  <Popup minWidth={260}>
                    <div className="text-sm space-y-2 min-w-[240px]">
                      <div className="flex items-center justify-between gap-2 border-b pb-2">
                        <div>
                          <div className="font-bold text-base">📦 {c.containerNumber}</div>
                          {c.blNumber && (
                            <div className="text-xs text-neutral-500">B/L: {c.blNumber}</div>
                          )}
                        </div>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(c.currentStatus)}`}
                        >
                          {c.currentStatus || 'N/A'}
                        </span>
                      </div>

                      <div>
                        <div className="text-xs text-neutral-500">Navă</div>
                        <div className="font-semibold">🚢 {c.vessel.name || '(necunoscută)'}</div>
                        <div className="text-xs text-neutral-500">
                          MMSI {c.vessel.mmsi}
                          {c.vessel.imo ? ` · IMO ${c.vessel.imo}` : ''}
                        </div>
                      </div>

                      {isLive ? (
                        <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded px-2 py-1">
                          <div className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold mb-1">
                            ● LIVE AIS
                          </div>
                          <div className="text-xs grid grid-cols-2 gap-x-3 gap-y-0.5">
                            <span className="text-neutral-500">Viteză</span>
                            <span className="font-medium">{c.position!.sog?.toFixed(1)} kn</span>
                            <span className="text-neutral-500">Curs</span>
                            <span className="font-medium">{c.position!.cog?.toFixed(0)}°</span>
                            {c.position!.destination && (
                              <>
                                <span className="text-neutral-500">Dest. AIS</span>
                                <span className="font-medium truncate">
                                  {c.position!.destination}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="bg-slate-50 dark:bg-slate-800 rounded px-2 py-1 text-xs text-slate-600 dark:text-slate-300">
                          ● Ultima poziție cunoscută
                          {c.position!.timestamp && (
                            <span className="ml-1 text-slate-400">
                              ({new Date(c.position!.timestamp).toLocaleString('ro-RO')})
                            </span>
                          )}
                        </div>
                      )}

                      {c.booking && (
                        <div className="text-xs border-t pt-2">
                          {c.booking.client && (
                            <div>
                              <span className="text-neutral-500">Client:</span>{' '}
                              <span className="font-medium">{c.booking.client}</span>
                            </div>
                          )}
                          {(c.booking.origin || c.booking.destination) && (
                            <div>
                              <span className="text-neutral-500">Rută:</span>{' '}
                              <span className="font-medium">
                                {c.booking.origin || '?'} → {c.booking.destination || '?'}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {c.eta && (
                        <div className="text-xs border-t pt-2">
                          <span className="text-neutral-500">ETA:</span>{' '}
                          <span className="font-medium">{formatDateShort(c.eta)}</span>
                        </div>
                      )}

                      {c.lastEvent && (
                        <div className="text-xs border-t pt-2 text-neutral-500">
                          Ultimul eveniment:{' '}
                          <span className="text-neutral-700 dark:text-neutral-200 font-medium">
                            {c.lastEvent.eventType}
                          </span>{' '}
                          la {c.lastEvent.location}
                        </div>
                      )}

                      <a
                        href={`/?tab=tracking&container=${c.containerNumber}`}
                        className="block text-xs text-primary-600 hover:text-primary-700 font-medium pt-1"
                      >
                        Vezi detalii complete →
                      </a>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
        </MapContainer>
      </div>
    </div>
  );
};

export default FleetMap;
