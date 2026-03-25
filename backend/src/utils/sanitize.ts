import { User } from '@prisma/client';

export function sanitizeUser(user: User) {
  const {
    passwordHash,
    twoFactorSecret,
    backupCodes,
    resetToken,
    resetTokenExpiry,
    verificationToken,
    ...safe
  } = user;
  return safe;
}
