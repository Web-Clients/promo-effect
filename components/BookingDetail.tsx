import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { User, Booking, BookingStatus, UserRole } from '../types';
import { SHIPPING_LINES, ORIGIN_PORTS, DESTINATION_PORTS, CONTAINER_TYPES } from '../constants';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { useToast } from './ui/Toast';
import bookingsService, {
  CreateBookingData,
  UpdateBookingData,
  BookingResponse,
} from '../services/bookings';
import GPSTrackingMap from './GPSTrackingMap';
import { getErrorMessage } from '../utils/formatters';

interface BookingDetailProps {
  user: User;
}

// Extended booking type for form state (includes API fields)
interface BookingFormState extends Partial<Booking> {
  cargoCategory?: string;
  cargoWeight?: string;
  cargoReadyDate?: string;
  supplierName?: string | null;
  supplierPhone?: string | null;
  supplierEmail?: string | null;
  supplierAddress?: string | null;
  clientNotes?: string | null;
  internalNotes?: string | null;
  bl_number?: string;
  // GPS Tracking fields
  trackingVehicleId?: string | null;
  trackingVehicleName?: string | null;
  trackingStartedAt?: string | null;
}

// Map API response to form state
const mapApiToFormState = (apiBooking: BookingResponse): BookingFormState => {
  return {
    id: parseInt(apiBooking.id) || 0,
    booking_number: apiBooking.id,
    client_id: parseInt(apiBooking.clientId) || 0,
    client_name: apiBooking.client?.companyName || apiBooking.client?.contactPerson || '',
    status: apiBooking.status as BookingStatus,
    origin_port: apiBooking.portOrigin,
    destination_port: apiBooking.portDestination,
    shipping_line: apiBooking.shippingLine,
    container_type: apiBooking.containerType,
    container_number: apiBooking.containers?.[0]?.containerNumber || '',
    bl_number: apiBooking.containers?.[0]?.blNumber || '',
    quoted_price_usd: apiBooking.totalPrice,
    estimated_arrival_date: apiBooking.eta || undefined,
    created_at: apiBooking.createdAt,
    cargoCategory: apiBooking.cargoCategory,
    cargoWeight: apiBooking.cargoWeight,
    cargoReadyDate: apiBooking.cargoReadyDate,
    supplierName: apiBooking.supplierName,
    supplierPhone: apiBooking.supplierPhone,
    supplierEmail: apiBooking.supplierEmail,
    supplierAddress: apiBooking.supplierAddress,
    clientNotes: apiBooking.clientNotes,
    internalNotes: apiBooking.internalNotes,
    // GPS Tracking
    trackingVehicleId: apiBooking.trackingVehicleId,
    trackingVehicleName: apiBooking.trackingVehicleName,
    trackingStartedAt: apiBooking.trackingStartedAt,
  };
};

// Map form state to API create format
const mapToCreateData = (formData: BookingFormState): CreateBookingData => {
  return {
    portOrigin: formData.origin_port || ORIGIN_PORTS[0],
    portDestination: formData.destination_port || DESTINATION_PORTS[0],
    containerType: formData.container_type || CONTAINER_TYPES[0],
    shippingLine: formData.shipping_line || SHIPPING_LINES[0],
    cargoCategory: formData.cargoCategory || 'general',
    cargoWeight: formData.cargoWeight || '1-10 tone',
    cargoReadyDate: formData.cargoReadyDate || new Date().toISOString().split('T')[0],
    supplierName: formData.supplierName || undefined,
    supplierPhone: formData.supplierPhone || undefined,
    supplierEmail: formData.supplierEmail || undefined,
    supplierAddress: formData.supplierAddress || undefined,
    clientNotes: formData.clientNotes || undefined,
  };
};

// Map form state to API update format
const mapToUpdateData = (formData: BookingFormState): UpdateBookingData => {
  return {
    status: formData.status,
    supplierName: formData.supplierName || undefined,
    supplierPhone: formData.supplierPhone || undefined,
    supplierEmail: formData.supplierEmail || undefined,
    supplierAddress: formData.supplierAddress || undefined,
    clientNotes: formData.clientNotes || undefined,
    internalNotes: formData.internalNotes || undefined,
    eta: formData.estimated_arrival_date,
    containerNumber: formData.container_number || undefined,
    blNumber: formData.bl_number || undefined,
  };
};

