import { observer } from 'mobx-react-lite';
import { ruleManagementStore } from './RuleManagementStore';
import DeleteConfirmModal from './DeleteConfirmModal';
import { Menu, Transition } from '@headlessui/react';
import { useAuth } from '../../hooks/useAuth';
import { PlusIcon, ChevronUpDownIcon } from '@heroicons/react/24/outline';
import { Fragment } from 'react';
import { Dayjs } from 'dayjs';
import CreateManualRule from './createManualRule/CreateManualRule';
import RuleManagementTable from './ruleManagementTable/RuleManagementTable';
import CreateRuleByAI from './createRuleByAI/CreateRuleByAI';
type Props = {
	onSearchByDateRange: (range: { from: Dayjs | null; to: Dayjs | null }) => void | Promise<void>;
};
const RuleManagement = observer(({ onSearchByDateRange }: Props) => {
	const { user } = useAuth();

	if (!user) return null;

	// Debug function to check modal state
	const handleOpenChargebackAnalysis = () => {
		ruleManagementStore.setDisplayAIRuleStepper(true);
	};

	return (
		<div className='space-y-6'>
			<div className='flex justify-between items-center'>
				{ruleManagementStore.displayManualRuleStepper ? (
					<div>
						<h1 className='text-2xl md:text-3xl font-bold text-gray-900'>Create New Rule</h1>
						<p className='mt-2 text-gray-600'>
							<span className='block sm:inline'>Create rules manualy</span>
						</p>
					</div>
				) : ruleManagementStore.displayAIRuleStepper ? (
					<div>
						<h1 className='text-2xl md:text-3xl font-bold text-gray-900'>Generate AI Rules</h1>
						<p className='mt-2 text-gray-600'>
							<span className='block sm:inline'>Generate and manage</span>
							<span className='block sm:inline sm:ml-1'>fraud detection rules by AI</span>
						</p>
					</div>
				) : (
					<div>
						<h1 className='text-2xl md:text-3xl font-bold text-gray-900'>Rule Management</h1>
						<p className='mt-2 text-gray-600'>
							<span className='block sm:inline'>Create and manage</span>
							<span className='block sm:inline sm:ml-1'>fraud detection rules</span>
						</p>
					</div>
				)}

				<div className='relative inline-block text-left'>
					<Menu as='div' className='relative'>
						<Menu.Button className='inline-flex items-center px-3 md:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm text-sm md:text-base'>
							<PlusIcon className='h-4 w-4 md:h-5 md:w-5 mr-2' />
							<span className='hidden sm:inline'>Create New Rule</span>
							<span className='sm:hidden'>Create</span>
							<ChevronUpDownIcon className='ml-2 h-3 w-3 md:h-4 md:w-4 text-white' aria-hidden='true' />
						</Menu.Button>
						<Transition
							as={Fragment}
							enter='transition ease-out duration-100'
							enterFrom='transform opacity-0 scale-95'
							enterTo='transform opacity-100 scale-100'
							leave='transition ease-in duration-75'
							leaveFrom='transform opacity-100 scale-100'
							leaveTo='transform opacity-0 scale-95'
						>
							<Menu.Items className='absolute right-0 mt-2 w-48 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-10'>
								<Menu.Item>
									{({ active }: { active: boolean }) => (
										<button
											onClick={() => ruleManagementStore.setDisplayManualRuleStepper(true)}
											className={`${active ? 'bg-blue-100' : ''} block px-4 py-2 text-sm text-gray-700 w-full text-left`}
										>
											Manual
										</button>
									)}
								</Menu.Item>
								<Menu.Item>
									{({ active }: { active: boolean }) => (
										<button
											onClick={handleOpenChargebackAnalysis}
											className={`${active ? 'bg-blue-100' : ''} block px-4 py-2 text-sm text-gray-700 w-full text-left`}
										>
											Generate by AI
										</button>
									)}
								</Menu.Item>
							</Menu.Items>
						</Transition>
					</Menu>
				</div>
			</div>

			{/* Tabs and Search */}
			{ruleManagementStore.displayManualRuleStepper ? (
				<CreateManualRule />
			) : ruleManagementStore.displayAIRuleStepper ? (
				<CreateRuleByAI />
			) : (
				<RuleManagementTable onSearchByDateRange={onSearchByDateRange} />
			)}

			{/* Modals */}

			{/* <ChargebackAnalysisModal /> */}
			<DeleteConfirmModal />
		</div>
	);
});

export default RuleManagement;
