/**
 * Admin Pricing Service
 * Frontend API service for managing base prices, port adjustments, and settings
 */

import api from './api';

// Types
export interface BasePrice {
  id: string;
  shippingLine: string;
  portOrigin: string;
  portDestination: string;
  containerType: string;
  basePrice: number;
  transitDays: number;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BasePriceInput {
  shippingLine: string;
  portOrigin: string;
  portDestination: string;
  containerType: string;
  basePrice: number;
  transitDays: number;
  validFrom: string;
  validUntil: string;
  isActive?: boolean;
}

export interface PortAdjustment {
  id: string;
  portName: string;
  adjustment: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PortAdjustmentInput {
  portName: string;
  adjustment: number;
  notes?: string;
}

export interface AdminSettings {
  id: number;
  portTaxesConstanta: number;
  terrestrialTransportConstanta: number;
  portTaxesOdessa: number;
  terrestrialTransportOdessa: number;
  customsTaxes: number;
  commission: number;
  insuranceCost: number;
  profitMarginPercent: number;
  updatedAt: string;
}

export interface AdminSettingsInput {
  portTaxesConstanta?: number;
  terrestrialTransportConstanta?: number;
  portTaxesOdessa?: number;
  terrestrialTransportOdessa?: number;
  customsTaxes?: number;
  commission?: number;
  insuranceCost?: number;
  profitMarginPercent?: number;
}

export interface PricingStats {
  totalBasePrices: number;
  activeBasePrices: number;
  totalPortAdjustments: number;
  shippingLinesCount: number;
}

// ============================================
// BASE PRICES
// ============================================

export async function getBasePrices(filters?: {
  shippingLine?: string;
  portOrigin?: string;
  portDestination?: string;
  containerType?: string;
  isActive?: boolean;
}): Promise<BasePrice[]> {
  const params: Record<string, string> = {};
  if (filters?.shippingLine) params.shippingLine = filters.shippingLine;
  if (filters?.portOrigin) params.portOrigin = filters.portOrigin;
  if (filters?.portDestination) params.portDestination = filters.portDestination;
  if (filters?.containerType) params.containerType = filters.containerType;
  if (filters?.isActive !== undefined) params.isActive = String(filters.isActive);

  const response = await api.get('/admin-pricing/base-prices', { params });
  return response.data.basePrices;
}

export async function getBasePriceById(id: string): Promise<BasePrice> {
  const response = await api.get(`/admin-pricing/base-prices/${id}`);
  return response.data;
}

export async function createBasePrice(data: BasePriceInput): Promise<BasePrice> {
  const response = await api.post('/admin-pricing/base-prices', data);
  return response.data;
}

export async function updateBasePrice(id: string, data: Partial<BasePriceInput>): Promise<BasePrice> {
  const response = await api.put(`/admin-pricing/base-prices/${id}`, data);
  return response.data;
}

export async function deleteBasePrice(id: string): Promise<void> {
  await api.delete(`/admin-pricing/base-prices/${id}`);
}

export async function bulkCreateBasePrices(prices: BasePriceInput[]): Promise<{ results: any[] }> {
  const response = await api.post('/admin-pricing/base-prices/bulk', { prices });
  return response.data;
}

// ============================================
// FILTER OPTIONS
// ============================================

export async function getShippingLines(): Promise<string[]> {
  const response = await api.get('/admin-pricing/shipping-lines');
  return response.data.shippingLines;
}

export async function getOriginPorts(): Promise<string[]> {
  const response = await api.get('/admin-pricing/origin-ports');
  return response.data.originPorts;
}

export async function getContainerTypes(): Promise<string[]> {
  const response = await api.get('/admin-pricing/container-types');
  return response.data.containerTypes;
}

// ============================================
// PORT ADJUSTMENTS
// ============================================

export async function getPortAdjustments(): Promise<PortAdjustment[]> {
  const response = await api.get('/admin-pricing/port-adjustments');
  return response.data.portAdjustments;
}

export async function getPortAdjustmentById(id: string): Promise<PortAdjustment> {
  const response = await api.get(`/admin-pricing/port-adjustments/${id}`);
  return response.data;
}

export async function createPortAdjustment(data: PortAdjustmentInput): Promise<PortAdjustment> {
  const response = await api.post('/admin-pricing/port-adjustments', data);
  return response.data;
}

export async function updatePortAdjustment(id: string, data: Partial<PortAdjustmentInput>): Promise<PortAdjustment> {
  const response = await api.put(`/admin-pricing/port-adjustments/${id}`, data);
  return response.data;
}

export async function deletePortAdjustment(id: string): Promise<void> {
  await api.delete(`/admin-pricing/port-adjustments/${id}`);
}

// ============================================
// ADMIN SETTINGS
// ============================================

export async function getAdminSettings(): Promise<AdminSettings> {
  const response = await api.get('/admin-pricing/settings');
  return response.data;
}

export async function updateAdminSettings(data: AdminSettingsInput): Promise<AdminSettings> {
  const response = await api.put('/admin-pricing/settings', data);
  return response.data;
}

// ============================================
// STATISTICS
// ============================================

export async function getPricingStats(): Promise<PricingStats> {
  const response = await api.get('/admin-pricing/stats');
  return response.data;
}
