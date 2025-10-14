import { makeAutoObservable, runInAction } from 'mobx';
import dayjs, { Dayjs } from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { supabase } from '@/lib/supabase';

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
type CatchesByDecision = { day: string; decision: string; catches: number };

type ExecutiveMetricsState = {
  metrics: {
    lossByWeek: LossByWeek[];
    catchesByDecision: CatchesByDecision[];
  };
  loading: boolean;
  error: string | null;
  rangeKey: string | null;
};

type TicketTrendRow = { week: string; channel: string; tickets: number };
type AlertRow = {
  id: string;
  title: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'resolved';
  created_at: string;
};

type OperationsMetricsState = {
  metrics: {
    ticketTrend: TicketTrendRow[];
    alerts: AlertRow[];
  };
  loading: boolean;
  error: string | null;
  rangeKey: string | null;
};

const EMPTY_RULE_TREND: RuleTrendSeries | null = null;
const EMPTY_LOSS: LossByWeek[] = [];
const EMPTY_DECISIONS: CatchesByDecision[] = [];
const EMPTY_TICKETS: TicketTrendRow[] = [];
const EMPTY_ALERTS: AlertRow[] = [];

const FALLBACK_LOSS: LossByWeek[] = [
  { week: '2025-07-14', fraudLoss: 12000, nonFraudLoss: 3500 },
  { week: '2025-07-21', fraudLoss: 18000, nonFraudLoss: 4200 },
  { week: '2025-07-28', fraudLoss: 9500, nonFraudLoss: 2800 },
  { week: '2025-08-04', fraudLoss: 16000, nonFraudLoss: 5000 },
  { week: '2025-08-11', fraudLoss: 21000, nonFraudLoss: 6100 },
  { week: '2025-08-18', fraudLoss: 15500, nonFraudLoss: 4400 },
  { week: '2025-08-25', fraudLoss: 19800, nonFraudLoss: 5200 },
];

const FALLBACK_DECISION_SERIES: CatchesByDecision[] = [
  { day: '2025-08-18', decision: 'allow', catches: 3100 },
  { day: '2025-08-18', decision: 'review', catches: 950 },
  { day: '2025-08-18', decision: 'deny', catches: 720 },
  { day: '2025-08-19', decision: 'allow', catches: 3250 },
  { day: '2025-08-19', decision: 'review', catches: 880 },
  { day: '2025-08-19', decision: 'deny', catches: 805 },
  { day: '2025-08-20', decision: 'allow', catches: 2980 },
  { day: '2025-08-20', decision: 'review', catches: 910 },
  { day: '2025-08-20', decision: 'deny', catches: 640 },
  { day: '2025-08-21', decision: 'allow', catches: 3340 },
  { day: '2025-08-21', decision: 'review', catches: 1025 },
  { day: '2025-08-21', decision: 'deny', catches: 770 },
];

