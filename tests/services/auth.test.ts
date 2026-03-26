import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserRole } from '../../types';

// Use vi.hoisted so variables are available inside vi.mock factory
const { mockPost, mockGet, mockTokenManager } = vi.hoisted(() => {
  const mockPost = vi.fn();
  const mockGet = vi.fn();
  const mockTokenManager = {
    setTokens: vi.fn(),
    setUser: vi.fn(),
    getUser: vi.fn(),
    getAccessToken: vi.fn(),
    getRefreshToken: vi.fn(),
    clearTokens: vi.fn(),
  };
  return { mockPost, mockGet, mockTokenManager };
});

vi.mock('../../services/api', () => ({
  default: {
    post: (...args: any[]) => mockPost(...args),
    get: (...args: any[]) => mockGet(...args),
  },
  tokenManager: mockTokenManager,
}));

import {
  login,
  complete2FALogin,
  register,
  logout,
  getCurrentUser,
  isAuthenticated,
  getStoredUser,
  requestPasswordReset,
  resetPassword,
  verifyEmail,
} from '../../services/auth';

const mockUser = {
  id: 'abc-123',
  email: 'test@example.com',
  name: 'Test User',
  role: 'CLIENT',
};

const mockTokens = {
  accessToken: 'access-token-123',
  refreshToken: 'refresh-token-456',
};

