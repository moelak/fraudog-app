import { useEffect, useMemo, useState, type ComponentType, type ReactNode, type SVGProps } from 'react';
import { observer } from 'mobx-react-lite';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  type ChartData,
  type ChartOptions,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { Responsive, WidthProvider, type Layouts } from 'react-grid-layout';
import dayjs, { type Dayjs } from 'dayjs';
import utc from 'dayjs/plugin/utc';
import {
  ShieldCheckIcon,
  CreditCardIcon,
  EyeIcon,
  ArrowsPointingOutIcon,
} from '@heroicons/react/24/outline';
import { useRules } from '@/hooks/useRules';
import { chargebacksStore } from '@/components/Chargebacks/ChargebacksStore';
import { monitoringStore } from '@/components/Monitoring/MonitoringStore';
import { useDashboardMetrics, type DashboardDateRange } from '@/hooks/useDashboardMetrics';
import DateRangeFields from '@/components/DateRangeFields/DateRangeFields';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

dayjs.extend(utc);

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

const ResponsiveGridLayout = WidthProvider(Responsive);

const DASHBOARD_LAYOUT_KEY = 'menu-dashboard-layout-v2';

const DEFAULT_LAYOUTS: Layouts = {
  lg: [
    { i: 'summary-rules', x: 0, y: 0, w: 4, h: 8, minW: 3, minH: 6 },
    { i: 'summary-chargebacks', x: 4, y: 0, w: 4, h: 8, minW: 3, minH: 6 },
    { i: 'summary-monitoring', x: 8, y: 0, w: 4, h: 8, minW: 3, minH: 6 },
    { i: 'rule-trend', x: 0, y: 8, w: 6, h: 12, minW: 4, minH: 10 },
    { i: 'rule-severity', x: 6, y: 8, w: 3, h: 12, minW: 3, minH: 8 },
    { i: 'chargebacks-status', x: 9, y: 8, w: 3, h: 12, minW: 3, minH: 8 },
    { i: 'monitoring-alerts', x: 0, y: 20, w: 6, h: 12, minW: 4, minH: 10 },
    { i: 'alerts-list', x: 6, y: 20, w: 3, h: 12, minW: 3, minH: 10 },
    { i: 'chargebacks-list', x: 9, y: 20, w: 3, h: 12, minW: 3, minH: 10 },
  ],
  md: [
    { i: 'summary-rules', x: 0, y: 0, w: 5, h: 8, minW: 4, minH: 6 },
    { i: 'summary-chargebacks', x: 5, y: 0, w: 5, h: 8, minW: 4, minH: 6 },
    { i: 'summary-monitoring', x: 0, y: 8, w: 10, h: 8, minW: 5, minH: 6 },
    { i: 'rule-trend', x: 0, y: 16, w: 10, h: 12, minW: 6, minH: 10 },
    { i: 'rule-severity', x: 0, y: 28, w: 5, h: 12, minW: 4, minH: 8 },
    { i: 'chargebacks-status', x: 5, y: 28, w: 5, h: 12, minW: 4, minH: 8 },
    { i: 'monitoring-alerts', x: 0, y: 40, w: 10, h: 12, minW: 6, minH: 10 },
    { i: 'alerts-list', x: 0, y: 52, w: 5, h: 12, minW: 4, minH: 10 },
    { i: 'chargebacks-list', x: 5, y: 52, w: 5, h: 12, minW: 4, minH: 10 },
  ],
  sm: [
    { i: 'summary-rules', x: 0, y: 0, w: 6, h: 8 },
    { i: 'summary-chargebacks', x: 0, y: 8, w: 6, h: 8 },
    { i: 'summary-monitoring', x: 0, y: 16, w: 6, h: 8 },
    { i: 'rule-trend', x: 0, y: 24, w: 6, h: 12 },
    { i: 'rule-severity', x: 0, y: 36, w: 3, h: 12, minW: 3 },
    { i: 'chargebacks-status', x: 3, y: 36, w: 3, h: 12, minW: 3 },
    { i: 'monitoring-alerts', x: 0, y: 48, w: 6, h: 12 },
    { i: 'alerts-list', x: 0, y: 60, w: 6, h: 12 },
    { i: 'chargebacks-list', x: 0, y: 72, w: 6, h: 12 },
  ],
  xs: [
    { i: 'summary-rules', x: 0, y: 0, w: 4, h: 9 },
    { i: 'summary-chargebacks', x: 0, y: 9, w: 4, h: 9 },
    { i: 'summary-monitoring', x: 0, y: 18, w: 4, h: 9 },
    { i: 'rule-trend', x: 0, y: 27, w: 4, h: 12 },
    { i: 'rule-severity', x: 0, y: 39, w: 4, h: 10 },
    { i: 'chargebacks-status', x: 0, y: 49, w: 4, h: 10 },
    { i: 'monitoring-alerts', x: 0, y: 59, w: 4, h: 12 },
    { i: 'alerts-list', x: 0, y: 71, w: 4, h: 12 },
    { i: 'chargebacks-list', x: 0, y: 83, w: 4, h: 12 },
  ],
  xxs: [
    { i: 'summary-rules', x: 0, y: 0, w: 2, h: 10 },
    { i: 'summary-chargebacks', x: 0, y: 10, w: 2, h: 10 },
    { i: 'summary-monitoring', x: 0, y: 20, w: 2, h: 10 },
    { i: 'rule-trend', x: 0, y: 30, w: 2, h: 12 },
    { i: 'rule-severity', x: 0, y: 42, w: 2, h: 10 },
    { i: 'chargebacks-status', x: 0, y: 52, w: 2, h: 10 },
    { i: 'monitoring-alerts', x: 0, y: 62, w: 2, h: 12 },
    { i: 'alerts-list', x: 0, y: 74, w: 2, h: 12 },
    { i: 'chargebacks-list', x: 0, y: 86, w: 2, h: 12 },
  ],
};

