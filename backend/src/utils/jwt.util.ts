import jwt from 'jsonwebtoken';

interface JWTPayload {
  userId: string;
  email: string;
  role: string;
}

interface User {
  id: string;
  email: string;
  role: string;
}

/**
 * B2: Access token expiry reduced to 15m (was 7d).
 * B3: Separate secrets for access vs refresh tokens.
 *     JWT_SECRET       → signs/verifies access tokens
 *     JWT_REFRESH_SECRET → signs/verifies refresh tokens
 * Both validated at startup in server.ts.
 */
export const generateAccessToken = (user: User): string => {
  const payload: JWTPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };

  // B2: default changed from 7d → 15m
  const expiresIn = process.env.JWT_EXPIRES_IN || '15m';
  return jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn,
  } as jwt.SignOptions);
};

export const generateRefreshToken = (user: User): string => {
  const payload: JWTPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };

  const expiresIn = process.env.REFRESH_TOKEN_EXPIRES_IN || '30d';
  // B3: use JWT_REFRESH_SECRET (separate from access token secret)
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, {
    expiresIn,
  } as jwt.SignOptions);
};

export const verifyToken = (token: string): JWTPayload => {
  try {
    // B3: access tokens verified with JWT_SECRET
    return jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

export const verifyRefreshToken = (token: string): JWTPayload => {
  try {
    // B3: refresh tokens verified with JWT_REFRESH_SECRET
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as JWTPayload;
  } catch (error) {
    throw new Error('Invalid or expired refresh token');
  }
};
