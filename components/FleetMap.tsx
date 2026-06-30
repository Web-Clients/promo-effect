import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import trackingService, { FleetContainer, AmbientVessel } from '../services/tracking';
import { formatDateShort } from '../utils/formatters';

const POLL_MS = 5000;
const ANIM_MS = 1000; // dead-reckoning animation tick

/**
 * Dead-reckoning: project a vessel's position forward from its last AIS
 * fix using speed-over-ground + course-over-ground. This is what makes
 * ships glide smoothly between AIS reports (which arrive every ~30s–3min)
 * instead of teleporting on each poll — the same visual trick MarineTraffic
 * and VesselFinder use.
 */
function project(
  lat: number,
  lng: number,
  sogKnots: number,
  cogDeg: number,
  elapsedSec: number
): [number, number] {
  if (!sogKnots || sogKnots < 0.3 || cogDeg == null) return [lat, lng];
  const distanceNm = sogKnots * (elapsedSec / 3600);
  const dLatDeg = (distanceNm / 60) * Math.cos((cogDeg * Math.PI) / 180);
  const cosLat = Math.cos((lat * Math.PI) / 180) || 1e-6;
  const dLngDeg = ((distanceNm / 60) * Math.sin((cogDeg * Math.PI) / 180)) / cosLat;
  return [lat + dLatDeg, lng + dLngDeg];
}

interface DRBaseline {
  lat: number;
  lng: number;
  sog: number;
  cog: number;
  t0: number; // ms when this fix was observed locally
}

/**
 * Container marker — distinct, branded, with rotation by heading/cog
 * so the operator can tell at a glance which way the vessel is heading.
 */
