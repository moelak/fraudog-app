import { observer } from 'mobx-react-lite';
import { ruleManagementStore } from './RuleManagementStore';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
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
          Create Rule
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {ruleManagementStore.rules.map((rule) => (
          <div key={rule.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-300">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4">
                <div className={`p-2 rounded-lg ${
                  rule.severity === 'high' ? 'bg-red-100' :
                  rule.severity === 'medium' ? 'bg-yellow-100' :
                  'bg-green-100'
                }`}>
                  {rule.severity === 'high' ? (
                    <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
                  ) : (
                    <ShieldCheckIcon className="h-6 w-6 text-blue-600" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{rule.name}</h3>
                  <p className="text-gray-600 mt-1">{rule.description}</p>
                  <div className="flex items-center space-x-4 mt-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      rule.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {rule.status}
                    </span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      rule.severity === 'high' ? 'bg-red-100 text-red-800' :
                      rule.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {rule.severity} severity
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => ruleManagementStore.editRule(rule.id)}
                  className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                >
                  <PencilIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={() => ruleManagementStore.deleteRule(rule.id)}
                  className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="mt-4 bg-gray-50 rounded-lg p-3">
              <p className="text-sm text-gray-700 font-mono">{rule.condition}</p>
            </div>
          </div>
        ))}
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
              Create Rule
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

export default RuleManagement;