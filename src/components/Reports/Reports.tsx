import { observer } from 'mobx-react-lite';
import { reportsStore } from './ReportsStore';

const Reports = observer(() => {
  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Reports</h2>
          <button
            onClick={reportsStore.generateReport}
            disabled={reportsStore.isGenerating}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {reportsStore.isGenerating ? 'Generating...' : 'Generate Report'}
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reportsStore.reports.map((report) => (
            <div key={report.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <h3 className="font-semibold text-lg mb-2">{report.title}</h3>
              <p className="text-gray-600 text-sm mb-2">{report.description}</p>
              <div className="flex justify-between items-center text-sm text-gray-500">
                <span>Generated: {report.createdAt}</span>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  report.status === 'completed' ? 'bg-green-100 text-green-800' :
                  report.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {report.status}
                </span>
              </div>
            </div>
          ))}
        </div>

        {reportsStore.reports.length === 0 && (
          <p className="text-gray-600 text-center py-8">No reports generated yet. Click "Generate Report" to create your first report.</p>
        )}
      </div>
    </div>
  );
});

export default Reports;