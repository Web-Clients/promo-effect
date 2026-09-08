import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Map as MlMap,
  NavigationControl,
  LngLatBounds,
  type GeoJSONSource,
  type MapLayerMouseEvent,
} from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import trackingService, { FleetContainer, AmbientVessel } from '../services/tracking';

/**
 * Fleet globe — every container Promo-Efect is carrying, on a 3D Earth.
 *
 * Base map is OpenFreeMap's dark style: OpenMapTiles vectors plus Natural Earth
 * shaded relief, served without an API key, without a quota and without a bill.
 * That constraint is deliberate — a photorealistic 3D tile provider would look
 * better and would invoice per tile load, growing with every visitor.
 *
 * The honest part of this map is `position.source`. Terrestrial AIS receivers do
 * not reach the middle of the Indian Ocean and satellite AIS is not free, so a
 * China→Constanța voyage always has a gap of days. Rather than hide it behind a
 * smoothly moving dot, every vessel carries the age and provenance of its fix,
 * and anything not observed live is drawn dimmer and labelled as estimated.
 */

const STYLE_URL = 'https://tiles.openfreemap.org/styles/dark';
const POLL_MS = 15000;

interface SourceStyle {
  color: string;
  label: string;
  /** Whether the fix was actually observed, as opposed to inferred. */
  observed: boolean;
}

const SOURCE_STYLES: Record<string, SourceStyle> = {
  AIS_LIVE: { color: '#22d3ee', label: 'AIS live', observed: true },
  LAST_KNOWN: { color: '#f59e0b', label: 'Ultima poziție cunoscută', observed: false },
  LAST_EVENT: { color: '#a78bfa', label: 'Ultimul eveniment', observed: false },
  PORT_FALLBACK: { color: '#64748b', label: 'Estimat din port', observed: false },
};

const UNKNOWN_STYLE: SourceStyle = { color: '#475569', label: 'Fără poziție', observed: false };

function styleFor(source?: string | null): SourceStyle {
  return (source && SOURCE_STYLES[source]) || UNKNOWN_STYLE;
}

