/**
 * Authentication Service
 * Handles login, register, logout, and user session management
 */

import api, { tokenManager } from './api';
import { User, UserRole } from '../types';

// API response interfaces
interface LoginResponse {
  success?: boolean;
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
    phone?: string;
    company?: string;
  };
  accessToken?: string;
  refreshToken?: string;
  requires2FA?: boolean;
  tempToken?: string;
  message?: string;
}

interface RegisterData {
  email: string;
  password: string;
  name: string;
  phone?: string;
  company?: string;
  role?: string;
}

interface LoginData {
  email: string;
  password: string;
  twoFactorCode?: string;
}

// Backend user type
interface BackendUser {
  id: string;
  email: string;
  name: string;
  role: string;
  phone?: string;
  company?: string;
}

// Convert backend user to frontend User type
const mapBackendUserToFrontend = (backendUser: BackendUser): User => {
  return {
    id: parseInt(backendUser.id.replace(/\D/g, '')) || Math.floor(Math.random() * 1000000), // Convert UUID to number for frontend compatibility
    name: backendUser.name,
    email: backendUser.email,
    role: (backendUser.role as UserRole) || UserRole.CLIENT,
  };
};

/**
 * Login user with email and password
 * Returns user if successful, or { requires2FA: true, tempToken: string } if 2FA is needed
 */
export const login = async (
  data: LoginData
): Promise<User | { requires2FA: true; tempToken: string }> => {
  try {
    const response = await api.post<LoginResponse>('/auth/login', data);

    // If 2FA is required, return special response
    if (response.data.requires2FA && response.data.tempToken) {
      return {
        requires2FA: true,
        tempToken: response.data.tempToken,
      };
    }

    // Normal login success
    if (response.data.user && response.data.accessToken && response.data.refreshToken) {
      const { user, accessToken, refreshToken } = response.data;

      // Store tokens
      tokenManager.setTokens(accessToken, refreshToken);

      // Map and store user
      const frontendUser = mapBackendUserToFrontend(user);
      tokenManager.setUser(frontendUser);

      return frontendUser;
    }

    throw new Error('Invalid response from server');
  } catch (error: unknown) {
    const err = error as { response?: { data?: { error?: string } }; message?: string };
    throw new Error(err.response?.data?.error || err.message || 'Autentificare eșuată', {
      cause: error,
    });
  }
};

/**
 * Complete login with 2FA code using temp token
 */
export const complete2FALogin = async (tempToken: string, twoFactorCode: string): Promise<User> => {
  try {
    const response = await api.post<LoginResponse>('/auth/complete-2fa-login', {
      tempToken,
      twoFactorCode,
    });

    if (response.data.user && response.data.accessToken && response.data.refreshToken) {
      const { user, accessToken, refreshToken } = response.data;

      // Store tokens
      tokenManager.setTokens(accessToken, refreshToken);

      // Map and store user
      const frontendUser = mapBackendUserToFrontend(user);
      tokenManager.setUser(frontendUser);

      return frontendUser;
    }

    throw new Error('Invalid response from server');
  } catch (error: unknown) {
    const err = error as { response?: { data?: { error?: string } }; message?: string };
    throw new Error(err.response?.data?.error || err.message || 'Autentificare 2FA eșuată', {
      cause: error,
    });
  }
};

/**
 * Register new user
 */
export const register = async (data: RegisterData): Promise<User> => {
  try {
    const response = await api.post<LoginResponse>('/auth/register', data);

    const { user, accessToken, refreshToken } = response.data;

    if (!accessToken || !refreshToken || !user) {
      throw new Error('Invalid register response from server');
    }

    // Store tokens
    tokenManager.setTokens(accessToken, refreshToken);

    // Map and store user
    const frontendUser = mapBackendUserToFrontend(user);
    tokenManager.setUser(frontendUser);

    return frontendUser;
  } catch (error: unknown) {
    const err = error as { message?: string };
    throw new Error(err.message || 'Înregistrare eșuată', { cause: error });
  }
};

/**
 * Logout current user
 */
export const logout = async (): Promise<void> => {
  try {
    // Call backend logout endpoint
    await api.post('/auth/logout');
  } catch (error) {
    // Even if backend logout fails, we still clear local tokens
    console.error('Logout error:', error);
  } finally {
    // Clear local storage
    tokenManager.clearTokens();
  }
};

/**
 * Get current authenticated user info
 */
