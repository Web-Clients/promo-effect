/**
 * An agent account reaches its own portal and nothing else.
 *
 * Found on production on 11 Sep, with the first real agent account: logged in
 * as the Guangzhou forwarder, GET /api/clients returned all 393 clients with
 * bank accounts and tax ids, and the fleet map, container list, reports and
 * turnover were all one request away. The routes only checked for a login.
 */

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-at-least-32-characters-long';
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || 'test-refresh-secret-at-least-32-chars';

import { Request, Response } from 'express';
import { agentSandbox, isAgentAllowed } from '../src/middleware/agent-sandbox.middleware';
import { generateAccessToken } from '../src/utils/jwt.util';

const token = (role: string) =>
  generateAccessToken({ id: `u-${role}`, email: `${role.toLowerCase()}@x.test`, role });

function run(method: string, url: string, authorization?: string) {
  const req = { method, originalUrl: url, headers: authorization ? { authorization } : {} };
  let status = 0;
  const res = {
    status(code: number) {
      status = code;
      return this;
    },
    json() {
      return this;
    },
  };
  let passed = false;
  agentSandbox(req as unknown as Request, res as unknown as Response, () => {
    passed = true;
  });
  return { passed, status };
}

describe('what an agent can reach', () => {
  it.each([
    ['GET', '/api/auth/me'],
    ['POST', '/api/auth/logout'],
    ['POST', '/api/v1/auth/refresh'],
    ['GET', '/api/agent-portal/prices'],
    ['POST', '/api/agent-portal/prices'],
    ['DELETE', '/api/agent-portal/prices/p1'],
    ['GET', '/api/agent-portal/vocabulary?lang=zh'],
    ['GET', '/api/v1/notifications/unread/count'],
    ['PATCH', '/api/v1/notifications/n1/read'],
    ['GET', '/api/ports'],
  ])('%s %s is allowed', (method, url) => {
    expect(isAgentAllowed(method, url)).toBe(true);
  });

  it.each([
    ['GET', '/api/clients'],
    ['GET', '/api/v1/clients'],
    ['GET', '/api/clients/stats'],
    ['GET', '/api/clients/c1'],
    ['GET', '/api/bookings'],
    ['GET', '/api/bookings/stats'],
    ['GET', '/api/tracking/search/fleet/live'],
    ['GET', '/api/tracking/map-data'],
    ['GET', '/api/tracking/containers'],
    ['GET', '/api/v1/reports/dashboard'],
    ['GET', '/api/invoices/stats'],
    ['GET', '/api/suppliers'],
    ['GET', '/api/calculator/ports'],
    ['POST', '/api/ports'],
    ['GET', '/API/CLIENTS'],
    ['GET', '/api/agent-portalx'],
    ['GET', '/api/authz'],
  ])('%s %s is refused', (method, url) => {
    expect(isAgentAllowed(method, url)).toBe(false);
  });
});

describe('the middleware', () => {
  it('refuses an agent outside the portal with 403', () => {
    expect(run('GET', '/api/clients', `Bearer ${token('AGENT')}`)).toEqual({
      passed: false,
      status: 403,
    });
  });

  it('lets an agent into the portal', () => {
    expect(run('GET', '/api/agent-portal/prices', `Bearer ${token('AGENT')}`).passed).toBe(true);
  });

  it.each(['ADMIN', 'SUPER_ADMIN', 'MANAGER', 'OPERATOR', 'CLIENT'])(
    'does not touch %s — their routes decide',
    (role) => {
      expect(run('GET', '/api/clients', `Bearer ${token(role)}`).passed).toBe(true);
    }
  );

  it('leaves requests without a token to the route, which answers 401', () => {
    expect(run('GET', '/api/clients').passed).toBe(true);
  });

  it('leaves an invalid token to the route, which answers 401', () => {
    expect(run('GET', '/api/clients', 'Bearer not-a-jwt').passed).toBe(true);
  });
});
