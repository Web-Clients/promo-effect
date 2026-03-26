/**
 * Landing Page Routes
 * Public endpoints for landing page functionality
 */

import { Router, Request, Response } from 'express';
import prisma from '../../lib/prisma';
import notificationService from '../../services/notification.service';

const router = Router();

/**
 * POST /api/v1/landing/contact
 * Submit contact form from landing page
 * @access Public
 */
router.post('/contact', async (req: Request, res: Response) => {
  try {
    const { name, company, email } = req.body;

    // Validation
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        error: 'Name and email are required',
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format',
      });
    }

    // Save to database (create a Lead or Contact record)
    // For now, we'll log it. In production, you might want to:
    // 1. Create a Lead model in Prisma
    // 2. Send email notification to sales team
    // 3. Add to CRM system

    // Save lead to AuditLog for tracking until a dedicated Lead model is added
    await prisma.auditLog.create({
      data: {
        action: 'LANDING_LEAD_CREATED',
        entityType: 'Lead',
        changes: JSON.stringify({
          name,
          company: company || null,
          email,
          source: 'LANDING_PAGE',
          status: 'NEW',
          timestamp: new Date().toISOString(),
        }),
      },
    });

    console.log('[Landing Contact] Lead saved to audit log:', { name, company, email });

    // Send email notification to sales team
    try {
      const salesEmail =
        process.env.SALES_EMAIL || process.env.ADMIN_EMAIL || 'sales@promo-efect.md';

      // Find admin user to send notification
      const adminUser = await prisma.user.findFirst({
        where: {
          role: { in: ['ADMIN', 'SUPER_ADMIN'] },
        },
      });

      if (adminUser) {
        await notificationService.sendNotification({
          userId: adminUser.id,
          type: 'NEW_LEAD',
          title: `Nou Lead de pe Landing Page: ${name}`,
          message: `Un nou lead a completat formularul de contact:\n\nNume: ${name}\nCompanie: ${company || 'N/A'}\nEmail: ${email}\n\nVă rugăm să contactați lead-ul cât mai curând.`,
          channels: { email: true, push: false, sms: false, whatsapp: false },
        });
      } else {
        // Fallback: log the lead if no admin user found
        console.log(`[Landing Contact] New lead: ${name} (${email}) from ${company || 'N/A'}`);
      }
    } catch (error) {
      console.error('[Landing Contact] Failed to send notification email:', error);
      // Don't fail the request if email fails
    }

    res.json({
      success: true,
      message: 'Thank you for your interest! We will contact you soon.',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Landing contact error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to submit contact form',
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
