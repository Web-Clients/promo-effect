/**
 * Clients Controller
 * REST API endpoints for client management
 */

import { Router, Request, Response } from 'express';
import { ClientsService } from './clients.service';
import { authMiddleware, requireRole } from '../../middleware/auth.middleware';
import { createClientSchema, updateClientSchema } from '../../middleware/validate.middleware';

const router = Router();
const clientsService = new ClientsService();

/**
 * GET /api/clients - List all clients with pagination and filters
 * Auth: Required
 * Query params: page, limit, search, status
 */
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const filters = {
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
      search: req.query.search as string,
      status: req.query.status as string,
    };

    const result = await clientsService.findAll(filters);
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch clients';
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/clients/stats - Get client statistics
 * Auth: Required
 */
router.get('/stats', authMiddleware, async (req: Request, res: Response) => {
  try {
    const stats = await clientsService.getStats();
    res.json(stats);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch stats';
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/clients/:id - Get single client by ID
 * Auth: Required
 */
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const client = await clientsService.findOne(req.params.id);
    res.json(client);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch client';

    if (message.includes('not found')) {
      return res.status(404).json({ error: message });
    }

    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/clients - Create new client
 * Auth: Required
 * Role: ADMIN, SUPER_ADMIN, MANAGER
 */
router.post(
  '/',
  authMiddleware,
  requireRole(['ADMIN', 'SUPER_ADMIN', 'MANAGER']),
  async (req: Request, res: Response) => {
    const parsed = createClientSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, errors: parsed.error.flatten().fieldErrors });
    }
    try {
      const { companyName, contactPerson, email, phone, address, taxId, bankAccount } = parsed.data;

      const client = await clientsService.create(
        {
          companyName: companyName.trim(),
          contactPerson: contactPerson.trim(),
          email: email.toLowerCase().trim(),
          phone: phone.trim(),
          address: address?.trim(),
          taxId: taxId?.trim(),
          bankAccount: bankAccount?.trim(),
        },
        req.user!.userId
      );

      res.status(201).json(client);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create client';

      if (message.includes('already exists')) {
        return res.status(409).json({ error: message });
      }

      res.status(400).json({ error: message });
    }
  }
);

/**
 * PUT /api/clients/:id - Update client
 * Auth: Required
 * Role: ADMIN, SUPER_ADMIN, MANAGER
 */
router.put(
  '/:id',
  authMiddleware,
  requireRole(['ADMIN', 'SUPER_ADMIN', 'MANAGER']),
  async (req: Request, res: Response) => {
    const parsed = updateClientSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, errors: parsed.error.flatten().fieldErrors });
    }
    try {
      const { companyName, contactPerson, email, phone, address, taxId, bankAccount, status } =
        parsed.data;

      const client = await clientsService.update(
        req.params.id,
        {
          companyName: companyName?.trim(),
          contactPerson: contactPerson?.trim(),
          email: email?.toLowerCase().trim(),
          phone: phone?.trim(),
          address: address?.trim(),
          taxId: taxId?.trim(),
          bankAccount: bankAccount?.trim(),
          status,
        },
        req.user!.userId
      );

      res.json(client);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update client';

      if (message.includes('not found')) {
        return res.status(404).json({ error: message });
      }

      if (message.includes('already exists')) {
        return res.status(409).json({ error: message });
      }

      res.status(400).json({ error: message });
    }
  }
);

/**
 * DELETE /api/clients/:id - Soft delete client
 * Auth: Required
 * Role: ADMIN, SUPER_ADMIN
 */
router.delete(
  '/:id',
  authMiddleware,
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  async (req: Request, res: Response) => {
    try {
      const result = await clientsService.delete(req.params.id, req.user!.userId);
      res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete client';

      if (message.includes('not found')) {
        return res.status(404).json({ error: message });
      }

      if (message.includes('active bookings')) {
        return res.status(409).json({ error: message });
      }

      res.status(500).json({ error: message });
    }
  }
);

export default router;
