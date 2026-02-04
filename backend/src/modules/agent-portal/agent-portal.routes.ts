/**
 * Agent Portal Routes
 * API endpoints for Chinese agents to manage their prices
 */

import { Router, Request, Response } from 'express';
import { agentPortalService } from './agent-portal.service';
import { authMiddleware } from '../../middleware/auth.middleware';

const router = Router();

// Middleware to check agent role
const agentOnly = async (req: Request, res: Response, next: Function) => {
  const user = (req as any).user;
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Allow agents and admins (admins can test agent features)
  if (!['AGENT', 'ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
    return res.status(403).json({ error: 'Agent access required' });
  }

  // For agents, get their agent profile
  if (user.role === 'AGENT') {
    const agent = await agentPortalService.getAgentByUserId(user.userId);
    if (!agent) {
      return res.status(403).json({ error: 'Agent profile not found' });
    }
    (req as any).agent = agent;
  }

  next();
};

// Middleware to check admin role
const adminOnly = (req: Request, res: Response, next: Function) => {
  const user = (req as any).user;
  if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// ============================================
// AGENT ROUTES
// ============================================

/**
 * GET /api/agent-portal/profile
 * Get current agent's profile
 */
router.get('/profile', authMiddleware, agentOnly, async (req: Request, res: Response) => {
  try {
    const agent = (req as any).agent;
    if (!agent) {
      return res.status(404).json({ error: 'Agent profile not found' });
    }
    res.json(agent);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get profile';
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/agent-portal/stats
 * Get agent statistics
 */
router.get('/stats', authMiddleware, agentOnly, async (req: Request, res: Response) => {
  try {
    const agent = (req as any).agent;
    if (!agent) {
      return res.status(404).json({ error: 'Agent profile not found' });
    }
    const stats = await agentPortalService.getAgentStats(agent.id);
    res.json(stats);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get stats';
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/agent-portal/prices
 * Get agent's prices with optional filters
 */
router.get('/prices', authMiddleware, agentOnly, async (req: Request, res: Response) => {
  try {
    const agent = (req as any).agent;
    if (!agent) {
      return res.status(404).json({ error: 'Agent profile not found' });
    }

    const filters = {
      approvalStatus: req.query.status as string,
      shippingLine: req.query.shippingLine as string,
    };

    const prices = await agentPortalService.getAgentPrices(agent.id, filters);
    res.json({ prices });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get prices';
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/agent-portal/prices
 * Submit new price for approval
 */
router.post('/prices', authMiddleware, agentOnly, async (req: Request, res: Response) => {
  try {
    const agent = (req as any).agent;
    if (!agent) {
      return res.status(404).json({ error: 'Agent profile not found' });
    }

    const data = {
      freightPrice: parseFloat(req.body.freightPrice),
      shippingLine: req.body.shippingLine,
      portOrigin: req.body.portOrigin,
      containerType: req.body.containerType,
      weightRange: req.body.weightRange,
      validFrom: new Date(req.body.validFrom),
      validUntil: new Date(req.body.validUntil),
      departureDate: new Date(req.body.departureDate),
      reason: req.body.reason,
    };

    // Validation
    if (!data.freightPrice || data.freightPrice <= 0) {
      return res.status(400).json({ error: 'Invalid freight price' });
    }
    if (!data.shippingLine || !data.portOrigin || !data.containerType || !data.weightRange) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const price = await agentPortalService.submitPrice(agent.id, data);
    res.status(201).json(price);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to submit price';
    res.status(400).json({ error: message });
  }
});

/**
 * PUT /api/agent-portal/prices/:id
 * Update existing price (resubmits for approval)
 */
router.put('/prices/:id', authMiddleware, agentOnly, async (req: Request, res: Response) => {
  try {
    const agent = (req as any).agent;
    if (!agent) {
      return res.status(404).json({ error: 'Agent profile not found' });
    }

    const data: any = {};
    if (req.body.freightPrice !== undefined) data.freightPrice = parseFloat(req.body.freightPrice);
    if (req.body.shippingLine) data.shippingLine = req.body.shippingLine;
    if (req.body.portOrigin) data.portOrigin = req.body.portOrigin;
    if (req.body.containerType) data.containerType = req.body.containerType;
    if (req.body.weightRange) data.weightRange = req.body.weightRange;
    if (req.body.validFrom) data.validFrom = new Date(req.body.validFrom);
    if (req.body.validUntil) data.validUntil = new Date(req.body.validUntil);
    if (req.body.departureDate) data.departureDate = new Date(req.body.departureDate);
    if (req.body.reason !== undefined) data.reason = req.body.reason;

    const price = await agentPortalService.updatePrice(agent.id, req.params.id, data);
    res.json(price);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update price';
    res.status(400).json({ error: message });
  }
});

/**
 * DELETE /api/agent-portal/prices/:id
 * Delete price (only if PENDING or REJECTED)
 */
router.delete('/prices/:id', authMiddleware, agentOnly, async (req: Request, res: Response) => {
  try {
    const agent = (req as any).agent;
    if (!agent) {
      return res.status(404).json({ error: 'Agent profile not found' });
    }

    await agentPortalService.deletePrice(agent.id, req.params.id);
    res.json({ message: 'Price deleted successfully' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete price';
    res.status(400).json({ error: message });
  }
});

/**
 * GET /api/agent-portal/shipping-lines
 * Get agent's shipping lines
 */
router.get('/shipping-lines', authMiddleware, agentOnly, async (req: Request, res: Response) => {
  try {
    const agent = (req as any).agent;
    if (!agent) {
      return res.status(404).json({ error: 'Agent profile not found' });
    }

    const shippingLines = await agentPortalService.getAgentShippingLines(agent.id);
    res.json({ shippingLines });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get shipping lines';
    res.status(500).json({ error: message });
  }
});

// ============================================
// ADMIN ROUTES (for price approval)
// ============================================

/**
 * GET /api/agent-portal/admin/pending
 * Get all pending prices for approval
 */
router.get('/admin/pending', authMiddleware, adminOnly, async (req: Request, res: Response) => {
  try {
    const prices = await agentPortalService.getPendingPrices();
    res.json({ prices });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get pending prices';
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/agent-portal/admin/stats
 * Get approval statistics
 */
router.get('/admin/stats', authMiddleware, adminOnly, async (req: Request, res: Response) => {
  try {
    const stats = await agentPortalService.getApprovalStats();
    res.json(stats);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get stats';
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/agent-portal/admin/approve/:id
 * Approve a price
 */
router.post('/admin/approve/:id', authMiddleware, adminOnly, async (req: Request, res: Response) => {
  try {
    const adminUserId = (req as any).user?.userId;
    if (!adminUserId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await agentPortalService.approvePrice(req.params.id, adminUserId);
    res.json({ message: 'Price approved successfully' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to approve price';
    res.status(400).json({ error: message });
  }
});

/**
 * POST /api/agent-portal/admin/reject/:id
 * Reject a price
 */
router.post('/admin/reject/:id', authMiddleware, adminOnly, async (req: Request, res: Response) => {
  try {
    const adminUserId = (req as any).user?.userId;
    if (!adminUserId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const reason = req.body.reason;
    if (!reason) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }

    await agentPortalService.rejectPrice(req.params.id, adminUserId, reason);
    res.json({ message: 'Price rejected successfully' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to reject price';
    res.status(400).json({ error: message });
  }
});

export default router;
