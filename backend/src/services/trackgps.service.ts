/**
 * TrackGPS Service
 * Integration with TrackGPS API for real-time vehicle GPS tracking
 * API Documentation: https://docs.trackgps.ro
 */

import axios, { AxiosInstance } from 'axios';
import prisma from '../lib/prisma';

interface TrackGPSAuth {
  access_token: string;
  expires_in: number;
  token_type: string;
  refresh_token: string;
  scope: string;
}

// API response structure for vehicles
interface TrackGPSVehicleResponse {
  VehicleId: number;
  VehicleUId: string;
  VehicleName: string;
  VehicleRegistrationNumber: string;
  GroupName: string;
  Latitude: number;
  Longitude: number;
  GpsDate: string;
  Address: string;
  Speed: number;
  Course: number;
  EngineEvent: number;
  EngineEventDate: string;
  ServerDate: string;
  IsPrivate: boolean;
  ExternalPowerVoltage?: number;
  ManufactureYear?: number;
  VehicleIdentificationNumber?: string;
}

interface TrackGPSVehiclesResponse {
  Payload: TrackGPSVehicleResponse[];
  CorrelationId: string;
  IsSuccess: boolean;
}

// Normalized vehicle interface for our app
export interface Vehicle {
  id: string;
  name: string;
  plateNumber: string;
  latitude: number;
  longitude: number;
  speed: number;
  course: number;
  gpsDate: string;
  engineOn: boolean;
}

// GPS Location interface
export interface GPSLocation {
  vehicleId: string;
  gpsDate: string;
  latitude: number;
  longitude: number;
  speed: number;
  course: number;
}

class TrackGPSService {
  private apiUrl: string;
  private username: string;
  private password: string;
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;
  private vehiclesCache: Vehicle[] = [];
  private vehiclesCacheExpiry: Date | null = null;
  private readonly CACHE_TTL_MS = 30000; // 30 seconds cache (API requires min 30s between requests)

  constructor() {
    this.apiUrl = process.env.TRACKGPS_API_URL || 'https://api.trackgps.ro/api';
    this.username = process.env.TRACKGPS_USERNAME || '';
    this.password = process.env.TRACKGPS_PASSWORD || '';
  }

  /**
   * Authenticate with TrackGPS API and get access token
   * Uses form-urlencoded format as required by the API
   */
  async authenticate(): Promise<string> {
    // Check if we have a valid token
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      console.log('[TrackGPS] Authenticating with user:', this.username);

      // TrackGPS API requires form-urlencoded authentication
      const params = new URLSearchParams();
      params.append('username', this.username);
      params.append('password', this.password);

      const response = await axios.post<TrackGPSAuth>(
        `${this.apiUrl}/authentication/login?api-version=2.0`,
        params,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      this.accessToken = response.data.access_token;
      // Set expiry 5 minutes before actual expiry for safety
      this.tokenExpiry = new Date(Date.now() + (response.data.expires_in - 300) * 1000);

      console.log('[TrackGPS] Authentication successful, token expires:', this.tokenExpiry);
      return this.accessToken;
    } catch (error: any) {
      const errorMsg = error.response?.data?.error_description || error.response?.data?.error || error.message;
      console.error('[TrackGPS] Authentication failed:', errorMsg);
      throw new Error(`TrackGPS authentication failed: ${errorMsg}`);
    }
  }

