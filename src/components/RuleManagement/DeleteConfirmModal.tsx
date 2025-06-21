import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { ruleManagementStore } from './RuleManagementStore';
import { useRules } from '../../hooks/useRules';
import { 
  XMarkIcon, 
  ExclamationTriangleIcon,
  TrashIcon,
  ArrowUturnLeftIcon
} from '@heroicons/react/24/outline';

const DeleteConfirmModal = observer(() => {
  const { softDeleteRule, permanentDeleteRule, fetchRules } = useRules();
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteType, setDeleteType] = useState<'soft' | 'permanent'>('soft');

  const rule = ruleManagementStore.deletingRule;

  const handleDelete = async () => {
    if (!rule) return;

    setIsDeleting(true);
    try {
      if (deleteType === 'soft') {
        await softDeleteRule(rule.id);
      } else {
        await permanentDeleteRule(rule.id);
      }
      
      ruleManagementStore.closeDeleteConfirmModal();
      
      // Refresh the table to show changes immediately
      await fetchRules();
      
    } catch (error) {
      console.error('Error deleting rule:', error);
      alert('Failed to delete rule: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    ruleManagementStore.closeDeleteConfirmModal();
    setDeleteType('soft');
  };

  if (!ruleManagementStore.isDeleteConfirmModalOpen || !rule) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={handleClose}
        />

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          {/* Header */}
          <div className="bg-white px-6 pt-6 pb-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="ml-3 text-lg font-medium text-gray-900">
                  Delete Rule
                </h3>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                You are about to delete the rule: <strong>"{rule.name}"</strong>
              </p>

              {/* Delete Type Selection */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  Choose deletion type:
                </label>
                
                <div className="space-y-2">
                  <label className="flex items-start space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="deleteType"
                      value="soft"
                      checked={deleteType === 'soft'}
                      onChange={(e) => setDeleteType(e.target.value as 'soft')}
                      className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <div className="flex-1">
                      <div className="flex items-center">
                        <ArrowUturnLeftIcon className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm font-medium text-gray-900">
                          Move to Deleted Rules (Recommended)
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        The rule will be moved to the "Deleted Rules" tab and can be recovered later. 
                        The rule will be deactivated but data is preserved.
                      </p>
                    </div>
                  </label>

                  <label className="flex items-start space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="deleteType"
                      value="permanent"
                      checked={deleteType === 'permanent'}
                      onChange={(e) => setDeleteType(e.target.value as 'permanent')}
                      className="mt-1 h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300"
                    />
                    <div className="flex-1">
                      <div className="flex items-center">
                        <TrashIcon className="h-4 w-4 text-red-500 mr-2" />
                        <span className="text-sm font-medium text-red-900">
                          Delete Permanently
                        </span>
                      </div>
                      <p className="text-xs text-red-600 mt-1">
                        ⚠️ This action cannot be undone. The rule and all its data will be 
                        permanently removed from the database.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {deleteType === 'permanent' && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex">
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-red-800">
                        Warning: Permanent Deletion
                      </h4>
                      <p className="text-sm text-red-700 mt-1">
                        This will permanently remove the rule from the database. 
                        All associated data including catches, false positives, and 
                        effectiveness metrics will be lost forever.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className={`w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm transition-colors disabled:opacity-50 ${
                deleteType === 'permanent'
                  ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                  : 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500'
              }`}
            >
              {isDeleting ? 'Deleting...' : (
                deleteType === 'permanent' ? 'Delete Permanently' : 'Move to Deleted'
              )}
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="mt-3 w-full inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

export default DeleteConfirmModal;