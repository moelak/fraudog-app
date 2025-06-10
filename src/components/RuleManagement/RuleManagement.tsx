import { observer } from 'mobx-react-lite';
import { ruleManagementStore } from './RuleManagementStore';
import CreateRuleModal from './CreateRuleModal';
import RuleActionsMenu from './RuleActionsMenu';
import {
  PlusIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

const RuleManagement = observer(() => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Rule Management</h1>
          <p className="mt-2 text-gray-600">Create and manage fraud detection rules</p>
        </div>
        <button
          onClick={ruleManagementStore.openCreateModal}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Create New Rule
        </button>
      </div>

      {/* Rules Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rule
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Severity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Updated
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {ruleManagementStore.rules.map((rule) => (
                <tr key={rule.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-start space-x-3">
                      <div className={`p-2 rounded-lg ${
                        rule.severity === 'high' ? 'bg-red-100' :
                        rule.severity === 'medium' ? 'bg-yellow-100' :
                        'bg-green-100'
                      }`}>
                        {rule.severity === 'high' ? (
                          <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
                        ) : (
                          <ShieldCheckIcon className="h-5 w-5 text-blue-600" />
                        )}
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">{rule.name}</h3>
                        <p className="text-sm text-gray-500 mt-1">{rule.description}</p>
                        <div className="mt-2 bg-gray-50 rounded p-2">
                          <code className="text-xs text-gray-700">{rule.condition}</code>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {rule.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      rule.severity === 'high' ? 'bg-red-100 text-red-800' :
                      rule.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {rule.severity}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      rule.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {rule.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {rule.updatedAt}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <RuleActionsMenu rule={rule} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {ruleManagementStore.rules.length === 0 && (
        <div className="text-center py-12">
          <ShieldCheckIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No rules</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating a new fraud detection rule.</p>
          <div className="mt-6">
            <button
              onClick={ruleManagementStore.openCreateModal}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Create New Rule
            </button>
          </div>
        </div>
      )}

      {/* Create Rule Modal */}
      <CreateRuleModal />
    </div>
  );
});

export default RuleManagement;