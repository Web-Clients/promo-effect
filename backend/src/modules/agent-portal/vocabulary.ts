/**
 * The words an agent is allowed to use, taken from the pricing tables.
 *
 * `computeFromAgentPrices` matches `containerType` exactly, so an agent rate is
 * only ever findable if its label is byte-identical to what base_prices,
 * shipping_line_containers and transport_rates already use. The agent form used
 * to offer '20ft', '40ft' and '40ft HC' against a database speaking '20DV',
 * '40HC' and '40HQ' — rates entered through it were unreachable and looked fine.
 *
 * Deriving the list from the data is what stops the two drifting apart again.
 */

/** Used only when the pricing tables are empty, so the form is never unusable. */
export const FALLBACK_CONTAINER_TYPES = ['20DV', '40DV', '40HC', '40HQ'] as const;

/** Distinct, trimmed, sorted container labels actually present in pricing. */
export function canonicalContainerTypes(rows: Array<{ containerType: string | null }>): string[] {
  const seen = new Set<string>();
  for (const r of rows) {
    const v = (r.containerType || '').trim();
    if (v) seen.add(v);
  }
  return seen.size > 0 ? [...seen].sort() : [...FALLBACK_CONTAINER_TYPES];
}

/**
 * Whether a label an agent submitted can be found by a quote.
 *
 * Exact membership, deliberately: this mirrors the Prisma `in` filter rather
 * than being more forgiving than it, so a value that passes here is genuinely
 * quotable and one that fails here would genuinely have been dead.
 */
export function agreesWithPricing(value: string, pricingLabels: string[]): boolean {
  return pricingLabels.includes((value || '').trim());
}

/** Weight bands to offer when admin_settings holds none or holds nonsense. */
export const FALLBACK_WEIGHT_RANGES = ['<23', '23-24', '24-25', '25-26', '26-27', '27-28'] as const;
