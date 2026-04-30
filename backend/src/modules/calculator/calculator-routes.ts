/**
 * Calculator Routes
 * Port + destination routing helpers
 */

export const ORIGIN_PORT_TRANSIT_DAYS: Record<string, { constanta: number; odessa: number }> = {
  Shanghai: { constanta: 32, odessa: 30 },
  Qingdao: { constanta: 30, odessa: 28 },
  Ningbo: { constanta: 33, odessa: 31 },
  Shenzhen: { constanta: 35, odessa: 33 },
  Guangzhou: { constanta: 35, odessa: 33 },
  Tianjin: { constanta: 28, odessa: 26 },
  Dalian: { constanta: 26, odessa: 24 },
  Xiamen: { constanta: 34, odessa: 32 },
  'Hong Kong': { constanta: 34, odessa: 32 },
};

// Destinations that require land transport from port
const INLAND_DESTINATIONS = [
  'chisinau',
  'balti',
  'orhei',
  'soroca',
  'cahul',
  'ungheni',
  'comrat',
  'tiraspol',
];

export function isConstantaDestination(portDestination: string): boolean {
  return (
    portDestination.toLowerCase().includes('constanta') ||
    portDestination.toLowerCase().includes('constanța')
  );
}

export function isOdessaDestination(portDestination: string): boolean {
  return portDestination.toLowerCase().includes('odessa');
}

export function requiresLandTransport(finalDestination: string): boolean {
  return INLAND_DESTINATIONS.includes(finalDestination?.toLowerCase());
}

export function buildRouteString(
  portOrigin: string,
  portIntermediate: string,
  finalDestination?: string
): string {
  if (!finalDestination || finalDestination === 'constanta') {
    return `${portOrigin} → ${portIntermediate}`;
  }

  const destLabel = DESTINATION_LABELS[finalDestination] || finalDestination;
  return `${portOrigin} → ${portIntermediate} → ${destLabel}`;
}

export const DESTINATION_LABELS: Record<string, string> = {
  constanta: 'Constanța',
  chisinau: 'Chișinău',
  balti: 'Bălți',
  orhei: 'Orhei',
  soroca: 'Soroca',
  cahul: 'Cahul',
  ungheni: 'Ungheni',
  comrat: 'Comrat',
  tiraspol: 'Tiraspol',
};

export function estimateTransitDays(origin: string, destination: string): number {
  const isConstanta = isConstantaDestination(destination);
  const estimate = ORIGIN_PORT_TRANSIT_DAYS[origin];
  if (estimate) {
    return isConstanta ? estimate.constanta : estimate.odessa;
  }
  return 30;
}

export function checkAvailability(date: Date): 'AVAILABLE' | 'LIMITED' | 'UNAVAILABLE' {
  const today = new Date();
  const daysUntil = Math.floor((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntil > 14) return 'AVAILABLE';
  if (daysUntil > 7) return 'LIMITED';
  return 'UNAVAILABLE';
}
