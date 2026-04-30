/**
 * CORS origin helpers — extracted for testability (B5 fix).
 *
 * Security rule: exact string equality for plain origins; strict regex for
 * wildcard patterns. Prevents subdomain-hijack like:
 *   https://evil.example.com.attacker.com  matching  https://example.com
 */

/**
 * Build an array of matchers from the allowed-origins list.
 * - Plain origin (e.g. "https://example.com") → exact string match
 * - Wildcard pattern (e.g. "*.example.com") → strict regex
 *     ^https://([a-z0-9-]+\.)*example\.com$
 *   so only genuine subdomains are accepted.
 */
export function buildOriginMatchers(origins: string[]): Array<string | RegExp> {
  return origins.map((entry) => {
    if (entry.startsWith('*.')) {
      const escaped = entry.slice(2).replace(/\./g, '\\.');
      // ([a-z0-9-]+\.)+ requires at least one subdomain segment
      return new RegExp(`^https://([a-z0-9-]+\\.)+${escaped}$`);
    }
    return entry;
  });
}

/**
 * Returns true only if `origin` is allowed by the matcher list.
 * For string matchers: strict equality (NOT startsWith — B5 fix).
 * For RegExp matchers: .test(origin).
 */
export function isOriginAllowed(origin: string, matchers: Array<string | RegExp>): boolean {
  return matchers.some((matcher) => {
    if (typeof matcher === 'string') {
      return origin === matcher;
    }
    return matcher.test(origin);
  });
}
