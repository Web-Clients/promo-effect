/**
 * Agent Portal Service
 * Frontend API calls for agent price management
 */

import api from './api';

// Types
export interface AgentProfile {
  id: string;
  agentCode: string;
  company: string;
  contactName: string;
  wechatId: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    email: string;
    name: string;
    phone: string | null;
  };
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
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedAt: string | null;
  rejectionReason: string | null;
  reason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AgentPriceInput {
  freightPrice: number;
  shippingLine: string;
  portOrigin: string;
  containerType: string;
  weightRange: string;
  validFrom: string;
  validUntil: string;
  departureDate: string;
  reason?: string;
}

export interface AgentStats {
  prices: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  };
  bookings: number;
}

export interface PendingPriceWithAgent extends AgentPrice {
  agent: {
    id: string;
    company: string;
    contactName: string;
    user: {
      id: string;
      email: string;
      name: string;
    };
  };
}

export interface ApprovalStats {
  pending: number;
  approvedToday: number;
  rejectedToday: number;
}

// ============================================
// AGENT FUNCTIONS
// ============================================

/**
 * Get agent profile
 */
export const getAgentProfile = async (): Promise<AgentProfile> => {
  const response = await api.get<AgentProfile>('/agent-portal/profile');
  return response.data;
};

/**
 * Get agent statistics
 */
export const getAgentStats = async (): Promise<AgentStats> => {
  const response = await api.get<AgentStats>('/agent-portal/stats');
  return response.data;
};

/**
 * Get agent's prices
 */
export const getAgentPrices = async (filters?: {
  status?: string;
  shippingLine?: string;
}): Promise<AgentPrice[]> => {
  const params = new URLSearchParams();
  if (filters?.status) params.append('status', filters.status);
  if (filters?.shippingLine) params.append('shippingLine', filters.shippingLine);

  const response = await api.get<{ prices: AgentPrice[] }>(
    `/agent-portal/prices?${params.toString()}`
  );
  return response.data.prices;
};

/**
 * Submit new price for approval
 */
export const submitPrice = async (data: AgentPriceInput): Promise<AgentPrice> => {
  const response = await api.post<AgentPrice>('/agent-portal/prices', data);
  return response.data;
};

/**
 * Update existing price (resubmits for approval)
 */
export const updatePrice = async (
  priceId: string,
  data: Partial<AgentPriceInput>
): Promise<AgentPrice> => {
  const response = await api.put<AgentPrice>(`/agent-portal/prices/${priceId}`, data);
  return response.data;
};

/**
 * Delete price
 */
export const deletePrice = async (priceId: string): Promise<void> => {
  await api.delete(`/agent-portal/prices/${priceId}`);
};

/**
 * Get agent's shipping lines
 */
export const getAgentShippingLines = async (): Promise<string[]> => {
  const response = await api.get<{ shippingLines: string[] }>('/agent-portal/shipping-lines');
  return response.data.shippingLines;
};

// ============================================
// ADMIN FUNCTIONS
// ============================================

/**
 * Get pending prices for approval
 */
export const getPendingPrices = async (): Promise<PendingPriceWithAgent[]> => {
  const response = await api.get<{ prices: PendingPriceWithAgent[] }>('/agent-portal/admin/pending');
  return response.data.prices;
};

/**
 * Get approval statistics
 */
export const getApprovalStats = async (): Promise<ApprovalStats> => {
  const response = await api.get<ApprovalStats>('/agent-portal/admin/stats');
  return response.data;
};

/**
 * Approve a price
 */
export const approvePrice = async (priceId: string): Promise<void> => {
  await api.post(`/agent-portal/admin/approve/${priceId}`);
};

/**
 * Reject a price
 */
export const rejectPrice = async (priceId: string, reason: string): Promise<void> => {
  await api.post(`/agent-portal/admin/reject/${priceId}`, { reason });
};

// Export service object
const agentPortalService = {
  // Agent functions
  getAgentProfile,
  getAgentStats,
  getAgentPrices,
  submitPrice,
  updatePrice,
  deletePrice,
  getAgentShippingLines,
  // Admin functions
  getPendingPrices,
  getApprovalStats,
  approvePrice,
  rejectPrice,
};

export default agentPortalService;
