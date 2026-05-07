/**
 * Suppliers Service (frontend)
 * Reusable Chinese supplier records — distinct from Client (beneficiar moldovean).
 */

import api from './api';
import type { AxiosError } from 'axios';

function getErrorMessage(error: unknown, fallback: string): string {
  const axiosErr = error as AxiosError<{ error?: string }>;
  return axiosErr?.response?.data?.error ?? (error instanceof Error ? error.message : fallback);
}

export interface Supplier {
  id: string;
  name: string;
  address?: string;
  contact?: string;
  phone?: string;
  email?: string;
  website?: string;
  country?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  _count?: { bookings: number };
}

export interface SuppliersListResponse {
  suppliers: Supplier[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateSupplierData {
  name: string;
  address?: string;
  contact?: string;
  phone?: string;
  email?: string;
  website?: string;
  country?: string;
  notes?: string;
}

/**
 * List all suppliers with optional search / pagination.
 */
export const getSuppliers = async (params?: {
  search?: string;
  country?: string;
  page?: number;
  limit?: number;
}): Promise<SuppliersListResponse> => {
  try {
    const response = await api.get<SuppliersListResponse>('/api/v1/suppliers', { params });
    return response.data;
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, 'Nu s-au putut încărca furnizorii'), { cause: error });
  }
};

/**
 * Create a new supplier.
 */
export const createSupplier = async (data: CreateSupplierData): Promise<Supplier> => {
  try {
    const response = await api.post<Supplier>('/api/v1/suppliers', data);
    return response.data;
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, 'Nu s-a putut crea furnizorul'), { cause: error });
  }
};

/**
 * Update a supplier.
 */
export const updateSupplier = async (
  id: string,
  data: Partial<CreateSupplierData>
): Promise<Supplier> => {
  try {
    const response = await api.patch<Supplier>(`/api/v1/suppliers/${id}`, data);
    return response.data;
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, 'Nu s-a putut actualiza furnizorul'), { cause: error });
  }
};

/**
 * Delete a supplier (admin only).
 */
export const deleteSupplier = async (id: string): Promise<void> => {
  try {
    await api.delete(`/api/v1/suppliers/${id}`);
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, 'Nu s-a putut șterge furnizorul'), { cause: error });
  }
};
