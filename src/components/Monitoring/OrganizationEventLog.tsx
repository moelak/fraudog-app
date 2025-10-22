import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { ChevronDownIcon, ChevronRightIcon, UserCircleIcon, ClockIcon, ClipboardDocumentListIcon } from '@heroicons/react/24/outline';
import dayjs from 'dayjs';
import { notificationStore } from './NotificationStore';
import { motion, AnimatePresence } from 'framer-motion';

interface MetadataChanges {
	[key: string]: {
		old?: string | null;
		new?: string | null;
	};
}

const OrganizationEventLog = observer(() => {
	const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

	const toggleExpand = (id: number) => {
		setExpandedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};

	return (
		<section className='bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden transition-all duration-300'>
			{/* Header */}
			<div className='px-6 py-4 border-b border-gray-100 flex items-center gap-2 bg-gradient-to-r from-gray-50 to-white'>
				<ClockIcon className='h-5 w-5 text-blue-600' />
				<h3 className='text-lg font-semibold text-gray-900'>Organization Event Log (7 Days)</h3>
			</div>

			{/* Body */}
			<div className='divide-y divide-gray-100 max-h-[26rem] overflow-y-auto bg-gray-50'>
				{notificationStore.filteredNotifications.length === 0 ? (
					<div className='px-6 py-6 text-gray-500 text-sm text-center italic'>No recent organization events found.</div>
				) : (
					notificationStore.filteredNotifications.map((log) => {
						const isExpanded = expandedIds.has(log.id);
						const ruleName = log.subject_type === 'rule' ? notificationStore.ruleNameCache[log.subject_id] || log.subject_id : null;

						// ✅ Type-safe extraction for metadata.changes
						const changes = (log.metadata?.changes ?? null) as MetadataChanges | null;

						return (
							<div
								key={log.id}
								className={`relative bg-white px-6 py-3 border-l-4 transition-all duration-200 ${
									isExpanded ? 'border-blue-500 bg-blue-50/30' : 'border-transparent hover:border-blue-300 hover:bg-gray-50'
								}`}
							>
								{/* Header Row */}
								<div className='flex justify-between items-center cursor-pointer' onClick={() => toggleExpand(log.id)}>
									{/* LEFT SIDE */}
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

									{/* RIGHT SIDE (TIME) */}
									<div className='text-xs text-gray-500 whitespace-nowrap ml-4'>{dayjs(log.created_at).format('MMM D, YYYY • h:mm A')}</div>
								</div>

								{/* Expandable Content */}
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
											{changes && Object.keys(changes).length > 0 ? (
												<div className='space-y-1.5'>
													<div className='font-semibold text-gray-800 mt-4 mb-2'>Metadata:</div>

													{Object.entries(changes).map(([key, val]) => (
														<div key={key} className='text-sm text-gray-700'>
															<span className='font-medium capitalize'>{key}</span> <span className='text-gray-500'>changed from</span>{' '}
															<span className='text-red-500'>“{val.old || '-'}”</span> <span className='text-gray-500'>to</span>{' '}
															<span className='text-green-600 font-medium'>“{val.new || '-'}”</span>
														</div>
													))}
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
