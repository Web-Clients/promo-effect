import { sanitizeUser } from '../../src/utils/sanitize';
import { User } from '@prisma/client';

const buildUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-uuid-123',
  email: 'test@example.com',
  name: 'Test User',
  role: 'CLIENT',
  phone: null,
  company: null,
  emailVerified: true,
  twoFactorEnabled: false,
  passwordHash: 'hashed-password-xyz',
  twoFactorSecret: 'totp-secret-abc',
  backupCodes: JSON.stringify(['code1', 'code2']),
  resetToken: 'reset-token-123',
  resetTokenExpiry: new Date('2026-04-01'),
  verificationToken: 'verify-token-456',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-02'),
  lastLoginAt: null,
  lastLoginIp: null,
  language: 'ro',
  timezone: 'Europe/Chisinau',
  notificationPreferences: null,
  ...overrides,
});

describe('sanitizeUser', () => {
  it('removes passwordHash', () => {
    const result = sanitizeUser(buildUser());
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('removes twoFactorSecret', () => {
    const result = sanitizeUser(buildUser());
    expect(result).not.toHaveProperty('twoFactorSecret');
  });

  it('removes backupCodes', () => {
    const result = sanitizeUser(buildUser());
    expect(result).not.toHaveProperty('backupCodes');
  });

  it('removes resetToken', () => {
    const result = sanitizeUser(buildUser());
    expect(result).not.toHaveProperty('resetToken');
  });

  it('removes resetTokenExpiry', () => {
    const result = sanitizeUser(buildUser());
    expect(result).not.toHaveProperty('resetTokenExpiry');
  });

  it('removes verificationToken', () => {
    const result = sanitizeUser(buildUser());
    expect(result).not.toHaveProperty('verificationToken');
  });

  it('preserves id', () => {
    const result = sanitizeUser(buildUser());
    expect(result).toHaveProperty('id', 'user-uuid-123');
  });

  it('preserves email', () => {
    const result = sanitizeUser(buildUser());
    expect(result).toHaveProperty('email', 'test@example.com');
  });

  it('preserves name', () => {
    const result = sanitizeUser(buildUser());
    expect(result).toHaveProperty('name', 'Test User');
  });

  it('preserves role', () => {
    const result = sanitizeUser(buildUser());
    expect(result).toHaveProperty('role', 'CLIENT');
  });

  it('preserves emailVerified', () => {
    const result = sanitizeUser(buildUser({ emailVerified: false }));
    expect(result).toHaveProperty('emailVerified', false);
  });

  it('preserves twoFactorEnabled', () => {
    const result = sanitizeUser(buildUser({ twoFactorEnabled: true }));
    expect(result).toHaveProperty('twoFactorEnabled', true);
  });

  it('preserves createdAt and updatedAt', () => {
    const result = sanitizeUser(buildUser());
    expect(result).toHaveProperty('createdAt');
    expect(result).toHaveProperty('updatedAt');
  });

  it('preserves optional language and timezone fields', () => {
    const result = sanitizeUser(buildUser({ language: 'en', timezone: 'UTC' }));
    expect(result).toHaveProperty('language', 'en');
    expect(result).toHaveProperty('timezone', 'UTC');
  });

  it('works when sensitive fields are null', () => {
    const result = sanitizeUser(
      buildUser({
        twoFactorSecret: null,
        backupCodes: null,
        resetToken: null,
        resetTokenExpiry: null,
        verificationToken: null,
      })
    );
    expect(result).not.toHaveProperty('twoFactorSecret');
    expect(result).not.toHaveProperty('backupCodes');
    expect(result).not.toHaveProperty('resetToken');
    expect(result).not.toHaveProperty('verificationToken');
    expect(result).toHaveProperty('email', 'test@example.com');
  });
});
