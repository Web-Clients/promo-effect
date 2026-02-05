/**
 * Users Service
 * API client for user management
 */

import api from './api';

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  company?: string;
  role: 'CLIENT' | 'AGENT' | 'ADMIN' | 'SUPER_ADMIN';
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  lastLoginIp?: string;
  language?: string;
  timezone?: string;
  twoFactorEnabled: boolean;
}

export interface UsersResponse {
  success: boolean;
  data: User[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface UserFilters {
  page?: number;
  limit?: number;
  role?: string;
  search?: string;
}

export interface UpdateUserData {
  name?: string;
  phone?: string;
  company?: string;
  role?: string;
}

const usersService = {
  /**
   * Get list of users with pagination and filters
   */
  async getUsers(filters: UserFilters = {}): Promise<UsersResponse> {
    const params = new URLSearchParams();
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.role) params.append('role', filters.role);
    if (filters.search) params.append('search', filters.search);

    const response = await api.get(`/v1/users?${params.toString()}`);
    return response.data;
  },

  /**
   * Get single user by ID
   */
  async getUserById(id: string): Promise<{ success: boolean; data: User }> {
    const response = await api.get(`/v1/users/${id}`);
    return response.data;
  },

  /**
   * Update user
   */
  async updateUser(id: string, data: UpdateUserData): Promise<{ success: boolean; data: User }> {
    const response = await api.put(`/v1/users/${id}`, data);
    return response.data;
  },

  /**
   * Delete user
   */
  async deleteUser(id: string): Promise<{ success: boolean; message: string }> {
    const response = await api.delete(`/v1/users/${id}`);
    return response.data;
  },

  /**
   * Reset user password (admin only)
   */
  async resetPassword(id: string): Promise<{ success: boolean; message: string }> {
    const response = await api.post(`/v1/users/${id}/reset-password-admin`);
    return response.data;
  },

  /**
   * Get user activity
   */
  async getUserActivity(id: string, page = 1, limit = 20): Promise<any> {
    const response = await api.get(`/v1/users/${id}/activity?page=${page}&limit=${limit}`);
    return response.data;
  },
};

export default usersService;
