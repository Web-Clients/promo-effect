/**
 * GPS Tracking Service
 * Handles GPS location tracking via TrackGPS API
 */

import api from './api';

export interface GPSLocation {
  latitude: number;
  longitude: number;
  speed: number;
  course: number;
  timestamp: string;
}

export interface GPSVehicle {
  id: string;
  name: string;
  plateNumber: string;
  type: string;
}

export interface GPSLocationResponse {
  success: boolean;
  bookingId?: string;
  vehicleId?: string;
  vehicleName?: string;
  location?: GPSLocation;
  error?: string;
}

export interface GPSVehiclesResponse {
  success: boolean;
  vehicles: GPSVehicle[];
  count: number;
  error?: string;
}

export interface AssignVehicleResponse {
  success: boolean;
  message: string;
  booking?: {
    id: string;
    trackingVehicleId: string;
    trackingVehicleName: string;
    trackingStartedAt: string;
  };
  initialLocation?: GPSLocation;
  error?: string;
}

const gpsTrackingService = {
  /**
   * Test TrackGPS API connection
   */
  async testConnection(): Promise<{ success: boolean; message: string; vehicleCount?: number }> {
    const response = await api.get('/tracking/gps/test-connection');
    return response.data;
  },

  /**
   * Get list of all available vehicles
   */
  async getVehicles(): Promise<GPSVehiclesResponse> {
    const response = await api.get('/tracking/gps/vehicles');
    return response.data;
  },

  /**
   * Get current GPS location for a specific vehicle
   */
  async getVehicleLocation(vehicleId: string): Promise<GPSLocationResponse> {
    const response = await api.get(`/tracking/gps/vehicles/${vehicleId}/location`);
    return response.data;
  },

  /**
   * Assign a vehicle to a booking
   */
  async assignVehicleToBooking(bookingId: string, vehicleId: string): Promise<AssignVehicleResponse> {
    const response = await api.put(`/tracking/bookings/${bookingId}/assign-vehicle`, {
      vehicleId,
    });
    return response.data;
  },

  /**
   * Get GPS location for a booking's assigned vehicle
   */
  async getBookingGPSLocation(bookingId: string): Promise<GPSLocationResponse> {
    const response = await api.get(`/tracking/bookings/${bookingId}/gps-location`);
    return response.data;
  },
};

export default gpsTrackingService;
