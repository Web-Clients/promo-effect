import { useState, useEffect } from 'react';
import calculatorService, {
  CalculatorResult,
  PriceOffer,
  SupplierData,
  ContainerEntry,
} from '../../services/calculator';
import { User, UserRole } from '../../types';
import { CalcParams, UseCalculatorReturn } from './types';

export function useCalculator(user?: User): UseCalculatorReturn {
  const isAdmin = !!(
    user && [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER].includes(user.role)
  );

  const [params, setParams] = useState<CalcParams>({
    portOrigin: '',
    portDestination: 'Constanța',
    cargoWeight: '',
    cargoReadyDate: '',
    cargoCategory: '',
    incoterm: 'FOB',
    finalDestination: 'constanta',
  });

  const [containers, setContainers] = useState<ContainerEntry[]>([{ type: '', quantity: 1 }]);

  const [availablePorts, setAvailablePorts] = useState<string[]>([]);
  const [availableDestinations, setAvailableDestinations] = useState<string[]>([]);
  const [availableContainerTypes, setAvailableContainerTypes] = useState<string[]>([]);
  const [availableWeightRanges, setAvailableWeightRanges] = useState<string[]>([]);

  const [result, setResult] = useState<CalculatorResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [selectedOffer, setSelectedOffer] = useState<number | null>(null);

  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [selectedOfferData, setSelectedOfferData] = useState<PriceOffer | null>(null);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null);

  const [supplierData, setSupplierData] = useState<SupplierData>({
    supplierName: '',
    supplierAddress: '',
    supplierContact: '',
    supplierEmail: '',
    supplierPhone: '',
    cargoDescription: '',
    invoiceValue: 0,
    invoiceCurrency: 'USD',
    specialInstructions: '',
  });

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [ports, destinations, types, weights] = await Promise.all([
          calculatorService.getAvailablePorts(),
          calculatorService.getAvailableDestinations(),
          calculatorService.getAvailableContainerTypes(),
          calculatorService.getAvailableWeightRanges(),
        ]);

        setAvailablePorts(ports);
        setAvailableDestinations(destinations);
        setAvailableContainerTypes(types);
        setAvailableWeightRanges(weights);

        if (ports.length > 0) setParams((prev) => ({ ...prev, portOrigin: ports[0] }));
        if (destinations.length > 0)
          setParams((prev) => ({ ...prev, portDestination: destinations[0] }));
        if (types.length > 0) setContainers([{ type: types[0], quantity: 1 }]);
        if (weights.length > 0) setParams((prev) => ({ ...prev, cargoWeight: weights[0] }));
      } catch (err: any) {
        console.error('Failed to load calculator options:', err);
      }
    };

    loadOptions();
  }, []);

  const addContainer = () => {
    if (availableContainerTypes.length > 0) {
      setContainers((prev) => [...prev, { type: availableContainerTypes[0], quantity: 1 }]);
    }
  };

  const removeContainer = (index: number) => {
    if (containers.length > 1) {
      setContainers((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const updateContainer = (index: number, field: 'type' | 'quantity', value: string | number) => {
    setContainers((prev) => prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)));
  };

  const getTotalContainers = () => containers.reduce((sum, c) => sum + c.quantity, 0);

  const handleCalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setResult(null);
    setError('');
    setSelectedOffer(null);
    setShowSupplierForm(false);
    setOrderSuccess(null);

    if (containers.length === 0 || containers.every((c) => c.quantity === 0)) {
      setError('Adăugați cel puțin un container cu cantitate > 0');
      setIsLoading(false);
      return;
    }

    try {
      const calculatorResult = await calculatorService.calculatePrices({
        portOrigin: params.portOrigin,
        portDestination: params.portDestination,
        containerType: containers[0].type,
        containers: containers.filter((c) => c.quantity > 0),
        cargoWeight: params.cargoWeight,
        cargoReadyDate: params.cargoReadyDate,
        cargoCategory: params.cargoCategory,
      });

      setResult(calculatorResult);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectOffer = (offer: PriceOffer, index: number) => {
    setSelectedOffer(index);
    setSelectedOfferData(offer);
    setShowSupplierForm(true);
    setOrderSuccess(null);
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOfferData || !result) return;

    setIsPlacingOrder(true);
    setError('');

    try {
      const response = await calculatorService.placeOrder({
        offerId: selectedOfferData.basePriceId,
        offer: selectedOfferData,
        calculatorInput: {
          portOrigin: params.portOrigin,
          portDestination: params.portDestination,
          containerType: containers[0].type,
          containers: containers.filter((c) => c.quantity > 0),
          cargoCategory: params.cargoCategory,
          cargoWeight: params.cargoWeight,
          cargoReadyDate: params.cargoReadyDate,
        },
        supplierData,
      });

      setOrderSuccess(`Comanda a fost plasată cu succes! Număr rezervare: ${response.bookingId}`);
      setShowSupplierForm(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsPlacingOrder(false);
    }
  };

  return {
    params,
    setParams,
    incoterm: params.incoterm,
    finalDestination: params.finalDestination,
    containers,
    addContainer,
    removeContainer,
    updateContainer,
    getTotalContainers,
    availablePorts,
    availableDestinations,
    availableContainerTypes,
    availableWeightRanges,
    result,
    isLoading,
    error,
    selectedOffer,
    setSelectedOffer,
    showSupplierForm,
    setShowSupplierForm,
    selectedOfferData,
    isPlacingOrder,
    orderSuccess,
    supplierData,
    setSupplierData,
    handleCalculate,
    handleSelectOffer,
    handlePlaceOrder,
    isAdmin,
  };
}
