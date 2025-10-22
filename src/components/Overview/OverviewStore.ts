import { makeAutoObservable, runInAction, observable } from 'mobx';
import dayjs, { Dayjs } from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

dayjs.extend(utc);

export type DashboardDateRange = { from: Dayjs | null; to: Dayjs | null };

type RuleTrendSeries = {
  labels: string[];
  catches: number[];
  falsePositives: number[];
};

type DashboardMetricsState = {
  metrics: { ruleTrend: RuleTrendSeries | null };
  loading: boolean;
  error: string | null;
  rangeKey: string | null;
};

type LossByWeek = { week: string; fraudLoss: number; nonFraudLoss: number };
type DecisionWeeklyRow = { week: string; decision: string; catches: number; percentage: number };

type ExecutiveMetricsState = {
  metrics: {
    lossByWeek: LossByWeek[];
    decisionByWeek: DecisionWeeklyRow[];
  };
  loading: boolean;
  error: string | null;
  rangeKey: string | null;
};

type AlertRow = {
  id: string;
  title: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'resolved';
  created_at: string;
};

type OperationsMetricsState = {
  metrics: {
    decisionByWeek: DecisionWeeklyRow[];
    alerts: AlertRow[];
  };
  loading: boolean;
  error: string | null;
  rangeKey: string | null;
};

const EMPTY_RULE_TREND: RuleTrendSeries | null = null;
const EMPTY_LOSS: LossByWeek[] = [];
const EMPTY_DECISIONS: DecisionWeeklyRow[] = [];
const EMPTY_ALERTS: AlertRow[] = [];
const DECISIONS = ['allow', 'review', 'deny'] as const;

const generateFallbackDecisionSeries = (range: DashboardDateRange): Map<string, Map<string, number>> => {
  const fallbackMap = new Map<string, Map<string, number>>();
  if (!range.from || !range.to) return fallbackMap;

  const start = range.from.startOf('week');
  const end = range.to.startOf('week');
  const weeks: string[] = [];
  let cursor = start.clone();
  while (cursor.isBefore(end) || cursor.isSame(end)) {
    weeks.push(cursor.format('YYYY-MM-DD'));
    cursor = cursor.add(1, 'week');
  }

  const sampleShares: Record<string, number> = { allow: 65, review: 22, deny: 13 };

  weeks.forEach((week) => {
    const decisionMap = new Map<string, number>();
    DECISIONS.forEach((decision) => {
      const base = sampleShares[decision] ?? 5;
      // Scale by week index for mild variation.
      const index = weeks.indexOf(week);
      const fluctuation = ((index % 3) - 1) * 2; // -2, 0, +2 pattern
      decisionMap.set(decision, Math.max(0, base + fluctuation));
    });
    fallbackMap.set(week, decisionMap);
  });

  return fallbackMap;
};

const ensureWeeklyDecisionSeries = (
  range: DashboardDateRange,
  source: Map<string, Map<string, number>>,
): DecisionWeeklyRow[] => {
  if (!range.from || !range.to) return [];

  const sourceToUse = source.size > 0 ? source : generateFallbackDecisionSeries(range);

  const start = range.from.startOf('week');
  const end = range.to.startOf('week');
  const weeks: string[] = [];
  let cursor = start.clone();
  while (cursor.isBefore(end) || cursor.isSame(end)) {
    weeks.push(cursor.format('YYYY-MM-DD'));
    cursor = cursor.add(1, 'week');
  }

  const series: DecisionWeeklyRow[] = [];
  weeks.forEach((week) => {
    const decisionMap = sourceToUse.get(week) ?? new Map<string, number>();
    const totals: Record<string, number> = {};
    let weekTotal = 0;

    DECISIONS.forEach((decision) => {
      const count = decisionMap.get(decision) ?? 0;
      totals[decision] = count;
      weekTotal += count;
    });

    DECISIONS.forEach((decision) => {
      const catches = totals[decision] ?? 0;
      const percentage = weekTotal > 0 ? Math.round(((catches / weekTotal) * 100) * 10) / 10 : 0;
      series.push({ week, decision, catches, percentage });
    });
  });

  return series;
};

// Generate dynamic sample data based on date range
const generateFallbackLoss = (range: DashboardDateRange): LossByWeek[] => {
  if (!range.from || !range.to) return [];
  
  const weeks: LossByWeek[] = [];
  let currentWeek = range.from.startOf('week');
  const endWeek = range.to.startOf('week');
  
  // Generate weekly data points with realistic variation
  while (currentWeek.isBefore(endWeek) || currentWeek.isSame(endWeek)) {
    const weekKey = currentWeek.format('YYYY-MM-DD');
    // Generate pseudo-random but consistent values based on week
    const seed = currentWeek.valueOf();
    const fraudBase = 15000;
    const fraudVariation = ((seed % 10000) / 10000) * 8000 - 4000;
    const nonFraudBase = 4500;
    const nonFraudVariation = ((seed % 5000) / 5000) * 2000 - 1000;
    
    weeks.push({
      week: weekKey,
      fraudLoss: Math.round(fraudBase + fraudVariation),
      nonFraudLoss: Math.round(nonFraudBase + nonFraudVariation),
    });
    
    currentWeek = currentWeek.add(1, 'week');
  }
  
  return weeks;
};


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

