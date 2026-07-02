import React, { useEffect, useState } from 'react';
import { Card } from './ui/Card';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  getFinancialReport,
  getContainersReport,
  type FinancialReport,
  type ContainersReport,
} from '../services/reports';

const COLORS = ['#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe'];

const RO_MONTHS = [
  'Ian',
  'Feb',
  'Mar',
  'Apr',
  'Mai',
  'Iun',
  'Iul',
  'Aug',
  'Sep',
  'Oct',
  'Noi',
  'Dec',
];

// "2026-07" -> "Iul 2026"
const formatPeriod = (period: string): string => {
  const m = /^(\d{4})-(\d{2})$/.exec(period);
  if (!m) return period;
  const monthIdx = Number(m[2]) - 1;
  return `${RO_MONTHS[monthIdx] ?? m[2]} ${m[1]}`;
};

const ReportsPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [financial, setFinancial] = useState<FinancialReport | null>(null);
  const [containers, setContainers] = useState<ContainersReport | null>(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [fin, cont] = await Promise.all([getFinancialReport('month'), getContainersReport()]);
      setFinancial(fin);
      setContainers(cont);
    } catch {
      setError('Rapoartele nu au putut fi încărcate. Reîncearcă.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const monthlyRevenue =
    financial?.byPeriod?.map((p) => ({ name: formatPeriod(p.period), revenue: p.invoiced })) ?? [];
  const containersByPort = Object.entries(containers?.statistics?.byPort ?? {})
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-semibold text-neutral-800 dark:text-neutral-100">
            Rapoarte
          </h3>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Analizați performanța și obțineți informații valoroase.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-72 text-neutral-500 dark:text-neutral-400">
          Se încarcă rapoartele...
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center h-72 gap-3">
          <p className="text-red-500">{error}</p>
          <button
            onClick={load}
            className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm hover:bg-primary-500"
          >
            Reîncarcă
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <h4 className="text-base font-semibold text-neutral-700 dark:text-neutral-200">
              Venit Facturat pe Lună
            </h4>
            <div className="h-72 mt-4">
              {monthlyRevenue.length === 0 ? (
                <div className="flex items-center justify-center h-full text-sm text-neutral-400">
                  Nu există date financiare încă.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={monthlyRevenue}
                    margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                    <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={12} />
                    <YAxis stroke="var(--text-secondary)" fontSize={12} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: '14px' }} />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      name="Venit"
                      stroke="#2563eb"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>
          <Card>
            <h4 className="text-base font-semibold text-neutral-700 dark:text-neutral-200">
              Containere după Portul de Origine
            </h4>
            <div className="h-72 mt-4">
              {containersByPort.length === 0 ? (
                <div className="flex items-center justify-center h-full text-sm text-neutral-400">
                  Nu există containere încă.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={containersByPort}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      nameKey="name"
                      label
                    >
                      {containersByPort.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: '14px' }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default React.memo(ReportsPage);
