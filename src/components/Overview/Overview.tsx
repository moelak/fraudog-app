import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from 'react';
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
import { useDashboardMetrics, type DashboardDateRange } from '@/hooks/useDashboardMetrics';
import { useExecutiveMetrics } from '@/hooks/useExecutiveMetrics';
import { useOperationsMetrics } from '@/hooks/useOperationsMetrics';
import { monitoringStore } from '@/components/Monitoring/MonitoringStore';
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
const OPERATIONS_WIDGETS = ['ops-rules-table', 'ops-alert-list', 'ops-ticket-trend', 'shared-rule-performance'] as const;

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
  frictionStackedChart: ChartData<'bar'> | null;
  frictionSummary: {
    total: number;
    channelTotals: Record<string, number>;
    topChannel?: { name: string; value: number };
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
    falsePositiveRate: number;
  }>;
  rulesLoading: boolean;
  alerts: Array<{
    id: string;
    title: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    status: 'open' | 'in_progress' | 'resolved';
    created_at: string;
  }>;
  alertsLoading: boolean;
  ticketTrendChart: ChartData<'bar'> | null;
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
    name: 'Executive View',
    type: 'executive',
    widgets: [...EXECUTIVE_WIDGETS],
    locked: true,
  },
  {
    id: 'operations',
    name: 'Operations View',
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
      { i: 'ops-rules-table', x: 0, y: 0, w: 7, h: 13 },
      { i: 'ops-alert-list', x: 7, y: 0, w: 5, h: 13 },
      { i: 'ops-ticket-trend', x: 0, y: 13, w: 6, h: 12 },
      { i: 'shared-rule-performance', x: 6, y: 13, w: 6, h: 12 },
    ],
    md: [
      { i: 'ops-rules-table', x: 0, y: 0, w: 10, h: 13 },
      { i: 'ops-alert-list', x: 0, y: 13, w: 10, h: 10 },
      { i: 'ops-ticket-trend', x: 0, y: 23, w: 10, h: 12 },
      { i: 'shared-rule-performance', x: 0, y: 35, w: 10, h: 12 },
    ],
    sm: [
      { i: 'ops-rules-table', x: 0, y: 0, w: 6, h: 13 },
      { i: 'ops-alert-list', x: 0, y: 13, w: 6, h: 10 },
      { i: 'ops-ticket-trend', x: 0, y: 23, w: 6, h: 12 },
      { i: 'shared-rule-performance', x: 0, y: 35, w: 6, h: 12 },
    ],
    xs: [
      { i: 'ops-rules-table', x: 0, y: 0, w: 4, h: 13 },
      { i: 'ops-alert-list', x: 0, y: 13, w: 4, h: 10 },
      { i: 'ops-ticket-trend', x: 0, y: 23, w: 4, h: 12 },
      { i: 'shared-rule-performance', x: 0, y: 35, w: 4, h: 12 },
    ],
    xxs: [
      { i: 'ops-rules-table', x: 0, y: 0, w: 2, h: 13 },
      { i: 'ops-alert-list', x: 0, y: 13, w: 2, h: 10 },
      { i: 'ops-ticket-trend', x: 0, y: 23, w: 2, h: 12 },
      { i: 'shared-rule-performance', x: 0, y: 35, w: 2, h: 12 },
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
    description: 'Weekly friction volume by channel (3DS, KYC, manual review, auto allow).',
    icon: QueueListIcon,
    category: 'Executive',
    render: ({ executive }) => {
      if (executive.loading) return <LoadingState />;
      if (!executive.frictionStackedChart) {
        return <EmptyState message={executive.error ?? 'No friction activity captured for this range.'} />;
      }
      return <Bar data={executive.frictionStackedChart} options={stackedBarOptions} />;
    },
  },
  'exec-friction-kpis': {
    id: 'exec-friction-kpis',
    title: 'Friction Summary',
    description: 'Impact on growth goals and staffing sensitivity.',
    icon: Cog6ToothIcon,
    category: 'Executive',
    render: ({ executive }) => {
      if (executive.loading) return <LoadingState />;
      if (!executive.frictionSummary) {
        return <EmptyState message={executive.error ?? 'No friction summary available.'} />;
      }

      const { total, channelTotals, topChannel, averageWeeklyFriction } = executive.frictionSummary;
      const orderedChannels = Object.entries(channelTotals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4);

      const formatter = new Intl.NumberFormat('en-US');

      return (
        <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
          <div className='rounded-xl border border-gray-100 bg-slate-50 p-4'>
            <p className='text-xs font-semibold uppercase tracking-wide text-slate-500'>Total Friction Volume</p>
            <p className='mt-1 text-2xl font-semibold text-slate-900'>{formatter.format(total)}</p>
            {averageWeeklyFriction && (
              <p className='mt-2 text-xs text-slate-500'>Avg weekly impact: {formatter.format(Math.round(averageWeeklyFriction))}</p>
            )}
          </div>
          <div className='space-y-3 rounded-xl border border-gray-100 bg-white p-4'>
            <p className='text-xs font-semibold uppercase tracking-wide text-slate-500'>Friction Mix</p>
            <ul className='space-y-2'>
              {orderedChannels.map(([channel, value]) => (
                <li key={channel} className='flex items-center justify-between text-sm'>
                  <span className='text-slate-600'>{channel}</span>
                  <span className='font-medium text-slate-900'>{formatter.format(value)}</span>
                </li>
              ))}
            </ul>
            {topChannel && (
              <p className='text-xs text-slate-500'>Largest source: {topChannel.name} ({formatter.format(topChannel.value)})</p>
            )}
          </div>
        </div>
      );
    },
  },
  'ops-rules-table': {
    id: 'ops-rules-table',
    title: 'Rule Performance Table',
    description: 'Monitor false positive impact and catches per rule.',
    icon: TableCellsIcon,
    category: 'Operations',
    render: ({ operations }) => {
      if (operations.rulesLoading) return <LoadingState />;
      if (!operations.rulesTable.length) return <EmptyState message='No rules available in this range.' />;
      return (
        <div className='overflow-hidden rounded-xl border border-gray-100'>
          <table className='min-w-full divide-y divide-gray-200'>
            <thead className='bg-gray-50 text-xs uppercase tracking-wide text-gray-500'>
              <tr>
                <th className='px-4 py-3 text-left font-semibold'>Rule</th>
                <th className='px-4 py-3 text-left font-semibold'>Description</th>
                <th className='px-4 py-3 text-right font-semibold'>Catches</th>
                <th className='px-4 py-3 text-right font-semibold'>False Positives %</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-gray-100 bg-white text-sm text-gray-600'>
              {operations.rulesTable.map((rule) => (
                <tr key={rule.id} className='hover:bg-slate-50'>
                  <td className='px-4 py-3 font-medium text-slate-900'>{rule.name}</td>
                  <td className='px-4 py-3'>{rule.description || '—'}</td>
                  <td className='px-4 py-3 text-right font-medium text-slate-900'>{rule.catches.toLocaleString()}</td>
                  <td className='px-4 py-3 text-right font-medium text-slate-900'>{rule.falsePositiveRate.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
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
    title: 'Friction Ticket Trend',
    description: 'Weekly tickets opened per friction touchpoint.',
    icon: QueueListIcon,
    category: 'Operations',
    render: ({ operations }) => {
      if (operations.ticketsLoading) return <LoadingState />;
      if (!operations.ticketTrendChart) return <EmptyState message='No tickets tracked for this period.' />;
      return <Bar data={operations.ticketTrendChart} options={stackedBarOptions} />;
    },
  },
  'shared-rule-performance': {
    id: 'shared-rule-performance',
    title: 'Rule Performance Trend',
    description: 'Catches vs. false positives (daily view).',
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
    description: 'Shared view of fraud losses.',
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
    title: 'Friction Volume by Channel',
    description: 'Shared stacked breakdown of friction events.',
    icon: QueueListIcon,
    category: 'Shared',
    render: ({ executive }) => {
      if (executive.loading) return <LoadingState />;
      if (!executive.frictionStackedChart) return <EmptyState message={executive.error ?? 'No friction data.'} />;
      return <Bar data={executive.frictionStackedChart} options={stackedBarOptions} />;
    },
  },
};

const defaultLineOptions: ChartOptions<'line'> = {
  responsive: true,
  maintainAspectRatio: false,
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

const stackedBarOptions: ChartOptions<'bar'> = {
  responsive: true,
  maintainAspectRatio: false,
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
    y: { stacked: true, beginAtZero: true, grid: { color: 'rgba(148,163,184,0.2)' }, ticks: { color: '#475569' } },
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

const Overview = observer(() => {
  const {
    rules,
    loading: rulesLoading,
    fetchRules,
  } = useRules();

  const [dateRange, setDateRange] = useState<DashboardDateRange>(() => ({
    from: dayjs().subtract(12, 'week'),
    to: dayjs(),
  }));

  const dashboardMetrics = useDashboardMetrics(dateRange);
  const executiveMetrics = useExecutiveMetrics(dateRange);
  const operationsMetrics = useOperationsMetrics(dateRange);

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

  const monitoringAlerts = monitoringStore.activeAlerts.slice();

  const executiveContext: ExecutiveWidgetContext = useMemo(() => {
    const lossRows = executiveMetrics.metrics.lossByWeek;
    const frictionRows = executiveMetrics.metrics.frictionByChannel;

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

    const sortedWeeksFriction = [...new Set(frictionRows.map((row) => row.week))].sort();
    const channels = [...new Set(frictionRows.map((row) => row.channel))];

    const frictionStackedChart: ChartData<'bar'> | null = sortedWeeksFriction.length
      ? {
          labels: sortedWeeksFriction.map((week) => dayjs(week).format('MMM D')),
          datasets: channels.map((channel, index) => {
            const colorPalette = ['#2563eb', '#0ea5e9', '#14b8a6', '#f59e0b', '#8b5cf6'];
            return {
              label: channel,
              data: sortedWeeksFriction.map(
                (week) => frictionRows.find((row) => row.week === week && row.channel === channel)?.transactions ?? 0,
              ),
              backgroundColor: colorPalette[index % colorPalette.length],
            } as ChartDataset<'bar'>;
          }),
        }
      : null;

    const channelTotals: Record<string, number> = {};
    frictionRows.forEach((row) => {
      channelTotals[row.channel] = (channelTotals[row.channel] ?? 0) + row.transactions;
    });

    const totalFriction = Object.values(channelTotals).reduce((sum, value) => sum + value, 0);
    const weeklyBuckets = [...new Set(frictionRows.map((row) => row.week))];
    const averageWeeklyFriction = weeklyBuckets.length ? totalFriction / weeklyBuckets.length : undefined;
    const topChannel = Object.entries(channelTotals)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }))[0];

    return {
      lossTrendChart,
      lossBreakdownChart,
      frictionStackedChart,
      frictionSummary: totalFriction
        ? {
            total: totalFriction,
            channelTotals,
            topChannel,
            averageWeeklyFriction,
          }
        : null,
      loading: executiveMetrics.loading,
      error: executiveMetrics.error,
    };
  }, [executiveMetrics.metrics, executiveMetrics.loading, executiveMetrics.error]);

  const operationsContext: OperationsWidgetContext = useMemo(() => {
    const rulesTable = rules
      .map((rule) => ({
        id: rule.id,
        name: rule.name,
        description: rule.description,
        catches: rule.catches ?? 0,
        falsePositives: rule.false_positives ?? 0,
        falsePositiveRate: rule.catches ? ((rule.false_positives ?? 0) / rule.catches) * 100 : 0,
      }))
      .sort((a, b) => b.falsePositiveRate - a.falsePositiveRate)
      .slice(0, 8);

    const ticketRows = operationsMetrics.metrics.ticketTrend;
    const weeks = [...new Set(ticketRows.map((row) => row.week))].sort();
    const ticketChannels = [...new Set(ticketRows.map((row) => row.channel))];

    const ticketTrendChart: ChartData<'bar'> | null = weeks.length
      ? {
          labels: weeks.map((week) => dayjs(week).format('MMM D')),
          datasets: ticketChannels.map((channel, index) => {
            const palette = ['#2563eb', '#0ea5e9', '#14b8a6', '#f97316', '#a855f7'];
            return {
              label: channel,
              data: weeks.map((week) => ticketRows.find((row) => row.week === week && row.channel === channel)?.tickets ?? 0),
              backgroundColor: palette[index % palette.length],
            } as ChartDataset<'bar'>;
          }),
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
      alerts,
      alertsLoading: operationsMetrics.loading,
      ticketTrendChart,
      ticketsLoading: operationsMetrics.loading,
    };
  }, [rules, rulesLoading, operationsMetrics.metrics, operationsMetrics.loading, monitoringAlerts]);

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
  };

  const handleRangeChange = (range: { from: Dayjs | null; to: Dayjs | null }) => {
    setDateRange(range);
  };

  const handleRefresh = () => {
    void fetchRules();
    void dashboardMetrics.refresh(dateRange);
    void executiveMetrics.refresh(dateRange);
    void operationsMetrics.refresh(dateRange);
  };

  const handleAddCustomView = () => {
    const index = views.filter((view) => view.type === 'custom').length + 1;
    const id = `custom-${Date.now()}`;
    const newView: DashboardView = {
      id,
      name: `Custom View ${index}`,
      type: 'custom',
      widgets: [],
    };
    setViews((prev) => [...prev, newView]);
    setLayoutsByView((prev) => ({ ...prev, [id]: createEmptyLayouts() }));
    setActiveViewId(id);
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
  };

  const handleRenameCurrentView = () => {
    if (!isCustomView) return;
    const nextName = typeof window !== 'undefined' ? window.prompt('Rename view', currentView.name) : null;
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
  };

  const activeWidgets = currentView.widgets.map((id) => widgetDefinitions[id]).filter(Boolean);

  return (
    <div className='space-y-6'>
      <header className='space-y-2'>
        <h1 className='text-2xl font-bold text-gray-900 sm:text-3xl'>Fraud Command Center</h1>
        <p className='text-gray-600'>Role-based dashboards backed by Supabase data, tailored for leadership, operations, and bespoke workflows.</p>
      </header>

      <nav className='flex flex-wrap items-center gap-3 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm'>
        {views.map((view) => {
          const isActive = view.id === currentView.id;
          return (
            <button
              key={view.id}
              type='button'
              onClick={() => setActiveViewId(view.id)}
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
          New Custom View
        </button>
        {isCustomView && (
          <div className='ml-auto flex flex-wrap items-center gap-2'>
            <button
              type='button'
              onClick={handleRenameCurrentView}
              className='rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-500 hover:border-blue-200 hover:text-blue-600'
            >
              Rename
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
            <p className='text-sm text-gray-500'>Drag, resize, and curate insights per audience. Layouts are saved locally per view.</p>
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
                        onClick={() => handleRemoveWidget(widget.id)}
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
              <p className='text-sm text-gray-500'>Select widgets to assemble your personalised view. Changes save automatically.</p>
            </div>
            <span className='text-xs font-medium uppercase tracking-wide text-slate-400'>Custom View Tools</span>
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
