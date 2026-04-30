/**
 * B5: CORS subdomain attack prevention tests
 *
 * Verifies that:
 * - Exact-match origins are allowed (strict equality, not startsWith)
 * - A malicious origin that appends ".attacker.com" is BLOCKED
 * - Wildcard patterns accept genuine subdomains
 * - Wildcard patterns BLOCK "subdomain-hijack" patterns
 */

import { buildOriginMatchers, isOriginAllowed } from '../../src/utils/cors.util';

describe('CORS origin matchers — B5 subdomain attack fix', () => {
  describe('plain (exact) origins', () => {
    const matchers = buildOriginMatchers(['https://promo-efect.md', 'https://app.promo-efect.md']);

    it('allows exact match', () => {
      expect(isOriginAllowed('https://promo-efect.md', matchers)).toBe(true);
      expect(isOriginAllowed('https://app.promo-efect.md', matchers)).toBe(true);
    });

    it('blocks origin that only starts with allowed origin (old startsWith bug)', () => {
      // This would have passed with startsWith but must be BLOCKED
      expect(isOriginAllowed('https://promo-efect.md.attacker.com', matchers)).toBe(false);
    });

    it('blocks origin with extra path or port', () => {
      expect(isOriginAllowed('https://promo-efect.md:8080', matchers)).toBe(false);
      expect(isOriginAllowed('https://promo-efect.md/path', matchers)).toBe(false);
    });

    it('blocks unrelated origins', () => {
      expect(isOriginAllowed('https://evil.com', matchers)).toBe(false);
      expect(isOriginAllowed('http://promo-efect.md', matchers)).toBe(false); // wrong scheme
    });
  });

  describe('wildcard patterns (*.example.com)', () => {
    const matchers = buildOriginMatchers(['*.example.com']);

    it('allows genuine subdomains', () => {
      expect(isOriginAllowed('https://app.example.com', matchers)).toBe(true);
      expect(isOriginAllowed('https://api.example.com', matchers)).toBe(true);
      expect(isOriginAllowed('https://test-1.example.com', matchers)).toBe(true);
    });

    it('BLOCKS https://evil.example.com.attacker.com (subdomain hijack)', () => {
      expect(isOriginAllowed('https://evil.example.com.attacker.com', matchers)).toBe(false);
    });

    it('BLOCKS http scheme for wildcard origin', () => {
      expect(isOriginAllowed('http://app.example.com', matchers)).toBe(false);
    });

    it('BLOCKS bare domain without subdomain', () => {
      // "*.example.com" does not match "https://example.com" — no subdomain part
      expect(isOriginAllowed('https://example.com', matchers)).toBe(false);
    });
  });

  describe('mixed list', () => {
    const matchers = buildOriginMatchers(['https://promo-efect.md', '*.promo-efect.md']);

    it('allows exact root domain', () => {
      expect(isOriginAllowed('https://promo-efect.md', matchers)).toBe(true);
    });

    it('allows genuine subdomains via wildcard', () => {
      expect(isOriginAllowed('https://app.promo-efect.md', matchers)).toBe(true);
    });

    it('BLOCKS attacker subdomain hijack', () => {
      expect(isOriginAllowed('https://evil.promo-efect.md.attacker.com', matchers)).toBe(false);
    });
  });
});
