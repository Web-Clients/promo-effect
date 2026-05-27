/**
 * Port Geocoder
 *
 * Lat/lng for the ports we trade through. Used as a fallback position
 * on the Fleet Map when a container has no AIS data and no persisted
 * coordinates — so the operator can at least see where the cargo
 * physically is by port.
 *
 * Hardcoded on purpose: this list is small, stable, and we don't want
 * to depend on a paid geocoding API for a feature that should always
 * work offline.
 */

export interface PortLocation {
  code: string;
  name: string;
  country: string;
  lat: number;
  lng: number;
}

const PORTS: PortLocation[] = [
  // China (POL)
  { code: 'CNSHA', name: 'Shanghai', country: 'CN', lat: 31.2304, lng: 121.4737 },
  { code: 'CNNGB', name: 'Ningbo', country: 'CN', lat: 29.8683, lng: 121.544 },
  { code: 'CNQIN', name: 'Qingdao', country: 'CN', lat: 36.0671, lng: 120.3826 },
  { code: 'CNSZX', name: 'Shenzhen', country: 'CN', lat: 22.5429, lng: 114.0596 },
  { code: 'CNYTN', name: 'Yantian', country: 'CN', lat: 22.5664, lng: 114.2682 },
  { code: 'CNGZG', name: 'Guangzhou', country: 'CN', lat: 23.0996, lng: 113.3258 },
  { code: 'CNTSN', name: 'Tianjin / Xingang', country: 'CN', lat: 38.9851, lng: 117.7572 },
  { code: 'CNXMG', name: 'Xiamen', country: 'CN', lat: 24.4798, lng: 118.0894 },
  { code: 'CNDLC', name: 'Dalian', country: 'CN', lat: 38.9295, lng: 121.6147 },
  { code: 'CNNSA', name: 'Nansha', country: 'CN', lat: 22.7497, lng: 113.5946 },
  { code: 'CNSHK', name: 'Shekou', country: 'CN', lat: 22.4773, lng: 113.9165 },
  // SE Asia transshipment
  { code: 'SGSIN', name: 'Singapore', country: 'SG', lat: 1.265, lng: 103.823 },
  { code: 'MYPKG', name: 'Port Klang', country: 'MY', lat: 3.0019, lng: 101.3927 },
  // Suez transit
  { code: 'EGPSD', name: 'Port Said', country: 'EG', lat: 31.2653, lng: 32.3019 },
  { code: 'EGDAM', name: 'Damietta', country: 'EG', lat: 31.4675, lng: 31.7591 },
  // Mediterranean hubs
  { code: 'GRPIR', name: 'Piraeus', country: 'GR', lat: 37.9362, lng: 23.6362 },
  { code: 'TRMER', name: 'Mersin', country: 'TR', lat: 36.7958, lng: 34.6406 },
  { code: 'TRAMB', name: 'Ambarli (Istanbul)', country: 'TR', lat: 40.97, lng: 28.6711 },
  { code: 'ITGOA', name: 'Genoa', country: 'IT', lat: 44.4056, lng: 8.945 },
  { code: 'ITLSP', name: 'La Spezia', country: 'IT', lat: 44.1024, lng: 9.8244 },
  { code: 'ESALG', name: 'Algeciras', country: 'ES', lat: 36.1408, lng: -5.4536 },
  { code: 'ESBCN', name: 'Barcelona', country: 'ES', lat: 41.3565, lng: 2.1714 },
  // Black Sea destinations
  { code: 'ROCND', name: 'Constanța', country: 'RO', lat: 44.1733, lng: 28.6383 },
  { code: 'UAODS', name: 'Odessa', country: 'UA', lat: 46.4825, lng: 30.7233 },
  { code: 'BGVAR', name: 'Varna', country: 'BG', lat: 43.2042, lng: 27.9081 },
  // North-EU
  { code: 'NLRTM', name: 'Rotterdam', country: 'NL', lat: 51.9244, lng: 4.4777 },
  { code: 'BEANR', name: 'Antwerp', country: 'BE', lat: 51.2199, lng: 4.4051 },
  { code: 'DEHAM', name: 'Hamburg', country: 'DE', lat: 53.5511, lng: 9.9937 },
];

const ALIASES: Record<string, string> = {
  CONSTANTA: 'ROCND',
  CONSTANȚA: 'ROCND',
  SHANGHAI: 'CNSHA',
  NINGBO: 'CNNGB',
  QINGDAO: 'CNQIN',
  SHENZHEN: 'CNSZX',
  YANTIAN: 'CNYTN',
  GUANGZHOU: 'CNGZG',
  TIANJIN: 'CNTSN',
  XINGANG: 'CNTSN',
  XIAMEN: 'CNXMG',
  DALIAN: 'CNDLC',
  NANSHA: 'CNNSA',
  SHEKOU: 'CNSHK',
  SINGAPORE: 'SGSIN',
  ODESSA: 'UAODS',
  ODESA: 'UAODS',
  PIRAEUS: 'GRPIR',
  ROTTERDAM: 'NLRTM',
  ANTWERP: 'BEANR',
  HAMBURG: 'DEHAM',
  ALGECIRAS: 'ESALG',
  MERSIN: 'TRMER',
  GENOA: 'ITGOA',
};

const byCode: Map<string, PortLocation> = new Map(PORTS.map((p) => [p.code, p]));

/**
 * Resolve a UN/LOCODE or port name (case-insensitive) to lat/lng.
 * Returns null if unknown — caller should treat as "no fallback position".
 */
export function geocodePort(input?: string | null): PortLocation | null {
  if (!input) return null;
  const raw = input.trim().toUpperCase();
  if (!raw) return null;

  // Direct UN/LOCODE match
  if (byCode.has(raw)) return byCode.get(raw)!;

  // Try to extract a UN/LOCODE pattern from longer string (e.g. "Constanța (ROCND)")
  const m = raw.match(/\b([A-Z]{5})\b/);
  if (m && byCode.has(m[1])) return byCode.get(m[1])!;

  // Alias by name (first token)
  const head = raw.split(/[,\s/(]/)[0];
  if (ALIASES[head]) return byCode.get(ALIASES[head])!;
  if (ALIASES[raw]) return byCode.get(ALIASES[raw])!;

  // Last attempt: substring contains a known port name
  for (const [alias, code] of Object.entries(ALIASES)) {
    if (raw.includes(alias)) return byCode.get(code)!;
  }

  return null;
}
