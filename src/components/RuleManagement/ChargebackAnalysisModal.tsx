import { observer } from 'mobx-react-lite';
import { useState, useEffect, useRef } from 'react';
import { ruleManagementStore } from './RuleManagementStore';
import { useRules } from '../../hooks/useRules';
import { uploadFile } from '../../utils/fileUpload';
import { XMarkIcon, CloudArrowUpIcon, DocumentTextIcon, SparklesIcon, PencilIcon, CheckIcon } from '@heroicons/react/24/outline';
import Lottie from 'lottie-react';

const ChargebackAnalysisModal = observer(() => {
	const { implementRule } = useRules();
	const [activeTab, setActiveTab] = useState<'analysis' | 'rules'>('analysis');
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [csvPreview, setCsvPreview] = useState<string[]>([]);
	const [isAnalyzing, setIsAnalyzing] = useState(false);
	const [showSuccessModal, setShowSuccessModal] = useState(false);
	const [errorMessage, setErrorMessage] = useState('');
	const [animationData, setAnimationData] = useState(null);
	const [initialRuleCount, setInitialRuleCount] = useState(0);
	const [showFailureAlert, setShowFailureAlert] = useState(false);
	
	// Refs to track timers and data generation state
	const failSafeTimerRef = useRef<NodeJS.Timeout | null>(null);
	const checkRulesTimerRef = useRef<NodeJS.Timeout | null>(null);
	const lastRuleCountRef = useRef(0);
	const noNewDataTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const dataGenerationCompleteRef = useRef(false);

	// Load Lottie animation
	useEffect(() => {
		const loadAnimation = async () => {
			try {
				const response = await fetch('/loading/Animation-1751146315326.json');
				const data = await response.json();
				setAnimationData(data);
			} catch (error) {
				console.error('Error loading Lottie animation:', error);
			}
		};
		loadAnimation();
	}, []);

	// Enhanced monitoring logic for rule generation
	useEffect(() => {
		if (showSuccessModal) {
			console.log('Starting rule generation monitoring...');
			dataGenerationCompleteRef.current = false;
			lastRuleCountRef.current = initialRuleCount;

			// Extended fail-safe timer (30 seconds total)
			failSafeTimerRef.current = setTimeout(() => {
				console.log('Fail-safe timer triggered - no rules generated in 30 seconds');
				setShowSuccessModal(false);
				setShowFailureAlert(true);
				
				// Auto-dismiss failure alert after 3 seconds
				setTimeout(() => {
					setShowFailureAlert(false);
				}, 3000);
			}, 30000); // 30 seconds fail-safe

			// Check for rule changes more frequently
			checkRulesTimerRef.current = setInterval(() => {
				const currentRuleCount = ruleManagementStore.inProgressRules.length;
				
				console.log(`Rule count check: ${currentRuleCount} (was ${lastRuleCountRef.current})`);
				
				// If we have new rules added
				if (currentRuleCount > initialRuleCount) {
					console.log('New rules detected!');
					
					// Check if rule count has stopped increasing (data generation complete)
					if (currentRuleCount === lastRuleCountRef.current) {
						// No new rules in the last check - start completion timer
						if (!noNewDataTimeoutRef.current && !dataGenerationCompleteRef.current) {
							console.log('No new rules in last check, starting completion timer...');
							noNewDataTimeoutRef.current = setTimeout(() => {
								console.log('Data generation appears complete, closing modal');
								dataGenerationCompleteRef.current = true;
								
								// Clear all timers
								if (failSafeTimerRef.current) {
									clearTimeout(failSafeTimerRef.current);
									failSafeTimerRef.current = null;
								}
								if (checkRulesTimerRef.current) {
									clearInterval(checkRulesTimerRef.current);
									checkRulesTimerRef.current = null;
								}
								
								// Close modal and switch to rules tab
								setShowSuccessModal(false);
								setActiveTab('rules');
							}, 5000); // Wait 5 seconds after last rule to ensure completion
						}
					} else {
						// Rule count increased, reset the completion timer
						if (noNewDataTimeoutRef.current) {
							console.log('New rules still coming, resetting completion timer');
							clearTimeout(noNewDataTimeoutRef.current);
							noNewDataTimeoutRef.current = null;
						}
						lastRuleCountRef.current = currentRuleCount;
					}
				}
			}, 2000); // Check every 2 seconds

			return () => {
				// Cleanup all timers
				if (failSafeTimerRef.current) {
					clearTimeout(failSafeTimerRef.current);
					failSafeTimerRef.current = null;
				}
				if (checkRulesTimerRef.current) {
					clearInterval(checkRulesTimerRef.current);
					checkRulesTimerRef.current = null;
				}
				if (noNewDataTimeoutRef.current) {
					clearTimeout(noNewDataTimeoutRef.current);
					noNewDataTimeoutRef.current = null;
				}
			};
		}
	}, [showSuccessModal, initialRuleCount]);

	const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (file && file.type === 'text/csv') {
			setSelectedFile(file);

			// Read first few lines for preview
			const reader = new FileReader();
			reader.onload = (e) => {
				const text = e.target?.result as string;
				const lines = text.split('\n').slice(0, 3);
				setCsvPreview(lines);
			};
			reader.readAsText(file);
		}
	};

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault();
	};

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault();
		const file = e.dataTransfer.files[0];
		if (file && file.type === 'text/csv') {
			setSelectedFile(file);

			const reader = new FileReader();
			reader.onload = (e) => {
				const text = e.target?.result as string;
				const lines = text.split('\n').slice(0, 3);
				setCsvPreview(lines);
			};
			reader.readAsText(file);
		}
	};

	const handleAnalyzePatterns = async () => {
		if (!selectedFile) return;

		setIsAnalyzing(true);
		setInitialRuleCount(ruleManagementStore.inProgressRules.length);
		console.log('Starting analysis with initial rule count:', ruleManagementStore.inProgressRules.length);

		try {
			// Upload file to Supabase storage using the uploadFile utility
			const uploadResult = await uploadFile(selectedFile);

			if (!uploadResult.success) {
				throw new Error(uploadResult.error || 'File upload failed');
			}

			console.log('File uploaded successfully:', uploadResult);

			// Show success message and switch to Generated Rules tab
			setActiveTab('rules');
			setShowSuccessModal(true);
		} catch (error) {
			console.error('Analysis error:', error);
			setErrorMessage(`File upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
		} finally {
			setIsAnalyzing(false);
		}
	};

	const handleImplementRule = async (ruleId: string) => {
		try {
			await implementRule(ruleId);
			// The rule will be automatically removed from inProgressRules via WebSocket
		} catch (error) {
			console.error('Error implementing rule:', error);
			alert('Failed to implement rule: ' + (error instanceof Error ? error.message : 'Unknown error'));
		}
	};

	const handleEditRule = (rule: any) => {
		ruleManagementStore.editRule(rule, true); // true indicates editing from Generated Rules
	};

	const handleClose = () => {
		// Clear all timers when closing
		if (failSafeTimerRef.current) {
			clearTimeout(failSafeTimerRef.current);
			failSafeTimerRef.current = null;
		}
		if (checkRulesTimerRef.current) {
			clearInterval(checkRulesTimerRef.current);
			checkRulesTimerRef.current = null;
		}
		if (noNewDataTimeoutRef.current) {
			clearTimeout(noNewDataTimeoutRef.current);
			noNewDataTimeoutRef.current = null;
		}

		setSelectedFile(null);
		setCsvPreview([]);
		setIsAnalyzing(false);
		setActiveTab('analysis');
		setShowSuccessModal(false);
		setShowFailureAlert(false);
		dataGenerationCompleteRef.current = false;
		ruleManagementStore.closeChargebackAnalysis();
	};

	if (!ruleManagementStore.isChargebackAnalysisOpen) return null;

	return (
		<div className='fixed inset-0 z-50 overflow-y-auto'>
			<div className='flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0'>
				{/* Background overlay */}
				<div className='fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity' onClick={handleClose} />

				{/* Modal panel - Reverted to original structure */}
				<div className='inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full'>
					{/* Header */}
					<div className='bg-white px-6 pt-6 pb-4'>
						<div className='flex items-center justify-between mb-6'>
							<h3 className='text-xl font-semibold text-gray-900'>Chargeback Analysis</h3>
							<button type='button' onClick={handleClose} className='text-gray-400 hover:text-gray-600 transition-colors'>
								<XMarkIcon className='h-6 w-6' />
							</button>
						</div>

						{/* Tabs */}
						<div className='border-b border-gray-200'>
							<nav className='-mb-px flex space-x-8'>
								<button
									onClick={() => setActiveTab('analysis')}
									className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
										activeTab === 'analysis' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
									}`}
								>
									Chargeback Analysis
								</button>
								<button
									onClick={() => setActiveTab('rules')}
									className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
										activeTab === 'rules' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
									}`}
								>
									Generated Rules
									{ruleManagementStore.inProgressRules.length > 0 && (
										<span className='ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800'>
											{ruleManagementStore.inProgressRules.length}
										</span>
									)}
								</button>
							</nav>
						</div>
					</div>

					{/* Content - Reverted to original max-height */}
					<div className='px-6 pb-6 max-h-[35rem] overflow-y-auto'>
						{activeTab === 'analysis' ? (
							<div className='space-y-6'>
								{/* Upload Section */}
								<div>
									<h4 className='text-lg font-medium text-gray-900 mb-4'>Upload CSV Data</h4>
									<div
										onDragOver={handleDragOver}
										onDrop={handleDrop}
										className='border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors'
									>
										<CloudArrowUpIcon className='mx-auto h-12 w-12 text-gray-400' />
										<div className='mt-4'>
											<label htmlFor='csv-upload' className='cursor-pointer'>
												<span className='mt-2 block text-sm font-medium text-gray-900'>
													Drop your CSV file here, or <span className='text-blue-600 hover:text-blue-500'>browse</span>
												</span>
												<input id='csv-upload' type='file' accept='.csv' onChange={handleFileSelect} className='sr-only' />
											</label>
											<p className='mt-1 text-xs text-gray-500'>CSV files only</p>
										</div>
									</div>

									{/* CSV Preview */}
									{csvPreview.length > 0 && (
										<div className='mt-4 p-4 bg-gray-50 rounded-lg'>
											<div className='flex items-center mb-2'>
												<DocumentTextIcon className='h-5 w-5 text-gray-400 mr-2' />
												<span className='text-sm font-medium text-gray-700'>{selectedFile?.name} - Preview</span>
											</div>
											<div className='text-xs font-mono text-gray-600 space-y-1'>
												{csvPreview.map((line, index) => (
													<div key={index} className='truncate'>
														{line}
													</div>
												))}
											</div>
										</div>
									)}
								</div>

								{/* Analyze Button */}
								<div className='flex justify-center'>
									<button
										onClick={handleAnalyzePatterns}
										disabled={!selectedFile || isAnalyzing}
										className='inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
									>
										{isAnalyzing ? (
											<>
												<div className='animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2'></div>
												Analyzing Patterns...
											</>
										) : (
											<>
												<SparklesIcon className='h-5 w-5 mr-2' />
												Analyze Patterns
											</>
										)}
									</button>
								</div>
							</div>
						) : (
							<div className='space-y-6'>
								{/* Generated Rules */}
								{ruleManagementStore.inProgressRules.length > 0 ? (
									<div>
										<h4 className='text-lg font-medium text-gray-900 mb-4'>Generated Fraud Detection Rules</h4>
										<div className='space-y-4'>
											{ruleManagementStore.inProgressRules.map((rule) => (
												<div key={rule.id} className='border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow'>
													<div className='flex justify-between items-start mb-4'>
														<div className='flex-1'>
															<h5 className='text-lg font-medium text-gray-900'>{rule.name}</h5>
															<p className='text-sm text-gray-600 mt-1'>{rule.description}</p>
														</div>
														<span
															className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
																rule.effectiveness >= 90
																	? 'bg-green-100 text-green-800'
																	: rule.effectiveness >= 70
																	? 'bg-yellow-100 text-yellow-800'
																	: 'bg-red-100 text-red-800'
															}`}
														>
															{rule.effectiveness > 0 ? `${rule.effectiveness}% confidence` : 'Processing...'}
														</span>
													</div>

													<div className='bg-gray-50 rounded p-3 mb-4'>
														<code className='text-sm text-gray-700'>{rule.condition}</code>
													</div>

													<div className='grid grid-cols-3 gap-4 mb-4'>
														<div className='text-center'>
															<div className='text-2xl font-bold text-green-600'>{rule.catches > 0 ? rule.catches : '—'}</div>
															<div className='text-xs text-gray-500'>Expected Catches</div>
														</div>
														<div className='text-center'>
															<div className='text-2xl font-bold text-red-600'>{rule.false_positives > 0 ? rule.false_positives : '—'}</div>
															<div className='text-xs text-gray-500'>Est. False Positives</div>
														</div>
														<div className='text-center'>
															<div className='text-2xl font-bold text-blue-600'>
																{rule.effectiveness > 0 ? `${rule.effectiveness}%` : '—'}
															</div>
															<div className='text-xs text-gray-500'>Effectiveness</div>
														</div>
													</div>

													<div className='flex justify-end space-x-3'>
														<button 
															onClick={() => handleEditRule(rule)}
															className='inline-flex items-center px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors'
														>
															<PencilIcon className='h-4 w-4 mr-2' />
															Edit
														</button>
														<button
															onClick={() => handleImplementRule(rule.id)}
															className='inline-flex items-center px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors'
														>
															<CheckIcon className='h-4 w-4 mr-2' />
															Implement Rule
														</button>
													</div>
												</div>
											))}
										</div>
									</div>
								) : (
									<div className='text-center py-12'>
										<SparklesIcon className='mx-auto h-12 w-12 text-gray-400' />
										<h3 className='mt-2 text-sm font-medium text-gray-900'>No rules generated yet</h3>
										<p className='mt-1 text-sm text-gray-500'>Upload a CSV file and run the analysis to generate fraud detection rules.</p>
									</div>
								)}
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Success Modal - Full Screen with Lottie Animation */}
			{showSuccessModal && (
				<div className='fixed inset-0 z-[60] bg-white flex flex-col items-center justify-center'>
					{/* Lottie Animation - Increased Size */}
					{animationData && (
						<div className='mb-8'>
							<Lottie 
								animationData={animationData} 
								style={{ width: 300, height: 300 }}
								loop={true}
							/>
						</div>
					)}
					
					{/* Success Message - Updated Text */}
					<div className='max-w-md text-center'>
						<p className='text-gray-700 text-lg'>
							Our AI is processing it now. The generated rules will appear in real-time in the <strong>Generated Rules</strong> tab.
						</p>
					</div>
				</div>
			)}

			{/* Failure Alert Modal */}
			{showFailureAlert && (
				<div className='fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50'>
					<div className='bg-white rounded-xl shadow-xl p-6 max-w-md text-center'>
						<h2 className='text-xl font-semibold text-red-600 mb-3'>Processing Failed</h2>
						<p className='text-gray-700'>
							Something went wrong. Please try again.
						</p>
					</div>
				</div>
			)}

			{/* Error Modal */}
			{errorMessage && (
				<div className='fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50'>
					<div className='bg-white rounded-xl shadow-xl p-6 max-w-md text-center'>
						<h2 className='text-xl font-semibold text-red-600 mb-3'>Upload Failed</h2>
						<p className='text-gray-700 mb-4'>{errorMessage}</p>
						<button onClick={() => setErrorMessage('')} className='bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition'>
							Close
						</button>
					</div>
				</div>
			)}
		</div>
	);
});

export default ChargebackAnalysisModal;