const numberFormatter = new Intl.NumberFormat('en-US');
const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

type Severity = 'low' | 'medium' | 'high' | 'critical';

type DashboardWidget = {
  id: string;
  title: string;
  description?: string;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  content: ReactNode;
};

const severityOrder: Severity[] = ['critical', 'high', 'medium', 'low'];
const severityColors: Record<Severity, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#facc15',
  low: '#22c55e',
};

const LoadingState = () => (
  <div className='flex h-full items-center justify-center text-sm text-gray-500'>Loading…</div>
);

const EmptyState = ({ message }: { message: string }) => (
  <div className='flex h-full items-center justify-center px-6 text-center text-sm text-gray-400'>{message}</div>
);

const getInitialLayouts = (): Layouts => {
  if (typeof window === 'undefined') {
    return DEFAULT_LAYOUTS;
  }

  const saved = window.localStorage.getItem(DASHBOARD_LAYOUT_KEY);
  if (!saved) return DEFAULT_LAYOUTS;

  try {
    const parsed = JSON.parse(saved) as Layouts;
    return { ...DEFAULT_LAYOUTS, ...parsed };
  } catch (error) {
    console.warn('Failed to parse stored dashboard layout, using defaults.', error);
    return DEFAULT_LAYOUTS;
  }
};

