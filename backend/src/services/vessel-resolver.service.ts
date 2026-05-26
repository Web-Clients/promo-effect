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
 * Look up a vessel by exact name, then by case-insensitive prefix.
 * Returns the most recently-seen match.
 */
export async function findByName(name: string): Promise<ResolvedVessel | null> {
  if (!name) return null;
  const needle = normalize(name);

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