class OverviewStore {
  dateRange: DashboardDateRange = {
    from: dayjs().subtract(1, 'month').startOf('day'),
    to: dayjs().endOf('day'),
  };

  dashboardMetrics: DashboardMetricsState = {
    metrics: { ruleTrend: EMPTY_RULE_TREND },
    loading: false,
    error: null,
    rangeKey: null,
  };

  executiveMetrics: ExecutiveMetricsState = {
    metrics: {
      lossByWeek: EMPTY_LOSS,
      decisionByWeek: EMPTY_DECISIONS,
    },
    loading: false,
    error: null,
    rangeKey: null,
  };

  operationsMetrics: OperationsMetricsState = {
    metrics: {
      decisionByWeek: EMPTY_DECISIONS,
      alerts: EMPTY_ALERTS,
    },
    loading: false,
    error: null,
    rangeKey: null,
  };

  private organizationId: string | null = null;
  private organizationUserId: string | null = null;
  private realtimeChannels: RealtimeChannel[] = [];

  constructor() {
    makeAutoObservable(this, {
      dateRange: observable.deep,
      dashboardMetrics: observable.deep,
      executiveMetrics: observable.deep,
      operationsMetrics: observable.deep,
    });
  }

  setDateRange = (range: DashboardDateRange) => {
    runInAction(() => {
      // Create a new object to ensure MobX detects the change
      this.dateRange = {
        from: range.from ? range.from.clone() : null,
        to: range.to ? range.to.clone() : null,
      };
    });
  };

  private rangeKey(range: DashboardDateRange) {
    return `${range.from?.valueOf() ?? 'null'}-${range.to?.valueOf() ?? 'null'}`;
  }

  private async ensureOrganization(userId?: string) {
    if (!userId) return null;
    if (this.organizationId && this.organizationUserId === userId) {
      return this.organizationId;
    }

    const { data, error } = await supabase
      .from('organizations')
      .select('organization_id')
      .eq('user_id', userId)
      .single();

    if (error) throw error;
    this.organizationId = data?.organization_id ?? null;
    this.organizationUserId = userId;
    return this.organizationId;
  }

