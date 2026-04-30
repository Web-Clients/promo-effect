/**
 * Booking Metadata Routes — Phase A3
 *
 * POST /api/bookings/:id/telex-release  — admin only, set telexReleased=true
 * POST /api/bookings/:id/documents      — client + admin, set documentsUploaded=true
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../../lib/prisma';
import { authMiddleware, requireRole } from '../../middleware/auth.middleware';
import logger from '../../utils/logger';

const router = Router();

// Zod schemas
const telexReleaseSchema = z.object({
  notes: z.string().optional(),
});

const documentsUploadedSchema = z.object({
  notes: z.string().optional(),
});

// ─── Helper: write audit log ───────────────────────────────────────────────

async function writeAuditLog(params: {
  userId: string | undefined;
  entityId: string;
  action: string;
  changes: Record<string, unknown>;
  ipAddress?: string;
}) {
  await prisma.auditLog.create({
    data: {
      userId: params.userId,
      entityType: 'BOOKING',
      entityId: params.entityId,
      action: params.action,
      changes: JSON.stringify(params.changes),
      ipAddress: params.ipAddress,
    },
  });
}

// ─── POST /api/bookings/:id/telex-release ─────────────────────────────────
// Admin only: marks booking as telex released

router.post(
  '/:id/telex-release',
  authMiddleware,
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Validate body
      const parseResult = telexReleaseSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: parseResult.error.flatten(),
        });
      }

      // Check booking exists
      const existing = await prisma.booking.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({ success: false, error: 'Booking not found' });
      }

      if ((existing as any).telexReleased) {
        return res.status(409).json({ success: false, error: 'Telex release already confirmed' });
      }

      // Update
      const updated = await (prisma.booking as any).update({
        where: { id },
        data: {
          telexReleased: true,
          updatedAt: new Date(),
        },
        include: {
          client: { select: { companyName: true, email: true } },
          containers: { select: { id: true, containerNumber: true, blNumber: true } },
        },
      });

      // Audit log
      await writeAuditLog({
        userId: req.user?.userId,
        entityId: id,
        action: 'TELEX_RELEASE',
        changes: {
          telexReleased: true,
          notes: parseResult.data.notes || null,
          setBy: req.user?.email,
        },
        ipAddress: req.ip,
      });

      return res.json({ success: true, booking: updated });
    } catch (err: any) {
      logger.error('[bookings-metadata] telex-release error:', err);
      return res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
);

// ─── POST /api/bookings/:id/documents ─────────────────────────────────────
// Client + admin: marks documentsUploaded=true (actual file upload handled by existing /documents route)

router.post(
  '/:id/documents',
  authMiddleware,
  requireRole(['CLIENT', 'ADMIN', 'SUPER_ADMIN', 'MANAGER']),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Validate body
      const parseResult = documentsUploadedSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: parseResult.error.flatten(),
        });
      }

      // Check booking exists
      const existing = await prisma.booking.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({ success: false, error: 'Booking not found' });
      }

      // For CLIENT role: only allow if it's their booking
      if (req.user?.role === 'CLIENT') {
        const clientRecord = await prisma.client.findUnique({
          where: { email: req.user.email },
          select: { id: true },
        });
        if (!clientRecord || existing.clientId !== clientRecord.id) {
          return res.status(403).json({ success: false, error: 'Access denied' });
        }
      }

      // Update
      const updated = await (prisma.booking as any).update({
        where: { id },
        data: {
          documentsUploaded: true,
          updatedAt: new Date(),
        },
        include: {
          client: { select: { companyName: true, email: true } },
          containers: { select: { id: true, containerNumber: true, blNumber: true } },
        },
      });

      // Audit log
      await writeAuditLog({
        userId: req.user?.userId,
        entityId: id,
        action: 'DOCUMENTS_UPLOADED',
        changes: {
          documentsUploaded: true,
          notes: parseResult.data.notes || null,
          uploadedBy: req.user?.email,
        },
        ipAddress: req.ip,
      });

      return res.json({ success: true, booking: updated });
    } catch (err: any) {
      logger.error('[bookings-metadata] documents error:', err);
      return res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
);

export default router;
