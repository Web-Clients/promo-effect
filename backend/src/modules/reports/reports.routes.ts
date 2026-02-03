/**
 * Reports Routes
 * API endpoints for reports and analytics
 */

import { Router, Request, Response } from 'express';
import { ReportsService } from './reports.service';
import { authMiddleware } from '../../middleware/auth.middleware';
import { reportLimiter } from '../../middleware/rateLimit.middleware';
import { reportExportService } from '../../services/report-export.service';

const router = Router();
const reportsService = new ReportsService();

/**
 * GET /api/v1/reports/dashboard
 * Get dashboard data (KPIs, charts, recent activity)
 * Access: Authenticated users
 */
router.get('/dashboard', authMiddleware, reportLimiter, async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).user;
    const filters: any = {
      dateFrom: req.query.date_from ? new Date(req.query.date_from as string) : undefined,
      dateTo: req.query.date_to ? new Date(req.query.date_to as string) : undefined,
    };

    // CLIENT users can only see their own data
    if (currentUser.role === 'CLIENT') {
      // TODO: Get clientId from user relationship
      // filters.clientId = currentUser.clientId;
    } else if (req.query.client_id) {
      filters.clientId = req.query.client_id as string;
    }

    const dashboard = await reportsService.getDashboard(filters);
    res.json({
      success: true,
      data: dashboard,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch dashboard';
    res.status(500).json({
      success: false,
      error: message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/v1/reports/containers
 * Get containers report
 * Access: Authenticated users
 * Query params: export_format (pdf|excel|csv) - if provided, returns file instead of JSON
 */
router.get('/containers', authMiddleware, async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).user;
    const filters: any = {
      dateFrom: req.query.date_from ? new Date(req.query.date_from as string) : undefined,
      dateTo: req.query.date_to ? new Date(req.query.date_to as string) : undefined,
      status: req.query.status as string,
      portOrigin: req.query.port_origin as string,
      portDestination: req.query.port_destination as string,
      shippingLine: req.query.shipping_line as string,
    };

    // CLIENT users can only see their own data
    if (currentUser.role === 'CLIENT') {
      // TODO: Get clientId from user relationship
    } else if (req.query.client_id) {
      filters.clientId = req.query.client_id as string;
    }

    const report = await reportsService.getContainersReport(filters);

    // Check if export is requested
    const exportFormat = req.query.export_format as 'pdf' | 'excel' | 'csv' | undefined;
    if (exportFormat) {
      const exportResult = await reportExportService.exportReport({
        format: exportFormat,
        reportType: 'containers',
        data: report,
        title: 'Raport Containere',
        filename: `containers-report-${new Date().toISOString().split('T')[0]}.${exportFormat === 'excel' ? 'xlsx' : exportFormat}`,
      });

      res.setHeader('Content-Type', exportResult.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${exportResult.filename}"`);
      res.setHeader('Content-Length', exportResult.buffer.length);
      return res.send(exportResult.buffer);
    }

    res.json({
      success: true,
      data: report.data,
      statistics: report.statistics,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch containers report';
    res.status(500).json({
      success: false,
      error: message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/v1/reports/financiar
 * Get financial report
 * Access: ADMIN, MANAGER
 * Query params: export_format (pdf|excel|csv) - if provided, returns file instead of JSON
 */
router.get('/financiar', authMiddleware, async (req: Request, res: Response) => {
  try {
    const filters: any = {
      dateFrom: req.query.date_from ? new Date(req.query.date_from as string) : undefined,
      dateTo: req.query.date_to ? new Date(req.query.date_to as string) : undefined,
      clientId: req.query.client_id as string,
      groupBy: (req.query.group_by as 'day' | 'month' | 'quarter' | 'year') || 'month',
    };

    const report = await reportsService.getFinancialReport(filters);

    // Check if export is requested
    const exportFormat = req.query.export_format as 'pdf' | 'excel' | 'csv' | undefined;
    if (exportFormat) {
      const exportResult = await reportExportService.exportReport({
        format: exportFormat,
        reportType: 'financial',
        data: report,
        title: 'Raport Financiar',
        filename: `financial-report-${new Date().toISOString().split('T')[0]}.${exportFormat === 'excel' ? 'xlsx' : exportFormat}`,
      });

      res.setHeader('Content-Type', exportResult.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${exportResult.filename}"`);
      res.setHeader('Content-Length', exportResult.buffer.length);
      return res.send(exportResult.buffer);
    }

    res.json({
      success: true,
      data: report,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch financial report';
    res.status(500).json({
      success: false,
      error: message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/v1/reports/client-performance
 * Get client performance report
 * Access: ADMIN, MANAGER
 * Query params: export_format (pdf|excel|csv) - if provided, returns file instead of JSON
 */
router.get('/client-performance', authMiddleware, async (req: Request, res: Response) => {
  try {
    const clientId = req.query.client_id as string | undefined;
    const report = await reportsService.getClientPerformance(clientId);

    // Check if export is requested
    const exportFormat = req.query.export_format as 'pdf' | 'excel' | 'csv' | undefined;
    if (exportFormat) {
      const exportResult = await reportExportService.exportReport({
        format: exportFormat,
        reportType: 'client-performance',
        data: report,
        title: 'Raport Performanță Clienți',
        filename: `client-performance-report-${new Date().toISOString().split('T')[0]}.${exportFormat === 'excel' ? 'xlsx' : exportFormat}`,
      });

      res.setHeader('Content-Type', exportResult.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${exportResult.filename}"`);
      res.setHeader('Content-Length', exportResult.buffer.length);
      return res.send(exportResult.buffer);
    }

    res.json({
      success: true,
      data: report,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch client performance';
    res.status(500).json({
      success: false,
      error: message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/v1/reports/operational
 * Get operational report with internal metrics
 * Access: ADMIN, MANAGER
 * Query params: export_format (pdf|excel|csv) - if provided, returns file instead of JSON
 */
router.get('/operational', authMiddleware, async (req: Request, res: Response) => {
  try {
    const dateFrom = req.query.date_from ? new Date(req.query.date_from as string) : undefined;
    const dateTo = req.query.date_to ? new Date(req.query.date_to as string) : undefined;

    const report = await reportsService.getOperationalReport(dateFrom, dateTo);

    // Check if export is requested
    const exportFormat = req.query.export_format as 'pdf' | 'excel' | 'csv' | undefined;
    if (exportFormat) {
      const exportResult = await reportExportService.exportReport({
        format: exportFormat,
        reportType: 'operational',
        data: report,
        title: 'Raport Operațional',
        filename: `operational-report-${new Date().toISOString().split('T')[0]}.${exportFormat === 'excel' ? 'xlsx' : exportFormat}`,
      });

      res.setHeader('Content-Type', exportResult.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${exportResult.filename}"`);
      res.setHeader('Content-Length', exportResult.buffer.length);
      return res.send(exportResult.buffer);
    }

    res.json({
      success: true,
      data: report,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch operational report';
    res.status(500).json({
      success: false,
      error: message,
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;

