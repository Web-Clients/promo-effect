import {
  CalculatorResult,
  PriceOffer,
  SupplierData,
  ContainerEntry,
} from '../../services/calculator';
import { User } from '../../types';

export type { CalculatorResult, PriceOffer, SupplierData, ContainerEntry };

export interface CalcParams {
  portOrigin: string;
  portDestination: string;
  cargoWeight: string;
  cargoReadyDate: string;
  cargoCategory: string;
}

export interface UseCalculatorReturn {
  // Params
  params: CalcParams;
  setParams: React.Dispatch<React.SetStateAction<CalcParams>>;
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
