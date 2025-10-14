import { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs, { type Dayjs } from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import type { DashboardDateRange } from './useDashboardMetrics';

dayjs.extend(utc);

type TicketRow = {
  week_start: string;
  channel: string;
  tickets: number | null;
};

type AlertRow = {
  id: string;
  title: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'resolved';
  created_at: string;
};

type OperationsMetricsState = {
  ticketTrend: Array<{ week: string; channel: string; tickets: number }>;
  alerts: AlertRow[];
};

const EMPTY_STATE: OperationsMetricsState = {
  ticketTrend: [],
  alerts: [],
};

const FALLBACK_TICKETS: OperationsMetricsState['ticketTrend'] = [
  { week: '2025-08-04', channel: 'Manual Review', tickets: 48 },
  { week: '2025-08-04', channel: 'KYC', tickets: 32 },
  { week: '2025-08-04', channel: '3DS', tickets: 21 },
  { week: '2025-08-04', channel: 'Customer Service', tickets: 15 },
  { week: '2025-08-11', channel: 'Manual Review', tickets: 52 },
  { week: '2025-08-11', channel: 'KYC', tickets: 30 },
  { week: '2025-08-11', channel: '3DS', tickets: 19 },
  { week: '2025-08-11', channel: 'Customer Service', tickets: 18 },
  { week: '2025-08-18', channel: 'Manual Review', tickets: 58 },
  { week: '2025-08-18', channel: 'KYC', tickets: 34 },
  { week: '2025-08-18', channel: '3DS', tickets: 24 },
  { week: '2025-08-18', channel: 'Customer Service', tickets: 17 },
  { week: '2025-08-25', channel: 'Manual Review', tickets: 61 },
  { week: '2025-08-25', channel: 'KYC', tickets: 38 },
  { week: '2025-08-25', channel: '3DS', tickets: 26 },
  { week: '2025-08-25', channel: 'Customer Service', tickets: 22 },
];

const FALLBACK_ALERTS: AlertRow[] = [
  {
    id: 'fallback-1',
    title: 'BIN attack spike on LatAm traffic',
    severity: 'critical',
    status: 'in_progress',
    created_at: dayjs().subtract(2, 'hour').toISOString(),
  },
  {
    id: 'fallback-2',
    title: 'Manual review backlog over SLA',
    severity: 'high',
    status: 'open',
    created_at: dayjs().subtract(6, 'hour').toISOString(),
  },
  {
    id: 'fallback-3',
    title: 'KYC provider latency degradation',
    severity: 'medium',
    status: 'open',
    created_at: dayjs().subtract(11, 'hour').toISOString(),
  },
  {
    id: 'fallback-4',
    title: 'Chargeback queue approaching limit',
    severity: 'high',
    status: 'in_progress',
    created_at: dayjs().subtract(1, 'day').toISOString(),
  },
  {
    id: 'fallback-5',
    title: 'Spike in 3DS challenge failures',
    severity: 'medium',
    status: 'open',
    created_at: dayjs().subtract(2, 'day').toISOString(),
  },
];

export function useOperationsMetrics(range: DashboardDateRange) {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<OperationsMetricsState>(EMPTY_STATE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (window: DashboardDateRange) => {
      if (!user?.id || !window.from || !window.to) {
        setMetrics(EMPTY_STATE);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const { data: orgRow, error: orgErr } = await supabase
          .from('organizations')
          .select('organization_id')
          .eq('user_id', user.id)
          .single();

        if (orgErr) throw orgErr;
        if (!orgRow?.organization_id) throw new Error('Organization not found for user');

        const orgId = orgRow.organization_id as string;

        const fromLocal = window.from.startOf('week');
        const toLocalExclusive = window.to.add(1, 'week').startOf('week');

        const fromUtc = fromLocal.utc();
        const toExclusiveUtc = toLocalExclusive.utc();

        const [{ data: ticketRows, error: ticketErr }, { data: alertRows, error: alertErr }] = await Promise.all([
          supabase
            .from('support_tickets_weekly')
            .select('week_start, channel, tickets')
            .eq('organization_id', orgId)
            .gte('week_start', fromUtc.toISOString())
            .lt('week_start', toExclusiveUtc.toISOString()),
          supabase
            .from('alerts')
            .select('id, title, severity, status, created_at')
            .eq('organization_id', orgId)
            .in('status', ['open', 'in_progress'])
            .order('created_at', { ascending: false })
            .limit(10),
        ]);

        if (ticketErr) throw ticketErr;
        if (alertErr) throw alertErr;

        const normalizedTickets = (ticketRows as TicketRow[] | null)?.map((row) => ({
          week: dayjs.utc(row.week_start).format('YYYY-MM-DD'),
          channel: row.channel,
          tickets: row.tickets ?? 0,
        })) ?? [];

        const normalizedAlerts = (alertRows as AlertRow[] | null) ?? [];

        setMetrics({
          ticketTrend: normalizedTickets,
          alerts: normalizedAlerts,
        });
      } catch (err) {
        console.error('Failed to load operations metrics', err);
        const message = err instanceof Error ? err.message : 'Failed to load operations metrics';
        setError(message);
        setMetrics({
          ticketTrend: FALLBACK_TICKETS,
          alerts: FALLBACK_ALERTS,
        });
      } finally {
        setLoading(false);
      }
    },
    [user?.id],
  );

  useEffect(() => {
    void load(range);
  }, [load, range, range.from?.valueOf(), range.to?.valueOf()]);

  const hasData = useMemo(
    () => metrics.ticketTrend.length > 0 || metrics.alerts.length > 0,
    [metrics.ticketTrend.length, metrics.alerts.length],
  );

  return {
    metrics,
    loading,
    error,
    hasData,
    refresh: (window?: DashboardDateRange) => load(window ?? range),
  };
}
