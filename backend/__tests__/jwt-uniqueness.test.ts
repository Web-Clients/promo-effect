/**
 * Every issued token must be unique.
 *
 * `sessions.token` is UNIQUE. A JWT's `iat` and `exp` have one-second
 * resolution, so signing the same {userId, email, role} payload twice inside
 * the same second produced a byte-identical string, `prisma.session.create`
 * failed on the unique constraint, and the login 500'd.
 *
 * Two things made it worse than a rare race. The failed login counts against
 * authLimiter (`skipSuccessfulRequests` only spares successes), so a user who
 * hit it was then locked out for fifteen minutes. And it fires precisely when
 * several people share one account — which is how Ion said on 8 Sep he intends
 * to hand out the test credentials.
 *
 * Fix: a `jti` per RFC 7519 §4.1.7, so uniqueness never depends on the clock.
 */

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-at-least-32-characters-long';
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || 'test-refresh-secret-at-least-32-chars';

import jwt from 'jsonwebtoken';
import { generateAccessToken, generateRefreshToken } from '../src/utils/jwt.util';

const user = { id: 'user-1', email: 'ion@promo-efect.md', role: 'ADMIN' };

describe('token uniqueness', () => {
  it('issues distinct access tokens for the same user in the same second', () => {
    const tokens = new Set<string>();
    for (let i = 0; i < 25; i++) tokens.add(generateAccessToken(user));
    expect(tokens.size).toBe(25);
  });

  it('issues distinct refresh tokens for the same user in the same second', () => {
    const tokens = new Set<string>();
    for (let i = 0; i < 25; i++) tokens.add(generateRefreshToken(user));
    expect(tokens.size).toBe(25);
  });

  it('access and refresh tokens are never the same string', () => {
    expect(generateAccessToken(user)).not.toBe(generateRefreshToken(user));
  });
});

describe('token payload', () => {
  it('still carries the claims the auth middleware reads', () => {
    const decoded = jwt.verify(generateAccessToken(user), process.env.JWT_SECRET!) as Record<
      string,
      unknown
    >;
    expect(decoded.userId).toBe('user-1');
    expect(decoded.email).toBe('ion@promo-efect.md');
    expect(decoded.role).toBe('ADMIN');
  });

  it('carries a jti, and a different one each time', () => {
    const secret = process.env.JWT_SECRET!;
    const a = jwt.verify(generateAccessToken(user), secret) as Record<string, unknown>;
    const b = jwt.verify(generateAccessToken(user), secret) as Record<string, unknown>;
    expect(typeof a.jti).toBe('string');
    expect(a.jti).not.toBe(b.jti);
  });

  it('is signed with the refresh secret for refresh tokens', () => {
    const t = generateRefreshToken(user);
    expect(() => jwt.verify(t, process.env.JWT_REFRESH_SECRET!)).not.toThrow();
    expect(() => jwt.verify(t, process.env.JWT_SECRET!)).toThrow();
  });
});
