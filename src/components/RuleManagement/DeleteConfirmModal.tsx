import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { ruleManagementStore } from './RuleManagementStore';
import { useRules } from '../../hooks/useRules';
import { showSuccessToast, showErrorToast } from '../../utils/toast';
import { XMarkIcon, ExclamationTriangleIcon, ArrowUturnLeftIcon } from '@heroicons/react/24/outline';

const DeleteConfirmModal = observer(() => {
	const { softDeleteRule, permanentDeleteRule } = useRules();
	const [isDeleting, setIsDeleting] = useState(false);
	const [confirmText, setConfirmText] = useState('');
	const deleteType = ruleManagementStore.activeTab === 'deleted' ? 'permanent' : 'soft';
	const rule = ruleManagementStore.deletingRule;

	const handleDelete = async () => {
		setConfirmText('');
		if (!rule) return;
		if (confirmText.trim() !== rule.name.trim()) {
			showErrorToast('Please type the exact rule name to confirm deletion.');
			return;
		}

		setIsDeleting(true);
		console.log('deleteType', deleteType);
		try {
			if (deleteType === 'soft') {
				await softDeleteRule(rule.id);

				// ✅ Update MobX store to reflect soft-deleted rule
				const updatedRule = {
					...rule,
					is_deleted: true,
					updated_at: new Date().toISOString(),
				};
				ruleManagementStore.updateRuleInStore(updatedRule);

				showSuccessToast('Rule moved to deleted rules successfully.');
			} else {
				await permanentDeleteRule(rule.id);

				// ✅ Optionally remove rule completely from MobX store (optional but recommended)
				ruleManagementStore.rules = ruleManagementStore.rules.filter((r) => r.id !== rule.id);
				ruleManagementStore.inProgressRules = ruleManagementStore.inProgressRules.filter((r) => r.id !== rule.id);

				showSuccessToast('Rule permanently deleted.');
			}

			ruleManagementStore.closeDeleteConfirmModal();
			// The hook will automatically refresh the data
		} catch (error) {
			console.error('Error deleting rule:', error);
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			showErrorToast(`Failed to delete rule: ${errorMessage}`);
		} finally {
			setIsDeleting(false);
		}
	};

	const handleClose = () => {
		ruleManagementStore.closeDeleteConfirmModal();
		setConfirmText('');
	};

	if (!ruleManagementStore.isDeleteConfirmModalOpen || !rule) return null;
	const isConfirmMatched = confirmText.trim() === rule.name.trim();

	return (
		<div className='fixed inset-0 z-50 overflow-y-auto'>
			<div className='flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0'>
				{/* Background overlay */}
				<div className='fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity z-40' onClick={handleClose} />
				{/* Modal panel */}
				<div className='relative z-50 inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full'>
					{/* Header */}
					<div className='bg-white px-6 pt-6 pb-4'>
						<div className='flex items-center justify-between mb-4'>
							<div className='flex items-center'>
								<div className='flex-shrink-0'>
									<ExclamationTriangleIcon className='h-6 w-6 text-red-600' />
								</div>
								<h3 className='ml-3 text-lg font-medium text-gray-900'>Delete Rule</h3>
							</div>
							<button type='button' onClick={handleClose} className='text-gray-400 hover:text-gray-600 transition-colors'>
								<XMarkIcon className='h-6 w-6' />
							</button>
						</div>

						<div className='space-y-4'>
							{ruleManagementStore.activeTab === 'deleted' ? (
								<>
									<p className='text-sm text-gray-600'>
										You are about to delete the rule: <strong>"{rule.name}"</strong>
									</p>
									<p className='text-xs text-red-600 mt-1'>
										⚠️ This action cannot be undone. The rule and all its data will be permanently removed from the database.
									</p>

									<input
										type='text'
										value={confirmText}
										onChange={(e) => setConfirmText(e.target.value)}
										placeholder='Type rule name exactly...'
										className='w-full mt-2 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500'
									/>
									{!isConfirmMatched && confirmText.length > 0 && (
										<p className='text-xs text-red-500 mt-1'>The rule name does not match. Please type it exactly.</p>
									)}
								</>
							) : (
								<div className='space-y-4'>
									<p className='text-sm text-gray-600'>
										You’re about to remove the rule: <strong>"{rule.name}"</strong>
									</p>

									<div className='flex items-start space-x-3 bg-gray-50 p-3 rounded-md'>
										<ArrowUturnLeftIcon className='h-5 w-5 text-gray-400 mt-0.5' />
										<div>
											<p className='text-sm font-medium text-gray-900'>
												Move this rule to the <span className='font-semibold'>Deleted Rules</span> tab
											</p>
											<p className='text-xs text-gray-500 mt-1'>
												The rule will be deactivated and hidden from your active list. You can restore it anytime from the Deleted Rules tab.
											</p>
										</div>
									</div>
									<input
										type='text'
										value={confirmText}
										onChange={(e) => setConfirmText(e.target.value)}
										placeholder='Type rule name exactly...'
										className='w-full mt-2 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500'
									/>
									{!isConfirmMatched && confirmText.length > 0 && (
										<p className='text-xs text-red-500 mt-1'>The rule name does not match. Please type it exactly.</p>
									)}
								</div>
							)}
							{/* {deleteType === 'permanent' && (
								<div className='bg-red-50 border border-red-200 rounded-lg p-3'>
									<div className='flex'>
										<ExclamationTriangleIcon className='h-5 w-5 text-red-400' />
										<div className='ml-3'>
											<h4 className='text-sm font-medium text-red-800'>Warning: Permanent Deletion</h4>
											<p className='text-sm text-red-700 mt-1'>
												This will permanently remove the rule from the database. All associated data including catches, false positives, and effectiveness
												metrics will be lost forever.
											</p>
										</div>
									</div>
								</div>
							)} */}
						</div>
					</div>

					{/* Footer */}
					<div className='bg-gray-50 px-6 py-4 sm:flex sm:flex-row-reverse'>
						<button
							type='button'
							onClick={handleDelete}
							disabled={!isConfirmMatched}
							className={`w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white sm:ml-3 sm:w-auto sm:text-sm transition-colors ${
								deleteType === 'permanent'
									? isConfirmMatched
										? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
										: 'bg-red-400 cursor-not-allowed'
									: isConfirmMatched
									? 'bg-yellow-500 hover:bg-yellow-600 focus:ring-yellow-500'
									: 'bg-yellow-600 cursor-not-allowed'
							}`}
						>
							{isDeleting ? 'Deleting...' : deleteType === 'permanent' ? 'Delete Permanently' : 'Move to Deleted'}
						</button>

						<button
							type='button'
							onClick={handleClose}
							className='mt-3 w-full inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm transition-colors'
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
