import { observer } from 'mobx-react-lite';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';
// Icons: ShieldCheckIcon, ExclamationTriangleIcon, ClockIcon, CheckCircleIcon are available if needed
import { overviewStore } from './OverviewStore';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const Overview = observer(() => {
  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        titleColor: '#1f2937',
        bodyColor: '#4b5563',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        padding: 12,
        boxPadding: 6,
        usePointStyle: true,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(156, 163, 175, 0.1)',
        },
      },
      x: {
        grid: {
          display: false,
        },
      },
    },
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {overviewStore.stats.map((stat) => (
          <div key={stat.name} className="bg-white overflow-hidden rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-300">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className={`flex-shrink-0 rounded-md bg-${stat.color}-100 p-3`}>
                  <stat.icon className={`h-6 w-6 text-${stat.color}-600`} />
                </div>
                <div className="ml-4">
                  <dt className="text-sm font-medium text-gray-500 truncate">{stat.name}</dt>
                  <dd className="mt-1 text-2xl font-semibold text-gray-900">{stat.value}</dd>
                </div>
              </div>
              <div className="mt-4">
                <div className={`inline-flex items-baseline px-2.5 py-0.5 rounded-full text-sm font-medium ${
                  stat.changeType === 'increase'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {stat.change}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-300">
          <h3 className="text-lg font-medium text-gray-900 mb-6">Fraud Detection Trend</h3>
          <Line data={overviewStore.fraudDetectionData} options={chartOptions} />
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-300">
          <h3 className="text-lg font-medium text-gray-900 mb-6">Fraud Types Distribution</h3>
          <Doughnut data={overviewStore.fraudTypeData} options={{ ...chartOptions, aspectRatio: 2 }} />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-300">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-100">
          <h3 className="text-lg font-medium text-gray-900">Recent Alerts</h3>
        </div>
        <div className="divide-y divide-gray-100">
          {overviewStore.recentAlerts.map((alert) => (
            <div key={alert.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50 transition-colors duration-150">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">{alert.type}</p>
                    <p className="text-sm text-gray-500">{alert.timestamp}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    alert.risk === 'High' ? 'bg-red-100 text-red-800' :
                    alert.risk === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {alert.risk}
                  </span>
                  <span className="text-sm text-gray-500">{alert.status}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

export default Overview;