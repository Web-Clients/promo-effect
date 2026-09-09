/**
 * Where a container ship actually sails.
 *
 * The first version of the fleet map drew a great-circle arc from the loading
 * port to the vessel. On a globe that is a clean curve and it is also wrong: the
 * Ningbo–Constanța arc runs over India, Iran and Anatolia. A route that crosses
 * a continent is not a small inaccuracy, it is the one thing a logistics map
 * must not get wrong.
 *
 * So routes follow real waypoints — the straits and canals ships are actually
 * routed through — and each leg between two waypoints is interpolated on the
 * sphere. The result reads as a voyage because it is one.
 *
 * Coordinates are [longitude, latitude], the GeoJSON order.
 */

export type Coord = [number, number];

/**
 * Asia to Northern Europe and the Black Sea, via Suez.
 *
 * The waypoints are the ones a routing service would give: Taiwan Strait, the
 * South China Sea, Singapore and Malacca, south of Sri Lanka, the Gulf of Aden,
 * Bab-el-Mandeb, the Red Sea, Suez, then the Mediterranean, the Dardanelles and
 * the Bosphorus into the Black Sea.
 */
const SUEZ_CORRIDOR: Coord[] = [
  [122.5, 30.4], // East China Sea, off Zhoushan
  [121.5, 27.0],
  [119.8, 24.2], // Taiwan Strait
  [116.5, 20.5],
  [113.0, 15.0], // South China Sea
  [109.5, 10.0], // off southern Vietnam
  [105.5, 4.0],
  [103.85, 1.25], // Singapore Strait
  [100.5, 2.8], // Malacca Strait
  [97.5, 5.5],
  [94.0, 6.5], // Andaman Sea, off northern Sumatra
  [85.0, 6.0], // Bay of Bengal approaches
  [79.5, 5.4], // south of Sri Lanka
  [72.0, 7.5], // Laccadive Sea
  [63.0, 10.5], // Arabian Sea
  [55.0, 12.0],
  [51.3, 12.5], // Socotra approaches
  [45.0, 12.4], // Gulf of Aden
  [43.4, 12.6], // Bab-el-Mandeb
  [40.0, 17.0], // southern Red Sea
  [36.5, 23.0],
  [34.0, 27.5], // northern Red Sea
  [33.3, 28.5], // Gulf of Suez
  [32.55, 29.95], // Suez
  [32.32, 31.26], // Port Said
  [30.0, 32.5], // eastern Mediterranean
  [26.5, 33.8],
  [24.0, 34.7], // south of Crete
  [25.3, 36.3], // Aegean
  [26.2, 39.5],
  [26.4, 40.2], // Dardanelles
  [28.2, 40.7], // Sea of Marmara
  [29.05, 41.1], // Bosphorus
  [29.6, 42.5], // Black Sea
  [28.9, 43.8],
];

/** Where each port joins the corridor, and how far along it sits. */
const PORTS: Record<string, { coord: Coord; corridorIndex: number }> = {
  // Chinese loading ports — all join at the northern end.
  ningbo: { coord: [121.544, 29.868], corridorIndex: 0 },
  shanghai: { coord: [121.474, 31.23], corridorIndex: 0 },
  qingdao: { coord: [120.383, 36.067], corridorIndex: 0 },
  tianjin: { coord: [117.7, 38.98], corridorIndex: 0 },
  xingang: { coord: [117.7, 38.98], corridorIndex: 0 },
  dalian: { coord: [121.63, 38.92], corridorIndex: 0 },
  xiamen: { coord: [118.08, 24.48], corridorIndex: 2 },
  shenzhen: { coord: [114.06, 22.55], corridorIndex: 3 },
  yantian: { coord: [114.27, 22.57], corridorIndex: 3 },
  shekou: { coord: [113.9, 22.48], corridorIndex: 3 },
  guangzhou: { coord: [113.26, 23.13], corridorIndex: 3 },
  nansha: { coord: [113.6, 22.75], corridorIndex: 3 },
  chiwan: { coord: [113.88, 22.48], corridorIndex: 3 },
  huangpu: { coord: [113.48, 23.09], corridorIndex: 3 },
  haiphong: { coord: [106.68, 20.86], corridorIndex: 4 },
  // Discharge ports at the European end.
  constanta: { coord: [28.638, 44.173], corridorIndex: SUEZ_CORRIDOR.length - 1 },
  constanța: { coord: [28.638, 44.173], corridorIndex: SUEZ_CORRIDOR.length - 1 },
  odessa: { coord: [30.723, 46.483], corridorIndex: SUEZ_CORRIDOR.length - 1 },
  piraeus: { coord: [23.63, 37.94], corridorIndex: 28 },
  istanbul: { coord: [28.98, 41.01], corridorIndex: 32 },
};

