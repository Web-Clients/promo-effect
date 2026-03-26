/**
 * Clients Service
 * Handles all client-related API calls
 */

import api from './api';

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return fallback;
}

// Types
export interface Client {
  id: string;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  address?: string;
  taxId?: string;
  bankAccount?: string;
  totalBookings: number;
  totalRevenue: number;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  createdAt: string;
  updatedAt: string;
  lastBookingAt?: string;
  _count?: {
    bookings: number;
    invoices: number;
  };
}

export interface CreateClientData {
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  address?: string;
  taxId?: string;
  bankAccount?: string;
}

export interface UpdateClientData extends Partial<CreateClientData> {
  status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
}

export interface ClientFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

export interface ClientListResponse {
  clients: Client[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ClientStats {
  total: number;
  active: number;
  inactive: number;
  suspended: number;
  totalRevenue: number;
}

/**
 * Get list of clients with filters and pagination
 */
export const getClients = async (filters?: ClientFilters): Promise<ClientListResponse> => {
  try {
    const params = new URLSearchParams();

    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.search) params.append('search', filters.search);
    if (filters?.status && filters.status !== 'ALL') params.append('status', filters.status);

    const url = `/clients${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await api.get<ClientListResponse>(url);

    return response.data;
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, 'Nu s-au putut încărca clienții'), { cause: error });
  }
};

/**
 * Get single client by ID
 */
export const getClientById = async (id: string): Promise<Client> => {
  try {
    const response = await api.get<Client>(`/clients/${id}`);
    return response.data;
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, 'Nu s-a putut încărca clientul'), { cause: error });
  }
};

/**
 * Get client statistics
 */
export const getClientStats = async (): Promise<ClientStats> => {
  try {
    const response = await api.get<ClientStats>('/clients/stats');
    return response.data;
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, 'Nu s-au putut încărca statisticile'), { cause: error });
  }
};

/**
 * Create new client
 */
export const createClient = async (data: CreateClientData): Promise<Client> => {
  try {
    const response = await api.post<Client>('/clients', data);
    return response.data;
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, 'Nu s-a putut crea clientul'), { cause: error });
  }
};

/**
 * Update existing client
 */
export const updateClient = async (id: string, data: UpdateClientData): Promise<Client> => {
  try {
    const response = await api.put<Client>(`/clients/${id}`, data);
    return response.data;
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, 'Nu s-a putut actualiza clientul'), { cause: error });
  }
};

/**
 * Delete (soft delete) client
 */
export const deleteClient = async (id: string): Promise<{ message: string }> => {
  try {
    const response = await api.delete<{ message: string }>(`/clients/${id}`);
    return response.data;
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, 'Nu s-a putut șterge clientul'), { cause: error });
  }
};

// Export as default object for easier imports
const clientsService = {
  getClients,
  getClientById,
  getClientStats,
  createClient,
  updateClient,
  deleteClient,
};

export default clientsService;
