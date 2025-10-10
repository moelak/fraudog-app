import { useEffect, useMemo, useState, type ComponentType, type SVGProps } from 'react';
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
import {
  ShieldCheckIcon,
  CreditCardIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import { useRules } from '@/hooks/useRules';
import { chargebacksStore } from '@/components/Chargebacks/ChargebacksStore';
import { monitoringStore } from '@/components/Monitoring/MonitoringStore';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

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

const DASHBOARD_LAYOUT_KEY = 'dashboard-layout-v1';

const DEFAULT_LAYOUTS: Layouts = {
  lg: [
    { i: 'rule-trend', x: 0, y: 0, w: 6, h: 9 },
    { i: 'rule-severity', x: 6, y: 0, w: 6, h: 9 },
    { i: 'chargebacks-status', x: 0, y: 9, w: 4, h: 9 },
    { i: 'monitoring-alerts', x: 4, y: 9, w: 8, h: 9 },
  ],
  md: [
    { i: 'rule-trend', x: 0, y: 0, w: 5, h: 9 },
    { i: 'rule-severity', x: 5, y: 0, w: 5, h: 9 },
    { i: 'chargebacks-status', x: 0, y: 9, w: 5, h: 9 },
    { i: 'monitoring-alerts', x: 5, y: 9, w: 5, h: 9 },
  ],
  sm: [
    { i: 'rule-trend', x: 0, y: 0, w: 6, h: 9 },
    { i: 'rule-severity', x: 0, y: 9, w: 6, h: 9 },
    { i: 'chargebacks-status', x: 0, y: 18, w: 6, h: 9 },
    { i: 'monitoring-alerts', x: 0, y: 27, w: 6, h: 9 },
  ],
  xs: [
    { i: 'rule-trend', x: 0, y: 0, w: 4, h: 10 },
    { i: 'rule-severity', x: 0, y: 10, w: 4, h: 10 },
    { i: 'chargebacks-status', x: 0, y: 20, w: 4, h: 10 },
    { i: 'monitoring-alerts', x: 0, y: 30, w: 4, h: 10 },
  ],
  xxs: [
    { i: 'rule-trend', x: 0, y: 0, w: 2, h: 10 },
    { i: 'rule-severity', x: 0, y: 10, w: 2, h: 10 },
    { i: 'chargebacks-status', x: 0, y: 20, w: 2, h: 10 },
    { i: 'monitoring-alerts', x: 0, y: 30, w: 2, h: 10 },
  ],
};

const numberFormatter = new Intl.NumberFormat('en-US');
const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

type SummaryMetric = {
  label: string;
  value: string;
  helper?: string;
};

type SummarySection = {
  id: string;
  title: string;
  subtitle: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  metrics: SummaryMetric[];
  footer?: string;
};

type Severity = 'low' | 'medium' | 'high' | 'critical';

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

  const {
    metrics: asyncMetrics,
    loading: metricsLoading,
    error: metricsError,
    refresh: refreshMetrics,
    hasData: hasTrendData,
  } = useDashboardMetrics();

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

  const ruleSummary = useMemo(() => {
    const severityCounts = { high: 0, medium: 0, low: 0 };
    let catches = 0;
    let falsePositives = 0;
    let chargebacks = 0;
    let effectivenessSum = 0;
    let effectivenessCount = 0;
    let aiGenerated = 0;

    rules.forEach((rule) => {
      severityCounts[rule.severity] += 1;
      catches += rule.catches ?? 0;
      falsePositives += rule.false_positives ?? 0;
      chargebacks += rule.chargebacks ?? 0;
      if (typeof rule.effectiveness === 'number') {
        effectivenessSum += rule.effectiveness;
        effectivenessCount += 1;
      }
      if (rule.source === 'AI') {
        aiGenerated += 1;
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
      aiGenerated,
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
        legend: {
          display: false,
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
    [chargebackSummary.byStatus.pending, chargebackSummary.byStatus.disputed, chargebackSummary.byStatus.won, chargebackSummary.byStatus.lost],
  );

  const chargebackStatusOptions = useMemo<ChartOptions<'doughnut'>>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            usePointStyle: true,
          },
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
        legend: {
          display: false,
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
          labels: {
            usePointStyle: true,
          },
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

  const summarySections: SummarySection[] = useMemo(
    () => [
      {
        id: 'rules-summary',
        title: 'Rule Management',
        subtitle: 'Active rules + effectiveness',
        icon: ShieldCheckIcon,
        metrics: [
          { label: 'Active Rules', value: numberFormatter.format(ruleSummary.active) },
          { label: 'Needs Attention', value: numberFormatter.format(needsAttentionRules.length) },
          { label: 'High Severity', value: numberFormatter.format(ruleSummary.severity.high) },
          {
            label: 'Avg Effectiveness',
            value: `${ruleSummary.avgEffectiveness.toFixed(1)}%`,
            helper: `${numberFormatter.format(ruleSummary.catches)} catches · ${numberFormatter.format(ruleSummary.falsePositives)} false positives`,
          },
        ],
      },
      {
        id: 'chargebacks-summary',
        title: 'Chargebacks',
        subtitle: 'Dispute health snapshot',
        icon: CreditCardIcon,
        metrics: [
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
        ],
      },
      {
        id: 'monitoring-summary',
        title: 'Monitoring',
        subtitle: 'Live platform signals',
        icon: EyeIcon,
        metrics: [
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
        ],
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

  const chartWidgets = [
    {
      id: 'rule-trend',
      title: 'Rule Performance',
      description: 'Daily catches vs false positives across your organization (last 7 days UTC).',
      content: (
        <div className='h-full min-h-[16rem]'>
          {metricsLoading && !hasTrendData ? (
            <LoadingState />
          ) : ruleTrendData ? (
            <Line data={ruleTrendData} options={ruleTrendOptions} />
          ) : (
            <EmptyState message={metricsError ?? 'Trend data appears once rules start generating metrics.'} />
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
  ];

  const topAlerts = monitoringAlerts.slice(0, 5);
  const topChargebacks = chargebackSnapshot.slice(0, 5);

  const handleRefresh = () => {
    void fetchRules();
    void refreshMetrics();
  };

  return (
    <div className='space-y-8'>
      <header className='space-y-2'>
        <h1 className='text-2xl font-bold text-gray-900 sm:text-3xl'>Command Center</h1>
        <p className='text-gray-600'>One glance view of rules, chargebacks, and live monitoring with drag-and-drop charts.</p>
      </header>

      <section className='grid grid-cols-1 gap-6 xl:grid-cols-3'>
        {summarySections.map(({ id, title, subtitle, icon: Icon, metrics }) => (
          <article key={id} className='rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md'>
            <div className='flex items-start justify-between gap-4'>
              <div>
                <h2 className='text-lg font-semibold text-gray-900'>{title}</h2>
                <p className='mt-1 text-sm text-gray-500'>{subtitle}</p>
              </div>
              <span className='rounded-xl bg-blue-50 p-2 text-blue-600'>
                <Icon className='h-6 w-6' aria-hidden='true' />
              </span>
            </div>
            <div className='mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2'>
              {metrics.map((metric) => (
                <div key={metric.label} className='space-y-1 rounded-xl bg-slate-50/60 p-4'>
                  <p className='text-xs font-semibold uppercase tracking-wide text-slate-500'>{metric.label}</p>
                  <p className='text-xl font-semibold text-slate-900'>{metric.value}</p>
                  {metric.helper && <p className='text-xs text-slate-500'>{metric.helper}</p>}
                </div>
              ))}
            </div>
          </article>
        ))}
      </section>

      <section className='space-y-4'>
        <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <div>
            <h2 className='text-lg font-semibold text-gray-900'>Interactive Dashboard</h2>
            <p className='text-sm text-gray-500'>Reorder or resize widgets to match your workflow. Layout is saved locally per device.</p>
          </div>
          <div className='flex items-center gap-3'>
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

        <ResponsiveGridLayout
          className='-m-2'
          layouts={layouts}
          cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
          rowHeight={32}
          margin={[16, 16]}
          isDraggable={!isMobile}
          isResizable={!isMobile}
          onLayoutChange={handleLayoutChange}
          draggableHandle='.drag-handle'
          draggableCancel='.chart-content'
          compactType='vertical'
        >
          {chartWidgets.map((widget) => (
            <div key={widget.id} className='p-2'>
              <div className='flex h-full flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-md'>
                <div className='drag-handle flex cursor-move items-start justify-between gap-3 border-b border-gray-100 bg-gray-50/60 px-5 py-4'>
                  <div className='space-y-1'>
                    <h3 className='text-base font-semibold text-gray-900'>{widget.title}</h3>
                    <p className='text-sm text-gray-500'>{widget.description}</p>
                  </div>
                  <span className='hidden text-xs font-semibold uppercase tracking-wide text-gray-300 sm:block'>Drag</span>
                </div>
                <div className='chart-content flex flex-1 flex-col p-5'>{widget.content}</div>
              </div>
            </div>
          ))}
        </ResponsiveGridLayout>
      </section>

      <section className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
        <article className='rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md'>
          <header className='flex items-center justify-between border-b border-gray-100 px-5 py-4'>
            <div>
              <h3 className='text-base font-semibold text-gray-900'>Priority Alerts</h3>
              <p className='text-sm text-gray-500'>Feed from Monitoring · most recent 5 alerts</p>
            </div>
          </header>
          <div className='divide-y divide-gray-100'>
            {topAlerts.length ? (
              topAlerts.map((alert) => (
                <div key={alert.id} className='flex items-start justify-between gap-4 px-5 py-4'>
                  <div>
                    <p className='text-sm font-semibold text-gray-900'>{alert.title}</p>
                    <p className='text-sm text-gray-500'>{alert.description}</p>
                    <p className='mt-1 text-xs text-gray-400'>{alert.timestamp}</p>
                  </div>
                  <span
                    className='inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide'
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
        </article>

        <article className='rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md'>
          <header className='flex items-center justify-between border-b border-gray-100 px-5 py-4'>
            <div>
              <h3 className='text-base font-semibold text-gray-900'>Recent Chargebacks</h3>
              <p className='text-sm text-gray-500'>Latest five disputes for quick review</p>
            </div>
          </header>
          <div className='divide-y divide-gray-100'>
            {topChargebacks.length ? (
              topChargebacks.map((cb) => (
                <div key={cb.id} className='flex flex-wrap items-center justify-between gap-3 px-5 py-4'>
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
        </article>
      </section>
    </div>
  );
});

export default Overview;