  /**
   * Get authorized axios instance
   */
  private async getAuthorizedClient(): Promise<AxiosInstance> {
    const token = await this.authenticate();
    return axios.create({
      baseURL: this.apiUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
  }

  /**
   * Get list of all company vehicles with their current GPS positions
   * Note: API requires minimum 30 seconds between requests
   */
  async getVehicles(): Promise<Vehicle[]> {
    // Check cache first (API rate limit: min 30s between requests)
    if (this.vehiclesCache.length > 0 && this.vehiclesCacheExpiry && new Date() < this.vehiclesCacheExpiry) {
      console.log('[TrackGPS] Returning cached vehicles');
      return this.vehiclesCache;
    }

    try {
      const client = await this.getAuthorizedClient();
      // Correct endpoint with hyphen: /carriers/company-vehicles
      const response = await client.get<TrackGPSVehiclesResponse>('/carriers/company-vehicles?api-version=2.0');

      if (!response.data.IsSuccess) {
        throw new Error('API returned unsuccessful response');
      }

      // Map API response to our normalized format
      const vehicles: Vehicle[] = response.data.Payload.map(v => ({
        id: v.VehicleUId, // Use UUID as ID
        name: v.VehicleName,
        plateNumber: v.VehicleRegistrationNumber,
        latitude: v.Latitude,
        longitude: v.Longitude,
        speed: v.Speed,
        course: v.Course,
        gpsDate: v.GpsDate,
        engineOn: v.EngineEvent === 1, // 1 = engine on, 2 = engine off
      }));

      // Update cache
      this.vehiclesCache = vehicles;
      this.vehiclesCacheExpiry = new Date(Date.now() + this.CACHE_TTL_MS);

      console.log(`[TrackGPS] Fetched ${vehicles.length} vehicles`);
      return vehicles;
    } catch (error: any) {
      console.error('[TrackGPS] Failed to fetch vehicles:', error.response?.data || error.message);
      throw new Error('Failed to fetch vehicles from TrackGPS');
    }
  }

  /**
   * Get current position for a specific vehicle
   * Returns data from the vehicles endpoint (includes current position)
   */
  async getCurrentPosition(vehicleId: string): Promise<GPSLocation | null> {
    try {
      const vehicles = await this.getVehicles();
      const vehicle = vehicles.find(v => v.id === vehicleId);

      if (!vehicle) {
        console.log(`[TrackGPS] Vehicle ${vehicleId} not found`);
        return null;
      }

      return {
        vehicleId: vehicle.id,
        gpsDate: vehicle.gpsDate,
        latitude: vehicle.latitude,
        longitude: vehicle.longitude,
        speed: vehicle.speed,
        course: vehicle.course,
      };
    } catch (error) {
      console.error('[TrackGPS] Failed to get current position:', error);
      return null;
    }
  }

  /**
   * Get detailed vehicle information
   */
  async getVehicleInfo(vehicleId: string): Promise<Vehicle | null> {
    try {
      const vehicles = await this.getVehicles();
      return vehicles.find(v => v.id === vehicleId) || null;
    } catch (error) {
      console.error('[TrackGPS] Failed to get vehicle info:', error);
      return null;
    }
  }

  /**
   * Update booking GPS location from TrackGPS
   * Fetches latest GPS data and updates the booking record
   */
  async updateBookingGPSLocation(bookingId: string): Promise<{
    success: boolean;
    location?: GPSLocation;
    error?: string;
  }> {
    try {
      // Get booking with vehicle assignment
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        select: {
          id: true,
          trackingVehicleId: true,
          trackingVehicleName: true,
        },
      });

      if (!booking) {
        return { success: false, error: 'Booking not found' };
      }

      if (!booking.trackingVehicleId) {
        return { success: false, error: 'No vehicle assigned to this booking' };
      }

      // Get current position from TrackGPS
      const location = await this.getCurrentPosition(booking.trackingVehicleId);

      if (!location) {
        return { success: false, error: 'No GPS data available for this vehicle' };
      }

      // Update booking with latest GPS data
      await prisma.booking.update({
        where: { id: bookingId },
        data: {
          lastGpsLat: location.latitude,
          lastGpsLng: location.longitude,
          lastGpsSpeed: location.speed,
          lastGpsUpdate: new Date(location.gpsDate),
        },
      });

      console.log(`[TrackGPS] Updated booking ${bookingId} with GPS location:`, {
        lat: location.latitude,
        lng: location.longitude,
        speed: location.speed,
      });

      return { success: true, location };
    } catch (error: any) {
      console.error('[TrackGPS] Failed to update booking GPS location:', error);
      return { success: false, error: error.message || 'Failed to update GPS location' };
    }
  }

  /**
   * Check if service is configured
   */
  isConfigured(): boolean {
    return !!(this.username && this.password);
  }

  /**
   * Clear the vehicles cache (useful for forcing a refresh)
   */
  clearCache(): void {
    this.vehiclesCache = [];
    this.vehiclesCacheExpiry = null;
  }
}

export const trackGPSService = new TrackGPSService();
export default trackGPSService;
