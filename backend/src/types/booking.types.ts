export interface CreateBookingDTO {
  clientId?: string; // Optional - will use current user if not provided
  agentId?: string;
  priceId?: string;

  // Route
  portOrigin: string;
  portDestination?: string; // Default: Constanta
  containerType: string;

  // Cargo details
  cargoCategory: string;
  cargoWeight: string;
  cargoReadyDate: string; // ISO date string

  // Pricing (optional - calculated automatically if priceId provided)
  shippingLine?: string;
  freightPrice?: number;
  portTaxes?: number;
  customsTaxes?: number;
  terrestrialTransport?: number;
  commission?: number;
  totalPrice?: number;

  // Supplier info (optional)
  supplierName?: string;
  supplierPhone?: string;
  supplierEmail?: string;
  supplierAddress?: string;

  // Dates (optional)
  departureDate?: string;
  eta?: string;

  // Notes
  internalNotes?: string;
  clientNotes?: string;
}

export interface UpdateBookingDTO {
  status?: BookingStatus;
  departureDate?: string;
  eta?: string;
  actualArrival?: string;
  internalNotes?: string;
  clientNotes?: string;
  // Container fields (saved to Container relation)
  containerNumber?: string;
  blNumber?: string;
}

export interface BookingFilters {
  clientId?: string;
  agentId?: string;
  status?: string;
  shippingLine?: string;
  dateFrom?: string; // Renamed from fromDate for consistency
  dateTo?: string;   // Renamed from toDate for consistency
  search?: string;
  limit?: number;
  offset?: number;
}

export type BookingStatus =
  | 'CONFIRMED'
  | 'SENT'
  | 'IN_TRANSIT'
  | 'ARRIVED'
  | 'DELIVERED'
  | 'CANCELLED';
