import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { User, UserRole } from '../types';
import KPICard from './KpiCard';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import { ShipIcon, PackageIcon, DollarSignIcon, AlertCircleIcon } from './icons';
import bookingsService, { BookingStatsResponse } from '../services/bookings';

interface MainDashboardProps {
  user: User;
}

const generateSparkline = () =>
  Array.from({ length: 10 }, () => ({ value: Math.floor(Math.random() * 100) }));

interface KpiData {
  title: string;
  value: string | number;
  change: string;
  trend: 'up' | 'down';
  icon: React.ComponentType<{ className?: string }>;
  sparklineData: { value: number }[];
}

const MainDashboard = ({ user }: MainDashboardProps) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const isAdminOrManager = [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER].includes(
    user.role
  );

  const [stats, setStats] = useState<BookingStatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load stats from API
  useEffect(() => {
    const loadStats = async () => {
      try {
        const statsData = await bookingsService.getBookingStats();
        setStats(statsData);
      } catch (error) {
        console.error('Failed to load stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadStats();

    loadStats();
  }, []);

  // Redirect Agents to their dashboard
  useEffect(() => {
    if (user.role === UserRole.AGENT) {
      navigate('/dashboard/my-prices');
    }
  }, [user, navigate]);

  // Calculate KPIs from real stats
  const kpis: KpiData[] =
    isLoading || !stats
      ? [
          {
            title: t('dashboard.totalBookings'),
            value: '...',
            icon: PackageIcon,
            change: '...',
            trend: 'up',
            sparklineData: generateSparkline(),
          },
          {
            title: t('dashboard.inTransit'),
            value: '...',
            icon: ShipIcon,
            change: '...',
            trend: 'up',
            sparklineData: generateSparkline(),
          },
          {
            title: t('dashboard.totalRevenue'),
            value: '...',
            icon: DollarSignIcon,
            change: '...',
            trend: 'up',
            sparklineData: generateSparkline(),
          },
          {
            title: t('dashboard.delivered'),
            value: '...',
            icon: AlertCircleIcon,
            change: '...',
            trend: 'down',
            sparklineData: generateSparkline(),
          },
        ]
      : [
          {
            title: t('dashboard.totalBookings'),
            value: stats.total,
            icon: PackageIcon,
            change: '+12%',
            trend: 'up',
            sparklineData: generateSparkline(),
          },
          {
            title: t('dashboard.inTransit'),
            value: stats.byStatus['IN_TRANSIT'] || 0,
            icon: ShipIcon,
            change: '+5%',
            trend: 'up',
            sparklineData: generateSparkline(),
          },
          {
            title: t('dashboard.totalRevenue'),
            value: `$${(stats.totalRevenue / 1000).toFixed(0)}k`,
            icon: DollarSignIcon,
            change: '+8%',
            trend: 'up',
            sparklineData: generateSparkline(),
          },
          {
            title: t('dashboard.delivered'),
            value: stats.byStatus['DELIVERED'] || 0,
            icon: AlertCircleIcon,
            change: '+15%',
            trend: 'up',
            sparklineData: generateSparkline(),
          },
        ];

  // Generate chart data from stats
  const containersByLine = stats
    ? Object.entries(stats.byStatus).map(([name, count]) => ({
        name: name.replace('_', ' '),
        count,
      }))
    : [];

  const weeklyRevenue = [
    { name: 'S1', revenue: stats ? stats.totalRevenue * 0.2 : 0 },
    { name: 'S2', revenue: stats ? stats.totalRevenue * 0.25 : 0 },
    { name: 'S3', revenue: stats ? stats.totalRevenue * 0.27 : 0 },
    { name: 'S4', revenue: stats ? stats.totalRevenue * 0.28 : 0 },
  ];

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-primary-800 dark:text-white font-heading">
            {t('dashboard.welcomeMessage', { name: user.name })}
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            {t('dashboard.activitySummary')}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-neutral-500">
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-accent-50 text-accent-700 dark:bg-accent-500/20 dark:text-accent-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-accent-500 mr-2 animate-pulse"></span>
            Live
          </span>
          <span>{t('dashboard.updatedNow')}</span>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {kpis.map((kpi, index) => (
          <div
            key={kpi.title}
            className="animate-slide-up"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <KPICard {...kpi} />
          </div>
        ))}
      </div>

      {/* Charts Section */}
      {isAdminOrManager && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Weekly Revenue Chart */}
          <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-card border border-neutral-200/50 dark:border-neutral-700/50 p-5">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-base font-semibold text-primary-800 dark:text-white">
                {t('dashboard.weeklyRevenue')}
              </h4>
              <span className="text-xs text-neutral-400 bg-neutral-100 dark:bg-neutral-700 px-2 py-1 rounded-md">
                {t('dashboard.lastFourWeeks')}
              </span>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={weeklyRevenue}
                  margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
                >
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0A2540" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#0A2540" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" opacity={0.5} />
                  <XAxis
                    dataKey="name"
                    stroke="var(--text-secondary)"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="var(--text-secondary)"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0A2540',
                      border: 'none',
                      borderRadius: '8px',
                      color: 'white',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    name={t('dashboard.revenue')}
                    stroke="#0A2540"
                    strokeWidth={3}
                    dot={{ fill: '#0A2540', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, fill: '#00C29A' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Status Distribution Chart */}
          <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-card border border-neutral-200/50 dark:border-neutral-700/50 p-5">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-base font-semibold text-primary-800 dark:text-white">
                {t('dashboard.bookingsStatus')}
              </h4>
              <span className="text-xs text-neutral-400 bg-neutral-100 dark:bg-neutral-700 px-2 py-1 rounded-md">
                {t('dashboard.distribution')}
              </span>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={containersByLine}
                  margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
                >
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00C29A" />
                      <stop offset="100%" stopColor="#008F6F" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" opacity={0.5} />
                  <XAxis
                    dataKey="name"
                    stroke="var(--text-secondary)"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    angle={-20}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    stroke="var(--text-secondary)"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0A2540',
                      border: 'none',
                      borderRadius: '8px',
                      color: 'white',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    }}
                  />
                  <Bar
                    dataKey="count"
                    fill="url(#barGradient)"
                    name={t('dashboard.count')}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MainDashboard;
