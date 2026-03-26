import {
  CalculatorResult,
  PriceOffer,
  SupplierData,
  ContainerEntry,
} from '../../services/calculator';
import { User } from '../../types';

export type { CalculatorResult, PriceOffer, SupplierData, ContainerEntry };

export type Incoterm = 'FOB' | 'EXW' | 'CFR';
export type FinalDestination = 'constanta' | 'chisinau';

export interface LandTransportRate {
  transport: number; // Transport terestru
  customs: number; // Taxe vamale
  commission: number; // Comision
}

export interface ChinaInlandCosts {
  transport: number; // Transport China
  customs: number; // Vamă export
  warehousing: number; // Depozitare
}

export const LAND_TRANSPORT_CHISINAU: LandTransportRate = {
  transport: 600, // USD
  customs: 150, // USD
  commission: 200, // USD
};

export const CHINA_INLAND_EXW: ChinaInlandCosts = {
  transport: 500, // USD
  customs: 250, // USD
  warehousing: 350, // USD
};

export interface CalcParams {
  portOrigin: string;
  portDestination: string;
  cargoWeight: string;
  cargoReadyDate: string;
  cargoCategory: string;
  incoterm: Incoterm;
  finalDestination: FinalDestination;
}

export interface UseCalculatorReturn {
  // Params
  params: CalcParams;
  setParams: React.Dispatch<React.SetStateAction<CalcParams>>;
  // Incoterms & Destination
  incoterm: Incoterm;
  finalDestination: FinalDestination;
  // Containers
  containers: ContainerEntry[];
  addContainer: () => void;
  removeContainer: (index: number) => void;
  updateContainer: (index: number, field: 'type' | 'quantity', value: string | number) => void;
  getTotalContainers: () => number;
  // Options
  availablePorts: string[];
  availableDestinations: string[];
  availableContainerTypes: string[];
  availableWeightRanges: string[];
  // Results
  result: CalculatorResult | null;
  isLoading: boolean;
  error: string;
  selectedOffer: number | null;
  setSelectedOffer: React.Dispatch<React.SetStateAction<number | null>>;
  // Order
  showSupplierForm: boolean;
  setShowSupplierForm: React.Dispatch<React.SetStateAction<boolean>>;
  selectedOfferData: PriceOffer | null;
  isPlacingOrder: boolean;
  orderSuccess: string | null;
  supplierData: SupplierData;
  setSupplierData: React.Dispatch<React.SetStateAction<SupplierData>>;
  // Handlers
  handleCalculate: (e: React.FormEvent) => Promise<void>;
  handleSelectOffer: (offer: PriceOffer, index: number) => void;
  handlePlaceOrder: (e: React.FormEvent) => Promise<void>;
  // Props
  isAdmin: boolean;
}

export interface PriceCalculatorProps {
  user?: User;
}
