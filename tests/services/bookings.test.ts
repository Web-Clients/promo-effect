import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted so mocks are available inside vi.mock factory
const { mockPost, mockGet, mockPut, mockDelete } = vi.hoisted(() => {
  return {
    mockPost: vi.fn(),
    mockGet: vi.fn(),
    mockPut: vi.fn(),
    mockDelete: vi.fn(),
  };
});

vi.mock('../../services/api', () => ({
  default: {
    post: (...args: any[]) => mockPost(...args),
    get: (...args: any[]) => mockGet(...args),
    put: (...args: any[]) => mockPut(...args),
    delete: (...args: any[]) => mockDelete(...args),
  },
}));

import {
  getBookings,
  createBooking,
  updateBooking,
  getBookingById,
  cancelBooking,
  getBookingStats,
} from '../../services/bookings';

const mockBooking = {
  id: 'booking-123',
  clientId: 'client-abc',
  agentId: null,
  priceId: null,
  portOrigin: 'Shanghai',
  portDestination: 'Constanța',
  containerType: '20GP',
  cargoCategory: 'General',
  cargoWeight: '10-15T',
  cargoReadyDate: '2026-04-01',
  shippingLine: 'MSC',
  freightPrice: 1200,
  portTaxes: 150,
  customsTaxes: 200,
  terrestrialTransport: 600,
  commission: 100,
  totalPrice: 2250,
  supplierName: null,
  supplierPhone: null,
  supplierEmail: null,
  supplierAddress: null,
  status: 'PENDING',
  departureDate: null,
  eta: null,
  actualArrival: null,
  internalNotes: null,
  clientNotes: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

describe('bookings service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getBookings', () => {
    it('returns booking list without filters', async () => {
      const listResponse = { bookings: [mockBooking], total: 1, limit: 20, offset: 0 };
      mockGet.mockResolvedValueOnce({ data: listResponse });

      const result = await getBookings();

      expect(mockGet).toHaveBeenCalledWith('/bookings');
      expect(result).toEqual(listResponse);
    });

    it('passes filters as query params', async () => {
      const listResponse = { bookings: [], total: 0, limit: 10, offset: 0 };
      mockGet.mockResolvedValueOnce({ data: listResponse });

      await getBookings({ status: 'PENDING', limit: 10, offset: 0, search: 'test' });

      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('status=PENDING'));
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('limit=10'));
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('search=test'));
    });

    it('passes clientId filter', async () => {
      mockGet.mockResolvedValueOnce({ data: { bookings: [], total: 0, limit: 20, offset: 0 } });

      await getBookings({ clientId: 'client-abc' });

      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('clientId=client-abc'));
    });

    it('passes date range filters', async () => {
      mockGet.mockResolvedValueOnce({ data: { bookings: [], total: 0, limit: 20, offset: 0 } });

      await getBookings({ dateFrom: '2026-01-01', dateTo: '2026-12-31' });

      const call = mockGet.mock.calls[0][0] as string;
      expect(call).toContain('dateFrom=2026-01-01');
      expect(call).toContain('dateTo=2026-12-31');
    });

    it('throws error on API failure', async () => {
      mockGet.mockRejectedValueOnce({ message: 'Network error' });

      await expect(getBookings()).rejects.toThrow('Network error');
    });
  });

  describe('createBooking', () => {
    it('creates a booking and returns it', async () => {
      mockPost.mockResolvedValueOnce({ data: mockBooking });

      const createData = {
        portOrigin: 'Shanghai',
        containerType: '20GP',
        cargoCategory: 'General',
        cargoWeight: '10-15T',
        cargoReadyDate: '2026-04-01',
      };

      const result = await createBooking(createData);

      expect(mockPost).toHaveBeenCalledWith('/bookings', createData);
      expect(result).toEqual(mockBooking);
    });

    it('throws error when creation fails', async () => {
      mockPost.mockRejectedValueOnce({ message: 'Validation failed' });

      await expect(
        createBooking({
          portOrigin: 'Shanghai',
          containerType: '20GP',
          cargoCategory: 'General',
          cargoWeight: '10-15T',
          cargoReadyDate: '2026-04-01',
        })
      ).rejects.toThrow('Validation failed');
    });

    it('throws default error message when no message provided', async () => {
      mockPost.mockRejectedValueOnce({});

      await expect(
        createBooking({
          portOrigin: 'Shanghai',
          containerType: '20GP',
          cargoCategory: 'General',
          cargoWeight: '10-15T',
          cargoReadyDate: '2026-04-01',
        })
      ).rejects.toThrow('Nu s-a putut crea rezervarea');
    });
  });

  describe('updateBooking', () => {
    it('updates a booking and returns the updated booking', async () => {
      const updated = { ...mockBooking, status: 'CONFIRMED' };
      mockPut.mockResolvedValueOnce({ data: updated });

      const result = await updateBooking('booking-123', { status: 'CONFIRMED' });

      expect(mockPut).toHaveBeenCalledWith('/bookings/booking-123', { status: 'CONFIRMED' });
      expect(result.status).toBe('CONFIRMED');
    });

    it('throws error when update fails', async () => {
      mockPut.mockRejectedValueOnce({ message: 'Booking not found' });

      await expect(updateBooking('missing-id', { status: 'CONFIRMED' })).rejects.toThrow(
        'Booking not found'
      );
    });

    it('throws default error message when no message provided', async () => {
      mockPut.mockRejectedValueOnce({});

      await expect(updateBooking('id', {})).rejects.toThrow('Nu s-a putut actualiza rezervarea');
    });
  });

  describe('getBookingById', () => {
    it('returns a single booking by id', async () => {
      mockGet.mockResolvedValueOnce({ data: mockBooking });

      const result = await getBookingById('booking-123');

      expect(mockGet).toHaveBeenCalledWith('/bookings/booking-123');
      expect(result).toEqual(mockBooking);
    });

    it('throws on failure', async () => {
      mockGet.mockRejectedValueOnce({ message: 'Not found' });

      await expect(getBookingById('bad-id')).rejects.toThrow('Not found');
    });
  });

  describe('cancelBooking', () => {
    it('cancels a booking and returns message', async () => {
      mockDelete.mockResolvedValueOnce({ data: { message: 'Booking cancelled' } });

      const result = await cancelBooking('booking-123');

      expect(mockDelete).toHaveBeenCalledWith('/bookings/booking-123');
      expect(result).toEqual({ message: 'Booking cancelled' });
    });

    it('throws on failure', async () => {
      mockDelete.mockRejectedValueOnce({ message: 'Cannot cancel' });

      await expect(cancelBooking('booking-123')).rejects.toThrow('Cannot cancel');
    });
  });

  describe('getBookingStats', () => {
    it('returns booking statistics', async () => {
      const stats = { total: 10, byStatus: { PENDING: 3, CONFIRMED: 7 }, totalRevenue: 25000 };
      mockGet.mockResolvedValueOnce({ data: stats });

      const result = await getBookingStats();

      expect(mockGet).toHaveBeenCalledWith('/bookings/stats');
      expect(result).toEqual(stats);
    });

    it('throws on failure', async () => {
      mockGet.mockRejectedValueOnce({ message: 'Server error' });

      await expect(getBookingStats()).rejects.toThrow('Server error');
    });
  });
});
