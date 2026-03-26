import React from 'react';
import { Card } from './ui/Card';
import {
  BarChart,
  Bar,
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

const monthlyRevenue = [
  { name: 'Ian', revenue: 180000 },
  { name: 'Feb', revenue: 210000 },
  { name: 'Mar', revenue: 250000 },
  { name: 'Apr', revenue: 230000 },
  { name: 'Mai', revenue: 270000 },
  { name: 'Iun', revenue: 310000 },
  { name: 'Iul', revenue: 290000 },
  { name: 'Aug', revenue: 340000 },
];

const containersByPort = [
  { name: 'Shanghai', value: 400 },
  { name: 'Qingdao', value: 300 },
  { name: 'Ningbo', value: 250 },
  { name: 'Shenzhen', value: 200 },
];
const COLORS = ['#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe'];

const ReportsPage = () => {
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-2xl font-semibold text-neutral-800 dark:text-neutral-100">Rapoarte</h3>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          Analizați performanța și obțineți informații valoroase.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <h4 className="text-base font-semibold text-neutral-700 dark:text-neutral-200">
            Venit Lunar
          </h4>
          <div className="h-72 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyRevenue} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
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
          </div>
        </Card>
        <Card>
          <h4 className="text-base font-semibold text-neutral-700 dark:text-neutral-200">
            Containere după Portul de Origine
          </h4>
          <div className="h-72 mt-4">
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
          </div>
        </Card>
      </div>
    </div>
  );
};

export default React.memo(ReportsPage);
