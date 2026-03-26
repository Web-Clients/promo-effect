import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { User, UserRole, Booking } from '../types';
import { cn } from '../lib/utils';
import {
  LayoutDashboardIcon,
  PackageIcon,
  ShipIcon,
  UsersIcon,
  FileTextIcon,
  BarChartIcon,
  SettingsIcon,
  CalculatorIcon,
  MailIcon,
  SparklesIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SearchIcon,
  SunIcon,
  MoonIcon,
  PlusIcon,
  LogOutIcon,
  MoreHorizontalIcon,
  UserIcon,
  DollarSignIcon,
  GlobeIcon,
  UserCheckIcon,
  AnchorIcon,
  MapPinIcon,
  TruckIcon,
} from './icons';
import NotificationsDropdown from './NotificationsDropdown';
import { LanguageSwitcher } from './shared/LanguageSwitcher';

interface DashboardLayoutProps {
  children?: React.ReactNode;
  user: User;
  onLogout: () => void;
  onNewBooking: (initialData?: Partial<Booking>) => void;
}

const Avatar = ({ children, className }: React.PropsWithChildren<{ className?: string }>) => (
  <div className={cn('relative flex h-9 w-9 shrink-0 overflow-hidden rounded-full', className)}>
    {children}
  </div>
);
const AvatarImage = ({ src }: { src?: string }) => (
  <img className="aspect-square h-full w-full" src={src} />
);
const AvatarFallback = ({
  children,
  className,
}: React.PropsWithChildren<{ className?: string }>) => (
  <span className="flex h-full w-full items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400">
    {children}
  </span>
);

interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  visible: boolean;
  end?: boolean;
}

