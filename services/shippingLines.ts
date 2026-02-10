/**
 * Shipping Lines Service
 * Frontend API service for managing shipping line containers (local taxes)
 * and transport rates
 */

import api from './api';

// Types
export interface ShippingLineContainer {
  id: string;
  shippingLine: string;
  containerType: string;
  portTaxes: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ShippingLineContainerInput {
  shippingLine: string;
  containerType: string;
  portTaxes: number;
  isActive?: boolean;
}

export interface TransportRate {
  id: string;
  containerType: string;
  weightRange: string;
  destination: string;
  rate: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TransportRateInput {
  containerType: string;
  weightRange: string;
  destination: string;
  rate: number;
  isActive?: boolean;
}

// ============================================
// SHIPPING LINE CONTAINERS
// ============================================

const getShippingLineContainers = async (filters?: { shippingLine?: string; containerType?: string }): Promise<ShippingLineContainer[]> => {
  const params = new URLSearchParams();
  if (filters?.shippingLine) params.set('shippingLine', filters.shippingLine);
  if (filters?.containerType) params.set('containerType', filters.containerType);
  const query = params.toString() ? `?${params.toString()}` : '';
  const response = await api.get(`/shipping-lines/containers${query}`);
  return response.data.items;
};

const getShippingLineContainerById = async (id: string): Promise<ShippingLineContainer> => {
  const response = await api.get(`/shipping-lines/containers/${id}`);
  return response.data;
};

const createShippingLineContainer = async (data: ShippingLineContainerInput): Promise<ShippingLineContainer> => {
  const response = await api.post('/shipping-lines/containers', data);
  return response.data;
};

const updateShippingLineContainer = async (id: string, data: Partial<ShippingLineContainerInput>): Promise<ShippingLineContainer> => {
  const response = await api.put(`/shipping-lines/containers/${id}`, data);
  return response.data;
};

const deleteShippingLineContainer = async (id: string): Promise<void> => {
  await api.delete(`/shipping-lines/containers/${id}`);
};

const bulkUpsertContainers = async (items: ShippingLineContainerInput[]): Promise<ShippingLineContainer[]> => {
  const response = await api.post('/shipping-lines/containers/bulk', { items });
  return response.data.items;
};

const getDistinctShippingLines = async (): Promise<string[]> => {
  const response = await api.get('/shipping-lines/distinct-lines');
  return response.data.lines;
};

// ============================================
// TRANSPORT RATES
// ============================================

const getTransportRates = async (filters?: { containerType?: string; destination?: string }): Promise<TransportRate[]> => {
  const params = new URLSearchParams();
  if (filters?.containerType) params.set('containerType', filters.containerType);
  if (filters?.destination) params.set('destination', filters.destination);
  const query = params.toString() ? `?${params.toString()}` : '';
  const response = await api.get(`/shipping-lines/transport-rates${query}`);
  return response.data.items;
};

const createTransportRate = async (data: TransportRateInput): Promise<TransportRate> => {
  const response = await api.post('/shipping-lines/transport-rates', data);
  return response.data;
};

const updateTransportRate = async (id: string, data: Partial<TransportRateInput>): Promise<TransportRate> => {
  const response = await api.put(`/shipping-lines/transport-rates/${id}`, data);
  return response.data;
};

const deleteTransportRate = async (id: string): Promise<void> => {
  await api.delete(`/shipping-lines/transport-rates/${id}`);
};

const bulkUpsertTransportRates = async (items: TransportRateInput[]): Promise<TransportRate[]> => {
  const response = await api.post('/shipping-lines/transport-rates/bulk', { items });
  return response.data.items;
};

export default {
  // Shipping Line Containers
  getShippingLineContainers,
  getShippingLineContainerById,
  createShippingLineContainer,
  updateShippingLineContainer,
  deleteShippingLineContainer,
  bulkUpsertContainers,
  getDistinctShippingLines,
  // Transport Rates
  getTransportRates,
  createTransportRate,
  updateTransportRate,
  deleteTransportRate,
  bulkUpsertTransportRates,
};
