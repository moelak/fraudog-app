// OrganizationEventLog.tsx
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { ChevronDownIcon, ChevronRightIcon, UserCircleIcon, ClockIcon, ClipboardDocumentListIcon } from '@heroicons/react/24/outline';
import dayjs from 'dayjs';
import { notificationStore } from './NotificationStore';
import { motion, AnimatePresence } from 'framer-motion';
import { ruleManagementStore } from '../RuleManagement/RuleManagementStore';

interface MetadataChanges {
	[key: string]: {
		old?: string | null;
		new?: string | null;
	};
}

const OrganizationEventLog = observer(() => {
	const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
	const toggleExpand = (id: number) =>
		setExpandedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});

	useEffect(() => {
		const orgId = ruleManagementStore.organizationId;

		if (orgId) {
			notificationStore.fetchOrganizationNotifications(orgId);
			notificationStore.subscribeToNotifications(orgId);
		}
		return () => {
			notificationStore.clearSubscription();
		};
	}, [ruleManagementStore.organizationId]);

	return (
		<section className='relative bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-300'>
			{notificationStore.isLoading && (
				<div className='absolute inset-0 flex items-center justify-center bg-white/70 z-20'>
					<div className='flex flex-col items-center space-y-3'>
						<svg className='animate-spin h-8 w-8 text-blue-600' xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24'>
							<circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4'></circle>
							<path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z'></path>
						</svg>
						<p className='text-gray-700 text-sm font-medium'>Loading notifications...</p>
					</div>
				</div>
			)}
			{/* Header with its own search */}
			<div className='px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-4 bg-gradient-to-r from-gray-50 to-white'>
				<div className='flex items-center gap-2'>
					<ClockIcon className='h-5 w-5 text-blue-600' />
					<h3 className='text-lg font-semibold text-gray-900'>Organization Event Log (14 Days)</h3>
				</div>

				<input
					type='text'
					placeholder='Search organization events (type / actor / subject / change)…'
					value={notificationStore.searchTerm}
					onChange={(e) => notificationStore.applySearch(e.target.value)}
					className='w-full md:w-80 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
				/>
			</div>

			{/* Body */}
			<div className='divide-y divide-gray-100 max-h-[26rem] overflow-y-auto bg-gray-50'>
				{notificationStore.filteredNotifications.length === 0 ? (
					<div className='px-6 py-6 text-gray-500 text-sm text-center italic'>No recent organization events found.</div>
				) : (
					notificationStore.filteredNotifications.map((log) => {
						const isExpanded = expandedIds.has(log.id);

						const ruleName = log.subject_type === 'rule' ? notificationStore.ruleNameCache[`${log.organization_id}_${log.subject_id}`] || log.subject_id : null;
						const ruleData = log.metadata?.rule as Record<string, unknown> | undefined;

						const changes = (log.metadata?.changes ?? null) as MetadataChanges | null;

						return (
							<div
								key={log.id}
								className={`relative bg-white px-6 py-3 border-l-4 transition-all duration-200 ${
									isExpanded ? 'border-blue-500 bg-blue-50/30' : 'border-transparent hover:border-blue-300 hover:bg-gray-50'
								}`}
							>
								{/* Row Header */}
								<div className='flex justify-between items-center cursor-pointer' onClick={() => toggleExpand(log.id)}>
									<div className='flex items-start gap-3'>
										{isExpanded ? (
											<ChevronDownIcon className='h-5 w-5 text-gray-500 mt-[2px]' />
										) : (
											<ChevronRightIcon className='h-5 w-5 text-gray-500 mt-[2px]' />
										)}
										<div>
											<div className='flex items-center gap-2'>
												<UserCircleIcon className='h-4 w-4 text-gray-500' />
												<span className='font-medium text-gray-900'>{log.actor_name || 'Unknown User'}</span>
												<span className='text-gray-500 text-sm font-normal'>— {log.event_type}</span>
											</div>
										</div>
									</div>
									<div className='text-xs text-gray-500 whitespace-nowrap ml-4'>{dayjs(log.created_at).format('MMM D, YYYY • h:mm A')}</div>
								</div>

								{/* Expandable */}
								<AnimatePresence>
									{isExpanded && (
										<motion.div
											initial={{ opacity: 0, height: 0 }}
											animate={{ opacity: 1, height: 'auto' }}
											exit={{ opacity: 0, height: 0 }}
											transition={{ duration: 0.2 }}
											className='mt-3 ml-8 border-t border-gray-100 pt-3 space-y-2 text-sm text-gray-700'
										>
											{/* Subject */}
											<div className='flex items-start gap-2'>
												<ClipboardDocumentListIcon className='h-4 w-4 text-gray-400 mt-[2px]' />
												<div>
													<span className='font-medium'>Rule Name:</span>{' '}
													{log.subject_type === 'rule' ? (
														<span className='text-blue-700 font-medium'>{ruleName}</span>
													) : (
														<>
															{log.subject_type} ({log.subject_id})
														</>
													)}
												</div>
											</div>

											{/* Metadata */}
											{(changes && Object.keys(changes).length > 0) || (log.metadata?.rule && Object.keys(log.metadata.rule).length > 0) ? (
												<div className='space-y-1.5'>
													<div className='font-semibold text-gray-800 mt-4 mb-2'>Metadata:</div>

													{changes && Object.keys(changes).length > 0 && (
														<>
															{Object.entries(changes).map(([key, val]) => (
																<div key={key} className='text-sm text-gray-700'>
																	<span className='font-medium capitalize'>{key}</span> <span className='text-gray-500'>changed from</span>{' '}
																	<span className='text-red-500'>“{val.old ?? '-'}”</span> <span className='text-gray-500'>to</span>{' '}
																	<span className='text-green-600 font-medium'>“{val.new ?? '-'}”</span>
																</div>
															))}
														</>
													)}

													{ruleData && Object.keys(ruleData).length > 0 && (
														<>
															{Object.entries(ruleData).map(([key, val]) => (
																<div key={key} className='text-sm text-gray-700'>
																	<span className='font-medium capitalize'>{key}:</span> <span className='text-gray-600'>{String(val)}</span>
																</div>
															))}
														</>
													)}
												</div>
											) : (
												<div className='text-gray-500 italic ml-1'>No metadata provided.</div>
											)}
										</motion.div>
									)}
								</AnimatePresence>
							</div>
						);
					})
				)}
			</div>
		</section>
	);
});

export default OrganizationEventLog;
