import { observer } from 'mobx-react-lite';
import { useState, useRef, useEffect } from 'react';
import { useRules } from '../../hooks/useRules';
import { showSuccessToast, showErrorToast } from '../../utils/toast';
import { EllipsisVerticalIcon, PencilIcon, ClockIcon, TrashIcon, ArrowUturnLeftIcon } from '@heroicons/react/24/outline';
import { ruleManagementStore } from './RuleManagementStore';

interface RuleActionsMenuProps {
	rule: {
		id: string;
		name: string;
		description: string;
		category: string;
		condition: string;
		severity: 'low' | 'medium' | 'high';
		status: 'active' | 'inactive' | 'warning' | 'in progress';
		log_only: boolean;
		catches: number;
		false_positives: number;
		effectiveness: number | null;
		source: 'AI' | 'User';
		is_deleted: boolean;
		user_id: string;
		created_at: string;
		updated_at: string;
		decision: string;
		chargebacks: number;
	};
}

const RuleActionsMenu = observer(({ rule }: RuleActionsMenuProps) => {
	const { recoverRule, toggleRuleStatus } = useRules();
	const [isOpen, setIsOpen] = useState(false);
	const [isRecovering, setIsRecovering] = useState(false);
	const [isTogglingStatus, setIsTogglingStatus] = useState(false);
	const menuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
				setIsOpen(false);
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, []);

	const handleAction = async (action: string) => {
		switch (action) {
			case 'edit':
				ruleManagementStore.editRule(rule);
				ruleManagementStore.setDisplayManualRuleStepper(true);
				break;
			case 'history':
				ruleManagementStore.viewRuleHistory(rule.id);
				break;
			case 'delete':
				ruleManagementStore.openDeleteConfirmModal(rule);
				break;
			case 'recover':
				setIsRecovering(true);
				try {
					await recoverRule(rule.id);
					const updatedRule = { ...rule, is_deleted: false, updated_at: new Date().toISOString() };
					ruleManagementStore.updateRuleInStore(updatedRule);
					showSuccessToast('Rule recovered successfully.');
				} catch (error) {
					console.error('Error recovering rule:', error);
					showErrorToast('Failed to recover rule');
				} finally {
					setIsRecovering(false);
				}
				break;

			case 'toggle-status':
				setIsTogglingStatus(true);
				try {
					await toggleRuleStatus(rule.id);
					const toggledStatus = (rule.status === 'active' ? 'inactive' : 'active') as 'active' | 'inactive';
					const updatedRule = { ...rule, status: toggledStatus, updated_at: new Date().toISOString() };
					ruleManagementStore.updateRuleInStore(updatedRule);
					showSuccessToast(`Rule ${toggledStatus === 'active' ? 'activated' : 'deactivated'} successfully.`);
				} catch (error) {
					console.error('Error toggling rule status:', error);
					showErrorToast('Failed to update rule status');
				} finally {
					setIsTogglingStatus(false);
				}
				break;
		}
	};

	return (
		<div className='relative' ref={menuRef}>
			<button
				onClick={() => setIsOpen(!isOpen)}
				className='p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors'
				disabled={isRecovering || isTogglingStatus}
			>
				<EllipsisVerticalIcon className='h-5 w-5' />
			</button>

			{isOpen && (
				<div className='absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10'>
					<div className='py-1'>
						{rule.is_deleted ? (
							// Actions for deleted rules
							<>
								<button
									onClick={() => handleAction('recover')}
									disabled={isRecovering}
									className='flex items-center w-full px-4 py-2 text-sm text-green-700 hover:bg-green-50 transition-colors disabled:opacity-50'
								>
									<ArrowUturnLeftIcon className='h-4 w-4 mr-3' />
									{isRecovering ? 'Recovering...' : 'Recover Rule'}
								</button>

								<div className='border-t border-gray-100 my-1'></div>

								<button
									onClick={() => handleAction('delete')}
									className='flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors'
								>
									<TrashIcon className='h-4 w-4 mr-3' />
									Delete Permanently
								</button>
							</>
						) : (
							// Actions for active rules
							<>
								<button
									onClick={() => handleAction('edit')}
									className='flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors'
								>
									<PencilIcon className='h-4 w-4 mr-3' />
									Edit Rule
								</button>

								<button
									onClick={() => handleAction('history')}
									className='flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors'
								>
									<ClockIcon className='h-4 w-4 mr-3' />
									View History
								</button>

								<button
									onClick={() => handleAction('toggle-status')}
									disabled={isTogglingStatus}
									className='flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50'
								>
									{rule.status === 'inactive' ? <ArrowUturnLeftIcon className='h-4 w-4 mr-3' /> : <TrashIcon className='h-4 w-4 mr-3 rotate-180' />}
									{isTogglingStatus ? 'Updating...' : rule.status === 'inactive' ? 'Activate' : 'Deactivate'}
								</button>

								<div className='border-t border-gray-100 my-1'></div>

								<button
									onClick={() => handleAction('delete')}
									className='flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors'
								>
									<TrashIcon className='h-4 w-4 mr-3' />
									Delete Rule
								</button>
							</>
						)}
					</div>
				</div>
			)}
		</div>
	);
});

export default RuleActionsMenu;
