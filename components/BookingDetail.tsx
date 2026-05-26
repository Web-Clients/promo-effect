import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { User, Booking, BookingStatus, UserRole } from '../types';
import { SHIPPING_LINES, ORIGIN_PORTS, DESTINATION_PORTS, CONTAINER_TYPES } from '../constants';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/Tabs';
import { useToast } from './ui/Toast';
import bookingsService, {
  CreateBookingData,
  UpdateBookingData,
  BookingResponse,
} from '../services/bookings';
import calculatorService from '../services/calculator';
import { getErrorMessage } from '../utils/formatters';
import { getClients, createClient, Client } from '../services/clients';
import { getSuppliers, createSupplier, Supplier } from '../services/suppliers';
import { getAgents, Agent } from '../services/agents';
import { EntityAutocomplete } from './ui/EntityAutocomplete';

// Sub-components
import BookingHeader from './bookings/detail/BookingHeader';
import BookingRouteMap from './bookings/detail/BookingRouteMap';
import BookingPricingPanel, { PricingData } from './bookings/detail/BookingPricingPanel';
import BookingDocuments, { BookingDocument } from './bookings/detail/BookingDocuments';
import BookingTimeline from './bookings/detail/BookingTimeline';
import BookingActions from './bookings/detail/BookingActions';

interface BookingDetailProps {
  user: User;
}

// Extended booking type for form state (includes API fields)
interface BookingFormState extends Partial<Booking> {
  cargoCategory?: string;
  cargoWeight?: string;
  cargoReadyDate?: string;
  // Beneficiar (Client moldovenesc) — autocomplete from /api/v1/clients
  clientId?: string;
  clientCompanyName?: string;
  clientContactPerson?: string;
  clientEmail?: string;
  clientPhone?: string;
  clientAddress?: string;
  clientTaxId?: string;
  clientBankAccount?: string;
  // Furnizor (Supplier China) — autocomplete from /api/v1/suppliers
  supplierId?: string;
  supplierName?: string | null;
  supplierPhone?: string | null;
  supplierEmail?: string | null;
  supplierAddress?: string | null;
  supplierContact?: string | null;
  // Agent China — autocomplete from /agents
  agentId?: string | null;
  agentCode?: string | null;
  agentCompany?: string | null;
  agentContactName?: string | null;
  agentWechatId?: string | null;
  // Notes
  clientNotes?: string | null;
  internalNotes?: string | null;
  bl_number?: string;
  // GPS Tracking fields
  trackingVehicleId?: string | null;
  trackingVehicleName?: string | null;
  trackingStartedAt?: string | null;
  // Pricing
  pricingData?: PricingData | null;
  // Documents
  documents?: BookingDocument[];
}

// Map API response to form state
const mapApiToFormState = (apiBooking: BookingResponse): BookingFormState => {
  return {
    id: parseInt(apiBooking.id) || 0,
    booking_number: apiBooking.id,
    client_id: parseInt(apiBooking.clientId) || 0,
    client_name: apiBooking.client?.companyName || apiBooking.client?.contactPerson || '',
    // Beneficiar (auto-filled from selected Client)
    clientId: apiBooking.clientId,
    clientCompanyName: apiBooking.client?.companyName,
    clientContactPerson: apiBooking.client?.contactPerson,
    clientEmail: apiBooking.client?.email,
    clientPhone: apiBooking.client?.phone,
    // Agent (auto-filled from selected Agent)
    agentId: apiBooking.agentId,
    agentCode: apiBooking.agent?.agentCode,
    agentCompany: apiBooking.agent?.company,
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
    // Pricing & documents — backend now returns pricingData assembled from raw fields
    pricingData: (apiBooking as any).pricingData ?? {
      tarifMaritim: apiBooking.freightPrice ?? 0,
      cheltuieliAditionale: (apiBooking as any).additionalCharges ?? 0,
      cheltuieliAditionaleLabel: (apiBooking as any).additionalChargesLabel ?? '',
      cheltuieliAditionale2: (apiBooking as any).additionalCharges2 ?? 0,
      cheltuieliAditionale2Label: (apiBooking as any).additionalCharges2Label ?? '',
      cheltuieliAditionale3: (apiBooking as any).additionalCharges3 ?? 0,
      cheltuieliAditionale3Label: (apiBooking as any).additionalCharges3Label ?? '',
      taxePortuare: apiBooking.portTaxes ?? 0,
      transportTerestru: apiBooking.terrestrialTransport ?? 0,
      taxeVamale: apiBooking.customsTaxes ?? 0,
      comision: apiBooking.commission ?? 0,
    },
    documents: (apiBooking as any).documents ?? [],
  };
};

