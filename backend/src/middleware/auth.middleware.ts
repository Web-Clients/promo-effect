import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt.util';
import prisma from '../lib/prisma';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        role: string;
        clientId?: string;
        agentId?: string;
      };
    }
  }
}

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.replace('Bearer ', '');

    // Verify token
    const payload = verifyToken(token);

    // Attach user to request
    req.user = {
      ...payload,
    };

    // For CLIENT users, look up their clientId from the clients table
    if (payload.role === 'CLIENT') {
      const client = await prisma.client.findUnique({
        where: { email: payload.email },
        select: { id: true },
      });
      if (client) {
        req.user.clientId = client.id;
      }
    }

    // For AGENT users, look up their agentId
    if (payload.role === 'AGENT') {
      const agent = await prisma.agent.findFirst({
        where: { userId: payload.userId },
        select: { id: true },
      });
      if (agent) {
        req.user.agentId = agent.id;
      }
    }

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Role-based middleware
export const requireRole = (roles: string | string[]) => {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];

  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

// Admin-only middleware
export const requireAdmin = requireRole(['ADMIN', 'SUPER_ADMIN']);
