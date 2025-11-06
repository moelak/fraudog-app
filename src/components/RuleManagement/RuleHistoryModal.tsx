import { observer } from 'mobx-react-lite';
import { Dialog, DialogTitle, DialogContent, IconButton, Tooltip } from '@mui/material';
import { formatDistanceToNow } from 'date-fns';
import { ruleManagementStore, type RuleHistoryItem } from './RuleManagementStore';
import { XMarkIcon, ClockIcon } from '@heroicons/react/24/outline';

const RuleHistoryModal = observer(() => {
	const { showHistoryModal, ruleHistory, setShowHistoryModal } = ruleManagementStore;
	return (
		<Dialog
			open={showHistoryModal}
			onClose={() => setShowHistoryModal(false)}
			maxWidth='md'
			fullWidth
			PaperProps={{
				className: 'rounded-2xl shadow-lg border border-gray-200',
			}}
		>
			{/* --- Header --- */}
			<div className='flex items-center justify-between px-6 pt-5 pb-3 border-b border-gray-200'>
				<div className='flex items-center gap-2'>
					<ClockIcon className='h-5 w-5 text-gray-700' />
					<DialogTitle className='!text-lg !font-semibold !text-gray-800 !p-0'>Rule Change History</DialogTitle>
				</div>
				<Tooltip title='Close'>
					<IconButton onClick={() => setShowHistoryModal(false)}>
						<XMarkIcon className='h-5 w-5 text-gray-500 hover:text-gray-700 transition-colors' />
					</IconButton>
				</Tooltip>
			</div>

			{/* --- Content --- */}
			<DialogContent className='px-6 py-4 max-h-[70vh] overflow-y-auto bg-gray-50'>
				{ruleHistory.length === 0 ? (
					<p className='text-gray-500 text-sm italic text-center py-8'>No change history found for this rule.</p>
				) : (
					<div className='space-y-4'>
						{ruleHistory.map((log: RuleHistoryItem) => (
							<div key={log.id} className='bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:border-gray-200 transition-all'>
								{/* Header */}
								<div className='flex items-center justify-between mb-2'>
									<div className='text-sm text-gray-700 font-medium'>
										<strong>{log.actor_name || 'Unknown User'}</strong>- {log.event_type}
									</div>
									<span className='text-xs text-gray-400'>{formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}</span>
								</div>

								{/* Metadata section */}
								{(log.metadata?.changes && Object.keys(log.metadata.changes).length > 0) || (log.metadata?.rule && Object.keys(log.metadata.rule).length > 0) ? (
									<div className='space-y-1.5'>
										<div className='font-semibold text-gray-800 mt-4 mb-2'>Metadata:</div>

										{/* 🟢 Field changes (old → new) */}
										{log.metadata?.changes && Object.keys(log.metadata.changes).length > 0 && (
											<>
												{Object.entries(log.metadata.changes).map(([key, val]) => (
													<div key={key} className='text-sm text-gray-700'>
														<span className='font-medium capitalize'>{key}</span> <span className='text-gray-500'>changed from</span>{' '}
														<span className='text-red-500'>“{val.old ?? '-'}”</span> <span className='text-gray-500'>to</span>{' '}
														<span className='text-green-600 font-medium'>“{val.new ?? '-'}”</span>
													</div>
												))}
											</>
										)}

										{/* 🟢 Full rule info (for create/delete/recover/etc.) */}
										{log.metadata?.rule && Object.keys(log.metadata.rule).length > 0 && (
											<>
												{Object.entries(log.metadata.rule).map(([key, val]) => (
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
							</div>
						))}
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
});

export default RuleHistoryModal;
