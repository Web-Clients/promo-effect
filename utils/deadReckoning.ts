/**
 * Where a vessel is now, between two AIS fixes.
 *
 * An AIS fix arrives every few minutes at best, and the fleet map polls every
 * fifteen seconds. Drawing only the fixes gives a map of ships standing still
 * that jump sideways now and then — which reads as a broken map, not as a live
 * one. Every marine traffic display solves this the same way: carry the vessel
 * forward from its last fix along its course at its reported speed, and correct
 * the moment a real fix arrives.
 *
 * The projection is honest only for a while. A ship turns, slows, anchors, and
 * none of that reaches us between fixes, so after MAX_PROJECTION_MS the vessel
 * is frozen where it was rather than sailed further on an assumption that has
 * gone stale. The caller can tell the two apart and dim what is projected.
 */

/** One observed AIS fix, with the local clock reading when we received it. */
export interface DrFix {
  lat: number;
  lng: number;
  /** Speed over ground, knots. */
  sogKnots: number | null;
  /** Course over ground in degrees; heading is an acceptable substitute. */
  cogDeg: number | null;
  /** `Date.now()` when this fix entered the map, not the AIS timestamp. */
  observedAtMs: number;
}

export interface DrPosition {
  lat: number;
  lng: number;
  /** Milliseconds of movement inferred rather than observed. */
  projectedMs: number;
}

/**
 * Stop projecting after twenty minutes without a fix — about three nautical
 * miles of guesswork at container-ship speed, which is as far as a straight
 * line stays believable.
 */
export const MAX_PROJECTION_MS = 20 * 60 * 1000;

/** Below this the vessel is manoeuvring or moored; its course means nothing. */
export const MIN_SOG_KNOTS = 0.3;

/** One nautical mile in degrees of latitude. */
const NM_PER_DEGREE = 60;

/** Keep longitude in [-180, 180] so a ship crossing the date line stays put. */
export function normalizeLng(lng: number): number {
  let out = lng;
  while (out > 180) out -= 360;
  while (out < -180) out += 360;
  return out;
}

/**
 * The vessel's position at `nowMs`, carried forward from `fix`.
 *
 * Returns the fix itself when there is nothing to carry forward: no speed, no
 * course, a clock that runs backwards, or a fix older than MAX_PROJECTION_MS.
 */
export function projectPosition(fix: DrFix, nowMs: number): DrPosition {
  const elapsed = Math.min(Math.max(0, nowMs - fix.observedAtMs), MAX_PROJECTION_MS);
  const sog = fix.sogKnots ?? 0;
  const cog = fix.cogDeg;

  if (elapsed === 0 || sog < MIN_SOG_KNOTS || cog == null || !Number.isFinite(cog)) {
    return { lat: fix.lat, lng: fix.lng, projectedMs: 0 };
  }

  const distanceNm = sog * (elapsed / 3_600_000);
  const rad = (cog * Math.PI) / 180;

  const lat = fix.lat + (distanceNm / NM_PER_DEGREE) * Math.cos(rad);
  // Meridians converge toward the poles: the same distance east is more degrees
  // of longitude the further north you are.
  const cosLat = Math.cos((fix.lat * Math.PI) / 180);
  const lng =
    Math.abs(cosLat) < 1e-6
      ? fix.lng
      : normalizeLng(fix.lng + ((distanceNm / NM_PER_DEGREE) * Math.sin(rad)) / cosLat);

  return {
    lat: Math.max(-85, Math.min(85, lat)),
    lng,
    projectedMs: elapsed,
  };
}

/**
 * Whether a new fix differs from the baseline we are already projecting from.
 *
 * Polls usually return the same fix, and restarting the clock on each poll
 * would pin the vessel to its last known point forever — it would never appear
 * to move at all.
 */
export function isNewFix(previous: DrFix | undefined, next: DrFix): boolean {
  if (!previous) return true;
  return previous.lat !== next.lat || previous.lng !== next.lng;
}
