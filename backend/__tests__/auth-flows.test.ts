/**
 * Task F2 — Auth flow tests
 * Covers: AuthService (register, login, 2FA, password reset, refresh token rotation, race condition)
 * All Prisma calls are mocked via jest.mock.
 */

import { jest } from '@jest/globals';

// ─── Mock uuid (ESM-only package) ─────────────────────────────────────────────
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-family'),
}));

// ─── Mock prisma ──────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockPrisma: any = {
  user: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
  },
  session: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  passwordResetToken: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  auditLog: {
    create: jest.fn(),
  },
  $transaction: jest.fn(),
};

jest.mock('../src/lib/prisma', () => ({
  __esModule: true,
  default: mockPrisma,
}));

// ─── Mock email services ──────────────────────────────────────────────────────

jest.mock('../src/services/email-verification.service', () => ({
  sendVerificationEmail: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
}));

// ─── Mock jwt utils ───────────────────────────────────────────────────────────

jest.mock('../src/utils/jwt.util', () => ({
  generateAccessToken: jest.fn(() => 'mock-access-token'),
  generateRefreshToken: jest.fn(() => 'mock-refresh-token'),
}));

// ─── Mock speakeasy (2FA) ─────────────────────────────────────────────────────

const mockSpeakeasy = {
  totp: { verify: jest.fn(() => true) },
  generateSecret: jest.fn(() => ({
    base32: 'MOCK_SECRET_BASE32',
    otpauth_url: 'otpauth://totp/test',
  })),
};
jest.mock('speakeasy', () => mockSpeakeasy);
jest.mock('qrcode', () => ({
  toDataURL: jest.fn(async () => 'data:image/png;base64,mock'),
}));

// ─── Imports after mocks ──────────────────────────────────────────────────────

import { AuthService } from '../src/modules/auth/auth.service';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    passwordHash: '$2b$12$mockhashmockhashhashhashhashhashhashhash',
    role: 'CLIENT',
    emailVerified: true,
    twoFactorEnabled: false,
    twoFactorSecret: null,
    backupCodes: null,
    verificationToken: null,
    verificationTokenHash: null,
    lastLoginAt: null,
    lastLoginIp: null,
    ...overrides,
  };
}