function containerIcon(rotation: number, source: string): L.DivIcon {
  // Visual hierarchy:
  //  - AIS_LIVE   → bright teal, full opacity, rotated triangle (live arrow)
  //  - LAST_KNOWN → slate, rotated arrow
  //  - LAST_EVENT → indigo, rotated arrow
  //  - PORT_FALLBACK → amber dot (no rotation — at port)
  const styles: Record<string, { color: string; ring: string }> = {
    AIS_LIVE: { color: '#0d9488', ring: '#5eead4' },
    LAST_KNOWN: { color: '#64748b', ring: '#cbd5e1' },
    LAST_EVENT: { color: '#6366f1', ring: '#c7d2fe' },
    PORT_FALLBACK: { color: '#d97706', ring: '#fcd34d' },
  };
  const { color, ring } = styles[source] || styles.LAST_KNOWN;
  const rot = source === 'PORT_FALLBACK' ? 0 : rotation;
  return new L.DivIcon({
    className: '',
    html: `<div style="transform: rotate(${rot}deg); filter: drop-shadow(0 2px 4px rgba(0,0,0,.3));">
      <svg width="28" height="28" viewBox="0 0 34 34" xmlns="http://www.w3.org/2000/svg">
        <circle cx="17" cy="17" r="13" fill="${color}" stroke="${ring}" stroke-width="2"/>
        <path d="M17 6 L23 19 L17 16 L11 19 Z" fill="white"/>
      </svg>
    </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
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

// Fits the map to the fleet ONCE on first data load. After that the
// presenter stays in control of pan/zoom — the 5s polling refresh must
// never yank the viewport back (that would make the map unusable during
// a live demo while zoomed into a specific ship).
const FitToFleet: React.FC<{ points: Array<[number, number]>; onDone: () => void }> = ({
  points,
  onDone,
}) => {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 5);
    } else {
      map.fitBounds(L.latLngBounds(points), { padding: [60, 60] });
    }
    onDone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
};

const FleetMap: React.FC = () => {
  const [fleet, setFleet] = useState<FleetContainer[]>([]);
  const [ambient, setAmbient] = useState<AmbientVessel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [showAmbient, setShowAmbient] = useState(true);
  const [hasFitted, setHasFitted] = useState(false);
  // Dead-reckoning projected display positions: containerId -> [lat,lng]
  const [drPositions, setDrPositions] = useState<Record<string, [number, number]>>({});
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const animRef = useRef<NodeJS.Timeout | null>(null);
  // Per-vessel baseline used to project motion between AIS fixes
  const baselines = useRef<Record<string, DRBaseline>>({});

  const load = async () => {
    try {
      const data = await trackingService.getFleetLive();
      setFleet(data.fleet);
      setAmbient(data.ambient);
      setFetchedAt(data.fetchedAt);
      setError(null);

      // Refresh dead-reckoning baselines for live vessels. Reset t0 only
      // when the underlying AIS fix actually changed, so projection stays
      // continuous across polls that returned the same fix.
      const now = Date.now();
      const next = { ...baselines.current };
      for (const f of data.fleet) {
        const p = f.position;
        if (!p || p.source !== 'AIS_LIVE' || p.sog == null) continue;
        const prev = next[f.containerId];
        const fixChanged = !prev || prev.lat !== p.latitude || prev.lng !== p.longitude;
        if (fixChanged) {
          next[f.containerId] = {
            lat: p.latitude,
            lng: p.longitude,
            sog: p.sog || 0,
            cog: p.cog ?? p.heading ?? 0,
            t0: now,
          };
        }
      }
      // Drop baselines for vessels no longer live
      const liveIds = new Set(
        data.fleet.filter((f) => f.position?.source === 'AIS_LIVE').map((f) => f.containerId)
      );
      for (const id of Object.keys(next)) if (!liveIds.has(id)) delete next[id];
      baselines.current = next;
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Eroare la încărcarea flotei');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    pollRef.current = setInterval(load, POLL_MS);
    // Animation loop: project each live vessel forward every second
    animRef.current = setInterval(() => {
      const now = Date.now();
      const projected: Record<string, [number, number]> = {};
      for (const [id, b] of Object.entries(baselines.current)) {
        projected[id] = project(b.lat, b.lng, b.sog, b.cog, (now - b.t0) / 1000);
      }
      setDrPositions(projected);
    }, ANIM_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (animRef.current) clearInterval(animRef.current);
    };
  }, []);

  const liveCount = fleet.filter((c) => c.position?.source === 'AIS_LIVE').length;
  const lastKnownCount = fleet.filter(
    (c) => c.position?.source === 'LAST_KNOWN' || c.position?.source === 'LAST_EVENT'
  ).length;
  const portFallbackCount = fleet.filter((c) => c.position?.source === 'PORT_FALLBACK').length;
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
      {/* Smooth glide for live vessel markers (matches the 1s DR tick) */}
      <style>{`.leaflet-marker-icon{transition:transform ${ANIM_MS}ms linear;}`}</style>
      {/* HUD — wraps to multiple rows on mobile */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-2 sm:py-3 border-b border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900">
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 min-w-0">
          <h1 className="text-base sm:text-xl font-bold text-neutral-800 dark:text-neutral-100 whitespace-nowrap">
            🚢 Hartă Flotă <span className="hidden sm:inline">— Live</span>
          </h1>
          <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs flex-wrap">
            <span className="px-2 py-1 rounded bg-emerald-50 text-emerald-700 font-medium">
              ● {liveCount} live AIS
            </span>
            <span className="px-2 py-1 rounded bg-slate-100 text-slate-700 font-medium">
              ● {lastKnownCount} ultima poziție
            </span>
            {portFallbackCount > 0 && (
              <span className="px-2 py-1 rounded bg-amber-50 text-amber-700 font-medium">
                ● {portFallbackCount} la port (fallback)
              </span>
            )}
            {noPositionCount > 0 && (
              <span className="px-2 py-1 rounded bg-red-50 text-red-700 font-medium">
                ● {noPositionCount} fără poziție
              </span>
            )}
            <span className="px-2 py-1 rounded bg-sky-50 text-sky-700 font-medium">
              ● {ambient.length} nave globale în zonă
            </span>
            <span className="px-2 py-1 rounded bg-neutral-100 text-neutral-700 font-medium">
              Total flotă: {fleet.length}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-neutral-600 dark:text-neutral-400 flex-shrink-0">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showAmbient}
              onChange={(e) => setShowAmbient(e.target.checked)}
              className="rounded"
            />
            <span className="hidden sm:inline">Afișează tot traficul AIS</span>
            <span className="sm:hidden">AIS global</span>
          </label>
          {fetchedAt && (
            <span className="hidden md:inline">
              Actualizat: {new Date(fetchedAt).toLocaleTimeString('ro-RO')}
            </span>
          )}
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
          preferCanvas
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

          {fleetPoints.length > 0 && !hasFitted && (
            <FitToFleet points={fleetPoints} onDone={() => setHasFitted(true)} />
          )}

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
              // Use the dead-reckoning projected position for live vessels so
              // they glide smoothly; fall back to the raw AIS fix otherwise.
              const dr = isLive ? drPositions[c.containerId] : undefined;
              const markerPos: [number, number] = dr || [
                c.position!.latitude,
                c.position!.longitude,
              ];
              return (
                <Marker
                  key={c.containerId}
                  position={markerPos}
                  icon={containerIcon(rotation, c.position!.source)}
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
                      ) : c.position!.source === 'PORT_FALLBACK' ? (
                        <div className="bg-amber-50 dark:bg-amber-900/20 rounded px-2 py-1 text-xs text-amber-700 dark:text-amber-300">
                          ● La port: {c.position!.portName || '?'}
                          <div className="text-amber-600/70 mt-0.5">
                            (poziție aproximativă — atribuie MMSI pentru tracking live)
                          </div>
                        </div>
                      ) : (
                        <div className="bg-slate-50 dark:bg-slate-800 rounded px-2 py-1 text-xs text-slate-600 dark:text-slate-300">
                          ●{' '}
                          {c.position!.source === 'LAST_EVENT'
                            ? 'Ultimul eveniment înregistrat'
                            : 'Ultima poziție cunoscută'}
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

                      {c.booking?.id && (
                        <a
                          href={`/dashboard/bookings/${c.booking.id}`}
                          className="block text-xs text-primary-600 hover:text-primary-700 font-medium pt-1"
                        >
                          Vezi rezervarea →
                        </a>
                      )}
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
