import React, { useState, useCallback, useEffect } from 'react';
import { Routes, Route, useNavigate, Navigate, Outlet, useLocation } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import VerifyEmail from './components/VerifyEmail';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';
import LandingPage from './components/LandingPage';
import DashboardLayout from './components/DashboardLayout';
import MainDashboard from './components/MainDashboard';
import BookingsList from './components/BookingsList';
import BookingDetail from './components/BookingDetail';
import TrackingView from './components/TrackingView';
import PriceCalculator from './components/PriceCalculator';
import EmailParserAssistant from './components/EmailParserAssistant';
import AIEmailParser from './components/AIEmailParser';
import ClientsList from './components/ClientsList';
import InvoicesList from './components/InvoicesList';
import ReportsPage from './components/ReportsPage';
import AdminSettingsPage from './components/AdminSettingsPage';
import AdminPricingPanel from './components/AdminPricingPanel';
import AgentsPanel from './components/AgentsPanel';
import UserProfile from './components/UserProfile';
import AdminDashboard from './components/AdminDashboard';
import AgentPricesDashboard from './components/AgentPricesDashboard';
import AdminPriceApproval from './components/AdminPriceApproval';
import AdminPortsManager from './components/AdminPortsManager';
import ContainersInTransit from './components/ContainersInTransit';
import UserManagement from './components/UserManagement';
import { User, Booking } from './types';
import { ToastProvider } from './components/ui/Toast';
import authService from './services/auth';
import { tokenManager } from './services/api';

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
    else if (path.includes('/dashboard/admin-pricing')) title = 'Administrare Prețuri | Promo-Efect';
    else if (path.includes('/dashboard/agents')) title = 'Agenți Chinezi | Promo-Efect';
    else if (path.includes('/dashboard/admin-panel')) title = 'Panou Admin | Promo-Efect';
    else if (path.includes('/dashboard/user-management')) title = 'Gestionare Utilizatori | Promo-Efect';
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

const ProtectedRoute = ({ user, children }: { user: User | null, children: React.ReactNode }) => {
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

  const handleLogin = useCallback((loggedInUser: User) => {
    setUser(loggedInUser);
    navigate('/dashboard');
  }, [navigate]);

  const handleLogout = useCallback(() => {
    // Clear persisted auth too
    tokenManager.clearTokens();
    setUser(null);
    navigate('/');
  }, [navigate]);

  const handleNewBooking = useCallback((initialData?: Partial<Booking>) => {
    navigate('/dashboard/bookings/new', { state: { initialData } });
  }, [navigate]);

  if (isLoading) {
    return (
      <ToastProvider>
        <div className="min-h-screen flex items-center justify-center bg-neutral-100 dark:bg-neutral-900">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-primary-800 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Se verifică sesiunea...</p>
          </div>
        </div>
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <RouteObserver />
      <Routes>
        <Route path="/" element={<LandingPage onLoginRedirect={() => navigate('/login')} />} />
        <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login onLogin={handleLogin} />} />
        <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={user ? <Navigate to="/dashboard" /> : <ForgotPassword />} />
        <Route path="/reset-password" element={user ? <Navigate to="/dashboard" /> : <ResetPassword />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute user={user}>
              <DashboardLayout user={user!} onLogout={handleLogout} onNewBooking={handleNewBooking}>
                <Outlet />
              </DashboardLayout>
            </ProtectedRoute>
          }
        >
          <Route index element={<MainDashboard user={user!} />} />
          <Route path="bookings" element={<BookingsList user={user!} />} />
          <Route path="bookings/:bookingId" element={<BookingDetail user={user!} />} />
          <Route path="tracking" element={<TrackingView />} />
          <Route path="containers-transit" element={<ContainersInTransit />} />
          <Route path="calculator" element={<PriceCalculator user={user!} />} />
          <Route path="emailParser" element={<EmailParserAssistant onBookingCreate={handleNewBooking} />} />
          <Route path="ai-parser" element={<AIEmailParser />} />
          <Route path="clients" element={<ClientsList />} />
          <Route path="invoices" element={<InvoicesList />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="adminSettings" element={<AdminSettingsPage />} />
          <Route path="admin-pricing" element={<AdminPricingPanel />} />
          <Route path="agents" element={<AgentsPanel />} />
          <Route path="admin-panel" element={<AdminDashboard />} />
          <Route path="my-prices" element={<AgentPricesDashboard />} />
          <Route path="price-approval" element={<AdminPriceApproval />} />
          <Route path="ports-manager" element={<AdminPortsManager />} />
          <Route path="user-management" element={<UserManagement currentUser={user!} />} />
          <Route path="userProfile" element={<UserProfile user={user!} />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ToastProvider>
  );
};

export default App;