// Map form state to API create format
const mapToCreateData = (formData: BookingFormState): CreateBookingData => {
  // cargoWeight is REQUIRED — backend uses it to auto-select the land transport
  // tariff from LandTransportRate. Form-level validation enforces presence; we
  // throw here defensively so we never send a silent "1-10 tone" placeholder.
  if (!formData.cargoWeight || !formData.cargoWeight.trim()) {
    throw new Error(
      'Greutatea cargo (cargoWeight) este obligatorie pentru a calcula tariful terestru'
    );
  }
  return {
    clientId: formData.clientId || undefined,
    agentId: formData.agentId || undefined,
    portOrigin: formData.origin_port || ORIGIN_PORTS[0],
    portDestination: formData.destination_port || DESTINATION_PORTS[0],
    containerType: formData.container_type || CONTAINER_TYPES[0],
    shippingLine: formData.shipping_line || SHIPPING_LINES[0],
    cargoCategory: formData.cargoCategory || 'general',
    cargoWeight: formData.cargoWeight,
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
  // cargoWeight is REQUIRED — backend uses it to auto-select the land transport
  // tariff from LandTransportRate. Same guard as mapToCreateData so UPDATE
  // cannot silently strip the field and leave a booking without weight.
  if (!formData.cargoWeight || !formData.cargoWeight.trim()) {
    throw new Error('Greutate marfă (tone) este obligatorie');
  }
  return {
    status: formData.status,
    agentId: formData.agentId || undefined,
    supplierName: formData.supplierName || undefined,
    supplierPhone: formData.supplierPhone || undefined,
    supplierEmail: formData.supplierEmail || undefined,
    supplierAddress: formData.supplierAddress || undefined,
    clientNotes: formData.clientNotes || undefined,
    internalNotes: formData.internalNotes || undefined,
    eta: formData.estimated_arrival_date,
    containerNumber: formData.container_number || undefined,
    blNumber: formData.bl_number || undefined,
    cargoWeight: formData.cargoWeight,
  };
};

const BookingSelect = ({ ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select
    {...props}
    className="w-full mt-1 p-2 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-neutral-100 dark:disabled:bg-neutral-700"
  />
);

const BookingDetail: React.FC<BookingDetailProps> = ({ user }) => {
  const { t } = useTranslation();
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

  // Dynamic port list from PortPricingMatrix (single source of truth)
  const [dynamicOriginPorts, setDynamicOriginPorts] = useState<string[]>(ORIGIN_PORTS);
  // Dynamic shipping lines from BasePrice (falls back to static constant)
  const [dynamicShippingLines, setDynamicShippingLines] = useState<string[]>(SHIPPING_LINES);

  useEffect(() => {
    calculatorService
      .getAvailablePorts()
      .then((ports) => {
        if (ports.length > 0) setDynamicOriginPorts(ports);
      })
      .catch(() => {
        // Keep static fallback on error
      });

    calculatorService
      .getAvailableShippingLines()
      .then((lines) => {
        if (lines.length > 0) setDynamicShippingLines(lines);
      })
      .catch(() => {
        // Keep static fallback on error
      });
  }, []);

  const isReadOnly = !isNew && isClient;
  const isAdmin = [UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER].includes(user.role);
  // Backend GET /agents is restricted to ADMIN/SUPER_ADMIN; MANAGER hits 403 silently.
  // Show Agent section (autocomplete + fields) only to roles that can fetch /agents.
  const showAgentSection = [UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(user.role);

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

          const statusErr = err as { status?: number; response?: { status?: number } };
          const httpStatus = statusErr.status ?? statusErr.response?.status;
          if (httpStatus === 404) {
            addToast(t('bookings.noBookings'), 'error');
            navigate('/dashboard/bookings');
          } else if (httpStatus === 403) {
            addToast(t('errors.unauthorized'), 'error');
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
      if (isSubmitting) return;
      setIsSubmitting(true);
      setError(null);

      try {
        if (isNew) {
          const createData = mapToCreateData(bookingData);
          const newBooking = await bookingsService.createBooking(createData);
          addToast('Rezervare creată cu succes!', 'success');
          navigate(`/dashboard/bookings/${newBooking.id}`);
        } else {
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

  // ── Autocomplete search helpers (Task 3) ────────────────────────────
  const searchClients = useCallback(async (q: string): Promise<Client[]> => {
    const res = await getClients({ search: q || undefined, limit: 20 });
    return res.clients;
  }, []);
  const searchSuppliers = useCallback(async (q: string): Promise<Supplier[]> => {
    const res = await getSuppliers({ search: q || undefined, limit: 20 });
    return res.suppliers;
  }, []);
  const searchAgents = useCallback(async (q: string): Promise<Agent[]> => {
    const res = await getAgents({ search: q || undefined });
    return res;
  }, []);

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
      {/* A9: Header — BL number, status, back button */}
      <BookingHeader
        bookingNumber={bookingData.booking_number}
        blNumber={bookingData.bl_number}
        status={bookingData.status}
        isNew={isNew}
        isAdmin={isAdmin}
        onBack={onBack}
      />

      {/* Form wraps the main card so submit button can trigger it */}
      <form onSubmit={handleSubmit}>
        {isNew ? (
          /* New booking: single card, no tabs */
          <Card className="space-y-6">
            {renderRouteSection()}
            {renderContainerSection()}
            {renderCargoSection()}
            {renderSupplierSection()}
            {renderNotesSection()}
            <div className="pt-4">
              <BookingActions
                bookingId={bookingId ?? ''}
                isAdmin={isAdmin}
                isNew={isNew}
                isSubmitting={isSubmitting}
                isReadOnly={isReadOnly}
                onBack={onBack}
              />
            </div>
          </Card>
        ) : (
          /* Existing booking: tabbed layout */
          <Tabs defaultValue="details">
            <TabsList>
              <TabsTrigger value="details">Detalii</TabsTrigger>
              <TabsTrigger value="pricing">Preț</TabsTrigger>
              <TabsTrigger value="map">Hartă</TabsTrigger>
              <TabsTrigger value="documents">Documente</TabsTrigger>
              <TabsTrigger value="timeline">Status</TabsTrigger>
            </TabsList>

            {/* --- TAB: Details --- */}
            <TabsContent value="details">
              <Card className="space-y-6">
                {renderRouteSection()}
                {renderContainerSection()}
                {isAdmin && renderAdminSection()}
                {renderShipperBeneficiarySection()}
                {renderCargoSection()}
                {renderSupplierSection()}
                {renderNotesSection()}
                <div className="pt-2">
                  <BookingActions
                    bookingId={bookingId ?? ''}
                    isAdmin={isAdmin}
                    isNew={isNew}
                    isSubmitting={isSubmitting}
                    isReadOnly={isReadOnly}
                    onBack={onBack}
                  />
                </div>
              </Card>
            </TabsContent>

            {/* --- TAB: Pricing (A11) --- */}
            <TabsContent value="pricing">
              <BookingPricingPanel
                bookingId={bookingId ?? ''}
                isAdmin={isAdmin}
                initialPricingData={bookingData.pricingData}
                onSaved={(p) => setBookingData((prev) => ({ ...prev, pricingData: p }))}
              />
            </TabsContent>

            {/* --- TAB: Route Map (A10) --- */}
            <TabsContent value="map">
              <BookingRouteMap
                portOrigin={bookingData.origin_port}
                portDestination={bookingData.destination_port}
                finalDestination={
                  bookingData.destination_port?.toLowerCase().includes('constanta') ||
                  bookingData.destination_port?.toLowerCase().includes('constanța')
                    ? 'Chișinău'
                    : undefined
                }
              />
            </TabsContent>

            {/* --- TAB: Documents --- */}
            <TabsContent value="documents">
              <BookingDocuments
                bookingId={bookingId ?? ''}
                documents={bookingData.documents}
                canUpload={true}
                onDocumentsChange={(docs) =>
                  setBookingData((prev) => ({ ...prev, documents: docs }))
                }
              />
            </TabsContent>

            {/* --- TAB: Timeline --- */}
            <TabsContent value="timeline">
              <BookingTimeline bookingStatus={bookingData.status} />
            </TabsContent>
          </Tabs>
        )}
      </form>
    </div>
  );

  // ─── Section renderers ───────────────────────────────────────────────────────

  function renderRouteSection() {
    return (
      <div>
        <h4 className="text-base font-semibold text-neutral-700 dark:text-neutral-200 border-b border-neutral-200 dark:border-neutral-700 pb-2 mb-4">
          Detalii Rută
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
              Port Origine <span className="text-red-500">*</span>
            </label>
            <BookingSelect
              disabled={isReadOnly}
              value={bookingData.origin_port || ''}
              onChange={(e) => setBookingData({ ...bookingData, origin_port: e.target.value })}
            >
              {dynamicOriginPorts.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </BookingSelect>
          </div>
          <div>
            <label className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
              Port Destinație <span className="text-red-500">*</span>
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
    );
  }

  function renderContainerSection() {
    return (
      <div>
        <h4 className="text-base font-semibold text-neutral-700 dark:text-neutral-200 border-b border-neutral-200 dark:border-neutral-700 pb-2 mb-4">
          Detalii Container
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
              Tip Container <span className="text-red-500">*</span>
            </label>
            <BookingSelect
              disabled={isReadOnly}
              value={bookingData.container_type || ''}
              onChange={(e) => setBookingData({ ...bookingData, container_type: e.target.value })}
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
              Linie Maritimă Preferată <span className="text-red-500">*</span>
            </label>
            <BookingSelect
              disabled={isReadOnly}
              value={bookingData.shipping_line || ''}
              onChange={(e) => setBookingData({ ...bookingData, shipping_line: e.target.value })}
            >
              {dynamicShippingLines.map((l) => (
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
              onChange={(e) => setBookingData({ ...bookingData, container_number: e.target.value })}
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
    );
  }

  function renderAdminSection() {
    return (
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
              Data Estimată Sosire (ETA)
            </label>
            <Input
              type="date"
              value={bookingData.estimated_arrival_date || ''}
              onChange={(e) =>
                setBookingData({ ...bookingData, estimated_arrival_date: e.target.value })
              }
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
    );
  }

  function renderShipperBeneficiarySection() {
    if (
      !bookingData.supplierName &&
      !bookingData.client_name &&
      bookingData.quoted_price_usd == null
    )
      return null;

    return (
      <div>
        <h4 className="text-base font-semibold text-neutral-700 dark:text-neutral-200 border-b border-neutral-200 dark:border-neutral-700 pb-2 mb-4">
          Expeditor & Beneficiar
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {bookingData.client_name && (
            <div>
              <label className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                {t('bookings.form.beneficiarySection')}
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
        </div>
      </div>
    );
  }

  function renderCargoSection() {
    return (
      <div>
        <h4 className="text-base font-semibold text-neutral-700 dark:text-neutral-200 border-b border-neutral-200 dark:border-neutral-700 pb-2 mb-4">
          Detalii Marfă
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
              Categorie Marfă <span className="text-red-500">*</span>
            </label>
            <Input
              type="text"
              value={bookingData.cargoCategory || ''}
              onChange={(e) => setBookingData({ ...bookingData, cargoCategory: e.target.value })}
              disabled={isReadOnly}
              placeholder="Ex: general, refrigerat, periculos"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
              Greutate <span className="text-red-500">*</span>
            </label>
            <Input
              type="text"
              required
              pattern="^(\d+(\.\d+)?(\s*-\s*\d+(\.\d+)?)?\s*(tone|t|kg|ton|tons))$"
              placeholder="Ex: 10-15 tone"
              title="Format acceptat: '10-15 tone', '24.5 ton', '24350 kg'. Fără valută. Câmp obligatoriu."
              value={bookingData.cargoWeight || ''}
              onChange={(e) => setBookingData({ ...bookingData, cargoWeight: e.target.value })}
              disabled={isReadOnly}
              aria-required="true"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
              Data Disponibilitate Marfă <span className="text-red-500">*</span>
            </label>
            <Input
              type="date"
              value={bookingData.cargoReadyDate || ''}
              onChange={(e) => setBookingData({ ...bookingData, cargoReadyDate: e.target.value })}
              disabled={isReadOnly}
            />
          </div>
        </div>
      </div>
    );
  }

  const handleClientSelect = (c: Client) => {
    setBookingData((prev) => ({
      ...prev,
      clientId: c.id,
      client_id: parseInt(c.id) || prev.client_id || 0,
      client_name: c.companyName,
      clientCompanyName: c.companyName,
      clientContactPerson: c.contactPerson,
      clientEmail: c.email,
      clientPhone: c.phone,
      clientAddress: c.address || '',
      clientTaxId: c.taxId || '',
      clientBankAccount: c.bankAccount || '',
    }));
  };

  const handleSupplierSelect = (s: Supplier) => {
    setBookingData((prev) => ({
      ...prev,
      supplierId: s.id,
      supplierName: s.name,
      supplierAddress: s.address || '',
      supplierPhone: s.phone || '',
      supplierEmail: s.email || '',
      supplierContact: s.contact || '',
    }));
  };

  const handleAgentSelect = (a: Agent) => {
    setBookingData((prev) => ({
      ...prev,
      agentId: a.id,
      agentCode: a.agentCode,
      agentCompany: a.company,
      agentContactName: a.contactName,
      agentWechatId: a.wechatId || '',
    }));
  };

  const handleCreateClient = async (initialName: string) => {
    try {
      const created = await createClient({
        companyName: initialName,
        contactPerson: '',
        email: '',
        phone: '',
      });
      handleClientSelect(created);
      addToast(`Client „${created.companyName}" creat`, 'success');
    } catch (err: unknown) {
      addToast(getErrorMessage(err, 'Nu s-a putut crea clientul'), 'error');
    }
  };

  const handleCreateSupplier = async (initialName: string) => {
    try {
      const created = await createSupplier({ name: initialName });
      handleSupplierSelect(created);
      addToast(`Furnizor „${created.name}" creat`, 'success');
    } catch (err: unknown) {
      addToast(getErrorMessage(err, 'Nu s-a putut crea furnizorul'), 'error');
    }
  };

  function renderSupplierSection() {
    return (
      <div className="space-y-6">
        {/* ── Beneficiar (Client moldovenesc) ─────────────────────── */}
        {!isClient && (
          <div>
            <h4 className="text-base font-semibold text-neutral-700 dark:text-neutral-200 border-b border-neutral-200 dark:border-neutral-700 pb-2 mb-4">
              {t('bookings.form.beneficiarySection')}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <EntityAutocomplete<Client>
                label={t('bookings.form.companyLabel')}
                placeholder={t('bookings.form.companySearchPlaceholder')}
                value={bookingData.clientCompanyName || bookingData.client_name || ''}
                onTextChange={(text) =>
                  setBookingData((prev) => ({
                    ...prev,
                    clientCompanyName: text,
                    client_name: text,
                    // Clear ID if text no longer matches selected
                    clientId: prev.clientCompanyName === text ? prev.clientId : undefined,
                  }))
                }
                onSelect={handleClientSelect}
                onCreateNew={handleCreateClient}
                search={searchClients}
                getDisplayName={(c) => c.companyName}
                renderItem={(c) => (
                  <>
                    <span className="font-medium">{c.companyName}</span>
                    <span className="text-xs text-neutral-500">
                      {[c.contactPerson, c.email, c.phone].filter(Boolean).join(' · ')}
                    </span>
                  </>
                )}
                disabled={isReadOnly}
              />
              <div>
                <label className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                  Persoană contact
                </label>
                <Input
                  type="text"
                  value={bookingData.clientContactPerson || ''}
                  onChange={(e) =>
                    setBookingData({ ...bookingData, clientContactPerson: e.target.value })
                  }
                  disabled={isReadOnly}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                  Email
                </label>
                <Input
                  type="email"
                  value={bookingData.clientEmail || ''}
                  onChange={(e) => setBookingData({ ...bookingData, clientEmail: e.target.value })}
                  disabled={isReadOnly}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                  Telefon
                </label>
                <Input
                  type="text"
                  value={bookingData.clientPhone || ''}
                  onChange={(e) => setBookingData({ ...bookingData, clientPhone: e.target.value })}
                  disabled={isReadOnly}
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                  Adresă
                </label>
                <Input
                  type="text"
                  value={bookingData.clientAddress || ''}
                  onChange={(e) =>
                    setBookingData({ ...bookingData, clientAddress: e.target.value })
                  }
                  disabled={isReadOnly}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                  Cod fiscal / IDNO
                </label>
                <Input
                  type="text"
                  value={bookingData.clientTaxId || ''}
                  onChange={(e) => setBookingData({ ...bookingData, clientTaxId: e.target.value })}
                  disabled={isReadOnly}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                  Rechizite bancare
                </label>
                <Input
                  type="text"
                  value={bookingData.clientBankAccount || ''}
                  onChange={(e) =>
                    setBookingData({ ...bookingData, clientBankAccount: e.target.value })
                  }
                  disabled={isReadOnly}
                />
              </div>
            </div>
          </div>
        )}

        {/* ── Furnizor (Supplier China) ───────────────────────────── */}
        <div>
          <h4 className="text-base font-semibold text-neutral-700 dark:text-neutral-200 border-b border-neutral-200 dark:border-neutral-700 pb-2 mb-4">
            {t('bookings.form.supplierSection')}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <EntityAutocomplete<Supplier>
              label="Nume Furnizor"
              placeholder="Caută furnizor după nume..."
              value={bookingData.supplierName || ''}
              onTextChange={(text) =>
                setBookingData((prev) => ({
                  ...prev,
                  supplierName: text,
                  supplierId: prev.supplierName === text ? prev.supplierId : undefined,
                }))
              }
              onSelect={handleSupplierSelect}
              onCreateNew={handleCreateSupplier}
              search={searchSuppliers}
              getDisplayName={(s) => s.name}
              renderItem={(s) => (
                <>
                  <span className="font-medium">{s.name}</span>
                  <span className="text-xs text-neutral-500">
                    {[s.country, s.contact, s.phone].filter(Boolean).join(' · ')}
                  </span>
                </>
              )}
              disabled={isReadOnly}
            />
            <div>
              <label className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                Telefon
              </label>
              <Input
                type="text"
                value={bookingData.supplierPhone || ''}
                onChange={(e) => setBookingData({ ...bookingData, supplierPhone: e.target.value })}
                disabled={isReadOnly}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                Email
              </label>
              <Input
                type="email"
                value={bookingData.supplierEmail || ''}
                onChange={(e) => setBookingData({ ...bookingData, supplierEmail: e.target.value })}
                onBlur={(e) => {
                  const val = e.target.value.trim();
                  if (val && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
                    addToast('Adresa de email a furnizorului nu este validă', 'error');
                  }
                }}
                disabled={isReadOnly}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                Adresă
              </label>
              <Input
                type="text"
                value={bookingData.supplierAddress || ''}
                onChange={(e) =>
                  setBookingData({ ...bookingData, supplierAddress: e.target.value })
                }
                disabled={isReadOnly}
              />
            </div>
          </div>
        </div>

        {/* ── Agent China — only roles that can call GET /agents ─── */}
        {showAgentSection && (
          <div>
            <h4 className="text-base font-semibold text-neutral-700 dark:text-neutral-200 border-b border-neutral-200 dark:border-neutral-700 pb-2 mb-4">
              {t('bookings.form.agentSection')}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <EntityAutocomplete<Agent>
                label="Companie Agent"
                placeholder="Caută agent după companie sau cod..."
                value={bookingData.agentCompany || ''}
                onTextChange={(text) =>
                  setBookingData((prev) => ({
                    ...prev,
                    agentCompany: text,
                    agentId: prev.agentCompany === text ? prev.agentId : undefined,
                  }))
                }
                onSelect={handleAgentSelect}
                search={searchAgents}
                getDisplayName={(a) => a.company}
                renderItem={(a) => (
                  <>
                    <span className="font-medium">
                      {a.company} <span className="text-xs text-neutral-500">({a.agentCode})</span>
                    </span>
                    <span className="text-xs text-neutral-500">
                      {[a.contactName, a.wechatId].filter(Boolean).join(' · ')}
                    </span>
                  </>
                )}
                disabled={isReadOnly}
              />
              <div>
                <label className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                  Cod Agent
                </label>
                <Input
                  type="text"
                  value={bookingData.agentCode || ''}
                  disabled
                  className="bg-neutral-50 dark:bg-neutral-800"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                  Persoană contact
                </label>
                <Input
                  type="text"
                  value={bookingData.agentContactName || ''}
                  onChange={(e) =>
                    setBookingData({ ...bookingData, agentContactName: e.target.value })
                  }
                  disabled={isReadOnly}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                  WeChat ID
                </label>
                <Input
                  type="text"
                  value={bookingData.agentWechatId || ''}
                  onChange={(e) =>
                    setBookingData({ ...bookingData, agentWechatId: e.target.value })
                  }
                  disabled={isReadOnly}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderNotesSection() {
    return (
      <div>
        <h4 className="text-base font-semibold text-neutral-700 dark:text-neutral-200 border-b border-neutral-200 dark:border-neutral-700 pb-2 mb-4">
          Note
        </h4>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
              Note Client
            </label>
            <textarea
              value={bookingData.clientNotes || ''}
              onChange={(e) => setBookingData({ ...bookingData, clientNotes: e.target.value })}
              disabled={isReadOnly}
              rows={3}
              className="w-full mt-1 p-2 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-neutral-100 dark:disabled:bg-neutral-700 resize-y"
              placeholder="Observații sau instrucțiuni speciale"
            />
          </div>
          {isAdmin && (
            <div>
              <label className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                Note Interne (Admin)
              </label>
              <textarea
                value={bookingData.internalNotes || ''}
                onChange={(e) => setBookingData({ ...bookingData, internalNotes: e.target.value })}
                rows={3}
                className="w-full mt-1 p-2 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-y"
                placeholder="Note interne, vizibile doar pentru admin"
              />
            </div>
          )}
        </div>
      </div>
    );
  }
};

export default BookingDetail;
