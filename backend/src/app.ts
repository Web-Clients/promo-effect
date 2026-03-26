// FIX: Explicitly import Request, Response, and NextFunction to avoid type collisions with other libraries (e.g., DOM types).
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { doubleCsrf } from 'csrf-csrf';
import authRoutes from './modules/auth/auth.routes';
import bookingsRoutes from './modules/bookings/bookings.routes';
import clientRoutes from './modules/clients/client.routes';
import invoiceRoutes from './modules/invoices/invoice.routes';
import trackingRoutes from './modules/tracking/tracking.routes';
import calculatorRoutes from './modules/calculator/calculator.controller';
import emailRoutes from './modules/emails/email.controller';
import usersRoutes from './modules/users/users.routes';
import paymentsRoutes from './modules/payments/payments.routes';
import notificationsRoutes from './modules/notifications/notifications.routes';
import settingsRoutes from './modules/settings/settings.routes';
import reportsRoutes from './modules/reports/reports.routes';
import pricingRoutes from './modules/pricing/pricing.routes';
import landingRoutes from './modules/landing/landing.routes';
import hscodesRoutes from './modules/hscodes/hscodes.routes';
import adminPricingRoutes from './modules/admin-pricing/admin-pricing.routes';
import agentsRoutes from './modules/agents/agents.routes';
import adminDashboardRoutes from './modules/admin/admin-dashboard.routes';
import agentPortalRoutes from './modules/agent-portal/agent-portal.routes';
import portsRoutes from './modules/ports/ports.routes';
import shippingLinesRoutes from './modules/shipping-lines/shipping-lines.routes';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';
import { apiLimiter } from './middleware/rateLimit.middleware';

const app = express();

// Trust proxy (required when behind Nginx/reverse proxy for rate limiting)
app.set('trust proxy', 1);

// Middlewares
app.use(helmet());

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.some((allowed) => origin.startsWith(allowed))) {
        return callback(null, true);
      }
      if (
        process.env.NODE_ENV === 'development' &&
        /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)/.test(origin)
      ) {
        return callback(null, true);
      }
      callback(new Error(`CORS: Origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-csrf-token'],
  })
);
// FIX: The errors on app.use were likely due to a cascading type resolution issue.
// Explicitly typing route handlers below should resolve this.
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// CSRF protection — double-submit cookie pattern
const { doubleCsrfProtection, generateCsrfToken } = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET || process.env.JWT_SECRET || 'csrf-fallback-secret',
  getSessionIdentifier: (req) => req.ip || '',
  cookieName: '__csrf',
  cookieOptions: {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
  },
  getCsrfTokenFromRequest: (req) => req.headers['x-csrf-token'] as string,
});

// CSRF token endpoint — must be BEFORE the protection middleware
app.get('/api/csrf-token', (req: Request, res: Response) => {
  const token = generateCsrfToken(req, res);
  res.json({ token });
});

// Apply CSRF protection to state-changing API routes (skip GET/HEAD/OPTIONS)
app.use('/api', (req: Request, res: Response, next: NextFunction) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  doubleCsrfProtection(req, res, next);
});

// Rate limiting - apply to all API routes
app.use('/api', apiLimiter);

// Health Check Route
// FIX: Explicitly type req and res to ensure correct type resolution for res.status.
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'UP', timestamp: new Date().toISOString() });
});

// Swagger/OpenAPI Documentation
app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Promo-Efect API Documentation',
    customfavIcon: '/favicon.ico',
  })
);

// Swagger JSON endpoint
app.get('/api-docs.json', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// API Routes - Version 1
// Все основные API endpoints под версией v1 для backward compatibility
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/clients', clientRoutes);
app.use('/api/v1/bookings', bookingsRoutes);
app.use('/api/v1/containers', trackingRoutes); // Containers endpoints
app.use('/api/v1/tracking', trackingRoutes);
app.use('/api/v1/invoices', invoiceRoutes);
app.use('/api/v1/payments', paymentsRoutes);
app.use('/api/v1/notifications', notificationsRoutes);
app.use('/api/v1/reports', reportsRoutes);
app.use('/api/v1/settings', settingsRoutes);
app.use('/api/v1/pricing', pricingRoutes);
app.use('/api/v1/calculator', calculatorRoutes);
app.use('/api/v1/hscodes', hscodesRoutes); // HS codes lookup
app.use('/api/v1/landing', landingRoutes); // Landing page public endpoints

// Legacy routes (backward compatibility - will be deprecated)
app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/calculator', calculatorRoutes);

// Admin routes (no versioning for internal tools)
app.use('/api/admin', emailRoutes); // Email processing (admin only)
app.use('/api/emails', emailRoutes); // Email parsing endpoints
app.use('/api/admin-pricing', adminPricingRoutes); // Admin pricing management
app.use('/api/agents', agentsRoutes); // Agents management
app.use('/api/admin/dashboard', adminDashboardRoutes); // Admin dashboard stats
app.use('/api/agent-portal', agentPortalRoutes); // Agent portal (prices with approval)
app.use('/api/ports', portsRoutes); // Ports management (public GET, admin CRUD)
app.use('/api/shipping-lines', shippingLinesRoutes); // Shipping lines & transport rates

// Static file serving for storage (invoices, documents, etc.)
import path from 'path';
const storagePath = process.env.LOCAL_STORAGE_PATH || path.join(__dirname, '../storage');
app.use(
  '/storage',
  express.static(storagePath, {
    setHeaders: (res, filePath) => {
      // Set appropriate headers for PDF files
      if (filePath.endsWith('.pdf')) {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline');
      }
    },
  })
);

// Error handling middleware
// FIX: Using explicitly imported Request, Response, and NextFunction types to fix 'status' property not found error.
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.path}:`, err.message);

  const statusCode = (err as any).statusCode || 500;
  const message = process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message;

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
});

export default app;
