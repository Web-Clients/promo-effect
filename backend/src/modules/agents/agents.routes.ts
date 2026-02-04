/**
 * Agents Routes
 * API endpoints for managing Chinese agents
 * Protected by admin role
 */

import { Router, Request, Response } from 'express';
import { agentsService } from './agents.service';
import { authMiddleware } from '../../middleware/auth.middleware';

const router = Router();

// Middleware to check admin role
const adminOnly = (req: Request, res: Response, next: Function) => {
  const user = (req as any).user;
  if (!user || !['admin', 'ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

/**
 * GET /api/agents
 * Get all agents with optional filters
 */
router.get('/', authMiddleware, adminOnly, async (req: Request, res: Response) => {
  try {
    const filters = {
      status: req.query.status as string,
      search: req.query.search as string,
    };

    const agents = await agentsService.getAllAgents(filters);
    res.json({ agents });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get agents';
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/agents/stats
 * Get agent statistics
 */
router.get('/stats', authMiddleware, adminOnly, async (req: Request, res: Response) => {
  try {
    const stats = await agentsService.getAgentStats();
    res.json(stats);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get agent stats';
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/agents/:id
 * Get agent by ID
 */
router.get('/:id', authMiddleware, adminOnly, async (req: Request, res: Response) => {
  try {
    const agent = await agentsService.getAgentById(req.params.id);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    res.json(agent);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get agent';
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/agents
 * Create new agent
 */
router.post('/', authMiddleware, adminOnly, async (req: Request, res: Response) => {
  try {
    const createdById = (req as any).user?.userId;
    if (!createdById) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const agent = await agentsService.createAgent(req.body, createdById);
    res.status(201).json(agent);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create agent';
    res.status(400).json({ error: message });
  }
});

/**
 * PUT /api/agents/:id
 * Update agent
 */
router.put('/:id', authMiddleware, adminOnly, async (req: Request, res: Response) => {
  try {
    const agent = await agentsService.updateAgent(req.params.id, req.body);
    res.json(agent);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update agent';
    res.status(400).json({ error: message });
  }
});

/**
 * DELETE /api/agents/:id
 * Soft delete agent (set status to INACTIVE)
 */
router.delete('/:id', authMiddleware, adminOnly, async (req: Request, res: Response) => {
  try {
    await agentsService.deleteAgent(req.params.id);
    res.json({ message: 'Agent deactivated successfully' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete agent';
    res.status(400).json({ error: message });
  }
});

/**
 * DELETE /api/agents/:id/hard
 * Hard delete agent (removes agent and user)
 */
router.delete('/:id/hard', authMiddleware, adminOnly, async (req: Request, res: Response) => {
  try {
    await agentsService.hardDeleteAgent(req.params.id);
    res.json({ message: 'Agent deleted permanently' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete agent';
    res.status(400).json({ error: message });
  }
});

/**
 * GET /api/agents/:id/prices
 * Get agent's prices
 */
router.get('/:id/prices', authMiddleware, adminOnly, async (req: Request, res: Response) => {
  try {
    const prices = await agentsService.getAgentPrices(req.params.id);
    res.json({ prices });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get agent prices';
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/agents/:id/bookings
 * Get agent's bookings
 */
router.get('/:id/bookings', authMiddleware, adminOnly, async (req: Request, res: Response) => {
  try {
    const bookings = await agentsService.getAgentBookings(req.params.id);
    res.json({ bookings });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get agent bookings';
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/agents/:id/prices
 * Create price for agent (Admin)
 */
router.post('/:id/prices', authMiddleware, adminOnly, async (req: Request, res: Response) => {
  try {
    const price = await agentsService.createAgentPrice(req.params.id, req.body);
    res.status(201).json(price);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create price';
    res.status(400).json({ error: message });
  }
});

/**
 * PUT /api/agents/:id/prices/:priceId
 * Update agent price (Admin)
 */
router.put('/:id/prices/:priceId', authMiddleware, adminOnly, async (req: Request, res: Response) => {
  try {
    const price = await agentsService.updateAgentPrice(req.params.id, req.params.priceId, req.body);
    res.json(price);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update price';
    res.status(400).json({ error: message });
  }
});

/**
 * DELETE /api/agents/:id/prices/:priceId
 * Delete agent price (Admin)
 */
router.delete('/:id/prices/:priceId', authMiddleware, adminOnly, async (req: Request, res: Response) => {
  try {
    await agentsService.deleteAgentPrice(req.params.id, req.params.priceId);
    res.json({ message: 'Price deleted successfully' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete price';
    res.status(400).json({ error: message });
  }
});

export default router;
