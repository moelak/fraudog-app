import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';
import dayjs from 'dayjs';
import { monitoringStore, type TransactionLog } from './MonitoringStore';
import { ruleManagementStore } from '../RuleManagement/RuleManagementStore';

type GroupedData<T> = Record<string, T[]>;

const Monitoring = observer(() => {
	useEffect(() => {
		const orgId = ruleManagementStore.organizationId;
		monitoringStore.fetchThisWeekTransactions(orgId!);
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

	const searchTerm = monitoringStore.searchTerm.trim().toLowerCase();

	const filteredLogs = searchTerm
		? enhancedLogs.filter((tx) => {
				// Normalize both sides
				const searchable = tx.searchableText.replace(/\s+/g, ''); // remove spaces
				const normalizedTerm = searchTerm.replace(/\s+/g, '');

				// Match any form: "false", "falsepositive", or "false positive"
				const isFalseSearch = normalizedTerm.includes('false') || normalizedTerm.includes('positive');

				return tx.searchableText.includes(searchTerm) || searchable.includes(normalizedTerm) || (isFalseSearch && tx.isFalsePositive);
		  })
		: enhancedLogs;

	const groupedTx = groupByDate(filteredLogs, 'datetime');

	return (
		<>
			{/* Header */}

			{/* ✅ Transactions Section */}
			<section className='relative bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-300'>
				{monitoringStore.isLoading && (
					<div className='absolute inset-0 flex items-center justify-center bg-white/70 z-20'>
						<div className='flex flex-col items-center space-y-3'>
							<svg className='animate-spin h-8 w-8 text-blue-600' xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24'>
								<circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4'></circle>
								<path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z'></path>
							</svg>
							<p className='text-gray-700 text-sm font-medium'>Loading transactions...</p>
						</div>
					</div>
				)}

				<div className='px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-4'>
					<h3 className='text-lg font-medium text-gray-900'>Transaction Decisions (14 Days)</h3>

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
		</>
	);
});

export default Monitoring;
