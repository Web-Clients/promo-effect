import React, { useState, useCallback, useEffect, lazy, Suspense } from 'react';
import { Routes, Route, useNavigate, Navigate, Outlet, useLocation } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import VerifyEmail from './components/VerifyEmail';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';
import LandingPage from './components/LandingPage';
import DashboardLayout from './components/DashboardLayout';

// Lazy-loaded dashboard components (loaded on demand)
const MainDashboard = lazy(() => import('./components/MainDashboard'));
const BookingsList = lazy(() => import('./components/BookingsList'));
const BookingDetail = lazy(() => import('./components/BookingDetail'));
const TrackingView = lazy(() => import('./components/TrackingView'));
const PriceCalculator = lazy(() => import('./components/PriceCalculator'));
const EmailParserAssistant = lazy(() => import('./components/EmailParserAssistant'));
const AIEmailParser = lazy(() => import('./components/AIEmailParser'));
const ClientsList = lazy(() => import('./components/ClientsList'));
const InvoicesList = lazy(() => import('./components/InvoicesList'));
const ReportsPage = lazy(() => import('./components/ReportsPage'));
const AdminSettingsPage = lazy(() => import('./components/AdminSettingsPage'));
const AdminPricingPanel = lazy(() => import('./components/AdminPricingPanel'));
const AgentsPanel = lazy(() => import('./components/AgentsPanel'));
const UserProfile = lazy(() => import('./components/UserProfile'));
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
const AgentPricesDashboard = lazy(() => import('./components/AgentPricesDashboard'));
const AdminPriceApproval = lazy(() => import('./components/AdminPriceApproval'));
const AdminPortsManager = lazy(() => import('./components/AdminPortsManager'));
const ContainersInTransit = lazy(() => import('./components/ContainersInTransit'));
const ShippingLinesPage = lazy(() => import('./components/ShippingLinesPage'));
const TransportRatesPage = lazy(() => import('./components/TransportRatesPage'));
const UserManagement = lazy(() => import('./components/UserManagement'));

const DashboardFallback = () => (
  <div className="flex items-center justify-center h-64">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
  </div>
);
import { User, Booking } from './types';
import { ToastProvider } from './components/ui/Toast';
import authService from './services/auth';
import { tokenManager } from './services/api';
import { ErrorBoundary } from './components/shared/ErrorBoundary';
import NotFoundPage from './components/pages/NotFoundPage';
import {
  Servicii,
  Preturi,
  Despre,
  Contact,
  Resurse,
  GhidImport,
  FAQ,
  Termeni,
  Politica,
  FCLTransport,
  LCLGrupaj,
  ConsultantaChina,
  Vamuire,
  Depozitare,
  Cariere,
  Cookies,
  CalculPrompt,
} from './components/pages/public';

// Helper component to update document title and handle external script awareness
const RouteObserver = () => {
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname;
    let title = 'Promo-Efect Logistics';

    if (path.includes('/dashboard/containers-transit')) title = 'Marfă în Drum | Promo-Efect';
    else if (path.includes('/dashboard/bookings')) title = 'Rezervări | Promo-Efect';
    else if (path.includes('/dashboard/tracking')) title = 'Urmărire Container | Promo-Efect';
    else if (path.includes('/dashboard/calculator')) title = 'Calculator Preț | Promo-Efect';
    else if (path.includes('/dashboard/clients')) title = 'Clienți | Promo-Efect';
    else if (path.includes('/dashboard/invoices')) title = 'Facturi | Promo-Efect';
    else if (path.includes('/dashboard/reports')) title = 'Rapoarte | Promo-Efect';
    else if (path.includes('/dashboard/adminSettings')) title = 'Setări Admin | Promo-Efect';
    else if (path.includes('/dashboard/shipping-lines')) title = 'Linii Maritime | Promo-Efect';
    else if (path.includes('/dashboard/transport-rates'))
      title = 'Transport Terestru | Promo-Efect';
    else if (path.includes('/dashboard/admin-pricing'))
      title = 'Administrare Prețuri | Promo-Efect';
    else if (path.includes('/dashboard/agents')) title = 'Agenți Chinezi | Promo-Efect';
    else if (path.includes('/dashboard/admin-panel')) title = 'Panou Admin | Promo-Efect';
    else if (path.includes('/dashboard/user-management'))
      title = 'Gestionare Utilizatori | Promo-Efect';
    else if (path.includes('/dashboard/userProfile')) title = 'Profil Utilizator | Promo-Efect';
    else if (path === '/dashboard') title = 'Panou de Control | Promo-Efect';
    else if (path === '/login') title = 'Autentificare | Promo-Efect';

    document.title = title;

    // Optional: Dispatch a custom event if the external script listens for it
    window.dispatchEvent(new Event('pushstate'));
    window.scrollTo(0, 0);
  }, [location]);

  return null;
};

