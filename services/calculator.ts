/**
 * Calculator Service
 * Handles all price calculator-related API calls
 */

import api from './api';
import type { AxiosError } from 'axios';

function getErrorMessage(error: unknown, fallback: string): string {
  const axiosErr = error as AxiosError<{ error?: string }>;
  return axiosErr?.response?.data?.error ?? (error instanceof Error ? error.message : fallback);
}

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
  // Incoterm context. These were being sent already but the type did not admit
  // them, so every call site cast itself away with `as never` — which is how the
  // order request came to omit the incoterm entirely and price CFR bookings as FOB.
  incoterm?: 'FOB' | 'EXW' | 'CFR' | 'CIF';
  finalDestination?: string;
  shippingLine?: string;
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

  // Incoterm pricing, computed by the backend (calculator-incoterms.priceOffer).
  // Render these; never re-derive the total in the browser — that divergence is
  // what made a $2.475 offer card turn into a $9.005 order form.
  incoterm?: 'FOB' | 'EXW' | 'CFR' | 'CIF';
  /** Ocean freight actually billed — 0 under CFR/CIF. */
  maritimeCharged?: number;
  /** portTaxes + customsTaxes, the "Taxe locale Constanța" cell. */
  localTaxesTotal?: number;
  /** terrestrialTransport + insurance. */
  landTransportTotal?: number;
  commissionPercent?: number;
  commissionBase?: number;
  commissionAmount?: number;
  /** Set when the origin port has no rate of its own and a reference port's was used. */
  priceFromReferencePort?: string;
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
export const calculatePrices = async (data: CalculatePriceData): Promise<CalculatorResult> => {
  try {
    const response = await api.post<CalculatorResult>('/calculator/calculate', data);
    return response.data;
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, 'Nu s-au putut calcula prețurile'), { cause: error });
  }
};

/**
 * Get list of available ports (for dropdown)
 */
export const getAvailablePorts = async (): Promise<string[]> => {
  try {
    const response = await api.get<{ ports: string[] }>('/calculator/ports');
    return response.data.ports;
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, 'Nu s-au putut încărca porturile'), { cause: error });
  }
};

/**
 * Get list of available container types (for dropdown)
 */
export const getAvailableContainerTypes = async (): Promise<string[]> => {
  try {
    const response = await api.get<{ containerTypes: string[] }>('/calculator/container-types');
    return response.data.containerTypes;
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, 'Nu s-au putut încărca tipurile de containere'), {
      cause: error,
    });
  }
};

/**
 * Get list of available weight ranges (for dropdown)
 */
export const getAvailableWeightRanges = async (): Promise<string[]> => {
  try {
    const response = await api.get<{ weightRanges: string[] }>('/calculator/weight-ranges');
    return response.data.weightRanges;
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, 'Nu s-au putut încărca intervalele de greutate'), {
      cause: error,
    });
  }
};

/**
 * Get list of available destination ports (for dropdown)
 */
export const getAvailableDestinations = async (): Promise<string[]> => {
  try {
    const response = await api.get<{ destinations: string[] }>('/calculator/destinations');
    return response.data.destinations;
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, 'Nu s-au putut încărca porturile de destinație'), {
      cause: error,
    });
  }
};

// Supplier data interface for order placement
export interface SupplierData {
  supplierId?: string; // Reference to reusable Supplier record (from autocomplete)
  supplierName: string;
  supplierAddress: string;
  supplierContact: string;
  supplierEmail?: string; // optional
  supplierPhone?: string; // optional
  cargoDescription: string;
  invoiceValue?: number; // optional
  invoiceCurrency?: string; // optional
  specialInstructions?: string;
  // Beneficiary (client from DB)
  clientId?: string;
  beneficiaryName?: string;
  beneficiaryContact?: string;
  beneficiaryAddress?: string;
  // Agent from DB
  agentId?: string;
}

// Order placement request
export interface PlaceOrderRequest {
  offerId: string;
  offer: PriceOffer;
  calculatorInput: CalculatePriceData;
  supplierData: SupplierData;
  /** Admin's effective commission % for this quote; re-validated server-side. */
  commissionPercent?: number;
}

/**
 * Get available shipping lines (for CFR dropdown)
 */
export const getAvailableShippingLines = async (): Promise<string[]> => {
  try {
    const response = await api.get<{ shippingLines: string[] }>('/calculator/shipping-lines');
    return response.data.shippingLines;
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, 'Nu s-au putut încărca liniile maritime'), {
      cause: error,
    });
  }
};

/**
 * Place order with selected offer
 */
export const placeOrder = async (
  data: PlaceOrderRequest
): Promise<{ success: boolean; bookingId: string; message: string }> => {
  try {
    const response = await api.post<{ success: boolean; bookingId: string; message: string }>(
      '/calculator/place-order',
      data
    );
    return response.data;
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, 'Nu s-a putut plasa comanda'), { cause: error });
  }
};

// Client summary for beneficiary dropdown
export interface ClientSummary {
  id: string;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  address?: string;
}

// Agent summary for agent dropdown
export interface AgentSummary {
  id: string;
  agentCode: string;
  company: string;
  contactName: string;
  user: { name: string; email: string };
}

/**
 * Get list of clients for beneficiary dropdown
 */
export const getClients = async (): Promise<ClientSummary[]> => {
  try {
    const response = await api.get<{ clients: ClientSummary[]; data?: ClientSummary[] }>(
      '/clients?limit=200&status=ACTIVE'
    );
    return response.data.clients || response.data.data || [];
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, 'Nu s-au putut încărca clienții'), { cause: error });
  }
};

/**
 * Get list of agents for agent dropdown
 */
export const getAgents = async (): Promise<AgentSummary[]> => {
  try {
    const response = await api.get<{ agents: AgentSummary[] }>('/agents?status=ACTIVE');
    return response.data.agents || [];
  } catch (error: unknown) {
    // Agents endpoint may require admin — return empty list gracefully
    return [];
  }
};

// Export calculator service
const calculatorService = {
  calculatePrices,
  getAvailablePorts,
  getAvailableContainerTypes,
  getAvailableWeightRanges,
  getAvailableDestinations,
  getAvailableShippingLines,
  placeOrder,
  getClients,
  getAgents,
};

export default calculatorService;
