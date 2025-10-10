import { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs, { type Dayjs } from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

dayjs.extend(utc);

type RuleTrendSeries = {
  labels: string[];
  catches: number[];
  falsePositives: number[];
};

type DashboardMetricsState = {
  ruleTrend: RuleTrendSeries | null;
};

const EMPTY_STATE: DashboardMetricsState = {
  ruleTrend: null,
};

const formatPgTimestamp = (value: Dayjs) => value.utc().format('YYYY-MM-DD HH:mm:ss[+00]');

export type DashboardDateRange = { from: Dayjs | null; to: Dayjs | null };

export function useDashboardMetrics(range: DashboardDateRange) {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetricsState>(EMPTY_STATE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (window: DashboardDateRange) => {
      if (!user?.id) {
        setLoading(false);
        setMetrics(EMPTY_STATE);
        return;
      }

      if (!window.from || !window.to) {
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

        const from = window.from.utc().startOf('day');
        const toExclusive = window.to.utc().add(1, 'day').startOf('day');

        const { data: rows, error: metricsErr } = await supabase
          .from('rules_metrics_hourly')
          .select('timestamp, catches, false_positives')
          .eq('organization_id', orgId)
          .gte('timestamp', formatPgTimestamp(from))
          .lt('timestamp', formatPgTimestamp(toExclusive));

        if (metricsErr) throw metricsErr;

        const daysBetween = Math.max(0, toExclusive.diff(from, 'day'));
        const dailyMap = new Map<string, { catches: number; falsePositives: number }>();

        // seed map to ensure stable chart coverage across selected range
        for (let offset = 0; offset <= daysBetween; offset += 1) {
          const day = from.add(offset, 'day');
          const key = day.utc().format('YYYY-MM-DD');
          if (!dailyMap.has(key)) {
            dailyMap.set(key, { catches: 0, falsePositives: 0 });
          }
        }

        (rows ?? []).forEach((row) => {
          const key = dayjs.utc(row.timestamp).format('YYYY-MM-DD');
          const bucket = dailyMap.get(key) ?? { catches: 0, falsePositives: 0 };
          bucket.catches += row.catches ?? 0;
          bucket.falsePositives += row.false_positives ?? 0;
          dailyMap.set(key, bucket);
        });

        const sortedKeys = Array.from(dailyMap.keys()).sort();

        const trend: RuleTrendSeries = {
          labels: sortedKeys.map((key) => dayjs.utc(key).format('MMM D')),
          catches: sortedKeys.map((key) => dailyMap.get(key)?.catches ?? 0),
          falsePositives: sortedKeys.map((key) => dailyMap.get(key)?.falsePositives ?? 0),
        };

        setMetrics({ ruleTrend: trend });
      } catch (err) {
        console.error('Failed to load dashboard metrics', err);
        const message = err instanceof Error ? err.message : 'Failed to load dashboard metrics';
        setError(message);
        setMetrics(EMPTY_STATE);
      } finally {
        setLoading(false);
      }
    },
    [user?.id],
  );

  const fromKey = range.from?.valueOf() ?? null;
  const toKey = range.to?.valueOf() ?? null;

  useEffect(() => {
    void load(range);
  }, [load, range, fromKey, toKey]);

  const hasData = useMemo(() => Boolean(metrics.ruleTrend && metrics.ruleTrend.labels.length > 0), [metrics.ruleTrend]);

  const refresh = useCallback(
    (window?: DashboardDateRange) => load(window ?? range),
    [load, range],
  );

  return { metrics, loading, error, refresh, hasData };
}

export type DashboardMetricsHook = ReturnType<typeof useDashboardMetrics>;
