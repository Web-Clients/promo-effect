import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import gpsTrackingService, { GPSLocation, GPSVehicle } from '../services/gpsTracking';

// Truck icon for GPS tracking
const truckIcon = new L.DivIcon({
  className: 'custom-truck-marker',
  html: `<div style="
    font-size: 32px;
    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
    transform: translateX(-50%) translateY(-50%);
  ">🚛</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

// Component to recenter map when location changes
const MapUpdater: React.FC<{ center: [number, number] }> = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
};

interface GPSTrackingMapProps {
  bookingId: string;
  vehicleId?: string | null;
  vehicleName?: string | null;
  isAdmin?: boolean;
  onVehicleAssigned?: () => void;
}

const GPSTrackingMap: React.FC<GPSTrackingMapProps> = ({
  bookingId,
  vehicleId,
  vehicleName,
  isAdmin = false,
  onVehicleAssigned,
}) => {
  const [location, setLocation] = useState<GPSLocation | null>(null);
  const [vehicles, setVehicles] = useState<GPSVehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showVehicleSelect, setShowVehicleSelect] = useState(false);
  const [assigning, setAssigning] = useState(false);

  // Fetch GPS location
  const fetchLocation = useCallback(async () => {
    if (!vehicleId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await gpsTrackingService.getBookingGPSLocation(bookingId);
      if (response.success && response.location) {
        setLocation(response.location);
      } else {
        setError(response.error || 'Nu s-a putut obține locația GPS');
      }
    } catch (err: any) {
      setError(err.message || 'Eroare la obținerea locației GPS');
    } finally {
      setLoading(false);
    }
  }, [bookingId, vehicleId]);

  // Fetch available vehicles (for admin)
  const fetchVehicles = useCallback(async () => {
    try {
      const response = await gpsTrackingService.getVehicles();
      if (response.success) {
        setVehicles(response.vehicles);
      }
    } catch (err) {
      console.error('Failed to fetch vehicles:', err);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    if (vehicleId) {
      fetchLocation();
    }
    if (isAdmin && !vehicleId) {
      fetchVehicles();
    }
  }, [vehicleId, isAdmin, fetchLocation, fetchVehicles]);

  // Auto-refresh every 30 seconds when vehicle is assigned
  useEffect(() => {
    if (!vehicleId) return;

    const interval = setInterval(fetchLocation, 30000);
    return () => clearInterval(interval);
  }, [vehicleId, fetchLocation]);

  // Assign vehicle to booking
  const handleAssignVehicle = async () => {
    if (!selectedVehicle) return;

    setAssigning(true);
    try {
      const response = await gpsTrackingService.assignVehicleToBooking(bookingId, selectedVehicle);
      if (response.success) {
        setShowVehicleSelect(false);
        if (response.initialLocation) {
          setLocation(response.initialLocation);
        }
        onVehicleAssigned?.();
      } else {
        setError(response.error || 'Nu s-a putut atribui vehiculul');
      }
    } catch (err: any) {
      setError(err.message || 'Eroare la atribuirea vehiculului');
    } finally {
      setAssigning(false);
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('ro-RO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // No vehicle assigned - show assignment UI for admin
  if (!vehicleId) {
    if (!isAdmin) {
      return null; // Clients don't see anything if no vehicle
    }

    return (
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-base font-semibold text-neutral-700 dark:text-neutral-200">
            🚛 GPS Tracking
          </h4>
        </div>

        {!showVehicleSelect ? (
          <div className="text-center py-6">
            <p className="text-neutral-500 dark:text-neutral-400 mb-4">
              Nu este atribuit niciun vehicul pentru tracking GPS
            </p>
            <Button onClick={() => { setShowVehicleSelect(true); fetchVehicles(); }}>
              Atribuie Vehicul
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                Selectează Vehicul
              </label>
              <select
                value={selectedVehicle}
                onChange={(e) => setSelectedVehicle(e.target.value)}
                className="w-full mt-1 p-2 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded-md text-sm"
              >
                <option value="">-- Selectează --</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name || v.plateNumber} ({v.plateNumber})
                  </option>
                ))}
              </select>
            </div>

            {error && (
              <p className="text-red-500 text-sm">{error}</p>
            )}

            <div className="flex gap-2">
              <Button
                onClick={handleAssignVehicle}
                disabled={!selectedVehicle || assigning}
                loading={assigning}
              >
                Atribuie
              </Button>
              <Button
                variant="secondary"
                onClick={() => setShowVehicleSelect(false)}
              >
                Anulează
              </Button>
            </div>
          </div>
        )}
      </Card>
    );
  }

  // Vehicle assigned - show map
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-base font-semibold text-neutral-700 dark:text-neutral-200">
          🚛 GPS Tracking - {vehicleName || vehicleId}
        </h4>
        <Button
          variant="secondary"
          size="sm"
          onClick={fetchLocation}
          disabled={loading}
        >
          {loading ? '...' : '🔄 Actualizează'}
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-md mb-4 text-sm">
          {error}
        </div>
      )}

      {location ? (
        <>
          <div className="h-[300px] rounded-lg overflow-hidden mb-4">
            <MapContainer
              center={[location.latitude, location.longitude]}
              zoom={14}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapUpdater center={[location.latitude, location.longitude]} />
              <Marker
                position={[location.latitude, location.longitude]}
                icon={truckIcon}
              >
                <Popup>
                  <div className="text-sm">
                    <strong>{vehicleName || 'Vehicul'}</strong>
                    <br />
                    Viteză: {location.speed?.toFixed(1) || 0} km/h
                    <br />
                    Ultima actualizare: {formatTimestamp(location.timestamp)}
                  </div>
                </Popup>
              </Marker>
            </MapContainer>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="bg-neutral-100 dark:bg-neutral-800 p-3 rounded-lg">
              <div className="text-neutral-500 dark:text-neutral-400">Latitudine</div>
              <div className="font-mono font-medium">{location.latitude.toFixed(6)}</div>
            </div>
            <div className="bg-neutral-100 dark:bg-neutral-800 p-3 rounded-lg">
              <div className="text-neutral-500 dark:text-neutral-400">Longitudine</div>
              <div className="font-mono font-medium">{location.longitude.toFixed(6)}</div>
            </div>
            <div className="bg-neutral-100 dark:bg-neutral-800 p-3 rounded-lg">
              <div className="text-neutral-500 dark:text-neutral-400">Viteză</div>
              <div className="font-medium">{location.speed?.toFixed(1) || 0} km/h</div>
            </div>
            <div className="bg-neutral-100 dark:bg-neutral-800 p-3 rounded-lg">
              <div className="text-neutral-500 dark:text-neutral-400">Actualizat</div>
              <div className="font-medium text-xs">{formatTimestamp(location.timestamp)}</div>
            </div>
          </div>
        </>
      ) : loading ? (
        <div className="flex items-center justify-center h-[300px]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-primary-800 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-neutral-500">Se încarcă locația...</p>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center h-[300px] text-neutral-500">
          Nu există date GPS disponibile
        </div>
      )}
    </Card>
  );
};

export default GPSTrackingMap;
