/**
 * Auth 2FA Service
 * Handles Two-Factor Authentication operations
 */

import crypto from 'crypto';
import bcrypt from 'bcrypt';
import prisma from '../../lib/prisma';
import { generateAccessToken, generateRefreshToken } from '../../utils/jwt.util';
import { AuthResponse, Complete2FALoginDTO } from './auth.types';

/**
 * Verify 2FA TOTP code
 */
export async function verify2FACode(secret: string, code: string): Promise<boolean> {
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
export async function enable2FA(
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
export async function verify2FA(userId: string, code: string): Promise<{ message: string }> {
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
  const isValid = await verify2FACode(user.twoFactorSecret, code);

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
export async function disable2FA(userId: string, password: string): Promise<{ message: string }> {
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
export async function complete2FALogin(
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
  const isValid2FA = await verify2FACode(user.twoFactorSecret, twoFactorCode);

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