function makeSession(overrides: Record<string, unknown> = {}) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);
  return {
    id: 'session-1',
    userId: 'user-1',
    token: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    expiresAt,
    revoked: false,
    revokedAt: null,
    tokenFamily: 'family-1',
    ipAddress: null,
    userAgent: null,
    user: makeUser(),
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    service = new AuthService();
    jest.clearAllMocks();
    // Default: transaction runs each fn immediately
    mockPrisma.$transaction.mockImplementation(async (fns: unknown) => {
      if (Array.isArray(fns)) {
        return Promise.all(fns);
      }
      return (fns as (prisma: unknown) => unknown)(mockPrisma);
    });
    mockPrisma.auditLog.create.mockResolvedValue({});
  });

  // ──────────────────────────────────────────────────────────
  // REGISTER
  // ──────────────────────────────────────────────────────────

  describe('register', () => {
    const validRegisterData = {
      email: 'new@example.com',
      password: 'Password1!',
      name: 'New User',
    };

    it('creates user and returns tokens on success', async () => {
      const user = makeUser({ email: 'new@example.com' });
      mockPrisma.user.create.mockResolvedValue(user);
      mockPrisma.session.create.mockResolvedValue({});

      const result = await service.register(validRegisterData);

      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toBe('mock-refresh-token');
      expect(result.user.email).toBe('new@example.com');
    });

    it('throws on duplicate email (Prisma P2002)', async () => {
      const err = new Error('Unique constraint failed');
      (err as any).code = 'P2002';
      mockPrisma.user.create.mockRejectedValue(err);

      await expect(service.register(validRegisterData)).rejects.toThrow(
        'User already exists with this email'
      );
    });

    it('rejects weak password — no uppercase', async () => {
      await expect(
        service.register({ ...validRegisterData, password: 'password1!' })
      ).rejects.toThrow('uppercase');
    });

    it('rejects weak password — no special char', async () => {
      await expect(
        service.register({ ...validRegisterData, password: 'Password1' })
      ).rejects.toThrow('special character');
    });

    it('rejects weak password — too short', async () => {
      await expect(service.register({ ...validRegisterData, password: 'P1!' })).rejects.toThrow(
        '8 characters'
      );
    });

    it('rejects invalid email format', async () => {
      await expect(
        service.register({ ...validRegisterData, email: 'not-an-email' })
      ).rejects.toThrow('Invalid email format');
    });

    it('normalizes email to lowercase', async () => {
      const user = makeUser({ email: 'new@example.com' });
      mockPrisma.user.create.mockResolvedValue(user);
      mockPrisma.session.create.mockResolvedValue({});

      await service.register({ ...validRegisterData, email: 'NEW@Example.COM' });

      const createCall = mockPrisma.user.create.mock.calls[0][0] as any;
      expect(createCall.data.email).toBe('new@example.com');
    });
  });

  // ──────────────────────────────────────────────────────────
  // LOGIN
  // ──────────────────────────────────────────────────────────

  describe('login', () => {
    it('returns tokens for valid credentials', async () => {
      const bcrypt = await import('bcrypt');
      const hash = await bcrypt.hash('Password1!', 12);
      const user = makeUser({ passwordHash: hash, emailVerified: true });
      mockPrisma.user.findUnique.mockResolvedValue(user);
      mockPrisma.session.create.mockResolvedValue({});
      mockPrisma.user.update.mockResolvedValue(user);

      const result = await service.login({ email: 'test@example.com', password: 'Password1!' });
      expect((result as any).accessToken).toBe('mock-access-token');
    });

    it('throws on wrong password', async () => {
      const bcrypt = await import('bcrypt');
      const hash = await bcrypt.hash('CorrectPassword1!', 12);
      const user = makeUser({ passwordHash: hash, emailVerified: true });
      mockPrisma.user.findUnique.mockResolvedValue(user);

      await expect(
        service.login({ email: 'test@example.com', password: 'WrongPassword1!' })
      ).rejects.toThrow('Invalid email or password');
    });

    it('throws if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'notfound@example.com', password: 'Password1!' })
      ).rejects.toThrow('Invalid email or password');
    });

    it('throws if email not verified', async () => {
      const bcrypt = await import('bcrypt');
      const hash = await bcrypt.hash('Password1!', 12);
      const user = makeUser({ passwordHash: hash, emailVerified: false });
      mockPrisma.user.findUnique.mockResolvedValue(user);

      await expect(
        service.login({ email: 'test@example.com', password: 'Password1!' })
      ).rejects.toThrow('verify your email');
    });

    it('returns requires2FA when 2FA is enabled and no code provided', async () => {
      const bcrypt = await import('bcrypt');
      const hash = await bcrypt.hash('Password1!', 12);
      const user = makeUser({
        passwordHash: hash,
        emailVerified: true,
        twoFactorEnabled: true,
        twoFactorSecret: 'SECRET',
      });
      mockPrisma.user.findUnique.mockResolvedValue(user);
      mockPrisma.session.create.mockResolvedValue({});

      const result = await service.login({ email: 'test@example.com', password: 'Password1!' });
      expect((result as any).requires2FA).toBe(true);
      expect((result as any).tempToken).toBeDefined();
    });
  });

  // ──────────────────────────────────────────────────────────
  // 2FA enable / disable
  // ──────────────────────────────────────────────────────────

  describe('2FA enable/disable', () => {
    it('enable2FA returns secret + qrCodeUrl + backupCodes', async () => {
      const user = makeUser({ twoFactorEnabled: false });
      mockPrisma.user.findUnique.mockResolvedValue(user);
      mockPrisma.user.update.mockResolvedValue({});

      const result = await service.enable2FA('user-1');
      expect(result.secret).toBe('MOCK_SECRET_BASE32');
      expect(result.qrCodeUrl).toContain('data:image/png');
      expect(result.backupCodes).toHaveLength(10);
    });

    it('enable2FA throws if 2FA already enabled', async () => {
      const user = makeUser({ twoFactorEnabled: true });
      mockPrisma.user.findUnique.mockResolvedValue(user);

      await expect(service.enable2FA('user-1')).rejects.toThrow('already enabled');
    });

    it('enable2FA throws if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.enable2FA('nonexistent')).rejects.toThrow('User not found');
    });

    it('verify2FA enables 2FA after correct code', async () => {
      const user = makeUser({
        twoFactorEnabled: false,
        twoFactorSecret: 'MOCK_SECRET_BASE32',
      });
      mockPrisma.user.findUnique.mockResolvedValue(user);
      mockSpeakeasy.totp.verify.mockReturnValue(true as never);
      mockPrisma.user.update.mockResolvedValue({});

      const result = await service.verify2FA('user-1', '123456');
      expect(result.message).toContain('enabled');
    });

    it('verify2FA throws on invalid code', async () => {
      const user = makeUser({
        twoFactorEnabled: false,
        twoFactorSecret: 'MOCK_SECRET_BASE32',
      });
      mockPrisma.user.findUnique.mockResolvedValue(user);
      mockSpeakeasy.totp.verify.mockReturnValue(false as never);

      await expect(service.verify2FA('user-1', '000000')).rejects.toThrow('Invalid 2FA code');
    });

    it('disable2FA requires correct password', async () => {
      const bcrypt = await import('bcrypt');
      const hash = await bcrypt.hash('Password1!', 12);
      const user = makeUser({
        passwordHash: hash,
        twoFactorEnabled: true,
      });
      mockPrisma.user.findUnique.mockResolvedValue(user);
      mockPrisma.user.update.mockResolvedValue({});

      const result = await service.disable2FA('user-1', 'Password1!');
      expect(result.message).toContain('disabled');
    });

    it('disable2FA throws on wrong password', async () => {
      const bcrypt = await import('bcrypt');
      const hash = await bcrypt.hash('Password1!', 12);
      const user = makeUser({ passwordHash: hash, twoFactorEnabled: true });
      mockPrisma.user.findUnique.mockResolvedValue(user);

      await expect(service.disable2FA('user-1', 'WrongPass1!')).rejects.toThrow('Invalid password');
    });

    it('disable2FA throws if 2FA is not enabled', async () => {
      const user = makeUser({ twoFactorEnabled: false });
      mockPrisma.user.findUnique.mockResolvedValue(user);

      await expect(service.disable2FA('user-1', 'Password1!')).rejects.toThrow('not enabled');
    });
  });

  // ──────────────────────────────────────────────────────────
  // PASSWORD RESET (single-use — Phase B7)
  // ──────────────────────────────────────────────────────────

  describe('password reset (single-use)', () => {
    it('forgotPassword returns generic message regardless of email existence', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const result = await service.forgotPassword({ email: 'ghost@example.com' });
      expect(result.message).toContain('If an account');
    });

    it('forgotPassword creates PasswordResetToken if user exists', async () => {
      const user = makeUser();
      mockPrisma.user.findUnique.mockResolvedValue(user);
      mockPrisma.passwordResetToken.create.mockResolvedValue({});

      await service.forgotPassword({ email: 'test@example.com' });
      expect(mockPrisma.passwordResetToken.create).toHaveBeenCalledTimes(1);
    });

    it('resetPassword rejects already-used token (B7 single-use)', async () => {
      const usedRecord = {
        id: 'reset-1',
        userId: 'user-1',
        tokenHash: 'hash',
        expiresAt: new Date(Date.now() + 3600000),
        usedAt: new Date(), // already used
        user: makeUser(),
      };
      mockPrisma.passwordResetToken.findUnique.mockResolvedValue(usedRecord);

      await expect(
        service.resetPassword({ token: 'sometoken', newPassword: 'NewPassword1!' })
      ).rejects.toThrow('already been used');
    });

    it('resetPassword rejects expired token', async () => {
      const expiredRecord = {
        id: 'reset-1',
        userId: 'user-1',
        tokenHash: 'hash',
        expiresAt: new Date(Date.now() - 1000), // expired
        usedAt: null,
        user: makeUser(),
      };
      mockPrisma.passwordResetToken.findUnique.mockResolvedValue(expiredRecord);

      await expect(
        service.resetPassword({ token: 'sometoken', newPassword: 'NewPassword1!' })
      ).rejects.toThrow('Invalid or expired');
    });

    it('resetPassword rejects invalid token (not found)', async () => {
      mockPrisma.passwordResetToken.findUnique.mockResolvedValue(null);

      await expect(
        service.resetPassword({ token: 'badtoken', newPassword: 'NewPassword1!' })
      ).rejects.toThrow('Invalid or expired');
    });

    it('resetPassword succeeds with valid token and strong password', async () => {
      const validRecord = {
        id: 'reset-1',
        userId: 'user-1',
        tokenHash: 'hash',
        expiresAt: new Date(Date.now() + 3600000),
        usedAt: null,
        user: makeUser(),
      };
      mockPrisma.passwordResetToken.findUnique.mockResolvedValue(validRecord);
      mockPrisma.passwordResetToken.update.mockResolvedValue({});
      mockPrisma.user.update.mockResolvedValue({});
      mockPrisma.session.deleteMany.mockResolvedValue({});
      mockPrisma.$transaction.mockImplementation(async (fns: unknown) => {
        if (Array.isArray(fns)) return Promise.all(fns);
        return (fns as (prisma: unknown) => unknown)(mockPrisma);
      });

      const result = await service.resetPassword({
        token: 'validtoken',
        newPassword: 'NewPassword1!',
      });
      expect(result.message).toContain('reset successfully');
    });

    it('resetPassword rejects weak new password', async () => {
      await expect(service.resetPassword({ token: 'tok', newPassword: 'weak' })).rejects.toThrow(
        '8 characters'
      );
    });
  });

  // ──────────────────────────────────────────────────────────
  // REFRESH TOKEN ROTATION (Phase B1)
  // ──────────────────────────────────────────────────────────

  describe('refresh token rotation (B1)', () => {
    it('issues new tokens on valid refresh token', async () => {
      const session = makeSession({ revoked: false });
      mockPrisma.session.findUnique.mockResolvedValue(session);
      mockPrisma.session.update.mockResolvedValue({});
      mockPrisma.session.create.mockResolvedValue({});

      const result = await service.refreshToken('mock-refresh-token');
      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toBe('mock-refresh-token');
    });

    it('throws on invalid refresh token (not found)', async () => {
      mockPrisma.session.findUnique.mockResolvedValue(null);

      await expect(service.refreshToken('invalid-token')).rejects.toThrow('Invalid refresh token');
    });

    it('detects token reuse: revokes entire family', async () => {
      const revokedSession = makeSession({ revoked: true, tokenFamily: 'family-abc' });
      mockPrisma.session.findUnique.mockResolvedValue(revokedSession);
      mockPrisma.session.updateMany.mockResolvedValue({});

      await expect(service.refreshToken('revoked-token')).rejects.toThrow('reuse detected');
      expect(mockPrisma.session.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tokenFamily: 'family-abc' },
          data: expect.objectContaining({ revoked: true }),
        })
      );
    });

    it('throws on expired refresh token', async () => {
      const expiredSession = makeSession({
        revoked: false,
        expiresAt: new Date(Date.now() - 1000),
      });
      mockPrisma.session.findUnique.mockResolvedValue(expiredSession);
      mockPrisma.session.delete.mockResolvedValue({});

      await expect(service.refreshToken('expired-token')).rejects.toThrow('expired');
    });
  });

  // ──────────────────────────────────────────────────────────
  // RACE CONDITION — concurrent register (Phase B8)
  // ──────────────────────────────────────────────────────────

  describe('race condition: concurrent register with same email (B8)', () => {
    it('only one succeeds; duplicate throws user-already-exists', async () => {
      const bcrypt = await import('bcrypt');
      const hash = await bcrypt.hash('Password1!', 12);
      const user = makeUser({ email: 'race@example.com', passwordHash: hash });

      let createCallCount = 0;
      mockPrisma.user.create.mockImplementation(async () => {
        createCallCount++;
        if (createCallCount === 1) return user;
        const err = new Error('Unique constraint');
        (err as any).code = 'P2002';
        throw err;
      });
      mockPrisma.session.create.mockResolvedValue({});

      const registerData = {
        email: 'race@example.com',
        password: 'Password1!',
        name: 'Race User',
      };

      const results = await Promise.allSettled([
        service.register(registerData),
        service.register(registerData),
        service.register(registerData),
      ]);

      const successes = results.filter((r) => r.status === 'fulfilled');
      const failures = results.filter((r) => r.status === 'rejected');

      expect(successes.length).toBe(1);
      expect(failures.length).toBe(2);
      failures.forEach((f) => {
        expect((f as PromiseRejectedResult).reason.message).toContain('User already exists');
      });
    });
  });
});