const FALLBACK_TICKETS: TicketTrendRow[] = [
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

class OverviewStore {
  dateRange: DashboardDateRange = {
    from: dayjs().subtract(12, 'week'),
    to: dayjs(),
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
      catchesByDecision: EMPTY_DECISIONS,
    },
    loading: false,
    error: null,
    rangeKey: null,
  };

  operationsMetrics: OperationsMetricsState = {
    metrics: {
      ticketTrend: EMPTY_TICKETS,
      alerts: EMPTY_ALERTS,
    },
    loading: false,
    error: null,
    rangeKey: null,
  };

  private organizationId: string | null = null;
  private organizationUserId: string | null = null;

  constructor() {
    makeAutoObservable(this, {
      loadDashboardMetrics: false,
      loadExecutiveMetrics: false,
      loadOperationsMetrics: false,
      refreshAll: false,
    });
  }

  setDateRange(range: DashboardDateRange) {
    this.dateRange = range;
  }

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

  async loadDashboardMetrics(userId?: string) {
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

      const { data: rows, error } = await supabase
        .from('rules_metrics_hourly')
        .select('timestamp, catches, false_positives')
        .eq('organization_id', orgId)
        .gte('timestamp', fromLocal.utc().format('YYYY-MM-DD HH:mm:ss[+00]'))
        .lt('timestamp', toLocalExclusive.utc().format('YYYY-MM-DD HH:mm:ss[+00]'));

      if (error) throw error;

      const dailyMap = new Map<string, { catches: number; falsePositives: number }>();
      const daysBetween = Math.max(0, toLocalExclusive.diff(fromLocal, 'day'));
      for (let offset = 0; offset < daysBetween; offset += 1) {
        const day = fromLocal.add(offset, 'day');
        const keyDay = day.utc().format('YYYY-MM-DD');
        dailyMap.set(keyDay, { catches: 0, falsePositives: 0 });
      }

      (rows ?? []).forEach((row) => {
        const keyDay = dayjs.utc(row.timestamp).format('YYYY-MM-DD');
        const bucket = dailyMap.get(keyDay) ?? { catches: 0, falsePositives: 0 };
        bucket.catches += row.catches ?? 0;
        bucket.falsePositives += row.false_positives ?? 0;
        dailyMap.set(keyDay, bucket);
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

  async loadExecutiveMetrics(userId?: string) {
    const range = this.dateRange;
    const key = this.rangeKey(range);

    if (this.executiveMetrics.rangeKey === key && this.executiveMetrics.metrics.lossByWeek.length) {
      return;
    }

    if (!userId || !range.from || !range.to) {
      runInAction(() => {
        this.executiveMetrics.metrics.lossByWeek = EMPTY_LOSS;
        this.executiveMetrics.metrics.catchesByDecision = EMPTY_DECISIONS;
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
          .eq('is_deleted', false),
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

      const catchesMap = new Map<string, number>();
      (metricsRows ?? []).forEach((row) => {
        if (!row?.rule_id) return;
        const decision = decisionByRule.get(row.rule_id) ?? 'review';
        const day = dayjs.utc(row.timestamp).format('YYYY-MM-DD');
        const keyDecision = `${day}__${decision}`;
        const current = catchesMap.get(keyDecision) ?? 0;
        catchesMap.set(keyDecision, current + (row.catches ?? 0));
      });

      const catchesByDecision: CatchesByDecision[] = Array.from(catchesMap.entries()).map(([keyDecision, total]) => {
        const [day, decision] = keyDecision.split('__');
        return { day, decision, catches: total };
      });

      runInAction(() => {
        this.executiveMetrics.metrics.lossByWeek = lossByWeek.length ? lossByWeek : FALLBACK_LOSS;
        this.executiveMetrics.metrics.catchesByDecision = catchesByDecision.length ? catchesByDecision : FALLBACK_DECISION_SERIES;
        this.executiveMetrics.rangeKey = key;
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load executive metrics';
      runInAction(() => {
        this.executiveMetrics.error = message;
        this.executiveMetrics.metrics.lossByWeek = FALLBACK_LOSS;
        this.executiveMetrics.metrics.catchesByDecision = FALLBACK_DECISION_SERIES;
        this.executiveMetrics.rangeKey = null;
      });
    } finally {
      runInAction(() => {
        this.executiveMetrics.loading = false;
      });
    }
  }

  async loadOperationsMetrics(userId?: string) {
    const range = this.dateRange;
    const key = this.rangeKey(range);

    if (this.operationsMetrics.rangeKey === key && this.operationsMetrics.metrics.ticketTrend.length) {
      return;
    }

    if (!userId || !range.from || !range.to) {
      runInAction(() => {
        this.operationsMetrics.metrics.ticketTrend = EMPTY_TICKETS;
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

      const fromWeek = range.from.startOf('week');
      const toWeekExclusive = range.to.add(1, 'week').startOf('week');

      const [{ data: ticketRows, error: ticketErr }, { data: alertRows, error: alertErr }] = await Promise.all([
        supabase
          .from('support_tickets_weekly')
          .select('week_start, channel, tickets')
          .eq('organization_id', orgId)
          .gte('week_start', fromWeek.utc().toISOString())
          .lt('week_start', toWeekExclusive.utc().toISOString()),
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

      const normalizedTickets: TicketTrendRow[] = (ticketRows ?? []).map((row) => ({
        week: dayjs.utc(row.week_start).format('YYYY-MM-DD'),
        channel: row.channel ?? 'Unknown',
        tickets: row.tickets ?? 0,
      }));

      const normalizedAlerts: AlertRow[] = (alertRows ?? []).map((row) => ({
        id: row.id,
        title: row.title,
        severity: row.severity,
        status: row.status,
        created_at: row.created_at,
      }));

      runInAction(() => {
        this.operationsMetrics.metrics.ticketTrend = normalizedTickets.length ? normalizedTickets : FALLBACK_TICKETS;
        this.operationsMetrics.metrics.alerts = normalizedAlerts.length ? normalizedAlerts : FALLBACK_ALERTS;
        this.operationsMetrics.rangeKey = key;
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load operations metrics';
      runInAction(() => {
        this.operationsMetrics.error = message;
        this.operationsMetrics.metrics.ticketTrend = FALLBACK_TICKETS;
        this.operationsMetrics.metrics.alerts = FALLBACK_ALERTS;
        this.operationsMetrics.rangeKey = null;
      });
    } finally {
      runInAction(() => {
        this.operationsMetrics.loading = false;
      });
    }
  }

  async refreshAll(userId?: string) {
    await Promise.all([
      this.loadDashboardMetrics(userId),
      this.loadExecutiveMetrics(userId),
      this.loadOperationsMetrics(userId),
    ]);
  }
}

export const overviewStore = new OverviewStore();
