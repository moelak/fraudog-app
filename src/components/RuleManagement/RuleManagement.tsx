import { observer } from 'mobx-react-lite';
import { ruleManagementStore } from './RuleManagementStore';
import CreateRuleModal from './CreateRuleModal';
import ChargebackAnalysisModal from './ChargebackAnalysisModal';
import RuleActionsMenu from './RuleActionsMenu';
import {
  PlusIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

const RuleManagement = observer(() => {
  const tabs = [
    { id: 'active', name: 'Active Rules', count: ruleManagementStore.activeRulesCount },
    { id: 'all', name: 'All Rules', count: ruleManagementStore.rules.length },
    { id: 'attention', name: 'Needs Attention', count: ruleManagementStore.needsAttentionCount },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Rule Management</h1>
          <p className="mt-2 text-gray-600">Create and manage fraud detection rules</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={ruleManagementStore.openChargebackAnalysis}
            className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-sm"
          >
            <ChartBarIcon className="h-5 w-5 mr-2" />
            Chargeback Analysis
          </button>
          <button
            onClick={ruleManagementStore.openCreateModal}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Create New Rule
          </button>
        </div>
      </div>

      {/* Tabs and Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-6 space-y-4 sm:space-y-0">
            {/* Tabs */}
            <nav className="flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => ruleManagementStore.setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    ruleManagementStore.activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span>{tab.name}</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    ruleManagementStore.activeTab === tab.id
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </nav>

            {/* Search Bar */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search rules..."
                value={ruleManagementStore.searchQuery}
                onChange={(e) => ruleManagementStore.setSearchQuery(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>
        </div>

        {/* Rules Table */}
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
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Catches
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  False Positives
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Effectiveness
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {ruleManagementStore.filteredRules.map((rule) => (
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
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-medium text-gray-900 truncate">{rule.name}</h3>
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{rule.description}</p>
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
                      rule.status === 'active' ? 'bg-green-100 text-green-800' : 
                      rule.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {rule.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{rule.catches.toLocaleString()}</div>
                    <div className="text-xs text-gray-500">fraud caught</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{rule.falsePositives.toLocaleString()}</div>
                    <div className="text-xs text-gray-500">false flags</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className={`text-sm font-medium ${
                        rule.effectiveness >= 90 ? 'text-green-600' :
                        rule.effectiveness >= 70 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {rule.effectiveness}%
                      </div>
                      <div className={`ml-2 w-16 bg-gray-200 rounded-full h-2`}>
                        <div
                          className={`h-2 rounded-full ${
                            rule.effectiveness >= 90 ? 'bg-green-500' :
                            rule.effectiveness >= 70 ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${rule.effectiveness}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => ruleManagementStore.toggleRuleStatus(rule.id)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          rule.status === 'active' ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            rule.status === 'active' ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                      <RuleActionsMenu rule={rule} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {ruleManagementStore.filteredRules.length === 0 && (
          <div className="text-center py-12">
            <ShieldCheckIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              {ruleManagementStore.searchQuery ? 'No rules found' : 'No rules'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {ruleManagementStore.searchQuery 
                ? 'Try adjusting your search terms or filters.'
                : 'Get started by creating a new fraud detection rule.'
              }
            </p>
            {!ruleManagementStore.searchQuery && (
              <div className="mt-6">
                <button
                  onClick={ruleManagementStore.openCreateModal}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Create New Rule
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateRuleModal />
      <ChargebackAnalysisModal />
    </div>
  );
});

export default RuleManagement;