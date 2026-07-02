import { api } from './api';

export interface FinancialPeriod {
  period: string;
  invoiced: number;
  paid: number;
  outstanding: number;
  count: number;
}

export interface FinancialReport {
  summary: {
    totalInvoiced: number;
    totalPaid: number;
    totalOutstanding: number;
    totalInvoices: number;
  };
  byPeriod: FinancialPeriod[];
}

export interface ContainersReport {
  statistics: {
    total: number;
    byStatus: Record<string, number>;
    byShippingLine: Record<string, number>;
    byPort: Record<string, number>;
  };
}

const unwrap = <T>(res: { data: { data?: T } | T }): T => {
  const body = res.data as { data?: T };
  return (body?.data ?? res.data) as T;
};

export async function getFinancialReport(groupBy = 'month'): Promise<FinancialReport> {
  const res = await api.get(`/v1/reports/financiar?group_by=${groupBy}`);
  return unwrap<FinancialReport>(res);
}

export async function getContainersReport(): Promise<ContainersReport> {
  const res = await api.get('/v1/reports/containers');
  // The endpoint returns { success, data: <containers[]>, statistics: {...} }
  // where `statistics` is a SIBLING of `data`, not nested. Read it directly.
  const body = res.data as { statistics?: ContainersReport['statistics'] };
  return {
    statistics: body.statistics ?? { total: 0, byStatus: {}, byShippingLine: {}, byPort: {} },
  };
}