function portKey(name?: string | null): string {
  return (name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics: Constanța -> constanta
    .replace(/[^a-z]/g, '');
}

export function knownPort(name?: string | null): boolean {
  const k = portKey(name);
  return k in PORTS || `${k}` in PORTS;
}

/** Points along the great circle between two coordinates. */
export function greatCircle(from: Coord, to: Coord, steps = 24): Coord[] {
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

  const out: Coord[] = [];
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

/**
 * The sailing route between two named ports.
 *
 * Returns null when either end is not a port we route from — better an honest
 * straight line drawn by the caller than a corridor invented for a lane nobody
 * sails.
 */
export function seaRoute(origin?: string | null, destination?: string | null): Coord[] | null {
  const a = PORTS[portKey(origin)];
  const b = PORTS[portKey(destination)];
  if (!a || !b) return null;

  const forward = a.corridorIndex <= b.corridorIndex;
  const slice = forward
    ? SUEZ_CORRIDOR.slice(a.corridorIndex, b.corridorIndex + 1)
    : SUEZ_CORRIDOR.slice(b.corridorIndex, a.corridorIndex + 1).reverse();

  const path: Coord[] = [a.coord, ...slice, b.coord];

  // Smooth each leg on the sphere. Short legs get fewer points: a strait does
  // not need the resolution an ocean crossing does.
  const smoothed: Coord[] = [];
  for (let i = 0; i < path.length - 1; i++) {
    const span = Math.hypot(path[i + 1][0] - path[i][0], path[i + 1][1] - path[i][1]);
    const steps = Math.max(2, Math.min(24, Math.round(span)));
    const leg = greatCircle(path[i], path[i + 1], steps);
    smoothed.push(...(i === 0 ? leg : leg.slice(1)));
  }
  return smoothed;
}

// ─── Progress along a route ──────────────────────────────────────────────────

function haversineKm(a: Coord, b: Coord): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[1] - a[1]);
  const dLon = toRad(b[0] - a[0]);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a[1])) * Math.cos(toRad(b[1])) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export interface RouteProgress {
  /** Index of the route point the vessel is nearest to. */
  index: number;
  /** 0–1 along the whole route. */
  fraction: number;
  /** Kilometres already sailed along the route. */
  sailedKm: number;
  /** Kilometres still to go. */
  remainingKm: number;
}

/**
 * Where a vessel sits along its route.
 *
 * Nearest-point rather than distance-from-origin: a ship that has rounded the
 * Red Sea is physically closer to its loading port than one mid-Indian Ocean,
 * and measuring by straight-line distance would show it going backwards.
 */
export function progressAlong(route: Coord[], position: Coord): RouteProgress | null {
  if (route.length < 2) return null;

  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < route.length; i++) {
    const d = haversineKm(route[i], position);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }

  const legs: number[] = [];
  let total = 0;
  for (let i = 0; i < route.length - 1; i++) {
    const d = haversineKm(route[i], route[i + 1]);
    legs.push(d);
    total += d;
  }

  const sailedKm = legs.slice(0, best).reduce((a, b) => a + b, 0);
  return {
    index: best,
    fraction: total > 0 ? sailedKm / total : 0,
    sailedKm: Math.round(sailedKm),
    remainingKm: Math.round(Math.max(0, total - sailedKm)),
  };
}

/** Total length of a route in kilometres. */
export function routeLengthKm(route: Coord[]): number {
  let total = 0;
  for (let i = 0; i < route.length - 1; i++) total += haversineKm(route[i], route[i + 1]);
  return Math.round(total);
}
