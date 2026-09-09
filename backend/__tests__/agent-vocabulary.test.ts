/**
 * An agent's rate must be expressible in the vocabulary the calculator queries.
 *
 * The agent form offered '20ft', '40ft' and '40ft HC'. base_prices,
 * shipping_line_containers and transport_rates all speak '20DV', '40HC' and
 * '40HQ', and computeFromAgentPrices matches containerType exactly — no
 * normalisation on that path. So a rate typed by a real Chinese agent through
 * the real form could never be found by a real quote. The rates would sit in
 * the table looking correct and simply never surface.
 *
 * The vocabulary now comes from the pricing tables instead of three hardcoded
 * lists that drift apart.
 */

import { canonicalContainerTypes, agreesWithPricing } from '../src/modules/agent-portal/vocabulary';

describe('container vocabulary', () => {
  it('rejects the labels the old form offered', () => {
    // These are what an agent would have picked, and they match nothing.
    expect(agreesWithPricing('40ft HC', ['40HQ', '40HC'])).toBe(false);
    expect(agreesWithPricing('40ft', ['40HQ', '40HC'])).toBe(false);
    expect(agreesWithPricing('20ft', ['20DV'])).toBe(false);
  });

  it('accepts a value that is literally one of the pricing labels', () => {
    expect(agreesWithPricing('40HQ', ['40HQ', '40HC'])).toBe(true);
    expect(agreesWithPricing('20DV', ['20DV', '40HQ'])).toBe(true);
  });

  it('derives the offered list from the pricing tables, deduplicated and sorted', () => {
    const types = canonicalContainerTypes([
      { containerType: '40HQ' },
      { containerType: '20DV' },
      { containerType: '40HQ' },
      { containerType: '40HC' },
    ]);
    expect(types).toEqual(['20DV', '40HC', '40HQ']);
  });

  it('never offers an empty or whitespace label', () => {
    const types = canonicalContainerTypes([
      { containerType: '40HQ' },
      { containerType: '' },
      { containerType: '   ' },
    ]);
    expect(types).toEqual(['40HQ']);
  });

  it('falls back to a usable list rather than an empty dropdown', () => {
    // An empty pricing table must not leave the agent with nothing to pick.
    expect(canonicalContainerTypes([]).length).toBeGreaterThan(0);
  });
});
