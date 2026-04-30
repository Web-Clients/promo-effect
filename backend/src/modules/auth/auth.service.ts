import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../../lib/prisma';
import { generateAccessToken, generateRefreshToken } from '../../utils/jwt.util';
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
} from '../../services/email-verification.service';
import {
  RegisterDTO,
  LoginDTO,
  ForgotPasswordDTO,
  ResetPasswordDTO,
  Complete2FALoginDTO,
  AuthResponse,
} from './auth.types';
import {
  verify2FACode,
  enable2FA,
  verify2FA,
  disable2FA,
  complete2FALogin,
} from './auth-2fa.service';

// Re-export types for backward compatibility
export {
  RegisterDTO,
  LoginDTO,
  ForgotPasswordDTO,
  ResetPasswordDTO,
  Complete2FALoginDTO,
  AuthResponse,
};

// Re-export 2FA functions for backward compatibility
export { enable2FA, verify2FA, disable2FA, complete2FALogin };

// Rate limiting storage (in production, use Redis)
const resetAttempts = new Map<string, { count: number; lastAttempt: Date }>();
const MAX_RESET_ATTEMPTS = 3;
const RESET_WINDOW_HOURS = 1;

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

    // Hash password with higher salt rounds for better security
    const passwordHash = await bcrypt.hash(data.password, 12);

    // B9: Generate verification token; hash before storage
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenHash = crypto
      .createHash('sha256')
      .update(verificationToken)
      .digest('hex');

    // B8: Replace findUnique+create pattern with direct create.
    // Unique constraint on email is enforced by DB — catch P2002 for race-safe 409.
    let user: Awaited<ReturnType<typeof prisma.user.create>>;
    try {
      user = await prisma.user.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          name: data.name,
          phone: data.phone,
          company: data.company,
          role: data.role || 'CLIENT',
          emailVerified: false,
          // B9: Store hash only; plain token goes in the email URL
          verificationTokenHash,
          verificationToken: null, // legacy field kept null
        },
      });
    } catch (err: any) {
      // P2002 = Prisma unique constraint violation (race-safe duplicate detection)
      if (err?.code === 'P2002') {
        throw new Error('User already exists with this email');
      }
      throw err;
    }

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

    // B1: Assign a new token family for this login session
    const tokenFamily = uuidv4();

    // Save session
    await prisma.session.create({
      data: {
        userId: user.id,
        token: accessToken,
        refreshToken,
        expiresAt,
        tokenFamily,
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
      const isValid2FA = await verify2FACode(user.twoFactorSecret!, twoFactorCode);

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

    // B1: New token family for each fresh login
    const loginTokenFamily = uuidv4();

    // Create new session
    await prisma.session.create({
      data: {
        userId: user.id,
        token: accessToken,
        refreshToken,
        expiresAt,
        ipAddress,
        userAgent,
        tokenFamily: loginTokenFamily,
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

  /**
   * B1: Refresh token rotation with replay detection.
   *
   * Flow:
   *  1. Look up session by refreshToken.
   *  2a. If NOT found → invalid token, reject.
   *  2b. If found but REVOKED → reuse attack detected.
   *      Revoke entire token family + log security incident, reject.
   *  3. If expired → delete session, reject.
   *  4. Otherwise: mark old session revoked, issue NEW access + refresh tokens
   *     in a NEW session record (same tokenFamily). All wrapped in a transaction.
   */
  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    // Find session (including revoked ones so we can detect reuse)
    const session = await prisma.session.findUnique({
      where: { refreshToken },
      include: { user: true },
    });

    if (!session) {
      throw new Error('Invalid refresh token');
    }

    // B1: Reuse detection — token was already rotated (revoked)
    if (session.revoked) {
      // Revoke entire family to protect against token theft
      if (session.tokenFamily) {
        await prisma.session.updateMany({
          where: { tokenFamily: session.tokenFamily },
          data: { revoked: true, revokedAt: new Date() },
        });
      }

      // Audit log for security incident
      await prisma.auditLog.create({
        data: {
          userId: session.userId,
          action: 'REFRESH_TOKEN_REUSE_DETECTED',
          entityType: 'Session',
          entityId: session.id,
          changes: JSON.stringify({
            tokenFamily: session.tokenFamily,
            detectedAt: new Date(),
            note: 'Entire token family revoked due to refresh token reuse (possible token theft)',
          }),
        },
      });

      throw new Error('Refresh token reuse detected. All sessions invalidated for security.');
    }

    // Check if expired
    if (session.expiresAt < new Date()) {
      await prisma.session.delete({ where: { id: session.id } });
      throw new Error('Refresh token expired');
    }

    const user = session.user;
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // B1: Atomic rotation — revoke old, create new (same family)
    await prisma.$transaction([
      // Mark old session as revoked (keep for reuse detection)
      prisma.session.update({
        where: { id: session.id },
        data: { revoked: true, revokedAt: new Date() },
      }),
      // Create new session inheriting the same token family
      prisma.session.create({
        data: {
          userId: user.id,
          token: newAccessToken,
          refreshToken: newRefreshToken,
          expiresAt,
          ipAddress: session.ipAddress,
          userAgent: session.userAgent,
          tokenFamily: session.tokenFamily, // inherit family
        },
      }),
    ]);

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

    // Generate secure random token (plain token sent in email, hash stored in DB)
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    // B7: Set expiry to 1 hour from now
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    // B7: Store in dedicated password_reset_tokens table (single-use enforced via usedAt)
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashedToken,
        expiresAt,
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

    // B7: Look up in dedicated table
    const resetRecord = await prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashedToken },
      include: { user: true },
    });

    if (!resetRecord) {
      throw new Error('Invalid or expired password reset token');
    }

    // B7: Replay detection — token already used
    if (resetRecord.usedAt !== null) {
      await prisma.auditLog.create({
        data: {
          userId: resetRecord.userId,
          action: 'PASSWORD_RESET_REPLAY_ATTEMPT',
          entityType: 'PasswordResetToken',
          entityId: resetRecord.id,
          changes: JSON.stringify({
            tokenHash: hashedToken,
            originalUsedAt: resetRecord.usedAt,
            attemptAt: new Date(),
          }),
        },
      });
      throw new Error('Password reset token has already been used');
    }

    // B7: Expiry check
    if (resetRecord.expiresAt < new Date()) {
      throw new Error('Invalid or expired password reset token');
    }

    const user = resetRecord.user;

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // B7: Mark token as used (single-use) + update password atomically
    await prisma.$transaction([
      prisma.passwordResetToken.update({
        where: { id: resetRecord.id },
        data: { usedAt: new Date() },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      }),
    ]);

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

    // B9: Generate new verification token; store hash only
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenHash = crypto
      .createHash('sha256')
      .update(verificationToken)
      .digest('hex');

    // Update user with new token hash
    await prisma.user.update({
      where: { id: user.id },
      data: {
        verificationTokenHash,
        verificationToken: null, // clear legacy plain field
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
    // B9: Hash the incoming token and lookup by hash (never store plain token in DB)
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await prisma.user.findFirst({
      where: {
        verificationTokenHash: tokenHash,
      },
    });

    if (!user) {
      throw new Error('Invalid or expired verification token');
    }

    // Check if already verified
    if (user.emailVerified) {
      return { message: 'Email is already verified' };
    }

    // Mark email as verified and clear token hash
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verificationTokenHash: null,
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

  // Expose 2FA methods as class methods for backward compatibility
  enable2FA = enable2FA;
  verify2FA = verify2FA;
  disable2FA = disable2FA;
  complete2FALogin = complete2FALogin;
}
