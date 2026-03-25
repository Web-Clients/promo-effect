import { Router, Request, Response } from 'express';
import { AuthService } from './auth.service';
import { authMiddleware } from '../../middleware/auth.middleware';
import {
  authLimiter,
  registerLimiter,
  passwordResetLimiter,
} from '../../middleware/rateLimit.middleware';
import { registerSchema, loginSchema } from '../../middleware/validate.middleware';

const router = Router();
const authService = new AuthService();

// POST /api/auth/register
router.post('/register', registerLimiter, async (req: Request, res: Response) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, errors: parsed.error.flatten().fieldErrors });
  }
  try {
    const result = await authService.register(parsed.data);
    res.status(201).json({
      success: true,
      ...result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Registration failed';
    res.status(400).json({
      success: false,
      error: message,
    });
  }
});

// POST /api/auth/login
router.post('/login', authLimiter, async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, errors: parsed.error.flatten().fieldErrors });
  }
  try {
    const { email, password, twoFactorCode } = parsed.data;
    const ipAddress = req.ip || req.socket.remoteAddress || undefined;
    const userAgent = req.headers['user-agent'];

    const result = await authService.login(
      { email, password },
      twoFactorCode,
      ipAddress,
      userAgent
    );

    // If 2FA is required, return special response
    if ('requires2FA' in result && result.requires2FA) {
      return res.status(200).json({
        success: true,
        requires2FA: true,
        tempToken: result.tempToken,
        message: 'Please enter your 2FA code',
      });
    }

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Login failed';
    res.status(401).json({
      success: false,
      error: message,
    });
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    const result = await authService.refreshToken(refreshToken);
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Token refresh failed';
    res.status(401).json({ error: message });
  }
});

// POST /api/auth/logout
router.post('/logout', authMiddleware, async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (token) {
      await authService.logout(token);
    }

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Logout failed';
    res.status(500).json({ error: message });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = await authService.getCurrentUser(req.user!.userId);
    res.json(user);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get user';
    res.status(500).json({ error: message });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', passwordResetLimiter, async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    // Validate email
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const result = await authService.forgotPassword({ email });
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to process request';

    // Rate limit error
    if (message.includes('Too many')) {
      return res.status(429).json({ error: message });
    }

    res.status(500).json({ error: message });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;

    // Validate inputs
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Reset token is required' });
    }

    if (!newPassword || typeof newPassword !== 'string') {
      return res.status(400).json({ error: 'New password is required' });
    }

    const result = await authService.resetPassword({ token, newPassword });
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to reset password';

    // Invalid/expired token
    if (message.includes('Invalid or expired')) {
      return res.status(400).json({ error: message });
    }

    // Password validation errors
    if (message.includes('Password must')) {
      return res.status(400).json({ error: message });
    }

    res.status(500).json({ error: message });
  }
});

// GET /api/auth/verify-email
router.get('/verify-email', async (req: Request, res: Response) => {
  try {
    const { token } = req.query;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Verification token is required' });
    }

    const result = await authService.verifyEmail(token);
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Email verification failed';

    if (message.includes('Invalid or expired')) {
      return res.status(400).json({ error: message });
    }

    res.status(500).json({ error: message });
  }
});

// POST /api/auth/resend-verification
router.post('/resend-verification', registerLimiter, async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const result = await authService.resendVerificationEmail(email);
    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to resend verification email';
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

// POST /api/auth/enable-2fa
router.post('/enable-2fa', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const result = await authService.enable2FA(userId);

    res.json({
      success: true,
      ...result,
      message: 'Scan the QR code with your authenticator app, then verify with a code',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to enable 2FA';

    if (message.includes('already enabled')) {
      return res.status(400).json({ error: message });
    }

    res.status(500).json({ error: message });
  }
});

// POST /api/auth/verify-2fa
router.post('/verify-2fa', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { code } = req.body;
    const userId = req.user!.userId;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: '2FA code is required' });
    }

    const result = await authService.verify2FA(userId, code);
    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to verify 2FA';

    if (message.includes('Invalid') || message.includes('already enabled')) {
      return res.status(400).json({ error: message });
    }

    res.status(500).json({ error: message });
  }
});

// POST /api/auth/disable-2fa
router.post('/disable-2fa', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { password } = req.body;
    const userId = req.user!.userId;

    if (!password || typeof password !== 'string') {
      return res.status(400).json({ error: 'Password is required to disable 2FA' });
    }

    const result = await authService.disable2FA(userId, password);
    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to disable 2FA';

    if (message.includes('Invalid password') || message.includes('not enabled')) {
      return res.status(400).json({ error: message });
    }

    res.status(500).json({ error: message });
  }
});

// POST /api/auth/complete-2fa-login
router.post('/complete-2fa-login', async (req: Request, res: Response) => {
  try {
    const { tempToken, twoFactorCode } = req.body;
    const ipAddress = req.ip || req.socket.remoteAddress || undefined;
    const userAgent = req.headers['user-agent'];

    if (!tempToken || typeof tempToken !== 'string') {
      return res.status(400).json({ error: 'Temporary token is required' });
    }

    if (!twoFactorCode || typeof twoFactorCode !== 'string') {
      return res.status(400).json({ error: '2FA code is required' });
    }

    const result = await authService.complete2FALogin(
      { tempToken, twoFactorCode },
      ipAddress,
      userAgent
    );

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to complete 2FA login';

    if (message.includes('Invalid') || message.includes('expired')) {
      return res.status(400).json({ error: message });
    }

    res.status(500).json({ error: message });
  }
});

export default router;
