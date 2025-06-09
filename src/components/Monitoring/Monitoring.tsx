import { observer } from 'mobx-react-lite';
import { monitoringStore } from './MonitoringStore';
import {
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';

const Monitoring = observer(() => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Monitoring</h1>
        <p className="mt-2 text-gray-600">Real-time system monitoring and alerts</p>
      </div>

      {/* System Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {monitoringStore.systemMetrics.map((metric) => (
          <div key={metric.name} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-300">
            <div className="flex items-center">
              <div className={`flex-shrink-0 rounded-md p-3 ${
                metric.status === 'healthy' ? 'bg-green-100' :
                metric.status === 'warning' ? 'bg-yellow-100' :
                'bg-red-100'
              }`}>
                {metric.status === 'healthy' ? (
                  <CheckCircleIcon className="h-6 w-6 text-green-600" />
                ) : metric.status === 'warning' ? (
                  <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600" />
                ) : (
                  <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
                )}
              </div>
              <div className="ml-4">
                <dt className="text-sm font-medium text-gray-500">{metric.name}</dt>
                <dd className="mt-1 text-2xl font-semibold text-gray-900">{metric.value}</dd>
              </div>
            </div>
            <div className="mt-4">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                metric.status === 'healthy' ? 'bg-green-100 text-green-800' :
                metric.status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {metric.status}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Active Alerts */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-300">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-medium text-gray-900">Active Alerts</h3>
        </div>
        <div className="divide-y divide-gray-100">
          {monitoringStore.activeAlerts.map((alert) => (
            <div key={alert.id} className="px-6 py-4 hover:bg-gray-50 transition-colors duration-150">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`flex-shrink-0 rounded-full p-1 ${
                    alert.severity === 'critical' ? 'bg-red-100' :
                    alert.severity === 'high' ? 'bg-orange-100' :
                    alert.severity === 'medium' ? 'bg-yellow-100' :
                    'bg-blue-100'
                  }`}>
                    <ExclamationTriangleIcon className={`h-4 w-4 ${
                      alert.severity === 'critical' ? 'text-red-600' :
                      alert.severity === 'high' ? 'text-orange-600' :
                      alert.severity === 'medium' ? 'text-yellow-600' :
                      'text-blue-600'
                    }`} />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">{alert.title}</p>
                    <p className="text-sm text-gray-500">{alert.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    alert.severity === 'critical' ? 'bg-red-100 text-red-800' :
                    alert.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                    alert.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {alert.severity}
                  </span>
                  <span className="text-sm text-gray-500">{alert.timestamp}</span>
                  <button
                    onClick={() => monitoringStore.acknowledgeAlert(alert.id)}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Acknowledge
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* System Logs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-300">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-medium text-gray-900">Recent System Logs</h3>
        </div>
        <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
          {monitoringStore.systemLogs.map((log) => (
            <div key={log.id} className="px-6 py-3 hover:bg-gray-50 transition-colors duration-150">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                    log.level === 'error' ? 'bg-red-100 text-red-800' :
                    log.level === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                    log.level === 'info' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {log.level.toUpperCase()}
                  </span>
                  <span className="ml-3 text-sm text-gray-900 font-mono">{log.message}</span>
                </div>
                <span className="text-sm text-gray-500">{log.timestamp}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

export default Monitoring;