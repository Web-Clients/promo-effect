import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Hoist mocks so they're available in the factory
const { mockCalculateService } = vi.hoisted(() => {
  const mockCalculateService = {
    getAvailablePorts: vi.fn(),
    getAvailableDestinations: vi.fn(),
    getAvailableContainerTypes: vi.fn(),
    getAvailableWeightRanges: vi.fn(),
    calculatePrices: vi.fn(),
    placeOrder: vi.fn(),
  };
  return { mockCalculateService };
});

vi.mock('../../services/calculator', () => ({
  default: mockCalculateService,
}));

import { useCalculator } from '../../components/calculator/useCalculator';

const defaultOptions = {
  ports: ['Shanghai', 'Guangzhou', 'Ningbo'],
  destinations: ['Constanța', 'Chișinău'],
  containerTypes: ['20GP', '40GP', '40HC'],
  weightRanges: ['<5T', '5-10T', '10-15T', '15-20T'],
};

describe('useCalculator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCalculateService.getAvailablePorts.mockResolvedValue(defaultOptions.ports);
    mockCalculateService.getAvailableDestinations.mockResolvedValue(defaultOptions.destinations);
    mockCalculateService.getAvailableContainerTypes.mockResolvedValue(
      defaultOptions.containerTypes
    );
    mockCalculateService.getAvailableWeightRanges.mockResolvedValue(defaultOptions.weightRanges);
  });

  describe('initial state', () => {
    it('has correct default params', () => {
      const { result } = renderHook(() => useCalculator());

      expect(result.current.params.portDestination).toBe('Constanța');
      expect(result.current.params.incoterm).toBe('FOB');
      expect(result.current.params.finalDestination).toBe('constanta');
      expect(result.current.params.portOrigin).toBe('');
      expect(result.current.params.cargoWeight).toBe('');
      expect(result.current.params.cargoReadyDate).toBe('');
      expect(result.current.params.cargoCategory).toBe('');
    });

    it('initializes with one empty container', () => {
      const { result } = renderHook(() => useCalculator());

      expect(result.current.containers).toHaveLength(1);
      expect(result.current.containers[0]).toEqual({ type: '', quantity: 1 });
    });

    it('starts with no result and no error', () => {
      const { result } = renderHook(() => useCalculator());

      expect(result.current.result).toBeNull();
      expect(result.current.error).toBe('');
      expect(result.current.isLoading).toBe(false);
    });

    it('starts with no selected offer', () => {
      const { result } = renderHook(() => useCalculator());

      expect(result.current.selectedOffer).toBeNull();
      expect(result.current.selectedOfferData).toBeNull();
      expect(result.current.showSupplierForm).toBe(false);
    });

    it('starts with empty supplier data', () => {
      const { result } = renderHook(() => useCalculator());

      expect(result.current.supplierData.supplierName).toBe('');
      expect(result.current.supplierData.supplierEmail).toBe('');
      expect(result.current.supplierData.invoiceValue).toBe(0);
      expect(result.current.supplierData.invoiceCurrency).toBe('USD');
    });

    it('initializes isPlacingOrder and orderSuccess to falsy values', () => {
      const { result } = renderHook(() => useCalculator());

      expect(result.current.isPlacingOrder).toBe(false);
      expect(result.current.orderSuccess).toBeNull();
    });
  });

  describe('isAdmin flag', () => {
    it('is false when no user provided', () => {
      const { result } = renderHook(() => useCalculator());
      expect(result.current.isAdmin).toBe(false);
    });

    it('is true for SUPER_ADMIN role', () => {
      const { result } = renderHook(() =>
        useCalculator({
          id: '1',
          email: 'admin@test.com',
          name: 'Admin',
          role: 'SUPER_ADMIN',
        } as any)
      );
      expect(result.current.isAdmin).toBe(true);
    });

    it('is true for ADMIN role', () => {
      const { result } = renderHook(() =>
        useCalculator({ id: '1', email: 'admin@test.com', name: 'Admin', role: 'ADMIN' } as any)
      );
      expect(result.current.isAdmin).toBe(true);
    });

    it('is true for MANAGER role', () => {
      const { result } = renderHook(() =>
        useCalculator({ id: '1', email: 'mgr@test.com', name: 'Manager', role: 'MANAGER' } as any)
      );
      expect(result.current.isAdmin).toBe(true);
    });

    it('is false for CLIENT role', () => {
      const { result } = renderHook(() =>
        useCalculator({ id: '1', email: 'client@test.com', name: 'Client', role: 'CLIENT' } as any)
      );
      expect(result.current.isAdmin).toBe(false);
    });
  });

  describe('container management', () => {
    it('addContainer appends a new container after options load', async () => {
      const { result } = renderHook(() => useCalculator());

      // Wait for options to load
      await act(async () => {
        await Promise.resolve();
      });

      act(() => {
        result.current.addContainer();
      });

      expect(result.current.containers).toHaveLength(2);
    });

    it('removeContainer removes container at given index', async () => {
      const { result } = renderHook(() => useCalculator());

      await act(async () => {
        await Promise.resolve();
      });

      // Add a second container first
      act(() => {
        result.current.addContainer();
      });

      expect(result.current.containers).toHaveLength(2);

      act(() => {
        result.current.removeContainer(0);
      });

      expect(result.current.containers).toHaveLength(1);
    });

    it('does not remove the last container', async () => {
      const { result } = renderHook(() => useCalculator());

      await act(async () => {
        await Promise.resolve();
      });

      expect(result.current.containers).toHaveLength(1);

      act(() => {
        result.current.removeContainer(0);
      });

      // Should still have 1 container
      expect(result.current.containers).toHaveLength(1);
    });

    it('updateContainer updates type field', async () => {
      const { result } = renderHook(() => useCalculator());

      await act(async () => {
        await Promise.resolve();
      });

      act(() => {
        result.current.updateContainer(0, 'type', '40HC');
      });

      expect(result.current.containers[0].type).toBe('40HC');
    });

    it('updateContainer updates quantity field', async () => {
      const { result } = renderHook(() => useCalculator());

      await act(async () => {
        await Promise.resolve();
      });

      act(() => {
        result.current.updateContainer(0, 'quantity', 3);
      });

      expect(result.current.containers[0].quantity).toBe(3);
    });

    it('getTotalContainers sums all container quantities', async () => {
      const { result } = renderHook(() => useCalculator());

      await act(async () => {
        await Promise.resolve();
      });

      act(() => {
        result.current.addContainer();
      });

      act(() => {
        result.current.updateContainer(0, 'quantity', 2);
        result.current.updateContainer(1, 'quantity', 3);
      });

      expect(result.current.getTotalContainers()).toBe(5);
    });
  });

  describe('setParams', () => {
    it('updates params correctly', () => {
      const { result } = renderHook(() => useCalculator());

      act(() => {
        result.current.setParams((prev) => ({ ...prev, cargoCategory: 'Electronics' }));
      });

      expect(result.current.params.cargoCategory).toBe('Electronics');
    });

    it('incoterm and finalDestination reflect params', () => {
      const { result } = renderHook(() => useCalculator());

      act(() => {
        result.current.setParams((prev) => ({
          ...prev,
          incoterm: 'EXW',
          finalDestination: 'chisinau',
        }));
      });

      expect(result.current.incoterm).toBe('EXW');
      expect(result.current.finalDestination).toBe('chisinau');
    });
  });

  describe('handleCalculate', () => {
    it('sets error when no containers have quantity > 0', async () => {
      const { result } = renderHook(() => useCalculator());

      await act(async () => {
        await Promise.resolve();
      });

      act(() => {
        result.current.updateContainer(0, 'quantity', 0);
      });

      const fakeEvent = { preventDefault: vi.fn() } as any;

      await act(async () => {
        await result.current.handleCalculate(fakeEvent);
      });

      expect(result.current.error).toBe('Adăugați cel puțin un container cu cantitate > 0');
      expect(result.current.isLoading).toBe(false);
    });

    it('calls calculatePrices and sets result on success', async () => {
      const mockResult = { offers: [], exchangeRate: 18.5 };
      mockCalculateService.calculatePrices.mockResolvedValueOnce(mockResult);

      const { result } = renderHook(() => useCalculator());

      await act(async () => {
        await Promise.resolve();
      });

      const fakeEvent = { preventDefault: vi.fn() } as any;

      await act(async () => {
        await result.current.handleCalculate(fakeEvent);
      });

      expect(mockCalculateService.calculatePrices).toHaveBeenCalled();
      expect(result.current.result).toEqual(mockResult);
      expect(result.current.error).toBe('');
      expect(result.current.isLoading).toBe(false);
    });

    it('sets error message when calculatePrices throws', async () => {
      mockCalculateService.calculatePrices.mockRejectedValueOnce(new Error('API down'));

      const { result } = renderHook(() => useCalculator());

      await act(async () => {
        await Promise.resolve();
      });

      const fakeEvent = { preventDefault: vi.fn() } as any;

      await act(async () => {
        await result.current.handleCalculate(fakeEvent);
      });

      expect(result.current.error).toBe('API down');
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('handleSelectOffer', () => {
    it('sets selectedOffer, selectedOfferData and shows supplier form', async () => {
      const { result } = renderHook(() => useCalculator());

      const mockOffer = { rank: 1, shippingLine: 'MSC', basePriceId: 'price-1' } as any;

      act(() => {
        result.current.handleSelectOffer(mockOffer, 0);
      });

      expect(result.current.selectedOffer).toBe(0);
      expect(result.current.selectedOfferData).toEqual(mockOffer);
      expect(result.current.showSupplierForm).toBe(true);
    });
  });

  describe('options loaded from API', () => {
    it('populates availablePorts after mount', async () => {
      const { result } = renderHook(() => useCalculator());

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(result.current.availablePorts).toEqual(defaultOptions.ports);
    });

    it('populates availableContainerTypes after mount', async () => {
      const { result } = renderHook(() => useCalculator());

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(result.current.availableContainerTypes).toEqual(defaultOptions.containerTypes);
    });

    it('sets portOrigin to first available port', async () => {
      const { result } = renderHook(() => useCalculator());

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(result.current.params.portOrigin).toBe('Shanghai');
    });
  });
});
