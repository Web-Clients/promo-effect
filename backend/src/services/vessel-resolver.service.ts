/**
 * Vessel Resolver
 *
 * Maps a vessel identity (name or IMO) coming from a parsed carrier email
 * to the AIS MMSI used by AISStream for live position tracking.
 *
 * The lookup table is `vessel_directory`, populated continuously by the
 * AISStream WebSocket subscription on the trade-route bounding box
 * (see aisstream.integration.ts).
 */

import prisma from '../lib/prisma';
import logger from '../utils/logger';

export interface ResolvedVessel {
  mmsi: string;
  name?: string;
  imo?: string;
  shipType?: number;
}

function normalize(name: string): string {
  return name.toUpperCase().replace(/\s+/g, ' ').trim();
}

/**
 * Carriers and AIS broadcasts disagree about vessel naming conventions:
 *  - some carrier emails say "M/V MSC GULSUN", AIS says "MSC GULSUN"
 *  - some emails use Roman numerals "MSC GULSUN II", AIS may use "MSC GULSUN 2"
 *  - some have trailing suffixes "MSC GULSUN F" (flag of convenience)
 *  - punctuation/diacritics differ ("MAERSK ELBA" vs "MÆRSK ELBA")
 *
 * Generate a small set of variants to try in order from most-specific to
 * most-lenient. Returns the first non-empty entry from the list.
 */
// Exported for unit tests; not part of the public API.
export function variants(name: string): string[] {
  const out = new Set<string>();
  const base = normalize(name);
  out.add(base);

  // Strip common vessel prefixes
  out.add(base.replace(/^(M\/V|MV|S\/V|SS|MS)\s+/i, '').trim());

  // Normalize Roman numerals → arabic and vice versa
  const roman = {
    I: '1',
    II: '2',
    III: '3',
    IV: '4',
    V: '5',
    VI: '6',
    VII: '7',
    VIII: '8',
    IX: '9',
    X: '10',
  } as const;
  for (const [r, a] of Object.entries(roman)) {
    out.add(base.replace(new RegExp(`\\b${r}\\b$`), a));
    out.add(base.replace(new RegExp(`\\b${a}\\b$`), r));
  }

  // Strip trailing single-letter suffix ("MSC GULSUN F" → "MSC GULSUN")
  out.add(base.replace(/\s+[A-Z]$/, ''));

  // Strip non-alphanumeric noise
  out.add(
    base
      .replace(/[^A-Z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );

  // Diacritic strip
  out.add(base.normalize('NFD').replace(/[̀-ͯ]/g, ''));

  return [...out].filter((v) => v && v.length >= 3);
}

/**
 * Look up a vessel by exact name; if no match, try carrier↔AIS naming
 * variants; finally fall back to case-insensitive prefix matching.
 * Returns the most recently-seen match.
 */
export async function findByName(name: string): Promise<ResolvedVessel | null> {
  if (!name) return null;
  const tried = new Set<string>();

  for (const needle of variants(name)) {
    if (tried.has(needle)) continue;
    tried.add(needle);

    const exact = await prisma.vesselDirectory.findFirst({
      where: { name: { equals: needle, mode: 'insensitive' } },
      orderBy: { lastSeen: 'desc' },
    });
    if (exact) {
      return {
        mmsi: exact.mmsi,
        name: exact.name || undefined,
        imo: exact.imo || undefined,
        shipType: exact.shipType ?? undefined,
      };
    }
  }

  // Last attempt: prefix match on the primary normalized form
  const needle = normalize(name);
  const prefix = await prisma.vesselDirectory.findFirst({
    where: { name: { startsWith: needle, mode: 'insensitive' } },
    orderBy: { lastSeen: 'desc' },
  });
  if (prefix) {
    return {
      mmsi: prefix.mmsi,
      name: prefix.name || undefined,
      imo: prefix.imo || undefined,
      shipType: prefix.shipType ?? undefined,
    };
  }

  return null;
}

export async function findByImo(imo: string): Promise<ResolvedVessel | null> {
  if (!imo) return null;
  const row = await prisma.vesselDirectory.findFirst({
    where: { imo },
    orderBy: { lastSeen: 'desc' },
  });
  if (!row) return null;
  return {
    mmsi: row.mmsi,
    name: row.name || undefined,
    imo: row.imo || undefined,
    shipType: row.shipType ?? undefined,
  };
}

/**
 * Resolve and persist: if the container has no vessel MMSI yet and we
 * find a directory match, set vessel_mmsi/imo/name on the container.
 * Idempotent and safe to call repeatedly.
 */
export async function resolveAndAttachToContainer(
  containerId: string,
  vesselName?: string,
  imo?: string
): Promise<ResolvedVessel | null> {
  let resolved: ResolvedVessel | null = null;
  if (imo) resolved = await findByImo(imo);
  if (!resolved && vesselName) resolved = await findByName(vesselName);
  if (!resolved) {
    logger.info(
      `[VesselResolver] no match for vessel="${vesselName}" imo="${imo}" — container will need manual MMSI`
    );
    return null;
  }

  await prisma.container.update({
    where: { id: containerId },
    data: {
      vesselMmsi: resolved.mmsi,
      vesselName: resolved.name || vesselName || undefined,
      vesselImo: resolved.imo || imo || undefined,
    } as any,
  });

  logger.info(
    `[VesselResolver] container ${containerId} ← MMSI ${resolved.mmsi} (${resolved.name})`
  );
  return resolved;
}