const DashboardLayout = ({ children, user, onLogout, onNewBooking }: DashboardLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  const isAdmin = [UserRole.SUPER_ADMIN, UserRole.ADMIN].includes(user.role);
  const isAdminOrManager = [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER].includes(
    user.role
  );

  const navigation: NavItem[] = [
    {
      name: 'Panou de control',
      path: '/dashboard',
      icon: LayoutDashboardIcon,
      visible: true,
      end: true,
    },
    { name: 'Rezervări', path: 'bookings', icon: PackageIcon, visible: true },
    { name: 'Urmărire', path: 'tracking', icon: ShipIcon, visible: true },
    { name: 'Marfă în Drum', path: 'containers-transit', icon: MapPinIcon, visible: true },
    { name: 'Calculator Preț', path: 'calculator', icon: CalculatorIcon, visible: true },
    { name: 'Profilul Meu', path: 'userProfile', icon: UserIcon, visible: true },
    { name: 'Clienți', path: 'clients', icon: UsersIcon, visible: isAdminOrManager },
    { name: 'Facturi', path: 'invoices', icon: FileTextIcon, visible: isAdminOrManager },
    { name: 'AI Email Parser', path: 'ai-parser', icon: SparklesIcon, visible: isAdminOrManager },
    { name: 'Rapoarte', path: 'reports', icon: BarChartIcon, visible: isAdminOrManager },
    { name: 'Administrare Prețuri', path: 'admin-pricing', icon: DollarSignIcon, visible: isAdmin },
    { name: 'Linii Maritime', path: 'shipping-lines', icon: ShipIcon, visible: isAdmin },
    { name: 'Transport Terestru', path: 'transport-rates', icon: TruckIcon, visible: isAdmin },
    { name: 'Agenți Chinezi', path: 'agents', icon: GlobeIcon, visible: isAdmin },
    { name: 'Gestionare Porturi', path: 'ports-manager', icon: AnchorIcon, visible: isAdmin },
    { name: 'Panou Admin', path: 'admin-panel', icon: UserCheckIcon, visible: isAdmin },
    { name: 'Utilizatori', path: 'user-management', icon: UsersIcon, visible: isAdmin },
    { name: 'Setări Admin', path: 'adminSettings', icon: SettingsIcon, visible: isAdmin },
    {
      name: 'Prețurile Mele',
      path: 'my-prices',
      icon: DollarSignIcon,
      visible: user.role === UserRole.AGENT,
    },
  ];

  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200">
      {/* Flexport-style Dark Navy Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 h-screen z-40 transition-all duration-300 hidden md:flex md:flex-col',
          'bg-[#0A2540] text-white shadow-xl',
          sidebarOpen ? 'w-64' : 'w-[72px]'
        )}
      >
        {/* Logo Section */}
        <div className="flex items-center h-16 px-4 border-b border-white/10 flex-shrink-0">
          {sidebarOpen ? (
            <div className="flex items-center gap-3 w-full">
              <div className="w-9 h-9 rounded-lg bg-accent-500 flex items-center justify-center">
                <svg
                  className="h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.125-.504 1.125-1.125V14.25m-17.25 4.5v-1.875a3.375 3.375 0 003.375-3.375h1.5a1.125 1.125 0 011.125 1.125v-1.5c0-.621.504-1.125 1.125-1.125H12m6 6v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H9.75"
                  />
                </svg>
              </div>
              <div>
                <span className="font-heading font-bold text-lg text-white">Promo-Efect</span>
                <p className="text-[10px] text-white/50 uppercase tracking-wider">
                  Logistics Platform
                </p>
              </div>
            </div>
          ) : (
            <div className="w-10 h-10 rounded-lg bg-accent-500 flex items-center justify-center mx-auto">
              <svg
                className="h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.125-.504 1.125-1.125V14.25m-17.25 4.5v-1.875a3.375 3.375 0 003.375-3.375h1.5a1.125 1.125 0 011.125 1.125v-1.5c0-.621.504-1.125 1.125-1.125H12m6 6v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H9.75"
                />
              </svg>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navigation
            .filter((item) => item.visible)
            .map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.name}
                  to={item.path}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 overflow-hidden text-sm group',
                      isActive
                        ? 'bg-white/15 text-white font-medium shadow-sm'
                        : 'text-white/70 hover:bg-white/10 hover:text-white',
                      !sidebarOpen && 'justify-center px-2'
                    )
                  }
                  title={item.name}
                >
                  <Icon
                    className={cn(
                      'h-5 w-5 flex-shrink-0 transition-transform',
                      'group-hover:scale-110'
                    )}
                  />
                  {sidebarOpen && <span className="flex-1 truncate">{item.name}</span>}
                </NavLink>
              );
            })}
        </nav>

        {/* Collapse Button */}
        <div className="px-3 py-2">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
              'text-white/50 hover:bg-white/10 hover:text-white/80',
              !sidebarOpen && 'justify-center px-2'
            )}
          >
            {sidebarOpen ? (
              <>
                <ChevronLeftIcon className="h-5 w-5" />
                <span className="text-sm">Restrânge</span>
              </>
            ) : (
              <ChevronRightIcon className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* User Section */}
        <div className="p-3 border-t border-white/10 flex-shrink-0">
          <div
            className={cn(
              'flex items-center gap-3 p-2 rounded-lg bg-white/5',
              !sidebarOpen && 'justify-center'
            )}
          >
            <Avatar className="border-2 border-accent-500">
              <AvatarFallback className="bg-accent-500 text-white text-sm font-medium">
                {user.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{user.name}</p>
                <p className="text-xs text-white/50 truncate">{user.role.replace('_', ' ')}</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className={cn('transition-all duration-300', sidebarOpen ? 'md:ml-64' : 'md:ml-[72px]')}>
        <header className="sticky top-0 z-30 bg-white/95 dark:bg-neutral-800/95 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center justify-between h-16 px-6">
            <div className="flex-1 max-w-xl">
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Caută rezervări, containere, clienți..."
                  className="w-full pl-10 pr-4 py-2.5 bg-neutral-100 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-sm"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <LanguageSwitcher />
              <NotificationsDropdown />

              <button
                onClick={toggleTheme}
                className="p-2.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
              >
                {theme === 'dark' ? (
                  <SunIcon className="h-5 w-5 text-neutral-600 dark:text-neutral-300" />
                ) : (
                  <MoonIcon className="h-5 w-5 text-neutral-600 dark:text-neutral-300" />
                )}
              </button>

              <button
                onClick={() => onNewBooking()}
                className="hidden sm:inline-flex items-center justify-center text-sm font-medium transition-all h-10 px-4 bg-accent-500 text-white shadow-sm hover:bg-accent-600 hover:shadow-md rounded-lg"
              >
                <PlusIcon className="mr-2 h-4 w-4" />
                Rezervare Nouă
              </button>

              <button
                onClick={onLogout}
                className="p-2.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                title="Deconectare"
              >
                <LogOutIcon className="h-5 w-5 text-neutral-600 dark:text-neutral-300" />
              </button>
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-6 pb-24 md:pb-6 animate-fade-in">{children}</main>
      </div>

      {/* Floating Action Button for Mobile */}
      <div className="md:hidden fixed bottom-20 right-4 z-40">
        <button
          onClick={() => onNewBooking()}
          className="bg-accent-500 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:bg-accent-600 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-500 hover:scale-105"
          aria-label="Rezervare Nouă"
        >
          <PlusIcon className="h-7 w-7" />
        </button>
      </div>

      {/* Mobile Bottom Navigation - Flexport Style */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0A2540] border-t border-white/10 z-50 safe-area-pb">
        <div className="grid grid-cols-5 gap-1 p-2">
          {navigation
            .filter((n) => n.visible)
            .slice(0, 5)
            .map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      'flex flex-col items-center justify-center py-2 px-1 rounded-lg text-center transition-all',
                      isActive ? 'bg-white/15 text-white' : 'text-white/60'
                    )
                  }
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-[10px] leading-tight mt-1 line-clamp-1 font-medium">
                    {item.name}
                  </span>
                </NavLink>
              );
            })}
        </div>
      </nav>
    </div>
  );
};

export default DashboardLayout;
