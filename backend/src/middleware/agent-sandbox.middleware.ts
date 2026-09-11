import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt.util';

/**
 * Chinese agents are outside suppliers, not staff. An agent account may reach
 * its own portal and nothing else.
 *
 * Most routes only check that the caller is logged in, and several return the
 * whole business to anyone who is: the client list with bank details, every
 * booking on the fleet map, turnover, invoice totals. Guarding each of those
 * one by one is how this leaked in the first place — a route written for staff
 * and never told agents exist. So agents are fenced at the edge instead: deny
 * by default, allow the few prefixes the agent portal actually calls. A new
 * route is closed to agents until someone decides otherwise.
 *
 * Every other role passes straight through to the route's own checks, and so
 * does a request without a valid token — the route answers 401 as before.
 */

const AGENT_ALLOWED: Array<{ path: RegExp; methods?: string[] }> = [
  { path: /^\/api(\/v1)?\/auth(\/|$)/i }, // login, refresh, logout, me, password reset
  { path: /^\/api\/agent-portal(\/|$)/i }, // the portal itself; admin sub-routes guard themselves
  { path: /^\/api\/v1\/notifications(\/|$)/i }, // the bell in the header, scoped to the caller
  { path: /^\/api\/ports(\/|$)/i, methods: ['GET', 'HEAD'] }, // public reference data
];

export function isAgentAllowed(method: string, url: string): boolean {
  const path = url.split('?')[0];
  const verb = method.toUpperCase();
  return AGENT_ALLOWED.some(
    (rule) => rule.path.test(path) && (!rule.methods || rule.methods.includes(verb))
  );
}

export function agentSandbox(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return next();

  let role: string;
  try {
    role = verifyToken(header.slice('Bearer '.length)).role;
  } catch {
    return next();
  }

  if (role !== 'AGENT' || isAgentAllowed(req.method, req.originalUrl)) return next();
  return res.status(403).json({ error: 'Insufficient permissions' });
}
