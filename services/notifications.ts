/**
 * Notifications Service
 * Frontend API service for managing user notifications
 */

import apiClient from './api';

export interface Notification {
  id: string;
  userId: string;
  bookingId: string | null;
  type: string;
  title: string;
  message: string;
  channels: string;
  read: boolean;
  sent: boolean;
  sentAt: string | null;
  createdAt: string;
}

export interface NotificationsResponse {
  success: boolean;
  data: Notification[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface UnreadCountResponse {
  success: boolean;
  data: {
    count: number;
  };
}

class NotificationsService {
  /**
   * Get all notifications for current user
   */
  async getNotifications(params?: {
    page?: number;
    limit?: number;
    read?: boolean;
  }): Promise<NotificationsResponse> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.read !== undefined) queryParams.append('read', params.read.toString());

    const query = queryParams.toString();
    const response = await apiClient.get(`/v1/notifications${query ? `?${query}` : ''}`);
    return response.data;
  }

  /**
   * Get unread notifications count
   */
  async getUnreadCount(): Promise<number> {
    const response = await apiClient.get('/v1/notifications/unread/count');
    return response.data.data.count;
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(id: string): Promise<Notification> {
    const response = await apiClient.patch(`/v1/notifications/${id}/read`);
    return response.data.data;
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<{ updated: number }> {
    const response = await apiClient.post('/v1/notifications/read-all');
    return response.data;
  }
}

export default new NotificationsService();
