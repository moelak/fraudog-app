import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';
import dayjs from 'dayjs';
import { monitoringStore, type TransactionLog } from './MonitoringStore';
import { notificationStore } from './NotificationStore';
import { ruleManagementStore } from '../RuleManagement/RuleManagementStore';
import OrganizationEventLog from './OrganizationEventLog';

type GroupedData<T> = Record<string, T[]>;

const Monitoring = observer(() => {
	useEffect(() => {
		const orgId = ruleManagementStore.organizationId;
		monitoringStore.fetchThisWeekTransactions();

		if (orgId) {
			notificationStore.fetchOrganizationNotifications(orgId);
			notificationStore.subscribeToNotifications(orgId);
		}
		return () => {
			notificationStore.clearSubscription();
		};
	}, [ruleManagementStore.organizationId]);

	const groupByDate = <T, K extends keyof T>(items: T[], key: K): GroupedData<T> => {
		return items.reduce((acc: GroupedData<T>, item: T) => {
			const dateKey = dayjs(String(item[key])).format('YYYY-MM-DD');
			if (!acc[dateKey]) acc[dateKey] = [];
			acc[dateKey].push(item);
			return acc;
		}, {});
	};

	const isFalsePositive = (tx: TransactionLog): boolean => {
		const decision = tx.decision?.toLowerCase();
		const changed = tx.decision_changed?.toLowerCase();

		if (!changed || changed === decision) return false;
		if (decision === 'review' && ['manual_review_approved', 'chargeback'].includes(changed)) return true;
		if (decision === 'deny' && ['manual_deny_approved', 'friction_throttle'].includes(changed)) return true;
		if (decision === 'allow' && changed === 'chargeback') return true;
		if (decision !== changed && changed !== 'review') return true;

		return false;
	};

	// 🔹 Create enhanced transactions list including searchable text
	const enhancedLogs = monitoringStore.filteredLogs.map((tx) => ({
		...tx,
		isFalsePositive: isFalsePositive(tx),
		searchableText: `${tx.transaction_id ?? ''} ${tx.decision ?? ''} ${tx.decision_changed ?? ''} ${isFalsePositive(tx) ? 'false positive' : ''}`.toLowerCase(),
	}));

	// 🔹 Use only the local searchTerm for filtering
	const searchTerm = monitoringStore.searchTerm.trim().toLowerCase();
	const filteredLogs = searchTerm ? enhancedLogs.filter((tx) => tx.searchableText.includes(searchTerm)) : enhancedLogs;

	const groupedTx = groupByDate(filteredLogs, 'datetime');

	return (
		<div className='space-y-8'>
			{/* Header */}
			<div>
				<h1 className='text-3xl font-bold text-gray-900'>Monitoring</h1>
				<p className='mt-2 text-gray-600'>Real-time monitoring of transactions and organization activity</p>
			</div>

			{/* ✅ Transactions Section */}
			<section className='bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-300'>
				<div className='px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-4'>
					<h3 className='text-lg font-medium text-gray-900'>Transaction Decisions (7 Days)</h3>

					{/* Local search bar */}
					<input
						type='text'
						placeholder='Search transactions (id / decision / changed / false positive)…'
						value={monitoringStore.searchTerm}
						onChange={(e) => (monitoringStore.searchTerm = e.target.value)}
						className='w-full md:w-80 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
					/>
				</div>

				<div className='divide-y divide-gray-100 max-h-96 overflow-y-auto'>
					{Object.keys(groupedTx).length === 0 ? (
						<div className='px-6 py-4 text-gray-500 text-sm text-center'>No transactions found.</div>
					) : (
						Object.entries(groupedTx)
							.sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
							.map(([date, transactions]) => (
								<div key={date}>
									{/* Date Header */}
									<div className='sticky top-0 bg-gray-50 text-gray-700 text-sm font-semibold px-6 py-2 border-b border-gray-100 shadow-sm'>
										{dayjs(date).format('dddd, MMM D, YYYY')}
									</div>

									{/* Transactions */}
									{transactions.map((tx) => (
										<div key={tx.transaction_id} className='px-6 py-3 hover:bg-gray-50 transition-colors duration-150'>
											<div className='flex justify-between items-center'>
												<div>
													<div className='text-sm font-mono text-gray-900 font-semibold'>{tx.transaction_id}</div>
													<div className='text-sm text-gray-700'>
														Original Decision: <span className='font-semibold text-blue-700'>{tx.decision || '—'}</span>
														{tx.decision_changed && (
															<>
																<span className='mx-2 text-gray-400'>→</span>
																<span className='font-semibold text-yellow-700'>{tx.decision_changed}</span>
															</>
														)}
														{/* 🔹 False Positive Tag */}
														{isFalsePositive(tx) && (
															<span className='ml-2 inline-block bg-red-100 text-red-700 text-xs font-semibold px-2 py-0.5 rounded-full'>
																False Positive
															</span>
														)}
													</div>
												</div>
												<span className='text-sm text-gray-500'>{dayjs(tx.datetime).format('h:mm A')}</span>
											</div>
										</div>
									))}
								</div>
							))
					)}
				</div>
			</section>

			{/* ✅ Organization Notifications */}
			<section className='bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-300'>
				<OrganizationEventLog />
			</section>
		</div>
	);
});

export default Monitoring;