describe('auth service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('login', () => {
    it('returns user on successful login', async () => {
      mockPost.mockResolvedValueOnce({
        data: {
          user: mockUser,
          ...mockTokens,
        },
      });

      const result = await login({ email: 'test@example.com', password: 'password123' });

      expect(mockPost).toHaveBeenCalledWith('/auth/login', {
        email: 'test@example.com',
        password: 'password123',
      });
      expect(mockTokenManager.setTokens).toHaveBeenCalledWith(
        mockTokens.accessToken,
        mockTokens.refreshToken
      );
      expect(result).toMatchObject({
        email: 'test@example.com',
        name: 'Test User',
        role: UserRole.CLIENT,
      });
    });

    it('returns requires2FA flag when 2FA is required', async () => {
      mockPost.mockResolvedValueOnce({
        data: {
          requires2FA: true,
          tempToken: 'temp-token-xyz',
        },
      });

      const result = await login({ email: 'test@example.com', password: 'password123' });

      expect(result).toEqual({ requires2FA: true, tempToken: 'temp-token-xyz' });
      expect(mockTokenManager.setTokens).not.toHaveBeenCalled();
    });

    it('throws error when response is invalid', async () => {
      mockPost.mockResolvedValueOnce({ data: {} });

      await expect(login({ email: 'test@example.com', password: 'password123' })).rejects.toThrow(
        'Invalid response from server'
      );
    });

    it('throws error with message from server on failure', async () => {
      mockPost.mockRejectedValueOnce({
        response: { data: { error: 'Invalid credentials' } },
      });

      await expect(login({ email: 'test@example.com', password: 'wrong' })).rejects.toThrow(
        'Invalid credentials'
      );
    });
  });

  describe('complete2FALogin', () => {
    it('returns user on successful 2FA completion', async () => {
      mockPost.mockResolvedValueOnce({
        data: {
          user: mockUser,
          ...mockTokens,
        },
      });

      const result = await complete2FALogin('temp-token', '123456');

      expect(mockPost).toHaveBeenCalledWith('/auth/complete-2fa-login', {
        tempToken: 'temp-token',
        twoFactorCode: '123456',
      });
      expect(result).toMatchObject({ email: 'test@example.com' });
    });

    it('throws on invalid response', async () => {
      mockPost.mockResolvedValueOnce({ data: {} });

      await expect(complete2FALogin('temp', '000000')).rejects.toThrow(
        'Invalid response from server'
      );
    });
  });

  describe('register', () => {
    it('returns user on successful registration', async () => {
      mockPost.mockResolvedValueOnce({
        data: {
          user: mockUser,
          ...mockTokens,
        },
      });

      const result = await register({
        email: 'new@example.com',
        password: 'password123',
        name: 'New User',
      });

      expect(mockPost).toHaveBeenCalledWith('/auth/register', {
        email: 'new@example.com',
        password: 'password123',
        name: 'New User',
      });
      expect(mockTokenManager.setTokens).toHaveBeenCalled();
      expect(result).toMatchObject({ email: 'test@example.com' });
    });

    it('throws when response is missing tokens', async () => {
      mockPost.mockResolvedValueOnce({
        data: { user: mockUser },
      });

      await expect(
        register({ email: 'test@test.com', password: 'pass', name: 'Name' })
      ).rejects.toThrow();
    });
  });

  describe('logout', () => {
    it('clears tokens even when backend call fails', async () => {
      mockPost.mockRejectedValueOnce(new Error('Network error'));

      await logout();

      expect(mockTokenManager.clearTokens).toHaveBeenCalled();
    });

    it('calls logout endpoint and clears tokens on success', async () => {
      mockPost.mockResolvedValueOnce({});

      await logout();

      expect(mockPost).toHaveBeenCalledWith('/auth/logout');
      expect(mockTokenManager.clearTokens).toHaveBeenCalled();
    });
  });

  describe('getCurrentUser', () => {
    it('returns user from /auth/me', async () => {
      mockGet.mockResolvedValueOnce({ data: mockUser });

      const result = await getCurrentUser();

      expect(mockGet).toHaveBeenCalledWith('/auth/me');
      expect(result).toMatchObject({ email: 'test@example.com' });
      expect(mockTokenManager.setUser).toHaveBeenCalled();
    });

    it('throws on failure', async () => {
      mockGet.mockRejectedValueOnce({ message: 'Unauthorized' });

      await expect(getCurrentUser()).rejects.toThrow();
    });
  });

  describe('isAuthenticated', () => {
    it('returns true when access token exists', () => {
      mockTokenManager.getAccessToken.mockReturnValueOnce('some-token');
      expect(isAuthenticated()).toBe(true);
    });

    it('returns false when no access token', () => {
      mockTokenManager.getAccessToken.mockReturnValueOnce(null);
      expect(isAuthenticated()).toBe(false);
    });
  });

  describe('getStoredUser', () => {
    it('returns user from tokenManager', () => {
      const storedUser = { id: 1, email: 'test@test.com', name: 'Test', role: UserRole.CLIENT };
      mockTokenManager.getUser.mockReturnValueOnce(storedUser);
      expect(getStoredUser()).toEqual(storedUser);
    });

    it('returns null when no user stored', () => {
      mockTokenManager.getUser.mockReturnValueOnce(null);
      expect(getStoredUser()).toBeNull();
    });
  });

  describe('requestPasswordReset', () => {
    it('calls forgot-password endpoint', async () => {
      mockPost.mockResolvedValueOnce({});

      await requestPasswordReset('user@example.com');

      expect(mockPost).toHaveBeenCalledWith('/auth/forgot-password', {
        email: 'user@example.com',
      });
    });

    it('throws on failure', async () => {
      mockPost.mockRejectedValueOnce({ message: 'Email not found' });

      await expect(requestPasswordReset('noone@example.com')).rejects.toThrow();
    });
  });

  describe('resetPassword', () => {
    it('calls reset-password endpoint with token and new password', async () => {
      mockPost.mockResolvedValueOnce({});

      await resetPassword('reset-token-abc', 'newPassword123');

      expect(mockPost).toHaveBeenCalledWith('/auth/reset-password', {
        token: 'reset-token-abc',
        newPassword: 'newPassword123',
      });
    });
  });

  describe('verifyEmail', () => {
    it('calls verify-email endpoint with token param', async () => {
      mockGet.mockResolvedValueOnce({});

      await verifyEmail('verify-token-xyz');

      expect(mockGet).toHaveBeenCalledWith('/auth/verify-email', {
        params: { token: 'verify-token-xyz' },
      });
    });

    it('throws with server error message on failure', async () => {
      mockGet.mockRejectedValueOnce({
        response: { data: { error: 'Token expired' } },
      });

      await expect(verifyEmail('expired-token')).rejects.toThrow('Token expired');
    });
  });
});
