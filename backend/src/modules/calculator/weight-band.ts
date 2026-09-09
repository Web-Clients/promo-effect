/**
 * Matching a cargo weight against an agent's weight band.
 *
 * The calculator carries the weight the client typed — "23500", kilograms —
 * and an agent stores a band in tonnes, "23-24". These were compared for exact
 * string equality, so no agent rate ever matched on weight: the rate saved,
 * looked right in the agent's own table, and was invisible to every quote.
 *
 * People write bands several ways, so the parser is generous about form and
 * strict about meaning: anything it cannot read is refused rather than guessed.
 */

export interface WeightBand {
  /** Tonnes, inclusive. */
  min: number;
  /** Tonnes, inclusive. Infinity for an open-ended band. */
  max: number;
}

/**
 * A written weight in tonnes.
 *
 * A bare number below 1000 is tonnes and above it is kilograms — nobody ships
 * 23 kilograms in a forty-foot container, and nobody quotes 23500 tonnes.
 */
export function toTonnes(value: string): number | null {
  const text = (value || '').trim().toLowerCase().replace(',', '.');
  if (!text) return null;

  const m = text.match(/(\d+(?:\.\d+)?)/);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n)) return null;

  if (/\bkg\b|kilogram/.test(text)) return n / 1000;
  if (/\bt\b|ton|тонн|吨/.test(text)) return n;
  return n >= 1000 ? n / 1000 : n;
}

export function parseWeightBand(label: string): WeightBand | null {
  const text = (label || '').trim().toLowerCase().replace(/,/g, '.');
  if (!text) return null;

  // Open-ended below: "<23", "sub 23", "under 23", "до 23"
  const below = text.match(/^(?:<|sub|under|до|below)\s*(\d+(?:\.\d+)?)/);
  if (below) return { min: 0, max: Number(below[1]) };

  // Open-ended above: ">28", "28+", "peste 28", "over 28"
  const above = text.match(/^(?:>|peste|over|from|от)\s*(\d+(?:\.\d+)?)|^(\d+(?:\.\d+)?)\s*\+/);
  if (above) return { min: Number(above[1] ?? above[2]), max: Infinity };

  // A range, with any of the dashes and joiners people use.
  const range = text.match(/(\d+(?:\.\d+)?)\s*(?:-|–|—|to|la|до)\s*(\d+(?:\.\d+)?)/);
  if (range) {
    const min = Number(range[1]);
    const max = Number(range[2]);
    return Number.isFinite(min) && Number.isFinite(max) ? { min, max } : null;
  }

  return null;
}

/**
 * Whether `cargoWeight` falls inside `bandLabel`.
 *
 * A band that cannot be parsed falls back to exact text equality, so rates
 * carrying a label rather than a range keep working instead of disappearing.
 */
export function weightBandMatches(bandLabel: string, cargoWeight: string): boolean {
  const band = parseWeightBand(bandLabel);
  if (!band) return (bandLabel || '').trim() === (cargoWeight || '').trim();

  const tonnes = toTonnes(cargoWeight);
  if (tonnes === null) return false;

  return tonnes >= band.min && tonnes <= band.max;
}
