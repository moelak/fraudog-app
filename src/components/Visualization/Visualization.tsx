import { observer } from 'mobx-react-lite';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { visualizationStore } from './VisualizationStore';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const Visualization = observer(() => {
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
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Visualization</h1>
        <p className="mt-2 text-gray-600">Visual analytics and fraud detection insights</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-300">
          <h3 className="text-lg font-medium text-gray-900 mb-6">Fraud Detection Trends</h3>
          <Line data={visualizationStore.fraudTrendData} options={chartOptions} />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-300">
          <h3 className="text-lg font-medium text-gray-900 mb-6">Transaction Volume</h3>
          <Bar data={visualizationStore.transactionVolumeData} options={chartOptions} />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-300">
          <h3 className="text-lg font-medium text-gray-900 mb-6">Risk Score Distribution</h3>
          <Doughnut data={visualizationStore.riskScoreData} options={{ ...chartOptions, aspectRatio: 2 }} />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-300">
          <h3 className="text-lg font-medium text-gray-900 mb-6">Geographic Distribution</h3>
          <Bar data={visualizationStore.geographicData} options={chartOptions} />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-300">
        <h3 className="text-lg font-medium text-gray-900 mb-6">Real-time Fraud Detection</h3>
        <Line data={visualizationStore.realTimeData} options={{
          ...chartOptions,
          animation: {
            duration: 0
          },
          scales: {
            ...chartOptions.scales,
            x: {
              ...chartOptions.scales.x,
              type: 'linear',
              position: 'bottom'
            }
          }
        }} />
      </div>
    </div>
  );
});

export default Visualization;