/**
 * Calculator Service
 * Handles all price calculator-related API calls
 */

import api from './api';

// Container entry for multiple containers support
export interface ContainerEntry {
  type: string;
  quantity: number;
}

// Calculator interfaces for API
export interface CalculatePriceData {
  portOrigin: string;
  portDestination?: string;
  containerType: string; // Main container type (for backward compatibility)
  containers?: ContainerEntry[]; // Multiple containers support
  cargoCategory: string;
  cargoWeight: string;
  cargoReadyDate: string;
}

// Container price breakdown for individual container types
export interface ContainerPriceBreakdown {
  type: string;
  quantity: number;
  unitPriceUSD: number;
  totalPriceUSD: number;
  freightPrice: number;
  portAdjustment: number;
}

export interface PriceOffer {
  rank: number;
  shippingLine: string;
  basePriceId: string;

  // Route info
  route: string;
  portOrigin: string;
  portIntermediate: string;
  portFinal: string;

  // Price breakdown (aggregate or single)
  freightPrice: number;
  portAdjustment: number;
  portTaxes: number;
  customsTaxes: number;
  terrestrialTransport: number;
  commission: number;
  insurance: number;

  totalPriceUSD: number;
  totalPriceMDL: number;

  // Multiple containers breakdown (optional)
  containerBreakdown?: ContainerPriceBreakdown[];
  totalContainers?: number;

  estimatedTransitDays: number;
  availability: 'AVAILABLE' | 'LIMITED' | 'UNAVAILABLE';
}

export interface CalculatorResult {
  offers: PriceOffer[];
  exchangeRate: number;
  calculatedAt: string;
  totalContainers: number;
  input: {
    portOrigin: string;
    portDestination: string;
    containerType: string;
    containers?: ContainerEntry[];
    cargoCategory: string;
    cargoWeight: string;
    cargoReadyDate: string;
  };
}

/**
 * Calculate prices for ALL 6 shipping lines and return top 5 sorted by price
 */
export const calculatePrices = async (
  data: CalculatePriceData
): Promise<CalculatorResult> => {
  try {
    const response = await api.post<CalculatorResult>('/calculator/calculate', data);
    return response.data;
  } catch (error: any) {
    const errorMessage = error.response?.data?.error || error.message || 'Nu s-au putut calcula prețurile';
    throw new Error(errorMessage);
  }
};

/**
 * Get list of available ports (for dropdown)
 */
export const getAvailablePorts = async (): Promise<string[]> => {
  try {
    const response = await api.get<{ ports: string[] }>('/calculator/ports');
    return response.data.ports;
  } catch (error: any) {
    throw new Error(error.message || 'Nu s-au putut încărca porturile');
  }
};

/**
 * Get list of available container types (for dropdown)
 */
export const getAvailableContainerTypes = async (): Promise<string[]> => {
  try {
    const response = await api.get<{ containerTypes: string[] }>('/calculator/container-types');
    return response.data.containerTypes;
  } catch (error: any) {
    throw new Error(error.message || 'Nu s-au putut încărca tipurile de containere');
  }
};

/**
 * Get list of available weight ranges (for dropdown)
 */
export const getAvailableWeightRanges = async (): Promise<string[]> => {
  try {
    const response = await api.get<{ weightRanges: string[] }>('/calculator/weight-ranges');
    return response.data.weightRanges;
  } catch (error: any) {
    throw new Error(error.message || 'Nu s-au putut încărca intervalele de greutate');
  }
};

/**
 * Get list of available destination ports (for dropdown)
 */
export const getAvailableDestinations = async (): Promise<string[]> => {
  try {
    const response = await api.get<{ destinations: string[] }>('/calculator/destinations');
    return response.data.destinations;
  } catch (error: any) {
    throw new Error(error.message || 'Nu s-au putut încărca porturile de destinație');
  }
};

// Supplier data interface for order placement
export interface SupplierData {
  supplierName: string;
  supplierAddress: string;
  supplierContact: string;
  supplierEmail: string;
  supplierPhone: string;
  cargoDescription: string;
  invoiceValue: number;
  invoiceCurrency: string;
  specialInstructions?: string;
}

// Order placement request
export interface PlaceOrderRequest {
  offerId: string;
  offer: PriceOffer;
  calculatorInput: CalculatePriceData;
  supplierData: SupplierData;
}

/**
 * Place order with selected offer
 */
export const placeOrder = async (data: PlaceOrderRequest): Promise<{ success: boolean; bookingId: string; message: string }> => {
  try {
    const response = await api.post<{ success: boolean; bookingId: string; message: string }>('/calculator/place-order', data);
    return response.data;
  } catch (error: any) {
    const errorMessage = error.response?.data?.error || error.message || 'Nu s-a putut plasa comanda';
    throw new Error(errorMessage);
  }
};

// Export calculator service
const calculatorService = {
  calculatePrices,
  getAvailablePorts,
  getAvailableContainerTypes,
  getAvailableWeightRanges,
  getAvailableDestinations,
  placeOrder,
};

export default calculatorService;