const Overview = observer(() => {
  const {
    rules,
    activeRules,
    needsAttentionRules,
    loading: rulesLoading,
    fetchRules,
  } = useRules();

  const chargebackSnapshot = chargebacksStore.chargebacks.slice();
  const monitoringAlerts = monitoringStore.activeAlerts.slice();
  const monitoringMetrics = monitoringStore.systemMetrics.slice();

  const [dateRange, setDateRange] = useState<DashboardDateRange>(() => ({
    from: dayjs().subtract(6, 'day'),
    to: dayjs(),
  }));

  const {
    metrics: asyncMetrics,
    loading: metricsLoading,
    error: metricsError,
    refresh: refreshMetrics,
    hasData: hasTrendData,
  } = useDashboardMetrics(dateRange);

  const [layouts, setLayouts] = useState<Layouts>(() => getInitialLayouts());
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(mediaQuery.matches);
    update();

    mediaQuery.addEventListener('change', update);
    return () => mediaQuery.removeEventListener('change', update);
  }, []);

  const handleLayoutChange = (_current: unknown, allLayouts: Layouts) => {
    setLayouts(allLayouts);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(DASHBOARD_LAYOUT_KEY, JSON.stringify(allLayouts));
    }
  };

  const handleRangeChange = (range: { from: Dayjs | null; to: Dayjs | null }) => {
    setDateRange(range);
  };

  const ruleSummary = useMemo(() => {
    const severityCounts = { high: 0, medium: 0, low: 0 };
    let catches = 0;
    let falsePositives = 0;
    let chargebacks = 0;
    let effectivenessSum = 0;
    let effectivenessCount = 0;

    rules.forEach((rule) => {
      severityCounts[rule.severity] += 1;
      catches += rule.catches ?? 0;
      falsePositives += rule.false_positives ?? 0;
      chargebacks += rule.chargebacks ?? 0;
      if (typeof rule.effectiveness === 'number') {
        effectivenessSum += rule.effectiveness;
        effectivenessCount += 1;
      }
    });

    const avgEffectiveness = effectivenessCount === 0 ? 0 : effectivenessSum / effectivenessCount;

    return {
      total: rules.length,
      active: activeRules.length,
      severity: severityCounts,
      catches,
      falsePositives,
      chargebacks,
      avgEffectiveness,
    };
  }, [rules, activeRules]);

  const chargebackSummary = useMemo(() => {
    const byStatus: Record<string, number> = {
      pending: 0,
      disputed: 0,
      won: 0,
      lost: 0,
    };
    let totalAmount = 0;

    const byDate = new Map<string, number>();

    chargebackSnapshot.forEach((cb) => {
      byStatus[cb.status] = (byStatus[cb.status] ?? 0) + 1;
      totalAmount += cb.amount;
      const day = cb.date;
      byDate.set(day, (byDate.get(day) ?? 0) + 1);
    });

    const trendLabels = Array.from(byDate.keys()).sort();
    const trendValues = trendLabels.map((label) => byDate.get(label) ?? 0);

    return {
      total: chargebackSnapshot.length,
      totalAmount,
      byStatus,
      trendLabels,
      trendValues,
    };
  }, [chargebackSnapshot]);

  const monitoringSummary = useMemo(() => {
    const severityCounts: Record<Severity, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    let highPriorityAlerts = 0;
    let acknowledged = 0;

    monitoringAlerts.forEach((alert) => {
      severityCounts[alert.severity] += 1;
      if (alert.severity === 'high' || alert.severity === 'critical') {
        highPriorityAlerts += 1;
      }
      if (alert.acknowledged) {
        acknowledged += 1;
      }
    });

    const getMetricValue = (name: string) =>
      monitoringMetrics.find((metric) => metric.name === name)?.value ?? '—';

    return {
      totalAlerts: monitoringAlerts.length,
      highPriorityAlerts,
      acknowledged,
      severityCounts,
      uptime: getMetricValue('System Uptime'),
      responseTime: getMetricValue('Response Time'),
      errorRate: getMetricValue('Error Rate'),
      cpuUsage: getMetricValue('CPU Usage'),
    };
  }, [monitoringAlerts, monitoringMetrics]);

  const ruleSeverityData = useMemo<ChartData<'bar'>>(
    () => ({
      labels: ['High', 'Medium', 'Low'],
      datasets: [
        {
          label: 'Rules',
          data: [
            ruleSummary.severity.high,
            ruleSummary.severity.medium,
            ruleSummary.severity.low,
          ],
          backgroundColor: ['#ef4444', '#f97316', '#22c55e'],
          borderRadius: 8,
        },
      ],
    }),
    [ruleSummary.severity.high, ruleSummary.severity.medium, ruleSummary.severity.low],
  );

  const ruleSeverityOptions = useMemo<ChartOptions<'bar'>>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(255,255,255,0.95)',
          borderColor: '#e2e8f0',
          borderWidth: 1,
          titleColor: '#0f172a',
          bodyColor: '#1e293b',
          padding: 12,
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#475569' },
        },
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(148, 163, 184, 0.2)' },
          ticks: { color: '#475569' },
        },
      },
    }),
    [],
  );

  const chargebackStatusData = useMemo<ChartData<'doughnut'>>(
    () => ({
      labels: ['Pending', 'Disputed', 'Won', 'Lost'],
      datasets: [
        {
          label: 'Chargebacks',
          data: [
            chargebackSummary.byStatus.pending ?? 0,
            chargebackSummary.byStatus.disputed ?? 0,
            chargebackSummary.byStatus.won ?? 0,
            chargebackSummary.byStatus.lost ?? 0,
          ],
          backgroundColor: ['#facc15', '#f97316', '#22c55e', '#ef4444'],
          borderColor: '#ffffff',
          borderWidth: 2,
        },
      ],
    }),
    [
      chargebackSummary.byStatus.pending,
      chargebackSummary.byStatus.disputed,
      chargebackSummary.byStatus.won,
      chargebackSummary.byStatus.lost,
    ],
  );

  const chargebackStatusOptions = useMemo<ChartOptions<'doughnut'>>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { usePointStyle: true },
        },
        tooltip: {
          backgroundColor: 'rgba(255,255,255,0.95)',
          borderColor: '#e2e8f0',
          borderWidth: 1,
          titleColor: '#0f172a',
          bodyColor: '#1e293b',
          padding: 12,
        },
      },
    }),
    [],
  );

  const monitoringAlertData = useMemo<ChartData<'bar'>>(
    () => ({
      labels: severityOrder.map((s) => s.toUpperCase()),
      datasets: [
        {
          label: 'Active Alerts',
          data: severityOrder.map((s) => monitoringSummary.severityCounts[s]),
          backgroundColor: severityOrder.map((s) => severityColors[s]),
          borderRadius: 8,
        },
      ],
    }),
    [monitoringSummary.severityCounts],
  );

  const monitoringAlertOptions = useMemo<ChartOptions<'bar'>>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(255,255,255,0.95)',
          borderColor: '#e2e8f0',
          borderWidth: 1,
          titleColor: '#0f172a',
          bodyColor: '#1e293b',
          padding: 12,
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#475569' },
        },
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(148, 163, 184, 0.2)' },
          ticks: { color: '#475569' },
        },
      },
    }),
    [],
  );

  const ruleTrendData = useMemo<ChartData<'line'> | null>(() => {
    if (!asyncMetrics.ruleTrend) return null;

    return {
      labels: asyncMetrics.ruleTrend.labels,
      datasets: [
        {
          label: 'Catches',
          data: asyncMetrics.ruleTrend.catches,
          borderColor: '#2563eb',
          backgroundColor: 'rgba(37, 99, 235, 0.12)',
          fill: true,
          tension: 0.4,
          pointRadius: 3,
        },
        {
          label: 'False Positives',
          data: asyncMetrics.ruleTrend.falsePositives,
          borderColor: '#f97316',
          backgroundColor: 'rgba(249, 115, 22, 0.12)',
          fill: true,
          tension: 0.4,
          pointRadius: 3,
        },
      ],
    };
  }, [asyncMetrics.ruleTrend]);

  const ruleTrendOptions = useMemo<ChartOptions<'line'>>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { usePointStyle: true },
        },
        tooltip: {
          backgroundColor: 'rgba(255,255,255,0.95)',
          borderColor: '#e2e8f0',
          borderWidth: 1,
          titleColor: '#0f172a',
          bodyColor: '#1e293b',
          padding: 12,
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#475569' },
        },
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(148, 163, 184, 0.2)' },
          ticks: { color: '#475569' },
        },
      },
    }),
    [],
  );

  const topAlerts = monitoringAlerts.slice(0, 5);
  const topChargebacks = chargebackSnapshot.slice(0, 5);

  const summaryWidgets: DashboardWidget[] = useMemo(
    () => [
      {
        id: 'summary-rules',
        title: 'Rule Management',
        description: 'Supabase rules + effectiveness',
        icon: ShieldCheckIcon,
        content: (
          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
            {[
              { label: 'Active Rules', value: numberFormatter.format(ruleSummary.active) },
              { label: 'Needs Attention', value: numberFormatter.format(needsAttentionRules.length) },
              { label: 'High Severity', value: numberFormatter.format(ruleSummary.severity.high) },
              {
                label: 'Avg Effectiveness',
                value: `${ruleSummary.avgEffectiveness.toFixed(1)}%`,
                helper: `${numberFormatter.format(ruleSummary.catches)} catches · ${numberFormatter.format(ruleSummary.falsePositives)} false positives`,
              },
            ].map((metric) => (
              <div key={metric.label} className='space-y-1 rounded-xl bg-slate-50/60 p-4'>
                <p className='text-xs font-semibold uppercase tracking-wide text-slate-500'>{metric.label}</p>
                <p className='text-xl font-semibold text-slate-900'>{metric.value}</p>
                {metric.helper && <p className='text-xs text-slate-500'>{metric.helper}</p>}
              </div>
            ))}
          </div>
        ),
      },
      {
        id: 'summary-chargebacks',
        title: 'Chargebacks',
        description: 'Dispute health snapshot',
        icon: CreditCardIcon,
        content: (
          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
            {[
              {
                label: 'Open Cases',
                value: numberFormatter.format(
                  (chargebackSummary.byStatus.pending ?? 0) + (chargebackSummary.byStatus.disputed ?? 0),
                ),
              },
              { label: 'Won', value: numberFormatter.format(chargebackSummary.byStatus.won ?? 0) },
              { label: 'Lost', value: numberFormatter.format(chargebackSummary.byStatus.lost ?? 0) },
              {
                label: 'Total Volume',
                value: currencyFormatter.format(chargebackSummary.totalAmount),
                helper: `${numberFormatter.format(chargebackSummary.total)} cases tracked`,
              },
            ].map((metric) => (
              <div key={metric.label} className='space-y-1 rounded-xl bg-slate-50/60 p-4'>
                <p className='text-xs font-semibold uppercase tracking-wide text-slate-500'>{metric.label}</p>
                <p className='text-xl font-semibold text-slate-900'>{metric.value}</p>
                {metric.helper && <p className='text-xs text-slate-500'>{metric.helper}</p>}
              </div>
            ))}
          </div>
        ),
      },
      {
        id: 'summary-monitoring',
        title: 'Monitoring',
        description: 'Live platform signals',
        icon: EyeIcon,
        content: (
          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
            {[
              { label: 'Active Alerts', value: numberFormatter.format(monitoringSummary.totalAlerts) },
              {
                label: 'High Priority',
                value: numberFormatter.format(monitoringSummary.highPriorityAlerts),
                helper: `${numberFormatter.format(monitoringSummary.acknowledged)} acknowledged`,
              },
              { label: 'Response Time', value: monitoringSummary.responseTime },
              {
                label: 'System Uptime',
                value: monitoringSummary.uptime,
                helper: `Error Rate ${monitoringSummary.errorRate} · CPU ${monitoringSummary.cpuUsage}`,
              },
            ].map((metric) => (
              <div key={metric.label} className='space-y-1 rounded-xl bg-slate-50/60 p-4'>
                <p className='text-xs font-semibold uppercase tracking-wide text-slate-500'>{metric.label}</p>
                <p className='text-xl font-semibold text-slate-900'>{metric.value}</p>
                {metric.helper && <p className='text-xs text-slate-500'>{metric.helper}</p>}
              </div>
            ))}
          </div>
        ),
      },
    ],
    [
      ruleSummary.active,
      ruleSummary.severity.high,
      ruleSummary.avgEffectiveness,
      ruleSummary.catches,
      ruleSummary.falsePositives,
      needsAttentionRules.length,
      chargebackSummary.byStatus.pending,
      chargebackSummary.byStatus.disputed,
      chargebackSummary.byStatus.won,
      chargebackSummary.byStatus.lost,
      chargebackSummary.totalAmount,
      chargebackSummary.total,
      monitoringSummary.totalAlerts,
      monitoringSummary.highPriorityAlerts,
      monitoringSummary.acknowledged,
      monitoringSummary.responseTime,
      monitoringSummary.uptime,
      monitoringSummary.errorRate,
      monitoringSummary.cpuUsage,
    ],
  );

  const chartWidgets: DashboardWidget[] = useMemo(
    () => [
      {
        id: 'rule-trend',
        title: 'Rule Performance (Supabase)',
        description: 'Daily catches vs false positives for the selected period.',
        content: (
          <div className='h-full min-h-[16rem]'>
            {metricsLoading && !hasTrendData ? (
              <LoadingState />
            ) : ruleTrendData ? (
              <Line data={ruleTrendData} options={ruleTrendOptions} />
            ) : (
              <EmptyState message={metricsError ?? 'Choose a wider range to see trend data.'} />
            )}
          </div>
        ),
      },
      {
        id: 'rule-severity',
        title: 'Rule Severity Mix',
        description: 'Distribution of active rules by severity tier.',
        content: (
          <div className='h-full min-h-[16rem]'>
            <Bar data={ruleSeverityData} options={ruleSeverityOptions} />
          </div>
        ),
      },
      {
        id: 'chargebacks-status',
        title: 'Chargeback Outcomes',
        description: 'Current status mix of chargeback cases.',
        content: (
          <div className='h-full min-h-[16rem]'>
            <Doughnut data={chargebackStatusData} options={chargebackStatusOptions} />
          </div>
        ),
      },
      {
        id: 'monitoring-alerts',
        title: 'Alert Severity Pipeline',
        description: 'Live alert counts by severity to prioritize response.',
        content: (
          <div className='h-full min-h-[16rem]'>
            <Bar data={monitoringAlertData} options={monitoringAlertOptions} />
          </div>
        ),
      },
    ],
    [
      metricsLoading,
      hasTrendData,
      ruleTrendData,
      ruleTrendOptions,
      metricsError,
      ruleSeverityData,
      ruleSeverityOptions,
      chargebackStatusData,
      chargebackStatusOptions,
      monitoringAlertData,
      monitoringAlertOptions,
    ],
  );

  const listWidgets: DashboardWidget[] = useMemo(
    () => [
      {
        id: 'alerts-list',
        title: 'Priority Alerts',
        description: 'Feed from Monitoring · most recent 5 alerts',
        content: (
          <div className='flex h-full flex-col'>
            <div className='scrollbar-thin flex-1 overflow-y-auto divide-y divide-gray-100'>
              {topAlerts.length ? (
                topAlerts.map((alert) => (
                  <div key={alert.id} className='flex items-start justify-between gap-4 px-1 py-3'>
                    <div>
                      <p className='text-sm font-semibold text-gray-900'>{alert.title}</p>
                      <p className='text-sm text-gray-500'>{alert.description}</p>
                      <p className='mt-1 text-xs text-gray-400'>{alert.timestamp}</p>
                    </div>
                    <span
                      className='mt-1 inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide'
                      style={{ backgroundColor: `${severityColors[alert.severity]}1a`, color: severityColors[alert.severity] }}
                    >
                      {alert.severity}
                    </span>
                  </div>
                ))
              ) : (
                <EmptyState message='No active alerts right now.' />
              )}
            </div>
          </div>
        ),
      },
      {
        id: 'chargebacks-list',
        title: 'Recent Chargebacks',
        description: 'Latest five disputes for quick review',
        content: (
          <div className='flex h-full flex-col'>
            <div className='scrollbar-thin flex-1 overflow-y-auto divide-y divide-gray-100'>
              {topChargebacks.length ? (
                topChargebacks.map((cb) => (
                  <div key={cb.id} className='flex flex-wrap items-center justify-between gap-3 px-1 py-3'>
                    <div>
                      <p className='text-sm font-semibold text-gray-900'>{cb.transactionId}</p>
                      <p className='text-sm text-gray-500'>{cb.reason}</p>
                      <p className='mt-1 text-xs text-gray-400'>{cb.date}</p>
                    </div>
                    <div className='text-right'>
                      <p className='text-sm font-semibold text-gray-900'>{currencyFormatter.format(cb.amount)}</p>
                      <span
                        className='mt-1 inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide'
                        style={{
                          backgroundColor:
                            cb.status === 'won'
                              ? '#dcfce7'
                              : cb.status === 'lost'
                                ? '#fee2e2'
                                : cb.status === 'disputed'
                                  ? '#ffedd5'
                                  : '#fef3c7',
                          color:
                            cb.status === 'won'
                              ? '#15803d'
                              : cb.status === 'lost'
                                ? '#b91c1c'
                                : cb.status === 'disputed'
                                  ? '#c2410c'
                                  : '#b45309',
                        }}
                      >
                        {cb.status}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState message='No chargeback activity recorded yet.' />
              )}
            </div>
          </div>
        ),
      },
    ],
    [topAlerts, topChargebacks],
  );

  const widgets = useMemo(
    () => [...summaryWidgets, ...chartWidgets, ...listWidgets],
    [summaryWidgets, chartWidgets, listWidgets],
  );

  const handleRefresh = () => {
    void fetchRules();
    void refreshMetrics(dateRange);
  };

  return (
    <div className='space-y-6'>
      <header className='space-y-2'>
        <h1 className='text-2xl font-bold text-gray-900 sm:text-3xl'>Command Center</h1>
        <p className='text-gray-600'>One glance view of rules, chargebacks, and live monitoring with drag-and-drop charts.</p>
      </header>

      <section className='space-y-4'>
        <div className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
          <div>
            <h2 className='text-lg font-semibold text-gray-900'>Interactive Dashboard</h2>
            <p className='text-sm text-gray-500'>Reorder or resize anything. Layouts are saved per device.</p>
          </div>
          <div className='flex flex-col gap-3 sm:flex-row sm:items-center'>
            <DateRangeFields value={dateRange} onChange={handleRangeChange} disableFuture />
            <div className='flex items-center gap-3 justify-end'>
              {(rulesLoading || metricsLoading) && <span className='text-sm text-gray-400'>Refreshing…</span>}
              <button
                type='button'
                onClick={handleRefresh}
                className='inline-flex items-center rounded-lg border border-blue-200 bg-white px-4 py-2 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50'
              >
                Refresh Data
              </button>
            </div>
          </div>
        </div>

        <ResponsiveGridLayout
          className='-m-2'
          layouts={layouts}
          cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          rowHeight={32}
          margin={[16, 16]}
          isDraggable={!isMobile}
          isResizable={!isMobile}
          onLayoutChange={handleLayoutChange}
          draggableHandle='.widget-drag-handle'
          compactType='vertical'
        >
          {widgets.map((widget) => (
            <div key={widget.id} className='p-2'>
              <div className='flex h-full flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-md'>
                <div className='widget-drag-handle flex cursor-move items-start justify-between gap-3 border-b border-gray-100 bg-gray-50/60 px-5 py-4'>
                  <div className='space-y-1'>
                    <div className='flex items-center gap-2'>
                      {widget.icon && <widget.icon className='h-5 w-5 text-blue-500' aria-hidden='true' />}
                      <h3 className='text-base font-semibold text-gray-900'>{widget.title}</h3>
                    </div>
                    {widget.description && <p className='text-sm text-gray-500'>{widget.description}</p>}
                  </div>
                  <ArrowsPointingOutIcon className='hidden h-5 w-5 text-gray-300 sm:block' aria-hidden='true' />
                </div>
                <div className='flex flex-1 flex-col p-5'>{widget.content}</div>
              </div>
            </div>
          ))}
        </ResponsiveGridLayout>
      </section>
    </div>
  );
});

export default Overview;