  loadDashboardMetrics = async (userId?: string) => {
    const range = this.dateRange;
    const key = this.rangeKey(range);

    if (this.dashboardMetrics.rangeKey === key && this.dashboardMetrics.metrics.ruleTrend) {
      return;
    }

    if (!userId || !range.from || !range.to) {
      runInAction(() => {
        this.dashboardMetrics = {
          metrics: { ruleTrend: EMPTY_RULE_TREND },
          loading: false,
          error: null,
          rangeKey: null,
        };
      });
      return;
    }

    runInAction(() => {
      this.dashboardMetrics.loading = true;
      this.dashboardMetrics.error = null;
    });

    try {
      const orgId = await this.ensureOrganization(userId);
      if (!orgId) throw new Error('Organization not found');

      const fromLocal = range.from.startOf('day');
      const toLocalExclusive = range.to.add(1, 'day').startOf('day');

      // Use database function for server-side aggregation (10-50x faster)
      const { data: rows, error } = await supabase.rpc('get_daily_rule_metrics', {
        p_organization_id: orgId,
        p_start_date: fromLocal.utc().toISOString(),
        p_end_date: toLocalExclusive.utc().toISOString(),
      });

      if (error) throw error;

      // Initialize map with all days in range (to show zeros for missing data)
      const dailyMap = new Map<string, { catches: number; falsePositives: number }>();
      const daysBetween = Math.max(0, toLocalExclusive.diff(fromLocal, 'day'));
      for (let offset = 0; offset < daysBetween; offset += 1) {
        const day = fromLocal.add(offset, 'day');
        const keyDay = day.format('YYYY-MM-DD');
        dailyMap.set(keyDay, { catches: 0, falsePositives: 0 });
      }

      // Populate with actual data from database function
      (rows ?? []).forEach((row: { day: string; catches: number; false_positives: number }) => {
        const keyDay = dayjs(row.day).format('YYYY-MM-DD');
        dailyMap.set(keyDay, {
          catches: Number(row.catches) || 0,
          falsePositives: Number(row.false_positives) || 0,
        });
      });

      const sortedKeys = Array.from(dailyMap.keys()).sort();
      const trend: RuleTrendSeries = {
        labels: sortedKeys.map((label) => dayjs(label).format('MMM D')),
        catches: sortedKeys.map((label) => dailyMap.get(label)?.catches ?? 0),
        falsePositives: sortedKeys.map((label) => dailyMap.get(label)?.falsePositives ?? 0),
      };

      runInAction(() => {
        this.dashboardMetrics.metrics.ruleTrend = trend;
        this.dashboardMetrics.rangeKey = key;
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load dashboard metrics';
      runInAction(() => {
        this.dashboardMetrics.error = message;
        this.dashboardMetrics.metrics.ruleTrend = EMPTY_RULE_TREND;
        this.dashboardMetrics.rangeKey = null;
      });
    } finally {
      runInAction(() => {
        this.dashboardMetrics.loading = false;
      });
    }
  }

  loadExecutiveMetrics = async (userId?: string) => {
    const range = this.dateRange;
    const key = this.rangeKey(range);

    if (this.executiveMetrics.rangeKey === key && this.executiveMetrics.metrics.lossByWeek.length) {
      return;
    }

    if (!userId || !range.from || !range.to) {
      runInAction(() => {
        this.executiveMetrics.metrics.lossByWeek = EMPTY_LOSS;
        this.executiveMetrics.metrics.decisionByWeek = EMPTY_DECISIONS;
        this.executiveMetrics.rangeKey = null;
      });
      return;
    }

    runInAction(() => {
      this.executiveMetrics.loading = true;
      this.executiveMetrics.error = null;
    });

    try {
      const orgId = await this.ensureOrganization(userId);
      if (!orgId) throw new Error('Organization not found');

      const fromWeek = range.from.startOf('week');
      const toWeekExclusive = range.to.add(1, 'week').startOf('week');

      const [{ data: lossRows, error: lossErr }, { data: rulesRows, error: rulesErr }, { data: metricsRows, error: metricsErr }] = await Promise.all([
        supabase
          .from('fraud_losses_weekly')
          .select('week_start, fraud_loss_amount, non_fraud_loss_amount')
          .eq('organization_id', orgId)
          .gte('week_start', fromWeek.utc().toISOString())
          .lt('week_start', toWeekExclusive.utc().toISOString()),
        supabase
          .from('rules')
          .select('id, decision')
          .eq('organization_id', orgId)
          .eq('is_deleted', false)
          .eq('status', 'active'),
        supabase
          .from('rules_metrics_hourly')
          .select('rule_id, catches, timestamp')
          .eq('organization_id', orgId)
          .gte('timestamp', range.from.startOf('day').utc().format('YYYY-MM-DD HH:mm:ss[+00]'))
          .lt('timestamp', range.to.add(1, 'day').startOf('day').utc().format('YYYY-MM-DD HH:mm:ss[+00]')),
      ]);

      if (lossErr) throw lossErr;
      if (rulesErr) throw rulesErr;
      if (metricsErr) throw metricsErr;

      const lossByWeek: LossByWeek[] = (lossRows ?? []).map((row) => ({
        week: dayjs.utc(row.week_start).format('YYYY-MM-DD'),
        fraudLoss: row.fraud_loss_amount ?? 0,
        nonFraudLoss: row.non_fraud_loss_amount ?? 0,
      }));

      const decisionByRule = new Map<string, string>();
      (rulesRows ?? []).forEach((rule) => {
        if (!rule?.id) return;
        const decision = (rule.decision ?? 'review').toLowerCase();
        decisionByRule.set(rule.id, ['allow', 'deny', 'review'].includes(decision) ? decision : 'review');
      });

      const weeklyDecisionTotals = new Map<string, Map<string, number>>();
      (metricsRows ?? []).forEach((row) => {
        if (!row?.rule_id) return;
        const decision = decisionByRule.get(row.rule_id) ?? 'review';
        const weekKey = dayjs.utc(row.timestamp).startOf('week').format('YYYY-MM-DD');
        const weekMap = weeklyDecisionTotals.get(weekKey) ?? new Map<string, number>();
        weekMap.set(decision, (weekMap.get(decision) ?? 0) + (row.catches ?? 0));
        weeklyDecisionTotals.set(weekKey, weekMap);
      });

      const decisionByWeek = ensureWeeklyDecisionSeries(range, weeklyDecisionTotals);
      const resolvedDecisionSeries = decisionByWeek.length ? decisionByWeek : ensureWeeklyDecisionSeries(range, new Map());

      runInAction(() => {
        this.executiveMetrics.metrics.lossByWeek = lossByWeek.length ? lossByWeek : generateFallbackLoss(range);
        this.executiveMetrics.metrics.decisionByWeek = resolvedDecisionSeries;
        this.executiveMetrics.rangeKey = key;
        this.operationsMetrics.metrics.decisionByWeek = resolvedDecisionSeries;
        this.operationsMetrics.rangeKey = key;
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load executive metrics';
      runInAction(() => {
        this.executiveMetrics.error = message;
        this.executiveMetrics.metrics.lossByWeek = generateFallbackLoss(range);
        this.executiveMetrics.metrics.decisionByWeek = ensureWeeklyDecisionSeries(range, new Map());
        this.executiveMetrics.rangeKey = null;
        this.operationsMetrics.metrics.decisionByWeek = ensureWeeklyDecisionSeries(range, new Map());
        this.operationsMetrics.rangeKey = null;
      });
    } finally {
      runInAction(() => {
        this.executiveMetrics.loading = false;
      });
    }
  }

  loadOperationsMetrics = async (userId?: string) => {
    const range = this.dateRange;
    const key = this.rangeKey(range);

    if (!userId || !range.from || !range.to) {
      runInAction(() => {
        this.operationsMetrics.metrics.decisionByWeek = ensureWeeklyDecisionSeries(range, new Map());
        this.operationsMetrics.metrics.alerts = EMPTY_ALERTS;
        this.operationsMetrics.rangeKey = null;
      });
      return;
    }

    runInAction(() => {
      this.operationsMetrics.loading = true;
      this.operationsMetrics.error = null;
    });

    try {
      const orgId = await this.ensureOrganization(userId);
      if (!orgId) throw new Error('Organization not found');

      const { data: alertRows, error: alertErr } = await supabase
        .from('alerts')
        .select('id, title, severity, status, created_at')
        .eq('organization_id', orgId)
        .in('status', ['open', 'in_progress'])
        .order('created_at', { ascending: false })
        .limit(10);

      if (alertErr) throw alertErr;

      const normalizedAlerts: AlertRow[] = (alertRows ?? []).map((row) => ({
        id: row.id,
        title: row.title,
        severity: row.severity,
        status: row.status,
        created_at: row.created_at,
      }));

      runInAction(() => {
        this.operationsMetrics.metrics.decisionByWeek = this.executiveMetrics.metrics.decisionByWeek.length
          ? this.executiveMetrics.metrics.decisionByWeek
          : ensureWeeklyDecisionSeries(range, new Map());
        this.operationsMetrics.metrics.alerts = normalizedAlerts.length ? normalizedAlerts : FALLBACK_ALERTS;
        this.operationsMetrics.rangeKey = key;
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load operations metrics';
      runInAction(() => {
        this.operationsMetrics.error = message;
        this.operationsMetrics.metrics.decisionByWeek = ensureWeeklyDecisionSeries(range, new Map());
        this.operationsMetrics.metrics.alerts = FALLBACK_ALERTS;
        this.operationsMetrics.rangeKey = null;
      });
    } finally {
      runInAction(() => {
        this.operationsMetrics.loading = false;
      });
    }
  }

  refreshAll = async (userId?: string) => {
    await Promise.all([
      this.loadDashboardMetrics(userId),
      this.loadExecutiveMetrics(userId),
      this.loadOperationsMetrics(userId),
    ]);
  }

  setupRealtimeSubscriptions = async (userId?: string) => {
    // Clean up existing subscriptions
    this.cleanupRealtimeSubscriptions();

    if (!userId) return;

    try {
      const orgId = await this.ensureOrganization(userId);
      if (!orgId) return;

      // Subscribe to rules_metrics_hourly changes
      const metricsChannel = supabase
        .channel('overview-metrics-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'rules_metrics_hourly',
            filter: `organization_id=eq.${orgId}`,
          },
          () => {
            void this.loadDashboardMetrics(userId);
          }
        )
        .subscribe();

      // Subscribe to fraud_losses_weekly changes
      const lossesChannel = supabase
        .channel('overview-losses-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'fraud_losses_weekly',
            filter: `organization_id=eq.${orgId}`,
          },
          () => {
            void this.loadExecutiveMetrics(userId);
          }
        )
        .subscribe();

      // Subscribe to alerts changes
      const alertsChannel = supabase
        .channel('overview-alerts-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'alerts',
            filter: `organization_id=eq.${orgId}`,
          },
          () => {
            void this.loadOperationsMetrics(userId);
          }
        )
        .subscribe();

      this.realtimeChannels = [metricsChannel, lossesChannel, alertsChannel];
    } catch (error) {
      console.error('Failed to setup real-time subscriptions:', error);
    }
  }

  cleanupRealtimeSubscriptions = () => {
    if (this.realtimeChannels.length > 0) {
      this.realtimeChannels.forEach((channel) => {
        void supabase.removeChannel(channel);
      });
      this.realtimeChannels = [];
    }
  }
}

export const overviewStore = new OverviewStore();
