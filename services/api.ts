/**
 * API Client - Axios configuration with interceptors
 * Handles authentication, token refresh, and error handling
 */

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Offline detection
window.addEventListener('offline', () => {
  console.warn('Network offline');
});
window.addEventListener('online', () => {
  console.warn('Network back online');
});

// Token storage keys
const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_KEY = 'user';

// Create axios instance — withCredentials sends/receives the __csrf cookie
export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// CSRF token cache (refreshed on demand for state-changing requests)
let csrfTokenCache: string | null = null;
let csrfTokenPromise: Promise<string> | null = null;

const fetchCsrfToken = async (): Promise<string> => {
  if (csrfTokenPromise) return csrfTokenPromise;
  csrfTokenPromise = axios
    .get<{ token: string }>(`${API_BASE_URL.replace(/\/api\/?$/, '')}/api/csrf-token`, {
      withCredentials: true,
    })
    .then((res) => {
      csrfTokenCache = res.data.token;
      return csrfTokenCache;
    })
    .finally(() => {
      csrfTokenPromise = null;
    });
  return csrfTokenPromise;
};

// Reset CSRF token (e.g. on 403 csrf error so we re-fetch)
export const invalidateCsrfToken = () => {
  csrfTokenCache = null;
};

// Token management utilities
export const tokenManager = {
  getAccessToken: (): string | null => {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },

  getRefreshToken: (): string | null => {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },

  setTokens: (accessToken: string, refreshToken: string) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  },

  removeTokens: () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },

  getUser: <T = unknown>(): T | null => {
    const userStr = localStorage.getItem(USER_KEY);
    if (!userStr) return null;

    try {
      return JSON.parse(userStr) as T;
    } catch {
      return null;
    }
  },

  setUser: (user: unknown) => {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  removeUser: () => {
    localStorage.removeItem(USER_KEY);
  },

  // Backwards-compatible helper
  clearTokens: () => {
    tokenManager.removeTokens();
    tokenManager.removeUser();
  },
};

// Auth endpoints exempt from CSRF (no token yet); see backend app.ts CSRF_EXEMPT_PATHS
const CSRF_EXEMPT_URL_PATTERNS = [
  /\/auth\/login(\b|$)/,
  /\/auth\/register(\b|$)/,
  /\/auth\/refresh(\b|$)/,
  /\/auth\/forgot-password(\b|$)/,
  /\/auth\/reset-password(\b|$)/,
  /\/auth\/verify-email(\b|$)/,
  /\/auth\/complete-2fa-login(\b|$)/,
];

// Request interceptor - Add auth token + CSRF token for state-changing requests
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = tokenManager.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const method = (config.method || 'get').toUpperCase();
    const url = config.url || '';
    const isStateChange = !['GET', 'HEAD', 'OPTIONS'].includes(method);
    const isCsrfExempt = CSRF_EXEMPT_URL_PATTERNS.some((re) => re.test(url));

    if (isStateChange && !isCsrfExempt) {
      try {
        const csrfToken = csrfTokenCache || (await fetchCsrfToken());
        config.headers['X-CSRF-Token'] = csrfToken;
      } catch {
        // Network/server issue — let request proceed; backend will return 403 if needed
      }
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle 401 and auto-refresh token
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    const requestUrl = originalRequest?.url || '';
    const isAuthEndpoint =
      requestUrl.includes('/auth/login') ||
      requestUrl.includes('/auth/register') ||
      requestUrl.includes('/auth/refresh') ||
      requestUrl.includes('/auth/logout') ||
      requestUrl.includes('/auth/me');

    // If error is 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      // If we got 401 on an auth endpoint, don't try refresh + don't hard-redirect.
      // Let the caller decide (e.g., App rehydration will clear tokens and render /login).
      if (isAuthEndpoint) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = tokenManager.getRefreshToken();

      if (!refreshToken) {
        // No refresh token - clear local session, but don't hard redirect here
        tokenManager.clearTokens();
        return Promise.reject(error);
      }

      try {
        // Try to refresh the token
        const response = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          { refreshToken },
          { timeout: 10000 }
        );

        const { accessToken, refreshToken: newRefreshToken } = response.data;

        // Update tokens
        tokenManager.setTokens(accessToken, newRefreshToken);

        // Process queued requests
        processQueue(null, accessToken);

        // Retry original request
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }

        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, clear tokens (no hard redirect)
        processQueue(refreshError, null);
        tokenManager.clearTokens();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Handle other errors
    if (error.response) {
      // Server responded with error status — extract message from AppError format or legacy
      const responseData = error.response.data as
        | { error?: string | { code?: string; message?: string }; message?: string }
        | undefined;
      let message = 'A apărut o eroare pe server';
      if (responseData?.error) {
        if (typeof responseData.error === 'string') {
          message = responseData.error;
        } else if (typeof responseData.error === 'object' && responseData.error.message) {
          message = responseData.error.message;
        }
      } else if (responseData?.message) {
        message = responseData.message;
      }

      return Promise.reject({
        status: error.response.status,
        message,
        data: error.response.data,
      });
    } else if (error.request) {
      // Request made but no response
      return Promise.reject({
        status: 0,
        message: 'Nu s-a putut conecta la server. Verificați conexiunea la internet.',
        data: null,
      });
    } else {
      // Something else happened
      return Promise.reject({
        status: 0,
        message: error.message || 'A apărut o eroare neprevăzută',
        data: null,
      });
    }
  }
);

// API error interface
export interface ApiError {
  status: number;
  message: string;
  data: unknown;
}

// Helper function to handle API errors in components
export const handleApiError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return 'A apărut o eroare neprevăzută';
};

export default api;
