/**
 * Agents Service
 * Frontend API service for managing Chinese agents
 */

import api from './api';

// Types
export interface AgentUser {
  id: string;
  email: string;
  name: string;
  phone: string | null;
}

export interface Agent {
  id: string;
  agentCode: string;
  company: string;
  contactName: string;
  wechatId: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  createdAt: string;
  updatedAt: string;
  user: AgentUser;
  pricesCount: number;
  bookingsCount: number;
}

export interface CreateAgentInput {
  email: string;
  password: string;
  name: string;
  phone?: string;
  company: string;
  contactName: string;
  wechatId?: string;
}

export interface UpdateAgentInput {
  company?: string;
  contactName?: string;
  wechatId?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  phone?: string;
  name?: string;
}

export interface AgentStats {
  total: number;
  active: number;
  inactive: number;
  suspended: number;
}

export interface AgentPrice {
  id: string;
  freightPrice: number;
  shippingLine: string;
  portOrigin: string;
  containerType: string;
  weightRange: string;
  validFrom: string;
  validUntil: string;
  departureDate: string;
  createdAt: string;
}

// ============================================
// AGENTS CRUD
// ============================================

export async function getAgents(filters?: { status?: string; search?: string }): Promise<Agent[]> {
  const params: Record<string, string> = {};
  if (filters?.status) params.status = filters.status;
  if (filters?.search) params.search = filters.search;

  const response = await api.get('/agents', { params });
  return response.data.agents;
}

export async function getAgentById(id: string): Promise<Agent> {
  const response = await api.get(`/agents/${id}`);
  return response.data;
}

export async function createAgent(data: CreateAgentInput): Promise<Agent> {
  const response = await api.post('/agents', data);
  return response.data;
}

export async function updateAgent(id: string, data: UpdateAgentInput): Promise<Agent> {
  const response = await api.put(`/agents/${id}`, data);
  return response.data;
}

export async function deleteAgent(id: string): Promise<void> {
  await api.delete(`/agents/${id}`);
}

export async function hardDeleteAgent(id: string): Promise<void> {
  await api.delete(`/agents/${id}/hard`);
}

// ============================================
// STATISTICS
// ============================================

export async function getAgentStats(): Promise<AgentStats> {
  const response = await api.get('/agents/stats');
  return response.data;
}

// ============================================
// AGENT DATA
// ============================================

export async function getAgentPrices(agentId: string): Promise<AgentPrice[]> {
  const response = await api.get(`/agents/${agentId}/prices`);
  return response.data.prices;
}

export async function createAgentPrice(
  agentId: string,
  data: Record<string, unknown>
): Promise<AgentPrice> {
  const response = await api.post(`/agents/${agentId}/prices`, data);
  return response.data;
}

export async function updateAgentPrice(
  agentId: string,
  priceId: string,
  data: Record<string, unknown>
): Promise<AgentPrice> {
  const response = await api.put(`/agents/${agentId}/prices/${priceId}`, data);
  return response.data;
}

export async function deleteAgentPrice(agentId: string, priceId: string): Promise<void> {
  await api.delete(`/agents/${agentId}/prices/${priceId}`);
}

export async function getAgentBookings(agentId: string): Promise<unknown[]> {
  const response = await api.get(`/agents/${agentId}/bookings`);
  return response.data.bookings;
}