export const getCurrentUser = async (): Promise<User> => {
  try {
    const response = await api.get<{
      id: string;
      email: string;
      name: string;
      role: string;
      phone?: string;
      company?: string;
    }>('/auth/me');

    const frontendUser = mapBackendUserToFrontend(response.data);
    tokenManager.setUser(frontendUser);

    return frontendUser;
  } catch (error: unknown) {
    const err = error as { message?: string };
    throw new Error(err.message || 'Nu s-a putut încărca informația utilizatorului', {
      cause: error,
    });
  }
};

/**
 * Check if user is authenticated (has valid token)
 */
export const isAuthenticated = (): boolean => {
  return !!tokenManager.getAccessToken();
};

/**
 * Get stored user from localStorage
 */
export const getStoredUser = (): User | null => {
  return tokenManager.getUser();
};

/**
 * Refresh access token using refresh token
 */
export const refreshToken = async (): Promise<void> => {
  const refreshToken = tokenManager.getRefreshToken();

  if (!refreshToken) {
    throw new Error('Nu există refresh token');
  }

  try {
    const response = await api.post<LoginResponse>('/auth/refresh', {
      refreshToken,
    });

    const { accessToken, refreshToken: newRefreshToken } = response.data;

    if (!accessToken || !newRefreshToken) {
      throw new Error('Invalid refresh response from server');
    }

    tokenManager.setTokens(accessToken, newRefreshToken);
  } catch (error: unknown) {
    // If refresh fails, clear tokens
    tokenManager.clearTokens();
    const err = error as { message?: string };
    throw new Error(err.message || 'Refresh token eșuat', { cause: error });
  }
};

/**
 * Request password reset email
 */
export const requestPasswordReset = async (email: string): Promise<void> => {
  try {
    await api.post('/auth/forgot-password', { email });
  } catch (error: unknown) {
    const err = error as { message?: string };
    throw new Error(err.message || 'Cerere resetare parolă eșuată', { cause: error });
  }
};

/**
 * Reset password with token
 */
export const resetPassword = async (token: string, newPassword: string): Promise<void> => {
  try {
    await api.post('/auth/reset-password', {
      token,
      newPassword,
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    throw new Error(err.message || 'Resetare parolă eșuată', { cause: error });
  }
};

/**
 * Verify email address using verification token
 */
export const verifyEmail = async (token: string): Promise<void> => {
  try {
    await api.get('/auth/verify-email', { params: { token } });
  } catch (error: unknown) {
    const err = error as { response?: { data?: { error?: string } }; message?: string };
    throw new Error(err.response?.data?.error || err.message || 'Verificare email eșuată', {
      cause: error,
    });
  }
};

/**
 * Enable 2FA - get QR code and backup codes
 */
export const enable2FA = async (): Promise<{
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}> => {
  try {
    const response = await api.post<{
      success: boolean;
      secret: string;
      qrCodeUrl: string;
      backupCodes: string[];
      message: string;
    }>('/auth/enable-2fa');

    return {
      secret: response.data.secret,
      qrCodeUrl: response.data.qrCodeUrl,
      backupCodes: response.data.backupCodes,
    };
  } catch (error: unknown) {
    const err = error as { response?: { data?: { error?: string } }; message?: string };
    throw new Error(err.response?.data?.error || err.message || 'Activare 2FA eșuată', {
      cause: error,
    });
  }
};

/**
 * Verify 2FA code and activate 2FA
 */
export const verify2FA = async (code: string): Promise<void> => {
  try {
    await api.post('/auth/verify-2fa', { code });
  } catch (error: unknown) {
    const err = error as { response?: { data?: { error?: string } }; message?: string };
    throw new Error(err.response?.data?.error || err.message || 'Verificare 2FA eșuată', {
      cause: error,
    });
  }
};

/**
 * Disable 2FA
 */
export const disable2FA = async (password: string): Promise<void> => {
  try {
    await api.post('/auth/disable-2fa', { password });
  } catch (error: unknown) {
    const err = error as { response?: { data?: { error?: string } }; message?: string };
    throw new Error(err.response?.data?.error || err.message || 'Dezactivare 2FA eșuată', {
      cause: error,
    });
  }
};

// Export auth service
const authService = {
  login,
  complete2FALogin,
  register,
  logout,
  getCurrentUser,
  isAuthenticated,
  getStoredUser,
  refreshToken,
  requestPasswordReset,
  resetPassword,
  verifyEmail,
  enable2FA,
  verify2FA,
  disable2FA,
};

export default authService;
