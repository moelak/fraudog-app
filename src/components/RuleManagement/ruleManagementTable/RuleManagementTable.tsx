import { observer } from 'mobx-react-lite';
import { ruleManagementStore, type Rule } from '../RuleManagementStore';

import DeleteConfirmModal from '../DeleteConfirmModal';
import RuleActionsMenu from '../RuleActionsMenu';
import { Menu, Transition } from '@headlessui/react';
import { useAuth } from '../../../hooks/useAuth';
import dayjs, { Dayjs } from 'dayjs';

import { ShieldCheckIcon, ExclamationTriangleIcon, MagnifyingGlassIcon, CpuChipIcon, UserIcon, ChevronDownIcon, ChevronRightIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Fragment, useState } from 'react';
import DateRangeFields from '../../DateRangeFields/DateRangeFields';

type Props = {
	onSearchByDateRange: (range: { from: Dayjs | null; to: Dayjs | null }) => void | Promise<void>;
};

const RuleManagementTable = observer(({ onSearchByDateRange }: Props) => {
	//const { rules } = useRules();
	const rules = ruleManagementStore.rules;
	const { user } = useAuth();
	const filteredRules = ruleManagementStore.filterRules(rules);
	const tabCounts = ruleManagementStore.getTabCounts(rules);
	const [range, setRange] = useState<{ from: Dayjs | null; to: Dayjs | null }>({
		from: dayjs().subtract(6, 'day').startOf('day'),
		to: dayjs().endOf('day'),
	});
	const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

	const [searchDirty, setSearchDirty] = useState(false);
	const [loading, setLoading] = useState(false); // NEW

	if (!user) return null;

	const displayName =
		user.user_metadata?.first_name && user.user_metadata?.last_name ? `${user.user_metadata.first_name} ${user.user_metadata.last_name}` : user.email?.split('@')[0] || 'User';

	const tabs = [
		{ id: 'active' as const, name: 'Active Rules', count: tabCounts.active },
		{ id: 'all' as const, name: 'All Rules', count: tabCounts.all },
		{ id: 'attention' as const, name: 'Needs Attention', count: tabCounts.attention },
		{ id: 'deleted' as const, name: 'Deleted Rules', count: tabCounts.deleted },
	];

	const searchColumns = ruleManagementStore.getSearchColumns();

	// Get current tab info for mobile dropdown
	const currentTab = tabs.find((tab) => tab.id === ruleManagementStore.activeTab) || tabs[0];

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
			return 'N/A';
		}
		return `${effectiveness}%`;
	};

	// When dates change, update state and start pulsing the Search button
	const handleRangeChange = (r: { from: Dayjs | null; to: Dayjs | null }) => {
		setRange(r);
		setSearchDirty(true);
	};

	// When Search is clicked, run the query and stop pulsing
	const handleSearch = async () => {
		setLoading(true);
		try {
			await onSearchByDateRange(range);
			setSearchDirty(false);
		} finally {
			setLoading(false);
		}
	};

	// Loading shimmer component
	const LoadingShimmer = () => (
		<div className='animate-pulse'>
			<div className='h-4 bg-gray-200 rounded w-12 mb-1'></div>
			<div className='h-3 bg-gray-200 rounded w-16'></div>
		</div>
	);

	// Spinner component for effectiveness
	const EffectivenessSpinner = () => (
		<div className='flex items-center'>
			<div className='animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2'></div>
			<div className='animate-pulse'>
				<div className='h-4 bg-gray-200 rounded w-8'></div>
			</div>
		</div>
	);

	return (
		<>
			<div className='bg-white rounded-xl shadow-sm border border-gray-100'>
				<div className=' border-b border-gray-200'>
					<div className='p-6 space-y-4'>
						{/* Desktop Tabs - Hidden on mobile */}
						<div className=' hidden md:block'>
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
													{({ active }: { active: boolean }) => (
														<button
															onClick={() => ruleManagementStore.setActiveTab(tab.id)}
															className={`${active ? 'bg-blue-50 text-blue-700' : 'text-gray-700'} ${
																ruleManagementStore.activeTab === tab.id ? 'bg-blue-100 text-blue-800 font-medium' : ''
															} flex items-center justify-between w-full px-4 py-2 text-sm transition-colors`}
														>
															<span>{tab.name}</span>
															<span
																className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
																	ruleManagementStore.activeTab === tab.id ? 'bg-blue-200 text-blue-900' : 'bg-gray-100 text-gray-800'
																}`}
															>
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
						{/* <div className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'> */}
						<div className='flex pt-4  flex-col md:flex-row md:items-center gap-3'>
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
														{({ active }: { active: boolean }) => (
															<button
																onClick={() => ruleManagementStore.setSearchColumn(column.value)}
																className={`${active ? 'bg-blue-50 text-blue-700' : 'text-gray-700'} ${
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
						{/* Row 2 - Date picker + search button */}
						<div className='flex pt-4 flex-col sm:flex-row items-stretch sm:items-center gap-2  w-full sm:w-auto max-w-[600px]'>
							<div className='flex-1 min-w-[250px]'>
								<DateRangeFields value={range} onChange={handleRangeChange} disableFuture />
							</div>
							<button
								onClick={handleSearch}
								disabled={!searchDirty || loading}
								className={
									'px-4 py-2 rounded text-white flex items-center justify-center gap-2 transition-colors min-w-[160px] ' +
									(searchDirty && !loading ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed')
								}
								title={loading ? 'Searching...' : searchDirty ? 'Dates changed — click to apply' : 'Search'}
							>
								{loading ? (
									<>
										<svg className='animate-spin h-4 w-4 text-white' xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24'>
											<circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4' />
											<path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z' />
										</svg>
										Searching...
									</>
								) : (
									'Search'
								)}
							</button>
						</div>
						{/* </div> */}
					</div>
				</div>

				{/* Rules Table */}
				<div className='overflow-x-auto h-[430px]'>
					<table className='min-w-full divide-y divide-gray-200'>
						<thead className='bg-gray-50 sticky top-0 z-10'>
							<tr>
								<th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12'>{/* Expand/Collapse column */}</th>
								<th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>Rule</th>
								<th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>Category</th>
								<th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>Source</th>
								<th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>Decision</th>
								<th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>Status</th>
								<th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>Catches</th>
								<th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>(False Positives) + (Chargebacks)</th>
								<th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>Effectiveness</th>
								<th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>Actions</th>
							</tr>
						</thead>
						<tbody className='bg-white divide-y divide-gray-200'>
							{filteredRules.map((rule) => (
								<>
									{/* Main Row */}
									<tr
										key={rule.id}
										onClick={() => setSelectedRowId(rule.id)}
										className={`transition-colors cursor-pointer 
    ${selectedRowId === rule.id ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
									>
										{/* Expand/Collapse Button */}
										<td className='px-6 py-4 whitespace-nowrap'>
											<button
												onClick={() => ruleManagementStore.toggleRowExpansion(rule.id)}
												className='p-1 text-gray-400 hover:text-gray-600 transition-colors'
											>
												{ruleManagementStore.isRowExpanded(rule.id) ? <ChevronDownIcon className='h-4 w-4' /> : <ChevronRightIcon className='h-4 w-4' />}
											</button>
										</td>
										{/* Rule */}
										<td className='px-6 py-4'>
											<div className='flex items-center space-x-3'>
												<div
													className={`p-2 rounded-lg ${
														rule?.decision === 'deny' ? 'bg-red-100' : rule?.decision === 'review' ? 'bg-yellow-100' : 'bg-green-100'
													}`}
												>
													{rule?.decision === 'review' ? (
														<ExclamationTriangleIcon className='h-5 w-5 text-yellow-600' />
													) : rule?.decision === 'deny' ? (
														<XMarkIcon className='h-5 w-5 text-red-600' />
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
										{/* Source */}
										<td className='px-6 py-4 whitespace-nowrap'>
											<div className='flex items-center'>
												<div className={`p-2 rounded-lg ${rule.source === 'AI' ? 'bg-purple-100' : 'bg-blue-100'}`}>
													{rule.source === 'AI' ? <CpuChipIcon className='h-5 w-5 text-purple-600' /> : <UserIcon className='h-5 w-5 text-blue-600' />}
												</div>
												<span className={`ml-2 text-sm font-medium ${rule.source === 'AI' ? 'text-purple-700' : 'text-blue-700'}`}>
													{rule.source === 'AI' ? 'AI' : rule.displayName || displayName}
												</span>
											</div>
										</td>
										{/* Decision */}
										<td className='px-6 py-4 whitespace-nowrap'>
											<div className='flex items-center'>
												<span className={`ml-2 text-sm font-medium text-blue-700`}>{rule?.decision === null ? 'review' : rule.decision}</span>
											</div>
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
												</>
											)}
										</td>
										{/* False Positives + rule.chargebacks*/}
										<td className='px-6 py-4 whitespace-nowrap'>
											{rule.isCalculating ? (
												<LoadingShimmer />
											) : (
												<>
													<div className='text-sm font-medium text-gray-900'>{formatNumber(rule.false_positives + rule.chargebacks)}</div>
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
										</td>
										{/* Actions */}

										<td className='px-6 py-4 whitespace-nowrap'>
											<RuleActionsMenu rule={rule as Rule} />
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
													<div className='grid grid-cols-2 md:grid-cols-8 gap-4 text-sm'>
														<div>
															<span className='font-medium text-gray-900'>False Positives:</span>
															<span className='ml-1 text-gray-600'>{rule.false_positives}</span>
														</div>

														<div>
															<span className='font-medium text-gray-900'>Chargebacks</span>
															<span className='ml-1 text-gray-600'>{rule.chargebacks}</span>
														</div>
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
			</div>

			<DeleteConfirmModal />
		</>
	);
});

export default RuleManagementTable;
