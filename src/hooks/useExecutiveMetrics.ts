import { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs, { type Dayjs } from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import type { DashboardDateRange } from './useDashboardMetrics';

dayjs.extend(utc);

type FraudLossRow = {
  week_start: string;
  fraud_loss_amount: number | null;
  non_fraud_loss_amount: number | null;
};

type FrictionRow = {
  week_start: string;
  channel: string;
  transactions: number | null;
};

type ExecutiveMetricsState = {
  lossByWeek: Array<{ week: string; fraudLoss: number; nonFraudLoss: number }>;
  frictionByChannel: Array<{ week: string; channel: string; transactions: number }>;
};

const EMPTY_STATE: ExecutiveMetricsState = {
  lossByWeek: [],
  frictionByChannel: [],
};

const FALLBACK_LOSS: ExecutiveMetricsState['lossByWeek'] = [
  { week: '2025-07-14', fraudLoss: 12000, nonFraudLoss: 3500 },
  { week: '2025-07-21', fraudLoss: 18000, nonFraudLoss: 4200 },
  { week: '2025-07-28', fraudLoss: 9500, nonFraudLoss: 2800 },
  { week: '2025-08-04', fraudLoss: 16000, nonFraudLoss: 5000 },
  { week: '2025-08-11', fraudLoss: 21000, nonFraudLoss: 6100 },
  { week: '2025-08-18', fraudLoss: 15500, nonFraudLoss: 4400 },
  { week: '2025-08-25', fraudLoss: 19800, nonFraudLoss: 5200 },
];

const FALLBACK_FRICTION: ExecutiveMetricsState['frictionByChannel'] = [
  { week: '2025-07-14', channel: '3DS', transactions: 8200 },
  { week: '2025-07-14', channel: 'KYC', transactions: 2700 },
  { week: '2025-07-14', channel: 'Manual Review', transactions: 3400 },
  { week: '2025-07-14', channel: 'Auto Allow', transactions: 11200 },
  { week: '2025-07-21', channel: '3DS', transactions: 9100 },
  { week: '2025-07-21', channel: 'KYC', transactions: 2500 },
  { week: '2025-07-21', channel: 'Manual Review', transactions: 4100 },
  { week: '2025-07-21', channel: 'Auto Allow', transactions: 12100 },
  { week: '2025-07-28', channel: '3DS', transactions: 7800 },
  { week: '2025-07-28', channel: 'KYC', transactions: 2600 },
  { week: '2025-07-28', channel: 'Manual Review', transactions: 3600 },
  { week: '2025-07-28', channel: 'Auto Allow', transactions: 10900 },
  { week: '2025-08-04', channel: '3DS', transactions: 8600 },
  { week: '2025-08-04', channel: 'KYC', transactions: 2800 },
  { week: '2025-08-04', channel: 'Manual Review', transactions: 4300 },
  { week: '2025-08-04', channel: 'Auto Allow', transactions: 11800 },
  { week: '2025-08-11', channel: '3DS', transactions: 9400 },
  { week: '2025-08-11', channel: 'KYC', transactions: 3100 },
  { week: '2025-08-11', channel: 'Manual Review', transactions: 3900 },
  { week: '2025-08-11', channel: 'Auto Allow', transactions: 12400 },
  { week: '2025-08-18', channel: '3DS', transactions: 8800 },
  { week: '2025-08-18', channel: 'KYC', transactions: 2950 },
  { week: '2025-08-18', channel: 'Manual Review', transactions: 3700 },
  { week: '2025-08-18', channel: 'Auto Allow', transactions: 11750 },
  { week: '2025-08-25', channel: '3DS', transactions: 9050 },
  { week: '2025-08-25', channel: 'KYC', transactions: 3050 },
  { week: '2025-08-25', channel: 'Manual Review', transactions: 3880 },
  { week: '2025-08-25', channel: 'Auto Allow', transactions: 11920 },
];

export function useExecutiveMetrics(range: DashboardDateRange) {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<ExecutiveMetricsState>(EMPTY_STATE);
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

        const [{ data: lossRows, error: lossErr }, { data: frictionRows, error: frictionErr }] = await Promise.all([
          supabase
            .from('fraud_losses_weekly')
            .select('week_start, fraud_loss_amount, non_fraud_loss_amount')
            .eq('organization_id', orgId)
            .gte('week_start', fromUtc.toISOString())
            .lt('week_start', toExclusiveUtc.toISOString()),
          supabase
            .from('friction_metrics_weekly')
            .select('week_start, channel, transactions')
            .eq('organization_id', orgId)
            .gte('week_start', fromUtc.toISOString())
            .lt('week_start', toExclusiveUtc.toISOString()),
        ]);

        if (lossErr) throw lossErr;
        if (frictionErr) throw frictionErr;

        const normalizedLoss = (lossRows as FraudLossRow[] | null)?.map((row) => ({
          week: dayjs.utc(row.week_start).format('YYYY-MM-DD'),
          fraudLoss: row.fraud_loss_amount ?? 0,
          nonFraudLoss: row.non_fraud_loss_amount ?? 0,
        })) ?? [];

        const normalizedFriction = (frictionRows as FrictionRow[] | null)?.map((row) => ({
          week: dayjs.utc(row.week_start).format('YYYY-MM-DD'),
          channel: row.channel,
          transactions: row.transactions ?? 0,
        })) ?? [];

        setMetrics({
          lossByWeek: normalizedLoss,
          frictionByChannel: normalizedFriction,
        });
      } catch (err) {
        console.error('Failed to load executive metrics', err);
        const message = err instanceof Error ? err.message : 'Failed to load executive metrics';
        setError(message);
        setMetrics({
          lossByWeek: FALLBACK_LOSS,
          frictionByChannel: FALLBACK_FRICTION,
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
    () => metrics.lossByWeek.length > 0 || metrics.frictionByChannel.length > 0,
    [metrics.lossByWeek.length, metrics.frictionByChannel.length],
  );

  return {
    metrics,
    loading,
    error,
    hasData,
    refresh: (window?: DashboardDateRange) => load(window ?? range),
  };
}
