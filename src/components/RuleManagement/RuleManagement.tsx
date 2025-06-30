import { observer } from 'mobx-react-lite';
import { ruleManagementStore } from './RuleManagementStore';

import CreateRuleModal from './CreateRuleModal';
import ChargebackAnalysisModal from './ChargebackAnalysisModal';
import DeleteConfirmModal from './DeleteConfirmModal';
import RuleActionsMenu from './RuleActionsMenu';
import { Menu, Transition } from '@headlessui/react';
import { useAuth } from '../../hooks/useAuth';

import {
	PlusIcon,
	ShieldCheckIcon,
	ExclamationTriangleIcon,
	MagnifyingGlassIcon,
	CpuChipIcon,
	UserIcon,
	ChevronDownIcon,
	ChevronRightIcon,
	ChevronUpDownIcon,
	InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { Fragment } from 'react';

const RuleManagement = observer(() => {
	//const { rules } = useRules();
	const rules = ruleManagementStore.rules;
	const { user } = useAuth();
	const filteredRules = ruleManagementStore.filterRules(rules);
	const tabCounts = ruleManagementStore.getTabCounts(rules);
	if (!user) return null;

	const displayName =
		user.user_metadata?.first_name && user.user_metadata?.last_name ? `${user.user_metadata.first_name} ${user.user_metadata.last_name}` : user.email?.split('@')[0] || 'User';

	const tabs = [
		{ id: 'active' as const, name: 'Active Rules', count: tabCounts.active },
		{ id: 'all' as const, name: 'All Rules', count: tabCounts.all },
		{ id: 'attention' as const, name: 'Needs Attention', count: tabCounts.attention },
		{ id: 'deleted' as const, name: 'Deleted Rules', count: tabCounts.deleted },
	];

	// Debug function to check modal state
	const handleOpenChargebackAnalysis = () => {
		console.log('Opening Chargeback Analysis Modal...');
		console.log('Current modal state:', ruleManagementStore.isChargebackAnalysisOpen);
		ruleManagementStore.openChargebackAnalysis();
		console.log('New modal state:', ruleManagementStore.isChargebackAnalysisOpen);
	};

	const searchColumns = ruleManagementStore.getSearchColumns();

	// Get current tab info for mobile dropdown
	const currentTab = tabs.find(tab => tab.id === ruleManagementStore.activeTab) || tabs[0];

	// Helper function to format numbers with commas - with null safety
	const formatNumber = (num: number | undefined | null): string => {
		if (num === undefined || num === null || isNaN(num)) {
			return '—';
		}
		return num.toLocaleString();
	};

	// Helper function to safely get effectiveness percentage
	const formatEffectiveness = (effectiveness: number | undefined | null): string => {
		if (effectiveness === undefined || effectiveness === null || isNaN(effectiveness)) {
			return '—';
		}
		return `${effectiveness}%`;
	};

	// Loading shimmer component
	const LoadingShimmer = () => (
		<div className="animate-pulse">
			<div className="h-4 bg-gray-200 rounded w-12 mb-1"></div>
			<div className="h-3 bg-gray-200 rounded w-16"></div>
		</div>
	);

	// Spinner component for effectiveness
	const EffectivenessSpinner = () => (
		<div className="flex items-center">
			<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
			<div className="animate-pulse">
				<div className="h-4 bg-gray-200 rounded w-8"></div>
			</div>
		</div>
	);

	return (
		<div className='space-y-6'>
			<div className='flex justify-between items-center'>
				<div>
					<h1 className='text-2xl md:text-3xl font-bold text-gray-900'>Rule Management</h1>
					<p className='mt-2 text-gray-600'>
						<span className='block sm:inline'>Create and manage</span>
						<span className='block sm:inline sm:ml-1'>fraud detection rules</span>
					</p>
				</div>

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
									{({ active }) => (
										<button
											onClick={ruleManagementStore.openCreateModal}
											className={`${active ? 'bg-blue-100' : ''} block px-4 py-2 text-sm text-gray-700 w-full text-left`}
										>
											Manual
										</button>
									)}
								</Menu.Item>
								<Menu.Item>
									{({ active }) => (
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

			{/* Demo Notice */}
			<div className='bg-blue-50 border border-blue-200 rounded-lg p-4'>
				<div className='flex items-start'>
					<InformationCircleIcon className='h-5 w-5 text-blue-400 mt-0.5 mr-3 flex-shrink-0' />
					<div>
						<h4 className='text-sm font-medium text-blue-800'>Demo Notice</h4>
						<p className='text-sm text-blue-700 mt-1'>
							The Catches, False Positives, and Effectiveness values shown in this demo are randomly generated mock data. 
							In a production environment, these would be calculated from actual fraud detection results.
						</p>
					</div>
				</div>
			</div>

			{/* Tabs and Search */}
			<div className='bg-white rounded-xl shadow-sm border border-gray-100'>
				<div className='border-b border-gray-200'>
					<div className='p-6 space-y-4'>
						{/* Desktop Tabs - Hidden on mobile */}
						<div className='hidden md:block'>
							<nav className='flex space-x-8'>
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
										<span
											className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
												ruleManagementStore.activeTab === tab.id ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
											}`}
										>
											{tab.count}
										</span>
									</button>
								))}
							</nav>
						</div>

						{/* Mobile Tab Dropdown - Visible only on mobile */}
						<div className='md:hidden'>
							<Menu as='div' className='relative'>
								<Menu.Button className='w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors'>
									<div className='flex items-center space-x-2'>
										<span>{currentTab.name}</span>
										<span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800'>
											{currentTab.count}
										</span>
									</div>
									<ChevronDownIcon className='h-5 w-5 text-gray-400' aria-hidden='true' />
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
									<Menu.Items className='absolute left-0 right-0 mt-1 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-20'>
										<div className='py-1'>
											{tabs.map((tab) => (
												<Menu.Item key={tab.id}>
													{({ active }) => (
														<button
															onClick={() => ruleManagementStore.setActiveTab(tab.id)}
															className={`${
																active ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
															} ${
																ruleManagementStore.activeTab === tab.id ? 'bg-blue-100 text-blue-800 font-medium' : ''
															} flex items-center justify-between w-full px-4 py-2 text-sm transition-colors`}
														>
															<span>{tab.name}</span>
															<span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
																ruleManagementStore.activeTab === tab.id ? 'bg-blue-200 text-blue-900' : 'bg-gray-100 text-gray-800'
															}`}>
																{tab.count}
															</span>
														</button>
													)}
												</Menu.Item>
											))}
										</div>
									</Menu.Items>
								</Transition>
							</Menu>
						</div>

						{/* Search Section - Side by side on desktop, stacked on mobile */}
						<div className='flex flex-col md:flex-row md:items-center gap-3'>
							{/* Search Column Dropdown */}
							<div className='w-full md:w-48'>
								<Menu as='div' className='relative inline-block text-left w-full'>
									<Menu.Button className='inline-flex items-center justify-between w-full px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors'>
										<span className='truncate'>{ruleManagementStore.getSearchColumnDisplayName(ruleManagementStore.searchColumn)}</span>
										<ChevronDownIcon className='ml-2 h-4 w-4 text-gray-400 flex-shrink-0' aria-hidden='true' />
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
										<Menu.Items className='absolute left-0 right-0 md:right-auto md:w-48 mt-1 origin-top-left md:origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-20'>
											<div className='py-1'>
												{searchColumns.map((column) => (
													<Menu.Item key={column.value}>
														{({ active }) => (
															<button
																onClick={() => ruleManagementStore.setSearchColumn(column.value)}
																className={`${
																	active ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
																} ${
																	ruleManagementStore.searchColumn === column.value ? 'bg-blue-100 text-blue-800 font-medium' : ''
																} block w-full text-left px-4 py-2 text-sm transition-colors`}
															>
																{column.label}
															</button>
														)}
													</Menu.Item>
												))}
											</div>
										</Menu.Items>
									</Transition>
								</Menu>
							</div>

							{/* Search Input - Fixed width on desktop */}
							<div className='relative w-full md:w-80'>
								<div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
									<MagnifyingGlassIcon className='h-5 w-5 text-gray-400' />
								</div>
								<input
									type='text'
									placeholder={`Search by ${ruleManagementStore.getSearchColumnDisplayName(ruleManagementStore.searchColumn).toLowerCase()}...`}
									value={ruleManagementStore.searchQuery}
									onChange={(e) => ruleManagementStore.setSearchQuery(e.target.value)}
									className='block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors'
								/>
							</div>
						</div>
					</div>
				</div>

				{/* Rules Table */}
				<div className='overflow-x-auto h-[600px]'>
					<table className='min-w-full divide-y divide-gray-200'>
						<thead className='bg-gray-50'>
							<tr>
								<th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12'>{/* Expand/Collapse column */}</th>
								<th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>Source</th>
								<th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>Rule</th>
								<th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>Category</th>
								<th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>Status</th>
								<th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>Catches</th>
								<th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>False Positives</th>
								<th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>Effectiveness</th>
								<th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>Actions</th>
							</tr>
						</thead>
						<tbody className='bg-white divide-y divide-gray-200'>
							{filteredRules.map((rule) => (
								<>
									{/* Main Row */}
									<tr key={rule.id} className='hover:bg-gray-50 transition-colors'>
										{/* Expand/Collapse Button */}
										<td className='px-6 py-4 whitespace-nowrap'>
											<button
												onClick={() => ruleManagementStore.toggleRowExpansion(rule.id)}
												className='p-1 text-gray-400 hover:text-gray-600 transition-colors'
											>
												{ruleManagementStore.isRowExpanded(rule.id) ? <ChevronDownIcon className='h-4 w-4' /> : <ChevronRightIcon className='h-4 w-4' />}
											</button>
										</td>

										{/* Source */}
										<td className='px-6 py-4 whitespace-nowrap'>
											<div className='flex items-center'>
												<div className={`p-2 rounded-lg ${rule.source === 'AI' ? 'bg-purple-100' : 'bg-blue-100'}`}>
													{rule.source === 'AI' ? <CpuChipIcon className='h-5 w-5 text-purple-600' /> : <UserIcon className='h-5 w-5 text-blue-600' />}
												</div>
												<span className={`ml-2 text-sm font-medium ${rule.source === 'AI' ? 'text-purple-700' : 'text-blue-700'}`}>
													{rule.source === 'AI' ? 'AI' : displayName}
												</span>
											</div>
										</td>

										{/* Rule */}
										<td className='px-6 py-4'>
											<div className='flex items-center space-x-3'>
												<div
													className={`p-2 rounded-lg ${
														rule.severity === 'high' ? 'bg-red-100' : rule.severity === 'medium' ? 'bg-yellow-100' : 'bg-green-100'
													}`}
												>
													{rule.severity === 'high' ? (
														<ExclamationTriangleIcon className='h-5 w-5 text-red-600' />
													) : (
														<ShieldCheckIcon className='h-5 w-5 text-blue-600' />
													)}
												</div>
												<div className='min-w-0 flex-1'>
													<h3 className='text-sm font-medium text-gray-900 truncate'>{rule.name}</h3>
													{rule.log_only && (
														<span className='inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 mt-1'>
															Log Only
														</span>
													)}
												</div>
											</div>
										</td>

										{/* Category */}
										<td className='px-6 py-4 whitespace-nowrap'>
											<span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800'>
												{rule.category}
											</span>
										</td>

										{/* Status */}
										<td className='px-6 py-4 whitespace-nowrap'>
											<span
												className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
													rule.status === 'active'
														? 'bg-green-100 text-green-800'
														: rule.status === 'inactive'
														? 'bg-gray-100 text-gray-800'
														: 'bg-yellow-100 text-yellow-800'
												}`}
											>
												{rule.status}
											</span>
										</td>

										{/* Catches */}
										<td className='px-6 py-4 whitespace-nowrap'>
											{rule.isCalculating ? (
												<LoadingShimmer />
											) : (
												<>
													<div className='text-sm font-medium text-gray-900'>{formatNumber(rule.catches)}</div>
													<div className='text-xs text-gray-500'>catches</div>
												</>
											)}
										</td>

										{/* False Positives */}
										<td className='px-6 py-4 whitespace-nowrap'>
											{rule.isCalculating ? (
												<LoadingShimmer />
											) : (
												<>
													<div className='text-sm font-medium text-gray-900'>{formatNumber(rule.false_positives)}</div>
													<div className='text-xs text-gray-500'>false positives</div>
												</>
											)}
										</td>

										{/* Effectiveness */}
										<td className='px-6 py-4 whitespace-nowrap'>
											{rule.isCalculating ? (
												<EffectivenessSpinner />
											) : (
												<div className='flex items-center'>
													<div className={`text-sm font-medium ${ruleManagementStore.getEffectivenessColorClass(rule.effectiveness || 0)}`}>
														{formatEffectiveness(rule.effectiveness)}
													</div>
													{rule.effectiveness !== undefined && rule.effectiveness !== null && !isNaN(rule.effectiveness) && (
														<div className='ml-2 w-16 bg-gray-200 rounded-full h-2'>
															<div
																className={`h-2 rounded-full ${ruleManagementStore.getEffectivenessBackgroundClass(rule.effectiveness)}`}
																style={{ width: `${rule.effectiveness}%` }}
															/>
														</div>
													)}
												</div>
											)}
											{!rule.isCalculating && (
												<div className='text-xs text-gray-500 mt-1'>effective</div>
											)}
										</td>

										{/* Actions */}
										<td className='px-6 py-4 whitespace-nowrap'>
											<RuleActionsMenu rule={rule} />
										</td>
									</tr>

									{/* Expanded Row Details */}
									{ruleManagementStore.isRowExpanded(rule.id) && (
										<tr className='bg-gray-50'>
											<td colSpan={9} className='px-6 py-4'>
												<div className='space-y-4'>
													{/* Description */}
													<div>
														<h4 className='text-sm font-medium text-gray-900 mb-2'>Description</h4>
														<p className='text-sm text-gray-700'>{rule.description}</p>
													</div>

													{/* Rule Condition */}
													<div>
														<h4 className='text-sm font-medium text-gray-900 mb-2'>Rule Condition</h4>
														<div className='bg-gray-100 rounded-lg p-3'>
															<code className='text-sm text-gray-800 font-mono whitespace-pre-wrap'>{rule.condition}</code>
														</div>
													</div>

													{/* Additional Metadata */}
													<div className='grid grid-cols-2 md:grid-cols-4 gap-4 text-sm'>
														<div>
															<span className='font-medium text-gray-900'>Severity:</span>
															<span
																className={`ml-1 capitalize ${
																	rule.severity === 'high' ? 'text-red-600' : rule.severity === 'medium' ? 'text-yellow-600' : 'text-green-600'
																}`}
															>
																{rule.severity}
															</span>
														</div>
														<div>
															<span className='font-medium text-gray-900'>Created:</span>
															<span className='ml-1 text-gray-600'>{new Date(rule.created_at).toLocaleDateString()}</span>
														</div>
														<div>
															<span className='font-medium text-gray-900'>Updated:</span>
															<span className='ml-1 text-gray-600'>{new Date(rule.updated_at).toLocaleDateString()}</span>
														</div>
														<div>
															<span className='font-medium text-gray-900'>Log Only:</span>
															<span className={`ml-1 ${rule.log_only ? 'text-blue-600' : 'text-gray-600'}`}>{rule.log_only ? 'Yes' : 'No'}</span>
														</div>
													</div>
												</div>
											</td>
										</tr>
									)}
								</>
							))}
						</tbody>
					</table>
				</div>

				{/* Empty State */}
				{filteredRules.length === 0 && (
					<div className='text-center py-12'>
						<ShieldCheckIcon className='mx-auto h-12 w-12 text-gray-400' />
						<h3 className='mt-2 text-sm font-medium text-gray-900'>
							{ruleManagementStore.searchQuery ? 'No rules found' : ruleManagementStore.activeTab === 'deleted' ? 'No deleted rules' : 'No rules'}
						</h3>
						<p className='mt-1 text-sm text-gray-500'>
							{ruleManagementStore.searchQuery
								? `Try adjusting your search terms or search in a different column.`
								: ruleManagementStore.activeTab === 'deleted'
								? 'Deleted rules will appear here when you delete them.'
								: 'Get started by creating a new fraud detection rule.'}
						</p>
						{!ruleManagementStore.searchQuery && ruleManagementStore.activeTab !== 'deleted' && (
							<div className='mt-6'>
								<button
									onClick={ruleManagementStore.openCreateModal}
									className='inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors'
								>
									<PlusIcon className='h-5 w-5 mr-2' />
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
			<DeleteConfirmModal />
		</div>
	);
});

export default RuleManagement;