/** Human age of a fix, in the operator's language. */
function ageLabel(timestamp?: string | null): string {
  if (!timestamp) return 'necunoscut';
  const ms = Date.now() - new Date(timestamp).getTime();
  if (!Number.isFinite(ms) || ms < 0) return 'necunoscut';
  const min = Math.floor(ms / 60000);
  if (min < 1) return 'acum câteva secunde';
  if (min < 60) return `acum ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `acum ${h} h`;
  const d = Math.floor(h / 24);
  return `acum ${d} ${d === 1 ? 'zi' : 'zile'}`;
}

/**
 * A fix older than this is stale enough that the vessel has certainly moved on;
 * six hours is roughly 90 nautical miles at container-ship speed.
 */
const STALE_AFTER_MS = 6 * 60 * 60 * 1000;

function isStale(timestamp?: string | null): boolean {
  if (!timestamp) return true;
  return Date.now() - new Date(timestamp).getTime() > STALE_AFTER_MS;
}

// ─── Great-circle interpolation ──────────────────────────────────────────────

/**
 * Points along the great circle between two coordinates.
 *
 * A straight LineString between Ningbo and Constanța is not the route a ship
 * takes and, on a globe, does not even look like a path — it cuts through the
 * Earth. Interpolating on the sphere gives the arc the eye expects.
 */
function greatCircle(from: [number, number], to: [number, number], steps = 64): [number, number][] {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;

  const [lon1, lat1] = [toRad(from[0]), toRad(from[1])];
  const [lon2, lat2] = [toRad(to[0]), toRad(to[1])];

  const d =
    2 *
    Math.asin(
      Math.sqrt(
        Math.sin((lat2 - lat1) / 2) ** 2 +
          Math.cos(lat1) * Math.cos(lat2) * Math.sin((lon2 - lon1) / 2) ** 2
      )
    );
  if (!Number.isFinite(d) || d === 0) return [from, to];

  const out: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const f = i / steps;
    const a = Math.sin((1 - f) * d) / Math.sin(d);
    const b = Math.sin(f * d) / Math.sin(d);
    const x = a * Math.cos(lat1) * Math.cos(lon1) + b * Math.cos(lat2) * Math.cos(lon2);
    const y = a * Math.cos(lat1) * Math.sin(lon1) + b * Math.cos(lat2) * Math.sin(lon2);
    const z = a * Math.sin(lat1) + b * Math.sin(lat2);
    out.push([toDeg(Math.atan2(y, x)), toDeg(Math.atan2(z, Math.sqrt(x * x + y * y)))]);
  }
  return out;
}

// ─── Icons drawn at runtime ──────────────────────────────────────────────────

/**
 * A chevron pointing north, tinted white so `icon-color` can recolour it per
 * feature. Drawn rather than shipped as an asset so there is nothing to load.
 */
function chevronImage(size = 64): ImageData {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, size, size);
  ctx.beginPath();
  ctx.moveTo(size / 2, size * 0.12);
  ctx.lineTo(size * 0.82, size * 0.86);
  ctx.lineTo(size / 2, size * 0.68);
  ctx.lineTo(size * 0.18, size * 0.86);
  ctx.closePath();
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  return ctx.getImageData(0, 0, size, size);
}

// ─── GeoJSON builders ────────────────────────────────────────────────────────

type FC = GeoJSON.FeatureCollection<GeoJSON.Geometry, Record<string, unknown>>;

const EMPTY: FC = { type: 'FeatureCollection', features: [] };

function vesselFeatures(fleet: FleetContainer[]): FC {
  return {
    type: 'FeatureCollection',
    features: fleet
      .filter((c) => c.position)
      .map((c) => {
        const p = c.position!;
        const st = styleFor(p.source);
        return {
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: [p.longitude, p.latitude] },
          properties: {
            containerId: c.containerId,
            containerNumber: c.containerNumber,
            vesselName: c.vessel?.name || 'Navă necunoscută',
            color: st.color,
            // cog is the direction actually made good; heading is where the bow
            // points. Prefer cog, fall back to heading, then to north.
            rotation: p.cog ?? p.heading ?? 0,
            observed: st.observed ? 1 : 0,
            stale: isStale(p.timestamp) ? 1 : 0,
          },
        };
      }),
  };
}

function routeFeatures(fleet: FleetContainer[]): FC {
  const features: FC['features'] = [];
  for (const c of fleet) {
    const b = c.booking;
    if (!b?.originCoords || !c.position) continue;

    const legs: [number, number][][] = [];
    const origin: [number, number] = [b.originCoords.lng, b.originCoords.lat];
    const here: [number, number] = [c.position.longitude, c.position.latitude];

    legs.push(greatCircle(origin, here));

    const ahead = b.transitCoords || b.destinationCoords;
    if (ahead) legs.push(greatCircle(here, [ahead.lng, ahead.lat]));

    legs.forEach((coords, i) => {
      features.push({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: coords },
        properties: {
          containerId: c.containerId,
          // The leg already sailed is solid; the leg ahead is a projection.
          sailed: i === 0 ? 1 : 0,
          color: styleFor(c.position?.source).color,
        },
      });
    });
  }
  return { type: 'FeatureCollection', features };
}

/**
 * The ports the fleet is sailing between, deduplicated.
 *
 * An arc with nothing at either end says where a ship is but not what it is
 * doing; anchoring the route to a named port is what makes it read as a voyage.
 */
function portFeatures(fleet: FleetContainer[]): FC {
  const seen = new Map<string, { lng: number; lat: number; name: string; role: string }>();
  for (const c of fleet) {
    const b = c.booking;
    if (!b) continue;
    const ends: [typeof b.originCoords, string][] = [
      [b.originCoords, 'origine'],
      [b.transitCoords, 'tranzit'],
      [b.destinationCoords, 'destinație'],
    ];
    for (const [coords, role] of ends) {
      if (!coords) continue;
      const key = `${coords.lng},${coords.lat}`;
      if (!seen.has(key)) seen.set(key, { ...coords, role });
    }
  }
  return {
    type: 'FeatureCollection',
    features: [...seen.values()].map((p) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [p.lng, p.lat] },
      properties: { name: p.name, role: p.role },
    })),
  };
}

function ambientFeatures(ambient: AmbientVessel[]): FC {
  return {
    type: 'FeatureCollection',
    features: ambient.map((v) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [v.lng, v.lat] },
      properties: { rotation: v.cog ?? v.heading ?? 0 },
    })),
  };
}

/**
 * OpenFreeMap's dark style paints land at rgb(12,12,12) and water at
 * rgb(27,27,29) — a 6% difference that is invisible on most screens, so the
 * globe reads as one black disc. Separating them costs nothing and is the
 * difference between a map and a silhouette.
 *
 * The same pass thins the basemap's own labelling. The style is built for
 * someone reading a country; this view is for someone finding a ship, and every
 * province name is one more thing between the operator and the vessel.
 */
function retintForContrast(map: MlMap) {
  const set = (layer: string, prop: string, value: string) => {
    if (map.getLayer(layer)) {
      try {
        map.setPaintProperty(layer, prop as never, value as never);
      } catch {
        /* the upstream style may drop a layer; never let cosmetics break the map */
      }
    }
  };

  // Drop sub-national labelling entirely; dim what survives.
  for (const layer of map.getStyle().layers ?? []) {
    if (layer.type !== 'symbol') continue;
    const id = layer.id;
    const isNoise =
      id.startsWith('place_') &&
      !/country|continent|capital/.test(id) &&
      !/place_city|place_town/.test(id);
    if (isNoise) {
      try {
        map.setLayoutProperty(id, 'visibility', 'none');
      } catch {
        /* ignore */
      }
    }
  }
  set('place_country_2', 'text-color', '#7c8ea6');
  set('place_country_1', 'text-color', '#7c8ea6');
  set('place_country_other', 'text-color', '#64748b');

  set('background', 'background-color', '#18222f'); // land
  set('water', 'fill-color', '#061525'); // sea
  set('waterway', 'line-color', '#0b2035');
  set('landcover_wood', 'fill-color', '#1b2a33');
  set('landuse_park', 'fill-color', '#1b2a33');
  set('boundary_country_z0-4', 'line-color', '#3f5573');
  set('boundary_country_z5-', 'line-color', '#3f5573');
  set('boundary_state', 'line-color', '#2b3b52');
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function FleetGlobe() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MlMap | null>(null);
  const readyRef = useRef(false);
  const fittedRef = useRef(false);

  const [fleet, setFleet] = useState<FleetContainer[]>([]);
  const [ambient, setAmbient] = useState<AmbientVessel[]>([]);
  const [selected, setSelected] = useState<FleetContainer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [showAmbient, setShowAmbient] = useState(true);
  // Data usually arrives before the style finishes loading. Without this the
  // first (and often only) payload is dropped and the globe stays empty.
  const [mapReady, setMapReady] = useState(false);

  const fleetRef = useRef<FleetContainer[]>([]);
  fleetRef.current = fleet;

  // ── Data ───────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    try {
      const res = await trackingService.getFleetLive();
      setFleet(res.fleet || []);
      setAmbient(res.ambient || []);
      setFetchedAt(res.fetchedAt || new Date().toISOString());
      setError(null);
    } catch {
      setError('Nu am putut încărca pozițiile flotei.');
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  // ── Map ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new MlMap({
      container: containerRef.current,
      style: STYLE_URL,
      center: [60, 25],
      zoom: 1.6,
      attributionControl: { compact: true },
    });
    mapRef.current = map;

    map.addControl(new NavigationControl({ visualizePitch: true }), 'top-left');

    map.on('load', () => {
      // Globe rather than a flat sheet: the whole point of the view is that a
      // container is crossing a planet, not a rectangle.
      try {
        map.setProjection({ type: 'globe' });
      } catch {
        /* older renderer: stay on mercator rather than fail to draw */
      }

      map.setSky({
        'sky-color': '#0b1220',
        'horizon-color': '#1e293b',
        'fog-color': '#0b1220',
        'fog-ground-blend': 0.6,
      });

      if (!map.hasImage('vessel-chevron')) {
        map.addImage('vessel-chevron', chevronImage(), { sdf: true });
      }

      map.addSource('ambient', { type: 'geojson', data: EMPTY });
      map.addSource('routes', { type: 'geojson', data: EMPTY });
      map.addSource('ports', { type: 'geojson', data: EMPTY });
      map.addSource('vessels', { type: 'geojson', data: EMPTY });

      // Background AIS traffic: context, deliberately faint.
      map.addLayer({
        id: 'ambient-dots',
        type: 'circle',
        source: 'ambient',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 1, 1.1, 6, 2.4],
          'circle-color': '#38bdf8',
          'circle-opacity': 0.28,
        },
      });

      map.addLayer({
        id: 'route-ahead',
        type: 'line',
        source: 'routes',
        filter: ['==', ['get', 'sailed'], 0],
        layout: { 'line-cap': 'round' },
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 1.4,
          'line-opacity': 0.45,
          'line-dasharray': [2, 2.5],
        },
      });

      map.addLayer({
        id: 'route-sailed',
        type: 'line',
        source: 'routes',
        filter: ['==', ['get', 'sailed'], 1],
        layout: { 'line-cap': 'round' },
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 2,
          'line-opacity': 0.85,
        },
      });

      map.addLayer({
        id: 'port-rings',
        type: 'circle',
        source: 'ports',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 1, 3.5, 6, 6],
          'circle-color': 'transparent',
          'circle-stroke-color': '#94a3b8',
          'circle-stroke-width': 1.4,
          'circle-stroke-opacity': 0.85,
        },
      });

      map.addLayer({
        id: 'port-labels',
        type: 'symbol',
        source: 'ports',
        layout: {
          'text-field': ['get', 'name'],
          'text-size': 11,
          'text-offset': [0, -1.3],
          'text-anchor': 'bottom',
        },
        paint: {
          'text-color': '#cbd5e1',
          'text-halo-color': '#020617',
          'text-halo-width': 1.4,
        },
      });

      // Halo under each vessel, brighter when the fix was actually observed.
      map.addLayer({
        id: 'vessel-halo',
        type: 'circle',
        source: 'vessels',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 1, 9, 6, 16],
          'circle-color': ['get', 'color'],
          'circle-opacity': ['case', ['==', ['get', 'observed'], 1], 0.28, 0.14],
          'circle-blur': 0.8,
        },
      });

      map.addLayer({
        id: 'vessel-icons',
        type: 'symbol',
        source: 'vessels',
        layout: {
          'icon-image': 'vessel-chevron',
          'icon-size': ['interpolate', ['linear'], ['zoom'], 1, 0.28, 6, 0.5],
          'icon-rotate': ['get', 'rotation'],
          'icon-rotation-alignment': 'map',
          'icon-allow-overlap': true,
        },
        paint: {
          'icon-color': ['get', 'color'],
          'icon-opacity': ['case', ['==', ['get', 'stale'], 1], 0.6, 1],
        },
      });

      map.addLayer({
        id: 'vessel-labels',
        type: 'symbol',
        source: 'vessels',
        layout: {
          'text-field': ['get', 'containerNumber'],
          'text-size': 11,
          'text-offset': [0, 1.5],
          'text-anchor': 'top',
          'text-allow-overlap': false,
        },
        paint: {
          'text-color': '#e2e8f0',
          'text-halo-color': '#020617',
          'text-halo-width': 1.4,
        },
      });

      const pick = (e: MapLayerMouseEvent) => {
        const id = e.features?.[0]?.properties?.containerId as string | undefined;
        if (!id) return;
        const hit = fleetRef.current.find((c) => c.containerId === id) || null;
        setSelected(hit);
        if (hit?.position) {
          map.flyTo({
            center: [hit.position.longitude, hit.position.latitude],
            zoom: Math.max(map.getZoom(), 4),
            duration: 900,
          });
        }
      };
      map.on('click', 'vessel-icons', pick);
      map.on('click', 'vessel-halo', pick);

      for (const layer of ['vessel-icons', 'vessel-halo']) {
        map.on('mouseenter', layer, () => (map.getCanvas().style.cursor = 'pointer'));
        map.on('mouseleave', layer, () => (map.getCanvas().style.cursor = ''));
      }

      retintForContrast(map);

      readyRef.current = true;
      map.resize();
      setMapReady(true);

      // Dev-only handle. MapLibre draws its labels into the canvas, so a browser
      // test has no DOM node to click; with this it can project a known lat/lng
      // to a pixel and click the vessel itself. Stripped from production builds.
      if (import.meta.env.DEV) {
        (window as unknown as { __fleetGlobeMap?: MlMap }).__fleetGlobeMap = map;
      }
    });

    // The map is created while the dashboard is still laying out, so at init the
    // container is often zero-high and the canvas sticks at its fallback size —
    // a full-width, 300px-tall, blank globe. Watch the box instead of guessing.
    const ro = new ResizeObserver(() => map.resize());
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      readyRef.current = false;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // ── Push data into the map ─────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;

    (map.getSource('vessels') as GeoJSONSource | undefined)?.setData(vesselFeatures(fleet));
    (map.getSource('routes') as GeoJSONSource | undefined)?.setData(routeFeatures(fleet));
    (map.getSource('ports') as GeoJSONSource | undefined)?.setData(portFeatures(fleet));

    if (fittedRef.current) return;
    const positioned = fleet.filter((c) => c.position);
    if (positioned.length === 0) return;

    // Fit once. Refitting on every poll would fight the operator's own panning.
    const bounds = new LngLatBounds();
    for (const c of positioned) {
      bounds.extend([c.position!.longitude, c.position!.latitude]);
      const b = c.booking;
      if (b?.originCoords) bounds.extend([b.originCoords.lng, b.originCoords.lat]);
      if (b?.destinationCoords) bounds.extend([b.destinationCoords.lng, b.destinationCoords.lat]);
    }
    map.fitBounds(bounds, { padding: 90, maxZoom: 4, duration: 1200 });
    fittedRef.current = true;
  }, [fleet, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    (map.getSource('ambient') as GeoJSONSource | undefined)?.setData(
      showAmbient ? ambientFeatures(ambient) : EMPTY
    );
  }, [ambient, showAmbient, mapReady]);

  // ── Counters ───────────────────────────────────────────────────────────────
  const counts = useMemo(() => {
    const out = { live: 0, stale: 0, none: 0 };
    for (const c of fleet) {
      if (!c.position) out.none++;
      else if (c.position.source === 'AIS_LIVE' && !isStale(c.position.timestamp)) out.live++;
      else out.stale++;
    }
    return out;
  }, [fleet]);

  return (
    <div className="flex flex-col gap-3">
      <header className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-700/60 bg-slate-900/80 px-4 py-3">
        <h1 className="text-lg font-semibold text-slate-100">Hartă Flotă — Live</h1>

        <Pill color="#22d3ee">{counts.live} AIS live</Pill>
        <Pill color="#f59e0b">{counts.stale} poziție estimată</Pill>
        {counts.none > 0 && <Pill color="#475569">{counts.none} fără poziție</Pill>}
        <Pill color="#38bdf8">{ambient.length} nave în trafic</Pill>

        <label className="ml-auto flex cursor-pointer items-center gap-2 text-xs text-slate-300">
          <input
            type="checkbox"
            checked={showAmbient}
            onChange={(e) => setShowAmbient(e.target.checked)}
            className="accent-sky-500"
          />
          Trafic AIS global
        </label>
        {fetchedAt && (
          <span className="text-xs text-slate-400">
            Actualizat {new Date(fetchedAt).toLocaleTimeString('ro-RO')}
          </span>
        )}
      </header>

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-950/40 px-4 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* Explicit height, not a utility class: the map needs a real box before
          MapLibre initialises, and a zero-high container yields a canvas stuck
          at its 300px fallback that never repaints. */}
      <div
        className="relative overflow-hidden rounded-xl border border-slate-700/60"
        style={{ height: 'calc(100vh - 13rem)', minHeight: 560 }}
      >
        {/* Sized by width/height, not by absolute inset: maplibre-gl.css sets
            `position: relative` on .maplibregl-map, which overrides an absolute
            container and collapses it to zero height. */}
        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

        {fleet.length === 0 && !error && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="rounded-lg bg-slate-900/85 px-5 py-4 text-center">
              <p className="font-medium text-slate-100">Nicio navă în flotă</p>
              <p className="text-sm text-slate-400">
                Containerele apar aici pe măsură ce primesc o poziție.
              </p>
            </div>
          </div>
        )}

        <Legend />

        {selected && <TacticalCard container={selected} onClose={() => setSelected(null)} />}
      </div>
    </div>
  );
}

// ─── Presentational pieces ───────────────────────────────────────────────────

function Pill({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-800/80 px-2.5 py-1 text-xs text-slate-200">
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      {children}
    </span>
  );
}

function Legend() {
  return (
    <div className="absolute bottom-3 left-3 rounded-lg border border-slate-700/60 bg-slate-900/85 px-3 py-2.5 text-xs backdrop-blur">
      <p className="mb-1.5 font-semibold text-slate-200">Sursa poziției</p>
      <ul className="space-y-1">
        {Object.values(SOURCE_STYLES).map((s) => (
          <li key={s.label} className="flex items-center gap-2 text-slate-300">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
            {s.label}
          </li>
        ))}
      </ul>
      <p className="mt-2 max-w-[15rem] text-[11px] leading-snug text-slate-500">
        AIS terestru nu acoperă mijlocul oceanului. Ce nu e observat live e marcat ca estimat.
      </p>
    </div>
  );
}

function TacticalCard({ container, onClose }: { container: FleetContainer; onClose: () => void }) {
  const p = container.position;
  const st = styleFor(p?.source);
  const b = container.booking;

  return (
    <div className="absolute right-3 top-3 w-80 rounded-xl border border-slate-700/60 bg-slate-900/92 p-4 text-sm backdrop-blur">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-slate-100">{container.vessel?.name}</p>
          <p className="font-mono text-xs text-slate-400">{container.containerNumber}</p>
        </div>
        <button
          onClick={onClose}
          className="rounded px-2 py-0.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          aria-label="Închide"
        >
          ✕
        </button>
      </div>

      <div className="mb-3 flex items-center gap-2 rounded-lg bg-slate-800/70 px-2.5 py-2">
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: st.color }} />
        <div className="leading-tight">
          <p className="text-xs font-medium text-slate-200">{st.label}</p>
          <p className="text-[11px] text-slate-400">
            {ageLabel(p?.timestamp)}
            {!st.observed && ' · nu e o observație live'}
          </p>
        </div>
      </div>

      <dl className="space-y-1.5 text-xs">
        <Row label="MMSI" value={container.vessel?.mmsi} mono />
        <Row label="IMO" value={container.vessel?.imo} mono />
        <Row label="B/L" value={container.blNumber} mono />
        <Row label="Viteză" value={p?.sog != null ? `${p.sog.toFixed(1)} noduri` : null} />
        <Row label="Curs" value={p?.cog != null ? `${Math.round(p.cog)}°` : null} />
        <Row label="Destinație declarată" value={p?.destination} />
        <Row
          label="Rută"
          value={b?.origin && b?.destination ? `${b.origin} → ${b.destination}` : null}
        />
        <Row label="Client" value={b?.client} />
        <Row label="Status" value={container.currentStatus} />
        <Row
          label="ETA"
          value={container.eta ? new Date(container.eta).toLocaleDateString('ro-RO') : null}
        />
      </dl>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-3">
      <dt className="shrink-0 text-slate-500">{label}</dt>
      <dd className={`text-right text-slate-200 ${mono ? 'font-mono' : ''}`}>{value}</dd>
    </div>
  );
}
