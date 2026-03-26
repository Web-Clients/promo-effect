// ============================================
// CALCULATOR TYPES & INTERFACES
// ============================================

// Container entry for multiple containers
export interface ContainerEntry {
  type: string;
  quantity: number;
}

export interface CalculatorInput {
  portOrigin: string;
  portDestination: string; // Constanta or Odessa
  containerType: string; // Primary container type (backward compatibility)
  containers?: ContainerEntry[]; // Multiple containers support
  cargoCategory: string;
  cargoWeight: string;
  cargoReadyDate: string; // ISO date string
  includeInsurance?: boolean;
}

// Price breakdown per container type
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
  route: string; // "Shanghai → Constanța → Chișinău"
  portOrigin: string;
  portIntermediate: string; // Constanta or Odessa
  portFinal: string; // Chișinău

  // Price breakdown (aggregate for all containers)
  freightPrice: number;
  portAdjustment: number;
  portTaxes: number;
  customsTaxes: number;
  terrestrialTransport: number;
  commission: number;
  insurance: number;

  totalPriceUSD: number;
  totalPriceMDL: number;

  // Multiple containers support
  containerBreakdown?: ContainerPriceBreakdown[];
  totalContainers?: number;

  estimatedTransitDays: number;
  availability: 'AVAILABLE' | 'LIMITED' | 'UNAVAILABLE';
}

export interface CalculatorResult {
  offers: PriceOffer[];
  exchangeRate: number;
  calculatedAt: Date;
  totalContainers: number;
  input: CalculatorInput;
}

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

export interface PlaceOrderRequest {
  offerId: string;
  offer: PriceOffer;
  calculatorInput: CalculatorInput;
  supplierData: SupplierData;
}

export interface PlaceOrderResult {
  success: boolean;
  bookingId: string;
  message: string;
}
