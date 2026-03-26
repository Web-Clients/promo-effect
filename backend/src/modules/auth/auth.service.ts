import bcrypt from 'bcrypt';
import crypto from 'crypto';
import prisma from '../../lib/prisma';
import { generateAccessToken, generateRefreshToken } from '../../utils/jwt.util';
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
} from '../../services/email-verification.service';

// Rate limiting storage (in production, use Redis)
const resetAttempts = new Map<string, { count: number; lastAttempt: Date }>();
const MAX_RESET_ATTEMPTS = 3;
const RESET_WINDOW_HOURS = 1;

export interface RegisterDTO {
  email: string;
  password: string;
  name: string;
  phone?: string;
  company?: string;
  role?: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface ForgotPasswordDTO {
  email: string;
}

export interface ResetPasswordDTO {
  token: string;
  newPassword: string;
}

export interface Complete2FALoginDTO {
  tempToken: string;
  twoFactorCode: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  /**
   * Validate password strength
   */
  private validatePassword(password: string): void {
    if (!password || password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    if (!/[A-Z]/.test(password)) {
      throw new Error('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      throw new Error('Password must contain at least one lowercase letter');
    }

    if (!/[0-9]/.test(password)) {
      throw new Error('Password must contain at least one number');
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      throw new Error('Password must contain at least one special character');
    }
  }

  /**
   * Validate email format
   */
  private validateEmail(email: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format');
    }
  }

  async register(data: RegisterDTO): Promise<AuthResponse> {
    // Validate email format
    this.validateEmail(data.email);

    // Validate password strength
    this.validatePassword(data.password);

    // Normalize email (lowercase)
    const normalizedEmail = data.email.toLowerCase().trim();

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      throw new Error('User already exists with this email');
    }

    // Hash password with higher salt rounds for better security
    const passwordHash = await bcrypt.hash(data.password, 12);

    // Generate email verification token (store plain token, not hash)
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // Create user with PENDING_VERIFICATION status
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        name: data.name,
        phone: data.phone,
        company: data.company,
        role: data.role || 'CLIENT',
        emailVerified: false,
        verificationToken, // Store plain token for email link
      },
    });

    // Build verification URL
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const verificationUrl = `${frontendUrl}/verify-email?token=${verificationToken}`;

    // Send verification email
    try {
      await sendVerificationEmail({
        email: user.email,
        name: user.name,
        verificationUrl,
      });
      console.log(`[AuthService] Verification email sent to ${user.email}`);
    } catch (error: any) {
      // Log error but don't fail registration - email can be resent later
      console.error('[AuthService] Failed to send verification email:', error.message);
      console.log('[AuthService] Verification URL (for manual sending):', verificationUrl);
    }

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Calculate expiry (30 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Save session
    await prisma.session.create({
      data: {
        userId: user.id,
        token: accessToken,
        refreshToken,
        expiresAt,
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      accessToken,
      refreshToken,
    };
  }

  async login(
    data: LoginDTO,
    twoFactorCode?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AuthResponse | { requires2FA: boolean; tempToken: string }> {
    // Normalize email
    const normalizedEmail = data.email.toLowerCase().trim();

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Check if email is verified
    if (!user.emailVerified) {
      throw new Error(
        'Please verify your email before logging in. Check your inbox for the verification link.'
      );
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(data.password, user.passwordHash);

    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    // If 2FA is enabled, require 2FA code
    if (user.twoFactorEnabled) {
      if (!twoFactorCode) {
        // Generate temporary token for 2FA verification
        const tempToken = crypto.randomBytes(32).toString('hex');
        const tempTokenHash = crypto.createHash('sha256').update(tempToken).digest('hex');

        // Store temp token in session (expires in 5 minutes)
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 5);

        await prisma.session.create({
          data: {
            userId: user.id,
            token: tempTokenHash,
            refreshToken: '', // Empty for temp token
            expiresAt,
          },
        });

        return {
          requires2FA: true,
          tempToken,
        };
      }

      // Verify 2FA code
      const isValid2FA = await this.verify2FACode(user.twoFactorSecret!, twoFactorCode);

      if (!isValid2FA) {
        // Check backup codes
        const backupCodes = user.backupCodes ? JSON.parse(user.backupCodes) : [];
        const codeIndex = backupCodes.indexOf(twoFactorCode);

        if (codeIndex === -1) {
          throw new Error('Invalid 2FA code');
        }

        // Remove used backup code
        backupCodes.splice(codeIndex, 1);
        await prisma.user.update({
          where: { id: user.id },
          data: { backupCodes: JSON.stringify(backupCodes) },
        });
      }
    }

    // Generate new tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Calculate expiry
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Create new session
    await prisma.session.create({
      data: {
        userId: user.id,
        token: accessToken,
        refreshToken,
        expiresAt,
        ipAddress,
        userAgent,
      },
    });

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: ipAddress,
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      accessToken,
      refreshToken,
    };
  }

  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    // Find session
    const session = await prisma.session.findUnique({
      where: { refreshToken },
      include: { user: true },
    });

    if (!session) {
      throw new Error('Invalid refresh token');
    }

    // Check if expired
    if (session.expiresAt < new Date()) {
      await prisma.session.delete({ where: { id: session.id } });
      throw new Error('Refresh token expired');
    }

    // Generate new tokens
    const user = session.user;
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    // Calculate new expiry
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Update session
    await prisma.session.update({
      where: { id: session.id },
      data: {
        token: newAccessToken,
        refreshToken: newRefreshToken,
        expiresAt,
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(token: string): Promise<void> {
    await prisma.session.deleteMany({
      where: { token },
    });
  }

  async getCurrentUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        company: true,
        role: true,
        createdAt: true,
        lastLoginAt: true,
        twoFactorEnabled: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  /**
   * Request password reset - sends email with reset token
   * Returns generic message for security (don't reveal if email exists)
   */
  async forgotPassword(data: ForgotPasswordDTO): Promise<{ message: string }> {
    const email = data.email.toLowerCase().trim();

    // Rate limiting check
    const attempts = resetAttempts.get(email);
    if (attempts) {
      const hoursSinceLastAttempt =
        (Date.now() - attempts.lastAttempt.getTime()) / (1000 * 60 * 60);

      if (hoursSinceLastAttempt < RESET_WINDOW_HOURS && attempts.count >= MAX_RESET_ATTEMPTS) {
        throw new Error('Too many password reset attempts. Please try again later.');
      }

      // Reset counter if window has passed
      if (hoursSinceLastAttempt >= RESET_WINDOW_HOURS) {
        resetAttempts.delete(email);
      }
    }

    // Update rate limiting
    const currentAttempts = resetAttempts.get(email) || { count: 0, lastAttempt: new Date() };
    resetAttempts.set(email, {
      count: currentAttempts.count + 1,
      lastAttempt: new Date(),
    });

    // Find user (but don't reveal if exists)
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Always return success message for security
    const successMessage =
      'If an account with that email exists, we have sent a password reset link.';

    if (!user) {
      // Don't reveal that email doesn't exist
      return { message: successMessage };
    }

    // Generate secure random token
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Hash the token for storage (store hash, send plain token)
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Set expiry to 1 hour from now
    const resetTokenExpiry = new Date();
    resetTokenExpiry.setHours(resetTokenExpiry.getHours() + 1);

    // Save token to database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: hashedToken,
        resetTokenExpiry,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'PASSWORD_RESET_REQUESTED',
        entityType: 'User',
        entityId: user.id,
        changes: JSON.stringify({ email: user.email, requestedAt: new Date() }),
      },
    });

    // Build reset URL
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

    // Send password reset email
    try {
      await sendPasswordResetEmail(user.email, user.name, resetUrl);
      console.log(`[AuthService] Password reset email sent to ${user.email}`);
    } catch (error: any) {
      // Log error but don't fail - email can be resent later
      console.error('[AuthService] Failed to send password reset email:', error.message);
      console.log('[AuthService] Reset URL (for manual sending):', resetUrl);
    }

    return { message: successMessage };
  }

  /**
   * Reset password using token
   */
  async resetPassword(data: ResetPasswordDTO): Promise<{ message: string }> {
    const { token, newPassword } = data;

    // Validate password strength
    if (!newPassword || newPassword.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    if (!/[A-Z]/.test(newPassword)) {
      throw new Error('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(newPassword)) {
      throw new Error('Password must contain at least one lowercase letter');
    }

    if (!/[0-9]/.test(newPassword)) {
      throw new Error('Password must contain at least one number');
    }

    // Hash the provided token to compare with stored hash
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find user by token and check expiry
    const user = await prisma.user.findFirst({
      where: {
        resetToken: hashedToken,
        resetTokenExpiry: {
          gt: new Date(), // Token must not be expired
        },
      },
    });

    if (!user) {
      throw new Error('Invalid or expired password reset token');
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    // Invalidate all existing sessions (security measure)
    await prisma.session.deleteMany({
      where: { userId: user.id },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'PASSWORD_RESET_COMPLETED',
        entityType: 'User',
        entityId: user.id,
        changes: JSON.stringify({ completedAt: new Date() }),
      },
    });

    console.log(`Password reset completed for user: ${user.email}`);

    return {
      message: 'Password has been reset successfully. You can now login with your new password.',
    };
  }

  /**
   * Verify email address using verification token
   */
  /**
   * Resend verification email
   */
  async resendVerificationEmail(email: string): Promise<{ message: string }> {
    const normalizedEmail = email.toLowerCase().trim();

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      // Don't reveal if email exists for security
      return {
        message:
          'If an account with that email exists and is not verified, we have sent a verification email.',
      };
    }

    // Check if already verified
    if (user.emailVerified) {
      return { message: 'Email is already verified' };
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // Update user with new token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        verificationToken,
      },
    });

    // Build verification URL
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const verificationUrl = `${frontendUrl}/verify-email?token=${verificationToken}`;

    // Send verification email
    try {
      await sendVerificationEmail({
        email: user.email,
        name: user.name,
        verificationUrl,
      });
      console.log(`[AuthService] Verification email resent to ${user.email}`);
    } catch (error: any) {
      console.error('[AuthService] Failed to resend verification email:', error.message);
      throw new Error('Failed to send verification email. Please try again later.');
    }

    return {
      message:
        'If an account with that email exists and is not verified, we have sent a verification email.',
    };
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    // Find user by verification token (stored as plain token)
    const user = await prisma.user.findFirst({
      where: {
        verificationToken: token,
      },
    });

    if (!user) {
      throw new Error('Invalid or expired verification token');
    }

    // Check if already verified
    if (user.emailVerified) {
      return { message: 'Email is already verified' };
    }

    // Mark email as verified and clear token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verificationToken: null,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'EMAIL_VERIFIED',
        entityType: 'User',
        entityId: user.id,
        changes: JSON.stringify({ verifiedAt: new Date() }),
      },
    });

    return { message: 'Email verified successfully. You can now login.' };
  }

  /**
   * Verify 2FA TOTP code
   */
  private async verify2FACode(secret: string, code: string): Promise<boolean> {
    try {
      // Dynamic import to avoid issues if package not installed
      const speakeasy = await import('speakeasy');

      return speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token: code,
        window: 2, // Allow 2 time steps (60 seconds) of tolerance
      });
    } catch (error) {
      console.error('2FA verification error:', error);
      return false;
    }
  }

  /**
   * Enable 2FA for user - generates secret and QR code
   */
  async enable2FA(
    userId: string
  ): Promise<{ secret: string; qrCodeUrl: string; backupCodes: string[] }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (user.twoFactorEnabled) {
      throw new Error('2FA is already enabled');
    }

    // Dynamic import
    const speakeasy = await import('speakeasy');
    const qrcode = await import('qrcode');

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `Promo-Efect (${user.email})`,
      length: 32,
    });

    // Generate backup codes (10 codes, 8 characters each)
    const backupCodes: string[] = [];
    for (let i = 0; i < 10; i++) {
      backupCodes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }

    // Generate QR code
    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url!);

    // Save secret and backup codes (but don't enable yet - user must verify first)
    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorSecret: secret.base32,
        backupCodes: JSON.stringify(backupCodes),
        // Don't enable yet - wait for verification
      },
    });

    return {
      secret: secret.base32!,
      qrCodeUrl,
      backupCodes,
    };
  }

  /**
   * Verify 2FA code and enable 2FA
   */
  async verify2FA(userId: string, code: string): Promise<{ message: string }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (!user.twoFactorSecret) {
      throw new Error('2FA secret not found. Please enable 2FA first.');
    }

    if (user.twoFactorEnabled) {
      throw new Error('2FA is already enabled');
    }

    // Verify code
    const isValid = await this.verify2FACode(user.twoFactorSecret, code);

    if (!isValid) {
      throw new Error('Invalid 2FA code');
    }

    // Enable 2FA
    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: true,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: '2FA_ENABLED',
        entityType: 'User',
        entityId: userId,
        changes: JSON.stringify({ enabledAt: new Date() }),
      },
    });

    return { message: '2FA has been enabled successfully' };
  }

  /**
   * Disable 2FA for user (requires password confirmation)
   */
  async disable2FA(userId: string, password: string): Promise<{ message: string }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (!user.twoFactorEnabled) {
      throw new Error('2FA is not enabled');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);

    if (!isValidPassword) {
      throw new Error('Invalid password');
    }

    // Disable 2FA and clear secret
    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        backupCodes: null,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: '2FA_DISABLED',
        entityType: 'User',
        entityId: userId,
        changes: JSON.stringify({ disabledAt: new Date() }),
      },
    });

    return { message: '2FA has been disabled successfully' };
  }

  /**
   * Complete login with 2FA using temp token
   * This is called after user enters 2FA code
   */
  async complete2FALogin(
    data: Complete2FALoginDTO,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AuthResponse> {
    const { tempToken, twoFactorCode } = data;

    // Hash temp token to find session
    const tempTokenHash = crypto.createHash('sha256').update(tempToken).digest('hex');

    // Find session by temp token
    const session = await prisma.session.findFirst({
      where: {
        token: tempTokenHash,
        expiresAt: {
          gt: new Date(), // Must not be expired
        },
      },
      include: { user: true },
    });

    if (!session) {
      throw new Error('Invalid or expired temporary token');
    }

    const user = session.user;

    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new Error('2FA is not enabled for this user');
    }

    // Verify 2FA code
    const isValid2FA = await this.verify2FACode(user.twoFactorSecret, twoFactorCode);

    if (!isValid2FA) {
      // Check backup codes
      const backupCodes = user.backupCodes ? JSON.parse(user.backupCodes) : [];
      const codeIndex = backupCodes.indexOf(twoFactorCode);

      if (codeIndex === -1) {
        throw new Error('Invalid 2FA code');
      }

      // Remove used backup code
      backupCodes.splice(codeIndex, 1);
      await prisma.user.update({
        where: { id: user.id },
        data: { backupCodes: JSON.stringify(backupCodes) },
      });
    }

    // Delete temp session
    await prisma.session.delete({
      where: { id: session.id },
    });

    // Generate real tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Calculate expiry
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Create real session
    await prisma.session.create({
      data: {
        userId: user.id,
        token: accessToken,
        refreshToken,
        expiresAt,
        ipAddress,
        userAgent,
      },
    });

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: ipAddress,
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      accessToken,
      refreshToken,
    };
  }
}
