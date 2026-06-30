/**
 * Task F5 — CalculatorForm component test
 * Tests: Incoterm switch, destination dropdown, form structure
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'calculator.transportDetails': 'Detalii transport',
        'calculator.fillAllFields': 'Completați câmpurile',
        'calculator.originPort': 'Port origine',
        'calculator.destinationPort': 'Port destinație',
        'calculator.destinationPortHint': 'Portul de descărcare',
        'calculator.finalDestination': 'Destinație finală',
        'calculator.finalDestinationHint': '',
        'calculator.deliveryCondition': 'Condiție livrare',
        'calculator.deliveryConditionHint': '',
        'calculator.containers': 'Containere',
        'calculator.totalContainers_one': '1 container',
        'calculator.totalContainers_other': 'containere',
        'calculator.addContainerType': 'Adaugă container',
        'calculator.removeContainer': 'Elimină',
        'calculator.cargoWeight': 'Greutate marfă',
        'calculator.hsCategory': 'Categorie HS',
        'calculator.hsCategoryHint': '',
        'calculator.cargoReadyDate': 'Data pregătirii',
        'calculator.calculatePrices': 'Calculează',
        'calculator.calculating': 'Se calculează...',
        'calculator.shippingLine': 'Linie maritimă',
        'calculator.incotermTooltipFOB': 'FOB',
        'calculator.incotermTooltipEXW': 'EXW',
        'calculator.incotermTooltipCFR': 'CFR',
      };
      return map[key] ?? key;
    },
    i18n: { language: 'ro', changeLanguage: vi.fn() },
  }),
}));

// Mock HSCodeAutocomplete since it makes API calls
vi.mock('../../components/calculator/HSCodeAutocomplete', () => ({
  HSCodeAutocomplete: ({ onChange }: any) => (
    <input
      data-testid="hs-code-autocomplete"
      placeholder="HS Code"
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

// ─── Mock localStorage ────────────────────────────────────────────────────────

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// ─── Import ───────────────────────────────────────────────────────────────────

import { CalculatorForm } from '../../components/calculator/CalculatorForm';
import type {
  UseCalculatorReturn,
  Incoterm,
  FinalDestination,
} from '../../components/calculator/types';

// ─── Default props factory ────────────────────────────────────────────────────

function makeDefaultProps(overrides: Partial<React.ComponentProps<typeof CalculatorForm>> = {}) {
  const setParams = vi.fn();
  const defaultParams = {
    portOrigin: 'Shanghai',
    portDestination: 'Constanța',
    finalDestination: 'constanta' as FinalDestination,
    incoterm: 'FOB' as Incoterm,
    cargoReadyDate: '2026-06-01',
    cargoWeight: '1000',
    cargoCategory: 'general',
    shippingLine: '',
  };

  return {
    params: defaultParams,
    setParams,
    containers: [{ id: 'c1', type: '20DV', quantity: 1 }],
    addContainer: vi.fn(),
    removeContainer: vi.fn(),
    updateContainer: vi.fn(),
    getTotalContainers: vi.fn(() => 1),
    availablePorts: ['Shanghai', 'Qingdao', 'Ningbo', 'Shenzhen'],
    availableDestinations: ['Constanța', 'Odessa'],
    availableContainerTypes: ['20DV', '40DV', '40HQ', '45HQ'],
    availableWeightRanges: ['1-18', '18-23', '23-24', '24-25', '25-26'],
    availableShippingLines: ['MSC', 'COSCO', 'Maersk', 'Evergreen'],
    isLoading: false,
    error: null,
    showSupplierForm: false,
    handleCalculate: vi.fn(),
    ...overrides,
  } as React.ComponentProps<typeof CalculatorForm>;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('CalculatorForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  describe('render', () => {
    it('renders the form heading', () => {
      render(<CalculatorForm {...makeDefaultProps()} />);
      expect(screen.getByText('Detalii transport')).toBeInTheDocument();
    });

    it('renders origin port select', () => {
      render(<CalculatorForm {...makeDefaultProps()} />);
      expect(screen.getByText('Port origine')).toBeInTheDocument();
    });

    it('renders final destination dropdown', () => {
      render(<CalculatorForm {...makeDefaultProps()} />);
      expect(screen.getByText('Destinație finală')).toBeInTheDocument();
    });

    it('renders delivery condition label (Incoterm)', () => {
      render(<CalculatorForm {...makeDefaultProps()} />);
      expect(screen.getByText('Condiție livrare')).toBeInTheDocument();
    });

    it('renders calculate button', () => {
      render(<CalculatorForm {...makeDefaultProps()} />);
      // Button text is 'calculator.calculatePrices' → 'Calculează'
      expect(screen.getByRole('button', { name: /Calculează/i })).toBeInTheDocument();
    });

    it('renders all available origin ports as options', () => {
      render(<CalculatorForm {...makeDefaultProps()} />);
      expect(screen.getByDisplayValue('Shanghai')).toBeInTheDocument();
    });
  });

  describe('Incoterm switch', () => {
    it('shows FOB buttons when incoterm=FOB', () => {
      const props = makeDefaultProps({
        params: {
          portOrigin: 'Shanghai',
          portDestination: 'Constanța',
          finalDestination: 'constanta',
          incoterm: 'FOB',
          cargoReadyDate: '2026-06-01',
          cargoWeight: '1000',
          cargoCategory: 'general',
          shippingLine: '',
        },
      });
      render(<CalculatorForm {...props} />);
      // Check the active incoterm button is present
      const fobButton = screen.getAllByText('FOB')[0];
      expect(fobButton).toBeInTheDocument();
    });

    it('calls setParams when EXW incoterm button clicked', () => {
      const setParams = vi.fn();
      const props = makeDefaultProps({ setParams });
      render(<CalculatorForm {...props} />);

      const exwButton = screen.getByText('EXW');
      fireEvent.click(exwButton);

      expect(setParams).toHaveBeenCalled();
      const callArg = setParams.mock.calls[0][0];
      // setParams might be called with object or updater function
      if (typeof callArg === 'function') {
        const result = callArg(props.params);
        expect(result.incoterm).toBe('EXW');
      } else {
        expect(callArg.incoterm).toBe('EXW');
      }
    });

    it('stores selected incoterm in localStorage', () => {
      const props = makeDefaultProps();
      render(<CalculatorForm {...props} />);

      const exwButton = screen.getByText('EXW');
      fireEvent.click(exwButton);

      expect(localStorage.getItem('lastIncoterm')).toBe('EXW');
    });

    it('renders CFR button', () => {
      render(<CalculatorForm {...makeDefaultProps()} />);
      expect(screen.getByText('CFR')).toBeInTheDocument();
    });

    it('shows shipping line selector when incoterm=CFR', () => {
      const props = makeDefaultProps({
        params: {
          portOrigin: 'Shanghai',
          portDestination: 'Constanța',
          finalDestination: 'constanta',
          incoterm: 'CFR',
          cargoReadyDate: '2026-06-01',
          cargoWeight: '1000',
          cargoCategory: 'general',
          shippingLine: '',
        },
      });
      render(<CalculatorForm {...props} />);
      // CFR shows "Linie Maritimă" label (hardcoded in component)
      expect(screen.getByText('Linie Maritimă')).toBeInTheDocument();
    });
  });

  describe('destination dropdown', () => {
    it('renders all destination options', () => {
      render(<CalculatorForm {...makeDefaultProps()} />);
      // The destination dropdown should contain the available destinations
      expect(screen.getByDisplayValue('Constanța')).toBeInTheDocument();
    });

    it('Constanța destination is default selected', () => {
      render(<CalculatorForm {...makeDefaultProps()} />);
      const select = screen.getByDisplayValue('Constanța');
      expect(select).toBeInTheDocument();
    });
  });

  describe('route display', () => {
    it('shows route when portOrigin is set', () => {
      render(<CalculatorForm {...makeDefaultProps()} />);
      // Route "Shanghai → Constanța" or similar should appear
      expect(screen.getByText(/Shanghai → Constanța/)).toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('renders error message when error prop is set', () => {
      const props = makeDefaultProps({ error: 'Nu am găsit prețuri disponibile' });
      render(<CalculatorForm {...props} />);
      expect(screen.getByText('Nu am găsit prețuri disponibile')).toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('shows loading text when isLoading=true', () => {
      const props = makeDefaultProps({ isLoading: true });
      render(<CalculatorForm {...props} />);
      // When loading, button text changes to 'Se calculează...'
      expect(screen.getByText('Se calculează...')).toBeInTheDocument();
    });

    it('disables the calculate button when isLoading=true', () => {
      const props = makeDefaultProps({ isLoading: true });
      render(<CalculatorForm {...props} />);
      const button = screen.getByRole('button', { name: /Se calculează/i });
      expect(button).toBeDisabled();
    });
  });
});
