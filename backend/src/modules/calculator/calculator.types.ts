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
  clientId?: string; // Optional: used to auto-apply client discount
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

  // Applied client discount (percentage, 0 if none)
  discountApplied?: number;

  // Multiple containers support
  containerBreakdown?: ContainerPriceBreakdown[];
  totalContainers?: number;

  estimatedTransitDays: number;
  availability: 'AVAILABLE' | 'LIMITED' | 'UNAVAILABLE';

  // Incoterm pricing — filled by finalizeOffers via calculator-incoterms.priceOffer.
  // The frontend renders these; it must never re-derive the total itself.
  incoterm?: 'FOB' | 'EXW' | 'CFR' | 'CIF';
  /** Ocean freight actually billed to the buyer — 0 under CFR/CIF. */
  maritimeCharged?: number;
  /** portTaxes + customsTaxes, the single "Taxe locale Constanța" cell. */
  localTaxesTotal?: number;
  /** terrestrialTransport + insurance. */
  landTransportTotal?: number;
  commissionPercent?: number;
  /** What the percentage is applied to — never includes the ocean freight. */
  commissionBase?: number;
  commissionAmount?: number;
  /** True when the quote used a Shanghai rate because the chosen origin has none. */
  priceFromReferencePort?: string;
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
  supplierEmail?: string; // optional — not required in Calculator form
  supplierPhone?: string; // optional
  cargoDescription: string;
  invoiceValue?: number; // optional
  invoiceCurrency?: string; // optional
  specialInstructions?: string;
  // Beneficiary (client) selected from DB
  clientId?: string;
  beneficiaryName?: string;
  beneficiaryContact?: string;
  beneficiaryAddress?: string;
  beneficiaryEmail?: string;
  beneficiaryPhone?: string;
  // Agent selected from DB
  agentId?: string;
}

export interface PlaceOrderRequest {
  offerId: string;
  offer: PriceOffer;
  calculatorInput: CalculatorInput;
  supplierData: SupplierData;
  /** Admin's per-quote commission percentage, re-validated server-side (0–30). */
  commissionPercent?: number;
}

export interface PlaceOrderResult {
  success: boolean;
  bookingId: string;
  message: string;
}
