/**
 * Task F5 — BookingsTable component test
 * Tests: render, sort helpers, click interactions, badges
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'bookings.title': 'Rezervări',
        'bookings.noBookings': 'Nicio rezervare',
        'bookings.createFirst': 'Creează prima rezervare',
        'bookings.createFirstBtn': 'Rezervare nouă',
        'bookings.selectAll': 'Selectează tot',
        'bookings.loadingBookings': 'Se încarcă...',
        'bookings.noBookingsInTab': 'Nicio rezervare în tab-ul',
        'status.pending': 'În așteptare',
        'status.confirmed': 'Confirmat',
        'status.inTransit': 'În tranzit',
        'status.delivered': 'Livrat',
        'status.cancelled': 'Anulat',
        'status.processing': 'În procesare',
        'bookings.columns.blNumber': 'Nr. BL',
        'bookings.columns.client': 'Client',
        'bookings.columns.shippingLine': 'Linie maritimă',
        'bookings.columns.container': 'Container',
        'bookings.columns.route': 'Rută',
        'bookings.columns.eta': 'ETA',
        'bookings.columns.price': 'Preț',
        'bookings.columns.status': 'Status',
        'bookings.columns.actions': 'Acțiuni',
        'bookings.viewDetails': 'Detalii',
        'bookings.createInvoice': 'Factură',
      };
      return map[key] ?? key;
    },
    i18n: { language: 'ro', changeLanguage: vi.fn() },
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

// ─── Import after mocks ───────────────────────────────────────────────────────

import {
  BookingsTable,
  getBlNumber,
  getContainerNumber,
  hasTelexRelease,
  hasDocuments,
} from '../../components/bookings/BookingsTable';
import { BookingResponse } from '../../services/bookings';
import { User, UserRole } from '../../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const mockUser: User = {
  id: 1,
  name: 'Admin User',
  email: 'admin@example.com',
  role: UserRole.ADMIN,
};

function makeBooking(overrides: Partial<BookingResponse> = {}): BookingResponse {
  return {
    id: 'PE2512001',
    clientId: 'client-1',
    portOrigin: 'Shanghai',
    portDestination: 'Constanta',
    containerType: '20DV',
    cargoCategory: 'General',
    cargoWeight: '18-23',
    cargoReadyDate: '2026-06-01',
    shippingLine: 'MSC',
    freightPrice: 1000,
    portTaxes: 200,
    customsTaxes: 150,
    terrestrialTransport: 300,
    commission: 50,
    totalPrice: 1700,
    status: 'CONFIRMED',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    client: {
      id: 'client-1',
      companyName: 'Test SRL',
      contactPerson: 'Ion',
      email: 'test@srl.md',
      phone: '',
      status: 'ACTIVE',
      createdAt: '',
      updatedAt: '',
    },
    containers: [],
    documents: [],
    ...overrides,
  } as any;
}

function renderTable(
  bookings: BookingResponse[] = [],
  props: Partial<React.ComponentProps<typeof BookingsTable>> = {}
) {
  const defaultProps = {
    bookings,
    selectedRows: [] as string[],
    onSelectAll: vi.fn(),
    onSelectRow: vi.fn(),
    user: mockUser,
    isLoading: false,
    activeTab: 'all',
    tabLabel: 'Toate',
  };
  return render(
    <MemoryRouter>
      <BookingsTable {...defaultProps} {...props} />
    </MemoryRouter>
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('BookingsTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('render', () => {
    it('renders table with aria-label', () => {
      renderTable([makeBooking()]);
      expect(screen.getByRole('table', { name: 'Rezervări' })).toBeInTheDocument();
    });

    it('renders "no bookings" state when list is empty', () => {
      renderTable([]);
      expect(screen.getByText('Nicio rezervare')).toBeInTheDocument();
    });

    it('renders loading skeleton when isLoading=true', () => {
      renderTable([], { isLoading: true });
      const table = screen.getByRole('table');
      expect(table).toHaveAttribute('aria-busy', 'true');
    });

    it('renders booking rows for each booking', () => {
      const bookings = [
        makeBooking({ id: 'PE001' }),
        makeBooking({ id: 'PE002' }),
        makeBooking({ id: 'PE003' }),
      ];
      const { container } = renderTable(bookings);
      const rows = container.querySelectorAll('tbody tr');
      expect(rows.length).toBe(3);
    });

    it('renders select-all checkbox', () => {
      renderTable([makeBooking()]);
      expect(screen.getByRole('checkbox', { name: 'Selectează tot' })).toBeInTheDocument();
    });

    it('shows "no bookings in tab" message for non-all tab', () => {
      renderTable([], { activeTab: 'transit', tabLabel: 'În Drum' });
      expect(screen.getByText(/Nicio rezervare în tab-ul "În Drum"/)).toBeInTheDocument();
    });

    it('shows "create first" button in empty all-tab for admin', () => {
      const onNewBooking = vi.fn();
      renderTable([], { activeTab: 'all', onNewBooking });
      expect(screen.getByText('Rezervare nouă')).toBeInTheDocument();
    });
  });

  describe('selection interactions', () => {
    it('calls onSelectAll when select-all checkbox changes', () => {
      const onSelectAll = vi.fn();
      renderTable([makeBooking()], { onSelectAll });
      const checkbox = screen.getByRole('checkbox', { name: 'Selectează tot' });
      fireEvent.click(checkbox);
      expect(onSelectAll).toHaveBeenCalledWith(true);
    });
  });
});

// ─── Helper function unit tests ───────────────────────────────────────────────

describe('getBlNumber', () => {
  it('returns blNumber from booking if present', () => {
    const booking = makeBooking() as any;
    booking.blNumber = 'MEDUKC298446';
    expect(getBlNumber(booking)).toBe('MEDUKC298446');
  });

  it('returns blNumber from first container if not on booking', () => {
    const booking = makeBooking({
      containers: [{ blNumber: 'COSU1234567890' } as any],
    } as any);
    expect(getBlNumber(booking)).toBe('COSU1234567890');
  });

  it('returns empty string if no BL found', () => {
    const booking = makeBooking({ containers: [] });
    expect(getBlNumber(booking as any)).toBe('');
  });
});

describe('getContainerNumber', () => {
  it('returns containerNumber from booking if present', () => {
    const booking = makeBooking() as any;
    booking.containerNumber = 'FTAU1173171';
    expect(getContainerNumber(booking)).toBe('FTAU1173171');
  });

  it('returns containerNumber from first container if not on booking', () => {
    const booking = makeBooking({
      containers: [{ containerNumber: 'CCLU1234567' } as any],
    } as any);
    expect(getContainerNumber(booking)).toBe('CCLU1234567');
  });

  it('returns empty string if no container number', () => {
    expect(getContainerNumber(makeBooking({ containers: [] }) as any)).toBe('');
  });
});

describe('hasTelexRelease', () => {
  it('returns true if booking.telexReleased=true', () => {
    const booking = makeBooking() as any;
    booking.telexReleased = true;
    expect(hasTelexRelease(booking)).toBe(true);
  });

  it('returns true if container has telexRelease=true', () => {
    const booking = makeBooking({
      containers: [{ telexRelease: true } as any],
    } as any);
    expect(hasTelexRelease(booking)).toBe(true);
  });

  it('returns false if not released', () => {
    const booking = makeBooking() as any;
    booking.telexReleased = false;
    expect(hasTelexRelease(booking)).toBe(false);
  });
});

describe('hasDocuments', () => {
  it('returns true if booking.documentsUploaded=true', () => {
    const booking = makeBooking() as any;
    booking.documentsUploaded = true;
    expect(hasDocuments(booking)).toBe(true);
  });

  it('returns true if documents array has items', () => {
    const booking = makeBooking({ documents: [{ id: 'doc-1' } as any] } as any);
    expect(hasDocuments(booking)).toBe(true);
  });

  it('returns false if no documents', () => {
    const booking = makeBooking({ documents: [] } as any);
    (booking as any).documentsUploaded = false;
    expect(hasDocuments(booking)).toBe(false);
  });
});
