/**
 * Bookings Service
 * Handles all booking-related API calls
 */

import api from './api';

// Booking interfaces for API
export interface CreateBookingData {
  clientId?: string;
  agentId?: string;
  priceId?: string;
  portOrigin: string;
  portDestination?: string;
  containerType: string;
  cargoCategory: string;
  cargoWeight: string;
  cargoReadyDate: string;
  shippingLine?: string;
  freightPrice?: number;
  supplierName?: string;
  supplierPhone?: string;
  supplierEmail?: string;
  supplierAddress?: string;
  clientNotes?: string;
  internalNotes?: string;
}

export interface UpdateBookingData {
  status?: string;
  agentId?: string;
  priceId?: string;
  departureDate?: string;
  eta?: string;
  actualArrival?: string;
  supplierName?: string;
  supplierPhone?: string;
  supplierEmail?: string;
  supplierAddress?: string;
  clientNotes?: string;
  internalNotes?: string;
  containerNumber?: string;
  blNumber?: string;
}

export interface BookingFilters {
  clientId?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface BookingResponse {
  id: string;
  clientId: string;
  agentId: string | null;
  priceId: string | null;
  portOrigin: string;
  portDestination: string;
  containerType: string;
  cargoCategory: string;
  cargoWeight: string;
  cargoReadyDate: string;
  shippingLine: string;
  freightPrice: number;
  portTaxes: number;
  customsTaxes: number;
  terrestrialTransport: number;
  commission: number;
  totalPrice: number;
  supplierName: string | null;
  supplierPhone: string | null;
  supplierEmail: string | null;
  supplierAddress: string | null;
  status: string;
  departureDate: string | null;
  eta: string | null;
  actualArrival: string | null;
  internalNotes: string | null;
  clientNotes: string | null;
  createdAt: string;
  updatedAt: string;
  client?: {
    id: string;
    companyName: string;
    contactPerson: string;
    email: string;
    phone: string;
  };
  agent?: {
    id: string;
    agentCode: string;
    company: string;
  };
  selectedPrice?: any;
  containers?: any[];
  documents?: any[];
  invoices?: any[];
  notifications?: any[];
  // GPS Tracking fields
  trackingVehicleId?: string | null;
  trackingVehicleName?: string | null;
  trackingStartedAt?: string | null;
  lastGpsLat?: number | null;
  lastGpsLng?: number | null;
  lastGpsSpeed?: number | null;
  lastGpsUpdate?: string | null;
}

export interface BookingListResponse {
  bookings: BookingResponse[];
  total: number;
  limit: number;
  offset: number;
}

export interface BookingStatsResponse {
  total: number;
  byStatus: {
    [key: string]: number;
  };
  totalRevenue: number;
}

/**
 * Create new booking
 */
export const createBooking = async (
  data: CreateBookingData
): Promise<BookingResponse> => {
  try {
    const response = await api.post<BookingResponse>('/bookings', data);
    return response.data;
  } catch (error: any) {
    throw new Error(error.message || 'Nu s-a putut crea rezervarea');
  }
};

/**
 * Get list of bookings with filters
 */
export const getBookings = async (
  filters?: BookingFilters
): Promise<BookingListResponse> => {
  try {
    const params = new URLSearchParams();

    if (filters?.clientId) params.append('clientId', filters.clientId);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params.append('dateTo', filters.dateTo);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.offset) params.append('offset', filters.offset.toString());

    const response = await api.get<BookingListResponse>(
      `/bookings${params.toString() ? `?${params.toString()}` : ''}`
    );

    return response.data;
  } catch (error: any) {
    throw new Error(error.message || 'Nu s-au putut încărca rezervările');
  }
};

/**
 * Get single booking by ID
 */
export const getBookingById = async (id: string): Promise<BookingResponse> => {
  try {
    const response = await api.get<BookingResponse>(`/bookings/${id}`);
    return response.data;
  } catch (error: any) {
    throw new Error(error.message || 'Nu s-a putut încărca rezervarea');
  }
};

/**
 * Update booking
 */
export const updateBooking = async (
  id: string,
  data: UpdateBookingData
): Promise<BookingResponse> => {
  try {
    const response = await api.put<BookingResponse>(`/bookings/${id}`, data);
    return response.data;
  } catch (error: any) {
    throw new Error(error.message || 'Nu s-a putut actualiza rezervarea');
  }
};

/**
 * Cancel (delete) booking
 */
export const cancelBooking = async (
  id: string
): Promise<{ message: string }> => {
  try {
    const response = await api.delete<{ message: string }>(`/bookings/${id}`);
    return response.data;
  } catch (error: any) {
    throw new Error(error.message || 'Nu s-a putut anula rezervarea');
  }
};

/**
 * Get booking statistics
 */
export const getBookingStats = async (): Promise<BookingStatsResponse> => {
  try {
    const response = await api.get<BookingStatsResponse>('/bookings/stats');
    return response.data;
  } catch (error: any) {
    throw new Error(error.message || 'Nu s-au putut încărca statisticile');
  }
};

// Export bookings service
const bookingsService = {
  createBooking,
  getBookings,
  getBookingById,
  updateBooking,
  cancelBooking,
  getBookingStats,
};

export default bookingsService;
