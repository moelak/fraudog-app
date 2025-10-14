import { useCallback, useEffect, useMemo, useState, type ComponentType, type ReactNode } from 'react';
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
  type ChartDataset,
  type ChartOptions,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { Responsive, WidthProvider, type Layout, type Layouts } from 'react-grid-layout';
import dayjs, { type Dayjs } from 'dayjs';
import utc from 'dayjs/plugin/utc';
import relativeTime from 'dayjs/plugin/relativeTime';
import {
  PresentationChartLineIcon,
  ChartPieIcon,
  ArrowsPointingOutIcon,
  QueueListIcon,
  TableCellsIcon,
  BellAlertIcon,
  PlusIcon,
  XMarkIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import DateRangeFields from '@/components/DateRangeFields/DateRangeFields';
import { useRules } from '@/hooks/useRules';
import { useAuth } from '@/hooks/useAuth';
import { monitoringStore } from '@/components/Monitoring/MonitoringStore';
import { overviewStore, type DashboardDateRange } from './OverviewStore';
import { decisionColors, decisionAreaFill, defaultPalette } from './chartTheme';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

dayjs.extend(utc);
dayjs.extend(relativeTime);

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

const BREAKPOINTS = { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 } as const;
const COLS = { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 } as const;

const LAYOUT_STORAGE_KEY = 'overview-layouts-v3';
const VIEW_STORAGE_KEY = 'overview-custom-views-v1';
const ACTIVE_VIEW_STORAGE_KEY = 'overview-active-view';

const DEFAULT_WIDGET_SIZE = {
  lg: { w: 6, h: 12 },
  md: { w: 5, h: 12 },
  sm: { w: 6, h: 12 },
  xs: { w: 4, h: 12 },
  xxs: { w: 2, h: 12 },
} as const;

const EXECUTIVE_WIDGETS = ['exec-loss-trend', 'exec-loss-breakdown', 'exec-friction-stack', 'exec-friction-kpis'] as const;
const OPERATIONS_WIDGETS = ['ops-rule-monitoring', 'ops-rules-table', 'ops-alert-list', 'ops-ticket-trend', 'shared-rule-performance'] as const;

type WidgetId =
  | typeof EXECUTIVE_WIDGETS[number]
  | typeof OPERATIONS_WIDGETS[number]
  | 'shared-loss-trend'
  | 'shared-friction-stack';

type ViewType = 'executive' | 'operations' | 'custom';

type DashboardView = {
  id: string;
  name: string;
  type: ViewType;
  widgets: WidgetId[];
  locked?: boolean;
};

type ExecutiveWidgetContext = {
  lossTrendChart: ChartData<'line'> | null;
  lossBreakdownChart: ChartData<'doughnut'> | null;
  frictionStackedChart: ChartData<'line'> | null;
  frictionSummary: {
    total: number;
    decisionTotals: Record<string, number>;
    topDecision?: { name: string; value: number };
    averageWeeklyFriction?: number;
  } | null;
  loading: boolean;
  error: string | null;
};

type OperationsWidgetContext = {
  rulesTable: Array<{
    id: string;
    name: string;
    description: string;
    catches: number;
    falsePositives: number;
    effectiveness: number | null;
  }>;
  rulesLoading: boolean;
  ruleMonitoring: {
    active: number;
    needsAttention: number;
    avgEffectiveness: number | null;
  };
  alerts: Array<{
    id: string;
    title: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    status: 'open' | 'in_progress' | 'resolved';
    created_at: string;
  }>;
  alertsLoading: boolean;
  ticketTrendChart: ChartData<'line'> | null;
  ticketsLoading: boolean;
};

type SharedWidgetContext = {
  rulePerformanceChart: ChartData<'line'> | null;
  rulePerformanceLoading: boolean;
  rulePerformanceError: string | null;
};

type WidgetRenderContext = {
  dateRange: DashboardDateRange;
  executive: ExecutiveWidgetContext;
  operations: OperationsWidgetContext;
  shared: SharedWidgetContext;
  view: DashboardView;
  isCustomView: boolean;
  onRemoveWidget?: (widgetId: WidgetId) => void;
};

type WidgetDefinition = {
  id: WidgetId;
  title: string;
  description?: string;
  icon: ComponentType<React.SVGProps<SVGSVGElement>>;
  render: (ctx: WidgetRenderContext) => ReactNode;
  category: 'Executive' | 'Operations' | 'Shared';
};

const LoadingState = () => (
  <div className='flex h-full items-center justify-center text-sm text-gray-500'>Loading…</div>
);

const EmptyState = ({ message }: { message: string }) => (
  <div className='flex h-full items-center justify-center px-6 text-center text-sm text-gray-400'>{message}</div>
);

const BUILT_IN_VIEWS: DashboardView[] = [
  {
    id: 'executive',
    name: 'Executive Briefing',
    type: 'executive',
    widgets: [...EXECUTIVE_WIDGETS],
    locked: true,
  },
  {
    id: 'operations',
    name: 'Operations Command',
    type: 'operations',
    widgets: [...OPERATIONS_WIDGETS],
    locked: true,
  },
];

const DEFAULT_LAYOUTS_BY_VIEW: Record<string, Layouts> = {
  executive: {
    lg: [
      { i: 'exec-loss-trend', x: 0, y: 0, w: 6, h: 12 },
      { i: 'exec-loss-breakdown', x: 6, y: 0, w: 6, h: 12 },
      { i: 'exec-friction-stack', x: 0, y: 12, w: 7, h: 12 },
      { i: 'exec-friction-kpis', x: 7, y: 12, w: 5, h: 12 },
    ],
    md: [
      { i: 'exec-loss-trend', x: 0, y: 0, w: 10, h: 12 },
      { i: 'exec-loss-breakdown', x: 0, y: 12, w: 10, h: 12 },
      { i: 'exec-friction-stack', x: 0, y: 24, w: 10, h: 12 },
      { i: 'exec-friction-kpis', x: 0, y: 36, w: 10, h: 12 },
    ],
    sm: [
      { i: 'exec-loss-trend', x: 0, y: 0, w: 6, h: 12 },
      { i: 'exec-loss-breakdown', x: 0, y: 12, w: 6, h: 12 },
      { i: 'exec-friction-stack', x: 0, y: 24, w: 6, h: 12 },
      { i: 'exec-friction-kpis', x: 0, y: 36, w: 6, h: 12 },
    ],
    xs: [
      { i: 'exec-loss-trend', x: 0, y: 0, w: 4, h: 12 },
      { i: 'exec-loss-breakdown', x: 0, y: 12, w: 4, h: 12 },
      { i: 'exec-friction-stack', x: 0, y: 24, w: 4, h: 12 },
      { i: 'exec-friction-kpis', x: 0, y: 36, w: 4, h: 12 },
    ],
    xxs: [
      { i: 'exec-loss-trend', x: 0, y: 0, w: 2, h: 12 },
      { i: 'exec-loss-breakdown', x: 0, y: 12, w: 2, h: 12 },
      { i: 'exec-friction-stack', x: 0, y: 24, w: 2, h: 12 },
      { i: 'exec-friction-kpis', x: 0, y: 36, w: 2, h: 12 },
    ],
  },
  operations: {
    lg: [
      { i: 'ops-rule-monitoring', x: 0, y: 0, w: 12, h: 8 },
      { i: 'ops-rules-table', x: 0, y: 8, w: 7, h: 13 },
      { i: 'ops-alert-list', x: 7, y: 8, w: 5, h: 13 },
      { i: 'ops-ticket-trend', x: 0, y: 21, w: 6, h: 12 },
      { i: 'shared-rule-performance', x: 6, y: 21, w: 6, h: 12 },
    ],
    md: [
      { i: 'ops-rule-monitoring', x: 0, y: 0, w: 10, h: 8 },
      { i: 'ops-rules-table', x: 0, y: 8, w: 10, h: 13 },
      { i: 'ops-alert-list', x: 0, y: 21, w: 10, h: 10 },
      { i: 'ops-ticket-trend', x: 0, y: 31, w: 10, h: 12 },
      { i: 'shared-rule-performance', x: 0, y: 43, w: 10, h: 12 },
    ],
    sm: [
      { i: 'ops-rule-monitoring', x: 0, y: 0, w: 6, h: 8 },
      { i: 'ops-rules-table', x: 0, y: 8, w: 6, h: 13 },
      { i: 'ops-alert-list', x: 0, y: 21, w: 6, h: 10 },
      { i: 'ops-ticket-trend', x: 0, y: 31, w: 6, h: 12 },
      { i: 'shared-rule-performance', x: 0, y: 43, w: 6, h: 12 },
    ],
    xs: [
      { i: 'ops-rule-monitoring', x: 0, y: 0, w: 4, h: 8 },
      { i: 'ops-rules-table', x: 0, y: 8, w: 4, h: 13 },
      { i: 'ops-alert-list', x: 0, y: 21, w: 4, h: 10 },
      { i: 'ops-ticket-trend', x: 0, y: 31, w: 4, h: 12 },
      { i: 'shared-rule-performance', x: 0, y: 43, w: 4, h: 12 },
    ],
    xxs: [
      { i: 'ops-rule-monitoring', x: 0, y: 0, w: 2, h: 8 },
      { i: 'ops-rules-table', x: 0, y: 8, w: 2, h: 13 },
      { i: 'ops-alert-list', x: 0, y: 21, w: 2, h: 10 },
      { i: 'ops-ticket-trend', x: 0, y: 31, w: 2, h: 12 },
      { i: 'shared-rule-performance', x: 0, y: 43, w: 2, h: 12 },
    ],
  },
};

const createEmptyLayouts = (): Layouts => ({ lg: [], md: [], sm: [], xs: [], xxs: [] });

const addWidgetToLayouts = (layouts: Layouts, widgetId: WidgetId): Layouts => {
  const next: Layouts = {
    lg: [...layouts.lg],
    md: [...layouts.md],
    sm: [...layouts.sm],
    xs: [...layouts.xs],
    xxs: [...layouts.xxs],
  };

  (Object.keys(next) as Array<keyof Layouts>).forEach((breakpoint) => {
    const items = next[breakpoint];
    const { w, h } = DEFAULT_WIDGET_SIZE[breakpoint as keyof typeof DEFAULT_WIDGET_SIZE];
    const y = items.reduce((max, item) => Math.max(max, item.y + item.h), 0);
    const layoutItem: Layout = {
      i: widgetId,
      x: 0,
      y,
      w,
      h,
    };
    items.push(layoutItem);
  });

  return next;
};

const removeWidgetFromLayouts = (layouts: Layouts, widgetId: WidgetId): Layouts => ({
  lg: layouts.lg.filter((item) => item.i !== widgetId),
  md: layouts.md.filter((item) => item.i !== widgetId),
  sm: layouts.sm.filter((item) => item.i !== widgetId),
  xs: layouts.xs.filter((item) => item.i !== widgetId),
  xxs: layouts.xxs.filter((item) => item.i !== widgetId),
});

const widgetDefinitions: Record<WidgetId, WidgetDefinition> = {
  'exec-loss-trend': {
    id: 'exec-loss-trend',
    title: 'Fraud Loss Trend',
    description: 'Week-over-week fraud and non-fraud loss trajectory.',
    icon: PresentationChartLineIcon,
    category: 'Executive',
    render: ({ executive }) => {
      if (executive.loading) return <LoadingState />;
      if (!executive.lossTrendChart) return <EmptyState message={executive.error ?? 'No fraud loss data for this range.'} />;
      return <Line data={executive.lossTrendChart} options={defaultLineOptions} />;
    },
  },
  'exec-loss-breakdown': {
    id: 'exec-loss-breakdown',
    title: 'Loss Mix by Type',
    description: 'Compare fraud vs. non-fraud chargeback exposure.',
    icon: ChartPieIcon,
    category: 'Executive',
    render: ({ executive }) => {
      if (executive.loading) return <LoadingState />;
      if (!executive.lossBreakdownChart) {
        return <EmptyState message={executive.error ?? 'No loss breakdown available for this range.'} />;
      }
      return <Doughnut data={executive.lossBreakdownChart} options={defaultDoughnutOptions} />;
    },
  },
  'exec-friction-stack': {
    id: 'exec-friction-stack',
    title: 'Friction Pipeline',
    description: 'Weekly catch contribution by rule decision (stacked share).',
    icon: QueueListIcon,
    category: 'Executive',
    render: ({ executive }) => {
      if (executive.loading) return <LoadingState />;
      if (!executive.frictionStackedChart) {
        return <EmptyState message={executive.error ?? 'No decision activity captured for this range.'} />;
      }
      return <Line data={executive.frictionStackedChart} options={stackedAreaOptions} />;
    },
  },
  'exec-friction-kpis': {
    id: 'exec-friction-kpis',
    title: 'Friction Summary',
    description: 'Impact on growth goals and staffing sensitivity by decision path.',
    icon: Cog6ToothIcon,
    category: 'Executive',
    render: ({ executive }) => {
      if (executive.loading) return <LoadingState />;
      if (!executive.frictionSummary) {
        return <EmptyState message={executive.error ?? 'No friction summary available.'} />;
      }

      const { total, decisionTotals, topDecision, averageWeeklyFriction } = executive.frictionSummary;
      const orderedDecisions = Object.entries(decisionTotals)
        .filter(([decision]) => decision !== 'allow')
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4);

      const formatter = new Intl.NumberFormat('en-US');

      return (
        <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
          <div className='rounded-xl border border-gray-100 bg-slate-50 p-4'>
            <p className='text-xs font-semibold uppercase tracking-wide text-slate-500'>Total Friction (non-allow)</p>
            <p className='mt-1 text-2xl font-semibold text-slate-900'>{formatter.format(total)}</p>
            {averageWeeklyFriction && (
              <p className='mt-2 text-xs text-slate-500'>Avg weekly impact: {formatter.format(Math.round(averageWeeklyFriction))}</p>
            )}
          </div>
          <div className='space-y-3 rounded-xl border border-gray-100 bg-white p-4'>
            <p className='text-xs font-semibold uppercase tracking-wide text-slate-500'>Decision Mix</p>
            <ul className='space-y-2'>
            {orderedDecisions.map(([decision, value]) => (
                <li key={decision} className='flex items-center justify-between text-sm'>
                  <span className='flex items-center gap-2 text-slate-600 capitalize'>
                    <span
                      className='inline-flex h-2.5 w-2.5 rounded-full'
                      style={{ backgroundColor: decisionColors[decision] ?? '#cbd5f5' }}
                    />
                    {decision}
                  </span>
                  <span className='font-medium text-slate-900'>{formatter.format(value)}</span>
                </li>
              ))}
            </ul>
            {topDecision && (
              <p className='text-xs text-slate-500'>Largest share: {topDecision.name} ({formatter.format(topDecision.value)})</p>
            )}
          </div>
        </div>
      );
    },
  },
  'ops-rule-monitoring': {
    id: 'ops-rule-monitoring',
    title: 'Rule Monitoring Pulse',
    description: 'Active coverage, items needing attention, and blended effectiveness.',
    icon: PresentationChartLineIcon,
    category: 'Operations',
    render: ({ operations }) => {
      const formatter = new Intl.NumberFormat('en-US');
      const cards = [
        {
          label: 'Active Rules',
          value: formatter.format(operations.ruleMonitoring.active),
          tone: 'text-emerald-600 bg-emerald-50 border border-emerald-100',
          helper: 'Enabled policies catching fraud today',
        },
        {
          label: 'Needs Attention',
          value: formatter.format(operations.ruleMonitoring.needsAttention),
          tone: 'text-amber-600 bg-amber-50 border border-amber-100',
          helper: 'Rules flagged for tuning or review',
        },
        {
          label: 'Avg Effectiveness %',
          value:
            operations.ruleMonitoring.avgEffectiveness !== null
              ? `${operations.ruleMonitoring.avgEffectiveness.toFixed(1)}%`
              : 'N/A',
          tone: 'text-slate-700 bg-slate-50 border border-slate-100',
          helper: 'Weighted against total catches across rules',
        },
      ];

      return (
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
          {cards.map((card) => (
            <div key={card.label} className={`rounded-2xl px-5 py-4 ${card.tone}`}>
              <p className='text-xs font-semibold uppercase tracking-wide text-slate-500'>{card.label}</p>
              <p className='mt-2 text-2xl font-semibold text-slate-900'>{card.value}</p>
              <p className='mt-1 text-xs text-slate-500'>{card.helper}</p>
            </div>
          ))}
        </div>
      );
    },
  },
  'ops-rules-table': {
    id: 'ops-rules-table',
    title: 'Rule Performance Table',
    description: 'Monitor effectiveness and catches per rule.',
    icon: TableCellsIcon,
    category: 'Operations',
    render: ({ operations }) => {
      if (operations.rulesLoading) return <LoadingState />;
      if (!operations.rulesTable.length) return <EmptyState message='No rules available in this range.' />;
      return (
        <div className='flex h-full flex-col'>
          <div className='max-h-72 flex-1 overflow-auto rounded-xl border border-gray-100'>
            <table className='min-w-full divide-y divide-gray-200'>
            <thead className='sticky top-0 z-10 bg-gray-50 text-xs uppercase tracking-wide text-gray-500'>
              <tr>
                <th className='px-4 py-3 text-left font-semibold'>Rule</th>
                <th className='px-4 py-3 text-left font-semibold'>Description</th>
                <th className='px-4 py-3 text-right font-semibold'>Catches</th>
                <th className='px-4 py-3 text-right font-semibold'>Effectiveness %</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-gray-100 bg-white text-sm text-gray-600'>
              {operations.rulesTable.map((rule) => (
                <tr key={rule.id} className='hover:bg-slate-50'>
                  <td className='px-4 py-3 font-medium text-slate-900'>{rule.name}</td>
                  <td className='px-4 py-3'>{rule.description || '—'}</td>
                  <td className='px-4 py-3 text-right font-medium text-slate-900'>{rule.catches.toLocaleString()}</td>
                  <td className='px-4 py-3 text-right font-medium text-slate-900'>
                    {rule.effectiveness !== null ? `${rule.effectiveness.toFixed(1)}%` : 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      );
    },
  },
  'ops-alert-list': {
    id: 'ops-alert-list',
    title: 'Live Alerts',
    description: 'Prioritise outstanding anomaly investigations.',
    icon: BellAlertIcon,
    category: 'Operations',
    render: ({ operations }) => {
      if (operations.alertsLoading) return <LoadingState />;
      if (!operations.alerts.length) return <EmptyState message='No open alerts.' />;
      return (
        <div className='space-y-3'>
          {operations.alerts.slice(0, 5).map((alert) => (
            <article key={alert.id} className='rounded-xl border border-gray-100 bg-white p-4 shadow-sm'>
              <div className='flex items-start justify-between gap-3'>
                <div>
                  <p className='text-sm font-semibold text-slate-900'>{alert.title}</p>
                  <p className='mt-1 text-xs text-slate-500'>Opened {dayjs(alert.created_at).fromNow()}</p>
                </div>
                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${severityBadgeClasses(alert.severity)}`}>
                  {alert.severity}
                </span>
              </div>
              <p className='mt-2 text-xs text-slate-500'>Status · {alert.status.replace('_', ' ')}</p>
            </article>
          ))}
        </div>
      );
    },
  },
  'ops-ticket-trend': {
    id: 'ops-ticket-trend',
    title: 'Decision Volume Share',
    description: 'Weekly catch share by allow / review / deny.',
    icon: QueueListIcon,
    category: 'Operations',
    render: ({ operations }) => {
      if (operations.ticketsLoading) return <LoadingState />;
      if (!operations.ticketTrendChart) return <EmptyState message='No decision activity captured for this range.' />;
      return <Line data={operations.ticketTrendChart} options={stackedAreaOptions} />;
    },
  },
  'shared-rule-performance': {
    id: 'shared-rule-performance',
    title: 'Rule Performance Trend',
    description: 'Catches vs. false positives (daily trend).',
    icon: PresentationChartLineIcon,
    category: 'Shared',
    render: ({ shared }) => {
      if (shared.rulePerformanceLoading) return <LoadingState />;
      if (!shared.rulePerformanceChart) return <EmptyState message={shared.rulePerformanceError ?? 'No rule metrics for this period.'} />;
      return <Line data={shared.rulePerformanceChart} options={defaultLineOptions} />;
    },
  },
  'shared-loss-trend': {
    id: 'shared-loss-trend',
    title: 'Chargeback Loss Trend',
    description: 'Shared lens on fraud losses.',
    icon: PresentationChartLineIcon,
    category: 'Shared',
    render: ({ executive }) => {
      if (executive.loading) return <LoadingState />;
      if (!executive.lossTrendChart) return <EmptyState message={executive.error ?? 'No loss data.'} />;
      return <Line data={executive.lossTrendChart} options={defaultLineOptions} />;
    },
  },
  'shared-friction-stack': {
    id: 'shared-friction-stack',
    title: 'Decision Volume Share',
    description: 'Shared stacked breakdown of rule decisions.',
    icon: QueueListIcon,
    category: 'Shared',
    render: ({ executive }) => {
      if (executive.loading) return <LoadingState />;
      if (!executive.frictionStackedChart) return <EmptyState message={executive.error ?? 'No friction data.'} />;
      return <Line data={executive.frictionStackedChart} options={stackedAreaOptions} />;
    },
  },
};

const defaultLineOptions: ChartOptions<'line'> = {
  responsive: true,
  maintainAspectRatio: false,
  resizeDelay: 120,
  plugins: {
    legend: { position: 'bottom', labels: { usePointStyle: true } },
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
      grid: { color: 'rgba(148,163,184,0.2)' },
      ticks: { color: '#475569' },
    },
  },
};

const defaultDoughnutOptions: ChartOptions<'doughnut'> = {
  responsive: true,
  maintainAspectRatio: false,
  resizeDelay: 120,
  plugins: {
    legend: { position: 'bottom', labels: { usePointStyle: true } },
    tooltip: {
      backgroundColor: 'rgba(255,255,255,0.95)',
      borderColor: '#e2e8f0',
      borderWidth: 1,
      titleColor: '#0f172a',
      bodyColor: '#1e293b',
      padding: 12,
    },
  },
};

const stackedAreaOptions: ChartOptions<'line'> = {
  responsive: true,
  maintainAspectRatio: false,
  resizeDelay: 120,
  plugins: {
    legend: { position: 'bottom', labels: { usePointStyle: true } },
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
    x: { stacked: true, grid: { display: false }, ticks: { color: '#475569' } },
    y: {
      stacked: true,
      beginAtZero: true,
      max: 100,
      grid: { color: 'rgba(148,163,184,0.2)' },
      ticks: { color: '#475569', callback: (value) => `${value}%` },
    },
  },
};

const severityBadgeClasses = (severity: 'low' | 'medium' | 'high' | 'critical') => {
  switch (severity) {
    case 'critical':
      return 'bg-red-100 text-red-700';
    case 'high':
      return 'bg-orange-100 text-orange-700';
    case 'medium':
      return 'bg-amber-100 text-amber-700';
    default:
      return 'bg-emerald-100 text-emerald-700';
  }
};

const sanitizeEffectiveness = (value: number | null | undefined): number | null => {
  if (value === null || value === undefined) return null;
  if (!Number.isFinite(value)) return null;
  const rounded = Math.round(value * 10) / 10;
  return Math.max(0, Math.min(100, rounded));
};

const computeEffectiveness = (catches: number, falsePositives: number): number | null => {
  if (!Number.isFinite(catches) || catches <= 0) return null;
  const ratio = falsePositives / catches;
  const raw = Math.round((1 - ratio) * 1000) / 10;
  return Math.max(0, Math.min(100, raw));
};

const Overview = observer(() => {
  const {
    rules,
    activeRules,
    needsAttentionRules,
    loading: rulesLoading,
    fetchRules,
  } = useRules();

  const { user } = useAuth();
  const {
    dateRange,
    setDateRange: setStoreDateRange,
    dashboardMetrics,
    executiveMetrics,
    operationsMetrics,
    refreshAll,
  } = overviewStore;

  const scheduleChartResize = useCallback(() => {
    if (typeof window === 'undefined') return;
    requestAnimationFrame(() => {
      window.dispatchEvent(new Event('resize'));
    });
  }, []);

  const [views, setViews] = useState<DashboardView[]>(() => {
    if (typeof window === 'undefined') return BUILT_IN_VIEWS;
    try {
      const stored = window.localStorage.getItem(VIEW_STORAGE_KEY);
      if (!stored) return BUILT_IN_VIEWS;
      const customViews = JSON.parse(stored) as DashboardView[];
      return [...BUILT_IN_VIEWS, ...customViews];
    } catch (error) {
      console.warn('Failed to parse stored overview views', error);
      return BUILT_IN_VIEWS;
    }
  });

  const [layoutsByView, setLayoutsByView] = useState<Record<string, Layouts>>(() => {
    if (typeof window === 'undefined') return { ...DEFAULT_LAYOUTS_BY_VIEW };
    try {
      const stored = window.localStorage.getItem(LAYOUT_STORAGE_KEY);
      const parsed = stored ? (JSON.parse(stored) as Record<string, Layouts>) : {};
      return { ...DEFAULT_LAYOUTS_BY_VIEW, ...parsed };
    } catch (error) {
      console.warn('Failed to parse stored overview layouts', error);
      return { ...DEFAULT_LAYOUTS_BY_VIEW };
    }
  });

  const [activeViewId, setActiveViewId] = useState<string>(() => {
    if (typeof window === 'undefined') return BUILT_IN_VIEWS[0].id;
    return window.localStorage.getItem(ACTIVE_VIEW_STORAGE_KEY) ?? BUILT_IN_VIEWS[0].id;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const customViews = views.filter((view) => view.type === 'custom');
    window.localStorage.setItem(VIEW_STORAGE_KEY, JSON.stringify(customViews));
  }, [views]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const customLayouts: Record<string, Layouts> = {};
    Object.entries(layoutsByView).forEach(([id, layouts]) => {
      if (!DEFAULT_LAYOUTS_BY_VIEW[id]) {
        customLayouts[id] = layouts;
      }
    });
    window.localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(customLayouts));
  }, [layoutsByView]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(ACTIVE_VIEW_STORAGE_KEY, activeViewId);
  }, [activeViewId]);

  useEffect(() => {
    if (!layoutsByView[activeViewId]) {
      setLayoutsByView((prev) => ({
        ...prev,
        [activeViewId]: DEFAULT_LAYOUTS_BY_VIEW[activeViewId] ?? createEmptyLayouts(),
      }));
    }
  }, [activeViewId, layoutsByView]);

  useEffect(() => {
    void overviewStore.refreshAll(user?.id ?? undefined).finally(() => {
      scheduleChartResize();
    });
  }, [user?.id, dateRange.from?.valueOf(), dateRange.to?.valueOf(), scheduleChartResize]);

  const monitoringAlerts = monitoringStore.activeAlerts.slice();

  const executiveContext: ExecutiveWidgetContext = useMemo(() => {
    const lossRows = executiveMetrics.metrics.lossByWeek;
    const decisionRows = executiveMetrics.metrics.decisionByWeek;

    const sortedWeeksLoss = [...new Set(lossRows.map((row) => row.week))].sort();
    const lossTrendChart: ChartData<'line'> | null = sortedWeeksLoss.length
      ? {
          labels: sortedWeeksLoss.map((week) => dayjs(week).format('MMM D')),
          datasets: [
            {
              label: 'Fraud Loss',
              data: sortedWeeksLoss.map((week) => lossRows.find((row) => row.week === week)?.fraudLoss ?? 0),
              borderColor: '#ef4444',
              backgroundColor: 'rgba(239,68,68,0.12)',
              fill: true,
              tension: 0.35,
              pointRadius: 2,
            },
            {
              label: 'Non-Fraud Loss',
              data: sortedWeeksLoss.map((week) => lossRows.find((row) => row.week === week)?.nonFraudLoss ?? 0),
              borderColor: '#6366f1',
              backgroundColor: 'rgba(99,102,241,0.12)',
              fill: true,
              tension: 0.35,
              pointRadius: 2,
            },
          ],
        }
      : null;

    const totalFraud = lossRows.reduce((sum, row) => sum + row.fraudLoss, 0);
    const totalNonFraud = lossRows.reduce((sum, row) => sum + row.nonFraudLoss, 0);

    const lossBreakdownChart: ChartData<'doughnut'> | null = totalFraud + totalNonFraud > 0
      ? {
          labels: ['Fraud', 'Non-Fraud'],
          datasets: [
            {
              data: [totalFraud, totalNonFraud],
              backgroundColor: ['#ef4444', '#6366f1'],
              borderColor: '#ffffff',
              borderWidth: 2,
            },
          ],
        }
      : null;

    const sortedWeeksDecision = [...new Set(decisionRows.map((row) => row.week))].sort();
    const decisions = [...new Set(decisionRows.map((row) => row.decision))];

    const frictionStackedChart: ChartData<'line'> | null = sortedWeeksDecision.length
      ? {
          labels: sortedWeeksDecision.map((week) => dayjs(week).format('MMM D')),
          datasets: decisions.map((decision, index) => ({
            label: decision,
            data: sortedWeeksDecision.map(
              (week) => decisionRows.find((row) => row.week === week && row.decision === decision)?.percentage ?? 0,
            ),
            borderColor: decisionColors[decision] ?? defaultPalette[index % defaultPalette.length],
            backgroundColor: decisionAreaFill(decision),
            fill: true,
            tension: 0.35,
            stack: 'decision-share',
          })),
        }
      : null;

    const decisionTotals: Record<string, number> = {};
    decisionRows.forEach((row) => {
      decisionTotals[row.decision] = (decisionTotals[row.decision] ?? 0) + row.catches;
    });

    const nonAllowEntries = Object.entries(decisionTotals).filter(([name]) => name !== 'allow');
    const totalNonAllow = nonAllowEntries.reduce((sum, [, value]) => sum + value, 0);
    const weekBuckets = [...new Set(decisionRows.map((row) => row.week))];
    const averageWeeklyFriction = weekBuckets.length ? totalNonAllow / weekBuckets.length : undefined;
    const topDecision = nonAllowEntries
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }))[0];

    return {
      lossTrendChart,
      lossBreakdownChart,
      frictionStackedChart,
      frictionSummary: decisionRows.length
        ? {
            total: totalNonAllow,
            decisionTotals,
            topDecision,
            averageWeeklyFriction,
          }
        : null,
      loading: executiveMetrics.loading,
      error: executiveMetrics.error,
    };
  }, [executiveMetrics.metrics, executiveMetrics.loading, executiveMetrics.error]);

  const operationsContext: OperationsWidgetContext = useMemo(() => {
    const activeRulesList = rules.filter((rule) => rule.status === 'active');

    const rulesTable = activeRulesList
      .map((rule) => {
        const catches = rule.catches ?? 0;
        const falsePositives = rule.false_positives ?? 0;
        const effectiveness = sanitizeEffectiveness(rule.effectiveness) ?? computeEffectiveness(catches, falsePositives);

        return {
          id: rule.id,
          name: rule.name,
          description: rule.description,
          catches,
          falsePositives,
          effectiveness,
        };
      })
      .sort((a, b) => b.catches - a.catches)
      .slice(0, 8);

    const totalCatches = activeRulesList.reduce((sum, rule) => sum + (rule.catches ?? 0), 0);
    const totalFalsePositives = activeRulesList.reduce((sum, rule) => sum + (rule.false_positives ?? 0), 0);
    const avgEffectiveness = computeEffectiveness(totalCatches, totalFalsePositives);

    const decisionRows = operationsMetrics.metrics.decisionByWeek;
    const weeks = [...new Set(decisionRows.map((row) => row.week))].sort();
    const decisions = [...new Set(decisionRows.map((row) => row.decision))];

    const ticketTrendChart: ChartData<'line'> | null = weeks.length
      ? {
          labels: weeks.map((week) => dayjs(week).format('MMM D')),
          datasets: decisions.map((decision, index) => ({
            label: decision,
            data: weeks.map(
              (week) => decisionRows.find((row) => row.week === week && row.decision === decision)?.percentage ?? 0,
            ),
            borderColor: decisionColors[decision] ?? defaultPalette[index % defaultPalette.length],
            backgroundColor: decisionAreaFill(decision),
            fill: true,
            tension: 0.35,
            stack: 'decision-share',
          })),
        }
      : null;

    const alerts = operationsMetrics.metrics.alerts.length
      ? operationsMetrics.metrics.alerts
      : monitoringAlerts.map((alert) => ({
          id: String(alert.id),
          title: alert.title,
          severity: alert.severity,
          status: (alert.acknowledged ? 'in_progress' : 'open') as 'open' | 'in_progress' | 'resolved',
          created_at: dayjs().subtract(1, 'hour').toISOString(),
        }));

    return {
      rulesTable,
      rulesLoading: rulesLoading,
      ruleMonitoring: {
        active: activeRules.length,
        needsAttention: needsAttentionRules.length,
        avgEffectiveness,
      },
      alerts,
      alertsLoading: operationsMetrics.loading,
      ticketTrendChart,
      ticketsLoading: operationsMetrics.loading || executiveMetrics.loading,
    };
  }, [rules, activeRules.length, needsAttentionRules.length, rulesLoading, operationsMetrics.metrics, operationsMetrics.loading, executiveMetrics.loading, monitoringAlerts]);

  const sharedContext: SharedWidgetContext = useMemo(() => {
    const trend = dashboardMetrics.metrics.ruleTrend;
    const chart: ChartData<'line'> | null = trend
      ? {
          labels: trend.labels,
          datasets: [
            {
              label: 'Catches',
              data: trend.catches,
              borderColor: '#2563eb',
              backgroundColor: 'rgba(37,99,235,0.12)',
              fill: true,
              tension: 0.35,
            },
            {
              label: 'False Positives',
              data: trend.falsePositives,
              borderColor: '#f97316',
              backgroundColor: 'rgba(249,115,22,0.12)',
              fill: true,
              tension: 0.35,
            },
          ],
        }
      : null;

    return {
      rulePerformanceChart: chart,
      rulePerformanceLoading: dashboardMetrics.loading,
      rulePerformanceError: dashboardMetrics.error,
    };
  }, [dashboardMetrics.metrics, dashboardMetrics.loading, dashboardMetrics.error]);

  const currentView = views.find((view) => view.id === activeViewId) ?? views[0];
  const currentLayouts = layoutsByView[currentView.id] ?? createEmptyLayouts();
  const isCustomView = currentView.type === 'custom';

  const handleLayoutChange = (_layout: Layout[], allLayouts: Layouts) => {
    setLayoutsByView((prev) => ({
      ...prev,
      [currentView.id]: allLayouts,
    }));
    scheduleChartResize();
  };

  const handleRangeChange = (range: { from: Dayjs | null; to: Dayjs | null }) => {
    setStoreDateRange(range);
    scheduleChartResize();
    void fetchRules();
  };

  const handleRefresh = () => {
    void fetchRules();
    void refreshAll(user?.id ?? undefined).finally(() => {
      scheduleChartResize();
    });
  };

  const handleAddCustomView = () => {
    const index = views.filter((view) => view.type === 'custom').length + 1;
    const id = `custom-${Date.now()}`;
    const newView: DashboardView = {
      id,
      name: `Custom Board ${index}`,
      type: 'custom',
      widgets: [],
    };
    setViews((prev) => [...prev, newView]);
    setLayoutsByView((prev) => ({ ...prev, [id]: createEmptyLayouts() }));
    setActiveViewId(id);
    scheduleChartResize();
  };

  const handleRemoveCurrentView = () => {
    if (!isCustomView) return;
    setViews((prev) => prev.filter((view) => view.id !== currentView.id));
    setLayoutsByView((prev) => {
      const next = { ...prev };
      delete next[currentView.id];
      return next;
    });
    const fallback = views.find((view) => view.id !== currentView.id) ?? BUILT_IN_VIEWS[0];
    setActiveViewId(fallback.id);
    scheduleChartResize();
  };

  const handleRenameCurrentView = () => {
    if (!isCustomView) return;
    const nextName = typeof window !== 'undefined' ? window.prompt('Rename board', currentView.name) : null;
    if (!nextName) return;
    setViews((prev) => prev.map((view) => (view.id === currentView.id ? { ...view, name: nextName } : view)));
  };

  const handleToggleWidget = (widgetId: WidgetId) => {
    if (!isCustomView) return;
    setViews((prev) =>
      prev.map((view) => {
        if (view.id !== currentView.id) return view;
        const exists = view.widgets.includes(widgetId);
        const nextWidgets = exists
          ? view.widgets.filter((id) => id !== widgetId)
          : [...view.widgets, widgetId];
        return { ...view, widgets: nextWidgets };
      }),
    );
    setLayoutsByView((prev) => {
      const current = prev[currentView.id] ?? createEmptyLayouts();
      const exists = current.lg.some((item) => item.i === widgetId);
      const nextLayouts = exists ? removeWidgetFromLayouts(current, widgetId) : addWidgetToLayouts(current, widgetId);
      return {
        ...prev,
        [currentView.id]: nextLayouts,
      };
    });
    scheduleChartResize();
  };

  const handleRemoveWidget = (widgetId: WidgetId) => {
    if (!isCustomView) return;
    setViews((prev) =>
      prev.map((view) => (view.id === currentView.id ? { ...view, widgets: view.widgets.filter((id) => id !== widgetId) } : view)),
    );
    setLayoutsByView((prev) => ({
      ...prev,
      [currentView.id]: removeWidgetFromLayouts(prev[currentView.id] ?? createEmptyLayouts(), widgetId),
    }));
    scheduleChartResize();
  };

  const handleSelectBoard = useCallback(
    (id: string) => {
      setActiveViewId(id);
      scheduleChartResize();
    },
    [scheduleChartResize],
  );

  useEffect(() => {
    scheduleChartResize();
  }, [scheduleChartResize, currentView.id, currentView.widgets.length, currentLayouts]);

  const activeWidgets = currentView.widgets.map((id) => widgetDefinitions[id]).filter(Boolean);

  return (
    <div className='space-y-6'>
      <header className='space-y-2'>
        <h1 className='text-2xl font-bold text-gray-900 sm:text-3xl'>Fraud Command Center</h1>
        <p className='text-gray-600'>Role-based dashboards powered by live intelligence, tailored for leadership, operations, and bespoke workflows.</p>
      </header>

      <nav className='flex flex-wrap items-center gap-3 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm'>
        {views.map((view) => {
          const isActive = view.id === currentView.id;
          return (
            <button
              key={view.id}
              type='button'
              onClick={() => handleSelectBoard(view.id)}
              className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-medium transition ${
                isActive ? 'bg-blue-600 text-white shadow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {view.name}
            </button>
          );
        })}
        <button
          type='button'
          onClick={handleAddCustomView}
          className='inline-flex items-center gap-2 rounded-full border border-dashed border-slate-300 px-4 py-2 text-sm font-medium text-slate-500 transition hover:border-blue-300 hover:text-blue-600'
        >
          <PlusIcon className='h-4 w-4' />
          New Custom Board
        </button>
        {isCustomView && (
          <div className='ml-auto flex flex-wrap items-center gap-2'>
            <button
              type='button'
              onClick={handleRenameCurrentView}
              className='rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-500 hover:border-blue-200 hover:text-blue-600'
            >
              Rename Board
            </button>
            <button
              type='button'
              onClick={handleRemoveCurrentView}
              className='rounded-full border border-red-200 px-3 py-1 text-xs font-medium text-red-500 hover:bg-red-50'
            >
              Remove
            </button>
          </div>
        )}
      </nav>

      <section className='space-y-4'>
        <div className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
          <div>
            <h2 className='text-lg font-semibold text-gray-900'>Interactive Dashboard</h2>
            <p className='text-sm text-gray-500'>Drag, resize, and curate insights per audience. Layouts are saved locally per workspace.</p>
          </div>
          <div className='flex flex-col gap-3 sm:flex-row sm:items-center'>
            <DateRangeFields value={dateRange} onChange={handleRangeChange} disableFuture />
            <div className='flex items-center gap-3 justify-end'>
              {(rulesLoading || dashboardMetrics.loading || executiveMetrics.loading || operationsMetrics.loading) && (
                <span className='text-sm text-gray-400'>Refreshing…</span>
              )}
              <button
                type='button'
                onClick={handleRefresh}
                className='inline-flex items-center rounded-lg border border-blue-200 bg-white px-4 py-2 text-sm font-medium text-blue-600 transition hover:bg-blue-50'
              >
                Refresh Data
              </button>
            </div>
          </div>
        </div>

        <ResponsiveGridLayout
          className='-m-2'
          layouts={currentLayouts}
          cols={COLS}
          breakpoints={BREAKPOINTS}
          rowHeight={32}
          margin={[16, 16]}
          isDraggable
          isResizable
          onLayoutChange={handleLayoutChange}
          onResizeStop={() => scheduleChartResize()}
          onDragStop={() => scheduleChartResize()}
          onBreakpointChange={() => scheduleChartResize()}
          draggableHandle='.widget-drag-handle'
          compactType='vertical'
        >
          {activeWidgets.map((widget) => (
            <div key={widget.id} className='p-2'>
              <div className='flex h-full flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-md'>
                <div className='widget-drag-handle flex items-start justify-between gap-3 border-b border-gray-100 bg-gray-50/80 px-5 py-4'>
                  <div>
                    <div className='flex items-center gap-2'>
                      <widget.icon className='h-5 w-5 text-blue-500' aria-hidden='true' />
                      <h3 className='text-base font-semibold text-gray-900'>{widget.title}</h3>
                    </div>
                    {widget.description && <p className='mt-1 text-sm text-gray-500'>{widget.description}</p>}
                  </div>
                  <div className='flex items-center gap-2'>
                    {isCustomView && (
                      <button
                        type='button'
                        onMouseDown={(event) => event.stopPropagation()}
                        onClick={(event) => {
                          event.stopPropagation();
                          event.preventDefault();
                          handleRemoveWidget(widget.id);
                        }}
                        className='rounded-full border border-transparent p-1 text-gray-300 transition hover:border-red-200 hover:text-red-500'
                        aria-label={`Remove ${widget.title}`}
                      >
                        <XMarkIcon className='h-5 w-5' />
                      </button>
                    )}
                    <ArrowsPointingOutIcon className='h-5 w-5 text-gray-300' aria-hidden='true' />
                  </div>
                </div>
                <div className='flex flex-1 flex-col p-5'>
                  {widget.render({
                    dateRange,
                    executive: executiveContext,
                    operations: operationsContext,
                    shared: sharedContext,
                    view: currentView,
                    isCustomView,
                    onRemoveWidget: handleRemoveWidget,
                  })}
                </div>
              </div>
            </div>
          ))}
        </ResponsiveGridLayout>
      </section>

      {isCustomView && (
        <section className='space-y-4 rounded-2xl border border-dashed border-slate-200 bg-white/70 p-6'>
          <header className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
            <div>
              <h3 className='text-lg font-semibold text-gray-900'>Chart Library</h3>
              <p className='text-sm text-gray-500'>Select widgets to assemble your personalised workspace. Changes save automatically.</p>
            </div>
            <span className='text-xs font-medium uppercase tracking-wide text-slate-400'>Custom Board Tools</span>
          </header>
          <div className='grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3'>
            {Object.values(widgetDefinitions).map((widget) => {
              const isSelected = currentView.widgets.includes(widget.id);
              return (
                <button
                  key={widget.id}
                  type='button'
                  onClick={() => handleToggleWidget(widget.id)}
                  className={`flex items-start gap-3 rounded-xl border p-4 text-left transition ${
                    isSelected ? 'border-blue-400 bg-blue-50/60 shadow-sm' : 'border-slate-200 bg-white hover:border-blue-200'
                  }`}
                >
                  <widget.icon className={`mt-1 h-5 w-5 ${isSelected ? 'text-blue-500' : 'text-slate-400'}`} aria-hidden='true' />
                  <div className='space-y-1'>
                    <div className='flex items-center gap-2'>
                      <p className='text-sm font-semibold text-slate-900'>{widget.title}</p>
                      <span className='rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500'>{widget.category}</span>
                    </div>
                    {widget.description && <p className='text-xs text-slate-500'>{widget.description}</p>}
                    <p className='text-xs font-medium text-blue-500'>{isSelected ? 'Click to remove' : 'Click to add'}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
});

export default Overview;