const BookingSelect = ({ ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select
    {...props}
    className="w-full mt-1 p-2 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-neutral-100 dark:disabled:bg-neutral-700"
  />
);

const BookingDetail: React.FC<BookingDetailProps> = ({ user }) => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { addToast } = useToast();

  const isNew = bookingId === 'new';
  const isClient = user.role === UserRole.CLIENT;

  // State
  const [bookingData, setBookingData] = useState<BookingFormState>({});
  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isReadOnly = !isNew && isClient;
  const isAdmin = [UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER].includes(user.role);

  // Initialize form for new booking
  useEffect(() => {
    if (isNew) {
      const initialData = location.state?.initialData;
      setBookingData({
        origin_port: ORIGIN_PORTS[0],
        destination_port: DESTINATION_PORTS[0],
        container_type: CONTAINER_TYPES[0],
        shipping_line: SHIPPING_LINES[0],
        client_name: isClient ? user.name : '',
        status: BookingStatus.DRAFT,
        cargoCategory: 'general',
        cargoWeight: '1-10 tone',
        cargoReadyDate: new Date().toISOString().split('T')[0],
        ...initialData,
      });
      setIsLoading(false);
    }
  }, [isNew, isClient, user.name, location.state]);

  // Load existing booking from API
  useEffect(() => {
    if (!isNew && bookingId) {
      const loadBooking = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const apiBooking = await bookingsService.getBookingById(bookingId);
          setBookingData(mapApiToFormState(apiBooking));
        } catch (err: unknown) {
          const message = getErrorMessage(err, 'Nu s-a putut încărca rezervarea');
          setError(message);
          addToast(message, 'error');

          // Handle specific errors
          const statusErr = err as { status?: number; response?: { status?: number } };
          const httpStatus = statusErr.status ?? statusErr.response?.status;
          if (httpStatus === 404) {
            addToast('Rezervarea nu a fost găsită', 'error');
            navigate('/dashboard/bookings');
          } else if (httpStatus === 403) {
            addToast('Nu aveți permisiunea de a vizualiza această rezervare', 'error');
            navigate('/dashboard/bookings');
          }
        } finally {
          setIsLoading(false);
        }
      };
      loadBooking();
    }
  }, [bookingId, isNew, navigate, addToast]);

  const onBack = () => navigate('/dashboard/bookings');

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (isSubmitting) return; // Prevent double submit

      setIsSubmitting(true);
      setError(null);

      try {
        if (isNew) {
          // CREATE new booking
          const createData = mapToCreateData(bookingData);
          const newBooking = await bookingsService.createBooking(createData);
          addToast('Rezervare creată cu succes!', 'success');
          navigate(`/dashboard/bookings/${newBooking.id}`);
        } else {
          // UPDATE existing booking
          const updateData = mapToUpdateData(bookingData);
          const updatedBooking = await bookingsService.updateBooking(bookingId!, updateData);
          setBookingData(mapApiToFormState(updatedBooking));
          addToast('Rezervare actualizată cu succes!', 'success');
        }
      } catch (err: unknown) {
        const message = getErrorMessage(
          err,
          `Nu s-a putut ${isNew ? 'crea' : 'actualiza'} rezervarea`
        );
        setError(message);
        addToast(message, 'error');
      } finally {
        setIsSubmitting(false);
      }
    },
    [isNew, bookingId, bookingData, isSubmitting, navigate, addToast]
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary-800 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Se încarcă rezervarea...</p>
        </div>
      </div>
    );
  }

  // Error state (only if no data loaded)
  if (error && !bookingData.id && !isNew) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="text-red-500 text-lg">⚠️ {error}</div>
        <Button onClick={onBack}>Înapoi la Rezervări</Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center">
        <button
          onClick={onBack}
          className="p-2 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-700 mr-3"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
        </button>
        <h3 className="text-2xl font-semibold text-neutral-800 dark:text-neutral-100">
          {isNew ? 'Cerere de Rezervare Nouă' : `Rezervare ${bookingData.booking_number}`}
        </h3>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="space-y-6">
          <div>
            <h4 className="text-base font-semibold text-neutral-700 dark:text-neutral-200 border-b border-neutral-200 dark:border-neutral-700 pb-2 mb-4">
              Detalii Rută
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                  Port Origine
                </label>
                <BookingSelect
                  disabled={isReadOnly}
                  value={bookingData.origin_port || ''}
                  onChange={(e) => setBookingData({ ...bookingData, origin_port: e.target.value })}
                >
                  {ORIGIN_PORTS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </BookingSelect>
              </div>
              <div>
                <label className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                  Port Destinație
                </label>
                <BookingSelect disabled value={bookingData.destination_port || ''}>
                  {DESTINATION_PORTS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </BookingSelect>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-base font-semibold text-neutral-700 dark:text-neutral-200 border-b border-neutral-200 dark:border-neutral-700 pb-2 mb-4">
              Detalii Container
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                  Tip Container
                </label>
                <BookingSelect
                  disabled={isReadOnly}
                  value={bookingData.container_type || ''}
                  onChange={(e) =>
                    setBookingData({ ...bookingData, container_type: e.target.value })
                  }
                >
                  {CONTAINER_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </BookingSelect>
              </div>
              <div>
                <label className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                  Linie Maritimă Preferată
                </label>
                <BookingSelect
                  disabled={isReadOnly}
                  value={bookingData.shipping_line || ''}
                  onChange={(e) =>
                    setBookingData({ ...bookingData, shipping_line: e.target.value })
                  }
                >
                  {SHIPPING_LINES.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </BookingSelect>
              </div>
              <div>
                <label className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                  Număr Container
                </label>
                <Input
                  type="text"
                  value={bookingData.container_number || ''}
                  onChange={(e) =>
                    setBookingData({ ...bookingData, container_number: e.target.value })
                  }
                  className="font-mono"
                  disabled={isReadOnly}
                  placeholder="Ex: MSCU1234567"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                  Număr BL (Bill of Lading)
                </label>
                <Input
                  type="text"
                  value={bookingData.bl_number || ''}
                  onChange={(e) => setBookingData({ ...bookingData, bl_number: e.target.value })}
                  className="font-mono"
                  disabled={isReadOnly}
                  placeholder="Ex: MEDU1234567"
                />
              </div>
            </div>
          </div>

          {isAdmin && !isNew && (
            <div>
              <h4 className="text-base font-semibold text-neutral-700 dark:text-neutral-200 border-b border-neutral-200 dark:border-neutral-700 pb-2 mb-4">
                Informații Administrative
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                    Stare Rezervare
                  </label>
                  <BookingSelect
                    value={bookingData.status || ''}
                    onChange={(e) =>
                      setBookingData({ ...bookingData, status: e.target.value as BookingStatus })
                    }
                  >
                    {Object.values(BookingStatus).map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </BookingSelect>
                </div>
                <div>
                  <label className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                    Număr Container
                  </label>
                  <Input
                    type="text"
                    value={bookingData.container_number || ''}
                    onChange={(e) =>
                      setBookingData({ ...bookingData, container_number: e.target.value })
                    }
                    className="font-mono"
                    placeholder="Ex: MSCU1234567"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                    Număr BL
                  </label>
                  <Input
                    type="text"
                    value={bookingData.bl_number || ''}
                    onChange={(e) => setBookingData({ ...bookingData, bl_number: e.target.value })}
                    className="font-mono"
                    placeholder="Ex: MEDU1234567"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                    Preț Ofertat (USD)
                  </label>
                  <Input
                    type="number"
                    value={bookingData.quoted_price_usd || ''}
                    onChange={(e) =>
                      setBookingData({
                        ...bookingData,
                        quoted_price_usd: parseFloat(e.target.value),
                      })
                    }
                  />
                </div>
              </div>
            </div>
          )}

          {/* Shipper / Beneficiary */}
          {!isNew &&
            (bookingData.supplierName ||
              bookingData.client_name ||
              bookingData.quoted_price_usd) && (
              <div>
                <h4 className="text-base font-semibold text-neutral-700 dark:text-neutral-200 border-b border-neutral-200 dark:border-neutral-700 pb-2 mb-4">
                  Expeditor & Beneficiar
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {bookingData.client_name && (
                    <div>
                      <label className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                        Beneficiar (Client)
                      </label>
                      <p className="mt-1 text-sm text-neutral-800 dark:text-neutral-200 font-medium">
                        {bookingData.client_name}
                      </p>
                    </div>
                  )}
                  {bookingData.supplierName && (
                    <div>
                      <label className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                        Expeditor (Furnizor)
                      </label>
                      <p className="mt-1 text-sm text-neutral-800 dark:text-neutral-200">
                        {bookingData.supplierName}
                      </p>
                      {bookingData.supplierAddress && (
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                          {bookingData.supplierAddress}
                        </p>
                      )}
                      {bookingData.supplierPhone && (
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                          {bookingData.supplierPhone}
                        </p>
                      )}
                      {bookingData.supplierEmail && (
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                          {bookingData.supplierEmail}
                        </p>
                      )}
                    </div>
                  )}
                  {bookingData.quoted_price_usd !== undefined &&
                    bookingData.quoted_price_usd !== null && (
                      <div>
                        <label className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                          Preț / Tarif
                        </label>
                        <p className="mt-1 text-lg font-bold text-primary-700 dark:text-primary-400">
                          $
                          {Number(bookingData.quoted_price_usd).toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{' '}
                          USD
                        </p>
                      </div>
                    )}
                </div>
              </div>
            )}

          {!isReadOnly && (
            <div className="flex justify-end pt-4">
              <Button type="button" variant="secondary" onClick={onBack} className="mr-4">
                Anulează
              </Button>
              <Button type="submit" disabled={isSubmitting} loading={isSubmitting}>
                {isSubmitting
                  ? 'Se salvează...'
                  : isNew
                    ? 'Trimite Cererea'
                    : 'Salvează Modificările'}
              </Button>
            </div>
          )}
        </Card>
      </form>

      {/* Print Button */}
      {!isNew && (
        <div className="flex justify-end print:hidden">
          <Button
            type="button"
            variant="secondary"
            onClick={() => window.print()}
            className="flex items-center gap-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
              />
            </svg>
            Tipărește
          </Button>
        </div>
      )}

      {/* GPS Tracking Map - show when booking exists and status is IN_TRANSIT or has vehicle assigned */}
      {!isNew &&
        bookingId &&
        (bookingData.status === 'IN_TRANSIT' || bookingData.trackingVehicleId) && (
          <GPSTrackingMap
            bookingId={bookingId}
            vehicleId={bookingData.trackingVehicleId}
            vehicleName={bookingData.trackingVehicleName}
            isAdmin={isAdmin}
            onVehicleAssigned={() => {
              // Reload booking to get updated tracking info
              if (bookingId) {
                bookingsService.getBookingById(bookingId).then((apiBooking) => {
                  setBookingData(mapApiToFormState(apiBooking));
                });
              }
            }}
          />
        )}

      {/* Show GPS Tracking section for admin even if no vehicle - allow assignment */}
      {!isNew &&
        bookingId &&
        isAdmin &&
        !bookingData.trackingVehicleId &&
        bookingData.status !== 'IN_TRANSIT' && (
          <GPSTrackingMap
            bookingId={bookingId}
            vehicleId={null}
            vehicleName={null}
            isAdmin={isAdmin}
            onVehicleAssigned={() => {
              if (bookingId) {
                bookingsService.getBookingById(bookingId).then((apiBooking) => {
                  setBookingData(mapApiToFormState(apiBooking));
                });
              }
            }}
          />
        )}
    </div>
  );
};

export default BookingDetail;