const ProtectedRoute = ({ user, children }: { user: User | null; children: React.ReactNode }) => {
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

const App = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Rehydrate auth state on first mount
  useEffect(() => {
    const rehydrate = async () => {
      try {
        const storedUser = tokenManager.getUser<User>();
        const hasToken = !!tokenManager.getAccessToken();

        if (!storedUser || !hasToken) {
          // Nothing to restore
          setUser(null);
          return;
        }

        // Optimistic set (avoid redirect flicker)
        setUser(storedUser);

        // Validate token on backend
        const validatedUser = await authService.getCurrentUser();
        setUser(validatedUser);
      } catch (err: any) {
        // Token invalid/expired or backend unreachable with 401/403
        tokenManager.clearTokens();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    rehydrate();
  }, []);

  const handleLogin = useCallback(
    (loggedInUser: User) => {
      setUser(loggedInUser);
      navigate('/dashboard');
    },
    [navigate]
  );

  const handleLogout = useCallback(() => {
    // Clear persisted auth too
    tokenManager.clearTokens();
    setUser(null);
    navigate('/');
  }, [navigate]);

  const handleNewBooking = useCallback(
    (initialData?: Partial<Booking>) => {
      navigate('/dashboard/bookings/new', { state: { initialData } });
    },
    [navigate]
  );

  if (isLoading) {
    return (
      <ToastProvider>
        <div className="min-h-screen flex items-center justify-center bg-neutral-100 dark:bg-neutral-900">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-primary-800 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Se verifică sesiunea...
            </p>
          </div>
        </div>
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <RouteObserver />
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<LandingPage onLoginRedirect={() => navigate('/login')} />} />
          <Route
            path="/login"
            element={user ? <Navigate to="/dashboard" /> : <Login onLogin={handleLogin} />}
          />
          <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <Register />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route
            path="/forgot-password"
            element={user ? <Navigate to="/dashboard" /> : <ForgotPassword />}
          />
          <Route
            path="/reset-password"
            element={user ? <Navigate to="/dashboard" /> : <ResetPassword />}
          />

          {/* Public Pages */}
          <Route
            path="/servicii"
            element={<Servicii onLoginRedirect={() => navigate('/login')} />}
          />
          <Route path="/preturi" element={<Preturi onLoginRedirect={() => navigate('/login')} />} />
          <Route
            path="/calcul-prompt"
            element={<CalculPrompt onLoginRedirect={() => navigate('/login')} />}
          />
          <Route path="/despre" element={<Despre onLoginRedirect={() => navigate('/login')} />} />
          <Route path="/contact" element={<Contact onLoginRedirect={() => navigate('/login')} />} />
          <Route path="/resurse" element={<Resurse onLoginRedirect={() => navigate('/login')} />} />
          <Route
            path="/ghid-import"
            element={<GhidImport onLoginRedirect={() => navigate('/login')} />}
          />
          <Route path="/faq" element={<FAQ onLoginRedirect={() => navigate('/login')} />} />
          <Route path="/termeni" element={<Termeni onLoginRedirect={() => navigate('/login')} />} />
          <Route
            path="/politica"
            element={<Politica onLoginRedirect={() => navigate('/login')} />}
          />
          <Route path="/cookies" element={<Cookies onLoginRedirect={() => navigate('/login')} />} />

          {/* Services Detail Pages */}
          <Route
            path="/servicii/fcl"
            element={<FCLTransport onLoginRedirect={() => navigate('/login')} />}
          />
          <Route
            path="/servicii/lcl"
            element={<LCLGrupaj onLoginRedirect={() => navigate('/login')} />}
          />
          <Route
            path="/servicii/consultanta"
            element={<ConsultantaChina onLoginRedirect={() => navigate('/login')} />}
          />
          <Route
            path="/servicii/vamuire"
            element={<Vamuire onLoginRedirect={() => navigate('/login')} />}
          />
          <Route
            path="/servicii/depozitare"
            element={<Depozitare onLoginRedirect={() => navigate('/login')} />}
          />

          {/* Company Detail Pages */}
          <Route path="/cariere" element={<Cariere onLoginRedirect={() => navigate('/login')} />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute user={user}>
                <DashboardLayout
                  user={user!}
                  onLogout={handleLogout}
                  onNewBooking={handleNewBooking}
                >
                  <Outlet />
                </DashboardLayout>
              </ProtectedRoute>
            }
          >
            <Suspense fallback={<DashboardFallback />}>
              <Route index element={<MainDashboard user={user!} />} />
              <Route path="bookings" element={<BookingsList user={user!} />} />
              <Route path="bookings/:bookingId" element={<BookingDetail user={user!} />} />
              <Route path="tracking" element={<TrackingView />} />
              <Route path="containers-transit" element={<ContainersInTransit />} />
              <Route path="calculator" element={<PriceCalculator user={user!} />} />
              <Route
                path="emailParser"
                element={<EmailParserAssistant onBookingCreate={handleNewBooking} />}
              />
              <Route path="ai-parser" element={<AIEmailParser />} />
              <Route path="clients" element={<ClientsList />} />
              <Route path="invoices" element={<InvoicesList />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="adminSettings" element={<AdminSettingsPage />} />
              <Route path="admin-pricing" element={<AdminPricingPanel />} />
              <Route path="shipping-lines" element={<ShippingLinesPage />} />
              <Route path="transport-rates" element={<TransportRatesPage />} />
              <Route path="agents" element={<AgentsPanel />} />
              <Route path="admin-panel" element={<AdminDashboard />} />
              <Route path="my-prices" element={<AgentPricesDashboard />} />
              <Route path="price-approval" element={<AdminPriceApproval />} />
              <Route path="ports-manager" element={<AdminPortsManager />} />
              <Route path="user-management" element={<UserManagement currentUser={user!} />} />
              <Route path="userProfile" element={<UserProfile user={user!} />} />
            </Suspense>
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </ErrorBoundary>
    </ToastProvider>
  );
};

export default App;
