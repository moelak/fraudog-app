import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';
import dayjs from 'dayjs';
import { monitoringStore } from './MonitoringStore';
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

	/* ✅ Group items by a date-based key */
	const groupByDate = <T, K extends keyof T>(items: T[], key: K): GroupedData<T> => {
		return items.reduce((acc: GroupedData<T>, item: T) => {
			const dateKey = dayjs(String(item[key])).format('YYYY-MM-DD');
			if (!acc[dateKey]) acc[dateKey] = [];
			acc[dateKey].push(item);
			return acc;
		}, {});
	};

	const groupedTx = groupByDate(monitoringStore.filteredLogs, 'datetime');
	return (
		<div className='space-y-8'>
			{/* Header */}
			<div>
				<h1 className='text-3xl font-bold text-gray-900'>Monitoring</h1>
				<p className='mt-2 text-gray-600'>Real-time monitoring of transactions and organization activity</p>
			</div>

			{/* Search */}
			<input
				type='text'
				placeholder='Search transactions or notifications...'
				value={monitoringStore.searchTerm || notificationStore.searchTerm}
				onChange={(e) => {
					monitoringStore.applySearch(e.target.value);
					notificationStore.applySearch(e.target.value);
				}}
				className='w-full md:w-1/2 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500'
			/>

			{/* ✅ Transactions Section */}
			<section className='bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-300'>
				<div className='px-6 py-4 border-b border-gray-100'>
					<h3 className='text-lg font-medium text-gray-900'>Transaction Decisions (7 Days)</h3>
				</div>

				<div className='divide-y divide-gray-100 max-h-96 overflow-y-auto'>
					{Object.keys(groupedTx).length === 0 ? (
						<div className='px-6 py-4 text-gray-500 text-sm text-center'>No transactions found.</div>
					) : (
						Object.entries(groupedTx)
							.sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
							.map(([date, transactions]) => (
								<div key={date}>
									{/* 🔹 Date Header */}
									<div className='sticky top-0 bg-gray-50 text-gray-700 text-sm font-semibold px-6 py-2 border-b border-gray-100 shadow-sm'>
										{dayjs(date).format('dddd, MMM D, YYYY')}
									</div>

									{/* 🔹 Transactions */}
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
													</div>
												</div>

												{/* ✅ Time per row */}
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
