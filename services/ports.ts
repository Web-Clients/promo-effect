/**
 * Ports Service
 * Frontend API service for managing shipping ports
 */

import apiClient from './api';

export interface Port {
  id: string;
  name: string;
  code: string | null;
  country: string;
  type: 'ORIGIN' | 'DESTINATION';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePortDto {
  name: string;
  code?: string;
  country: string;
  type: 'ORIGIN' | 'DESTINATION';
}

export interface UpdatePortDto {
  name?: string;
  code?: string;
  country?: string;
  isActive?: boolean;
}

class PortsService {
  /**
   * Get all ports
   */
  async getAll(type?: 'ORIGIN' | 'DESTINATION', includeInactive = false): Promise<Port[]> {
    const params = new URLSearchParams();
    if (type) params.append('type', type);
    if (includeInactive) params.append('includeInactive', 'true');

    const query = params.toString();
    const response = await apiClient.get(`/ports${query ? `?${query}` : ''}`);
    return response.data;
  }

  /**
   * Get origin ports only
   */
  async getOriginPorts(includeInactive = false): Promise<Port[]> {
    const response = await apiClient.get(`/ports/origin${includeInactive ? '?includeInactive=true' : ''}`);
    return response.data;
  }

  /**
   * Get destination ports only
   */
  async getDestinationPorts(includeInactive = false): Promise<Port[]> {
    const response = await apiClient.get(`/ports/destination${includeInactive ? '?includeInactive=true' : ''}`);
    return response.data;
  }

  /**
   * Get a single port by ID
   */
  async getById(id: string): Promise<Port> {
    const response = await apiClient.get(`/ports/${id}`);
    return response.data;
  }

  /**
   * Create a new port (admin only)
   */
  async create(data: CreatePortDto): Promise<Port> {
    const response = await apiClient.post('/ports', data);
    return response.data;
  }

  /**
   * Update a port (admin only)
   */
  async update(id: string, data: UpdatePortDto): Promise<Port> {
    const response = await apiClient.put(`/ports/${id}`, data);
    return response.data;
  }

  /**
   * Delete a port (admin only)
   */
  async delete(id: string): Promise<void> {
    await apiClient.delete(`/ports/${id}`);
  }

  /**
   * Seed initial ports data (admin only)
   */
  async seed(): Promise<{ success: boolean; created: number }> {
    const response = await apiClient.post('/ports/seed');
    return response.data;
  }
}

export default new PortsService();
