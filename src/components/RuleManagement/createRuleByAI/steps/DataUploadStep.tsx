import React from 'react';
import { CloudArrowUpIcon, TrashIcon, CheckCircleIcon, ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import type { StepperData } from '@/components/RuleManagement/createRuleByAI/CreateRuleByAI';
import * as XLSX from 'xlsx';

interface DataUploadStepProps {
	data: StepperData;
	updateData: (updates: Partial<StepperData>) => void;
	onValidation: (csvContent: string) => void;
}

interface ParsedFileData {
	headers: string[];
	rows: string[][];
	jsonData: Record<string, unknown>[];
	originalFormat: string;
}

const DataUploadStep: React.FC<DataUploadStepProps> = ({ data, updateData, onValidation }) => {
	const [isUploading, setIsUploading] = React.useState(false);
	const [isDragOver, setIsDragOver] = React.useState(false);
	const [errors, setErrors] = React.useState<{ [key: string]: string }>({});
	const fileInputRef = React.useRef<HTMLInputElement>(null);

	// --- PII detection helpers ---
	const NAME_HEADERS = React.useMemo(
		() => new Set([
			'name', 'full_name', 'fullname', 'first', 'first_name', 'firstname', 'last', 'last_name', 'lastname', 'given_name', 'surname', 'customer_name', 'cardholder_name'
		]),
		[]
	);

	const ADDRESS_HEADERS = React.useMemo(
		() => new Set([
			'address', 'address1', 'address2', 'street', 'street_address', 'billing_address', 'city', 'state', 'province', 'region', 'zip', 'zipcode', 'postal', 'postal_code', 'country', 'billing_city', 'billing_state', 'billing_zip'
		]),
		[]
	);

	const luhnCheck = (num: string): boolean => {
		let sum = 0;
		let shouldDouble = false;
		for (let i = num.length - 1; i >= 0; i--) {
			let digit = parseInt(num.charAt(i), 10);
			if (shouldDouble) {
				digit *= 2;
				if (digit > 9) digit -= 9;
			}
			sum += digit;
			shouldDouble = !shouldDouble;
		}
		return sum % 10 === 0;
	};

	const looksLikeName = (val: string): boolean => {
		// Basic heuristic: two+ capitalized words (no digits), common name chars
		if (!val) return false;
		if (/\d/.test(val)) return false;
		const trimmed = val.trim();
		// Avoid very long strings
		if (trimmed.length < 3 || trimmed.length > 64) return false;
		const parts = trimmed.split(/\s+/);
		if (parts.length < 2 || parts.length > 4) return false;
		const nameWord = /^[A-Z][a-zA-Z'\-]{1,}$/;
		return parts.every(p => nameWord.test(p));
	};

	const looksLikeAddress = (val: string): boolean => {
		if (!val) return false;
		const streetSuffix = '(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Ln|Lane|Dr|Drive|Ct|Court|Pl|Place|Way|Pkwy|Parkway|Cir|Circle|Ter|Terrace)';
		const re = new RegExp(`\\b\\d{1,6}\\s+[A-Za-z0-9.'\\- ]{3,}\\s+${streetSuffix}\\b`, 'i');
		return re.test(val);
	};

	type PIIScanResult = {
		detected: boolean;
		findings: {
			names: number;
			creditCards: number;
			addresses: number;
			samples: { names: string[]; creditCards: string[]; addresses: string[] };
		};
	};

	const scanPII = (headers: string[], jsonData: Record<string, any>[]): PIIScanResult => {
		const lowerHeaders = headers.map(h => (h || '').toString().toLowerCase().trim());
		const hasNameHeader = lowerHeaders.some(h => NAME_HEADERS.has(h));
		const addressHeaderCount = lowerHeaders.filter(h => ADDRESS_HEADERS.has(h)).length;
		const hasAddressColumns = addressHeaderCount >= 2; // heuristically treat as address present

		let names = 0;
		let creditCards = 0;
		let addresses = hasAddressColumns ? 1 : 0; // if clear address columns, mark one finding
		const samples = { names: [] as string[], creditCards: [] as string[], addresses: [] as string[] };

		const ROW_SCAN_LIMIT = 500; // performance guard
		for (let i = 0; i < jsonData.length && i < ROW_SCAN_LIMIT; i++) {
			const row = jsonData[i];
			for (const key of Object.keys(row)) {
				const raw = row[key];
				if (raw === null || raw === undefined) continue;
				const val = String(raw);

				// credit card: 16 digits, allow spaces/dashes, pass Luhn
				const ccMatches = val.match(/\b(?:\d[ -]*?){16}\b/g);
				if (ccMatches) {
					for (const m of ccMatches) {
						const digits = m.replace(/\D/g, '');
						if (digits.length === 16 && luhnCheck(digits)) {
							creditCards++;
							if (samples.creditCards.length < 3) samples.creditCards.push(m.trim());
						}
					}
				}

				// names
				if (hasNameHeader || looksLikeName(val)) {
					if (looksLikeName(val)) {
						names++;
						if (samples.names.length < 3) samples.names.push(val.trim());
					}
				}

				// addresses
				if (looksLikeAddress(val)) {
					addresses++;
					if (samples.addresses.length < 3) samples.addresses.push(val.trim());
				}
			}
		}

		const detected = (names > 0) || (creditCards > 0) || (addresses > 0);
		return { detected, findings: { names, creditCards, addresses, samples } };
	};

	// Simple CSV parser to avoid Papa Parse dependency
	const parseCSVText = (text: string): { 
		headers: string[]; 
		rows: string[][];
		jsonData: Record<string, any>[] 
	} => {
		const lines = text.split('\n').filter((line) => line.trim());
		if (lines.length === 0) throw new Error('Empty file');

		const parseCSVLine = (line: string): string[] => {
			const result: string[] = [];
			let current = '';
			let inQuotes = false;

			for (let i = 0; i < line.length; i++) {
				const char = line[i];

				if (char === '"') {
					if (inQuotes && line[i + 1] === '"') {
						current += '"';
						i++; // Skip next quote
					} else {
						inQuotes = !inQuotes;
					}
				} else if (char === ',' && !inQuotes) {
					result.push(current.trim());
					current = '';
				} else {
					current += char;
				}
			}

			result.push(current.trim());
			return result;
		};

		const headers = parseCSVLine(lines[0]);
		const rows = lines.slice(1).map((line) => parseCSVLine(line));
		
		// Convert rows to array of objects with proper typing
		const jsonData: Record<string, any>[] = rows.map(row => {
			const obj: Record<string, any> = {};
			headers.forEach((header, index) => {
				obj[header] = row[index] || '';
			});
			return obj;
		});

		return { headers, rows, jsonData };
	};

	// Universal file parser that handles multiple formats
	const parseFile = async (file: File): Promise<ParsedFileData> => {
		const fileExt = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));

		switch (fileExt) {
			case '.csv':
				return await parseCSVFile(file);
			case '.tsv':
				return await parseTSVFile(file);
			case '.xlsx':
			case '.xls':
			case '.xlsm':
			case '.xlsb':
				return await parseExcelFile(file);
			case '.json':
				return await parseJSONFile(file);
			case '.txt':
				return await parseTextFile(file);
			default:
				throw new Error(`Unsupported file format: ${fileExt}`);
		}
	};

	const parseCSVFile = async (file: File): Promise<ParsedFileData> => {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();

			reader.onload = (e) => {
				try {
					const text = e.target?.result as string;
					const { headers, rows, jsonData } = parseCSVText(text);

					if (rows.length === 0) {
						throw new Error('Empty CSV file');
					}

					resolve({
						headers,
						rows,
						jsonData,
						originalFormat: 'csv',
					});
				} catch (error) {
					reject(new Error(`Error parsing CSV: ${error instanceof Error ? error.message : 'Unknown error'}`));
				}
			};

			reader.onerror = () => {
				reject(new Error('Error reading CSV file'));
			};

			reader.readAsText(file);
		});
	};

	const parseTSVFile = async (file: File): Promise<ParsedFileData> => {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();

			reader.onload = (e) => {
				try {
					const text = e.target?.result as string;
					const lines = text.split('\n').filter((line) => line.trim());

					if (lines.length === 0) {
						throw new Error('Empty TSV file');
					}

					const headers = lines[0].split('\t').map((h) => h.trim());
					const rows = lines.slice(1).map((line) => line.split('\t').map((cell) => cell.trim()));

					const jsonData = rows.map((row) => {
						const obj: Record<string, unknown> = {};
						headers.forEach((header, index) => {
							obj[header] = row[index] || '';
						});
						return obj;
					});

					resolve({
						headers,
						rows,
						jsonData,
						originalFormat: 'tsv',
					});
				} catch (error) {
					reject(new Error(`Error parsing TSV: ${error instanceof Error ? error.message : 'Unknown error'}`));
				}
			};

			reader.onerror = () => {
				reject(new Error('Error reading TSV file'));
			};

			reader.readAsText(file);
		});
	};

	const parseExcelFile = async (file: File): Promise<ParsedFileData> => {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();

			reader.onload = (e) => {
				try {
					const data = new Uint8Array(e.target?.result as ArrayBuffer);
					const workbook = XLSX.read(data, { type: 'array' });
					const firstSheetName = workbook.SheetNames[0];
					const worksheet = workbook.Sheets[firstSheetName];

					// Convert to array of arrays
					const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];

					if (rawData.length === 0) {
						throw new Error('Empty worksheet');
					}

					const headers = rawData[0].map((header) => String(header || '').trim());
					const rows = rawData
						.slice(1)
						.filter((row) => row.some((cell) => cell !== undefined && cell !== null && cell !== ''))
						.map((row) => row.map((cell) => String(cell || '')));

					// Convert to JSON format
					const jsonData = rows.map((row) => {
						const obj: Record<string, unknown> = {};
						headers.forEach((header, index) => {
							obj[header] = row[index] || '';
						});
						return obj;
					});

					resolve({
						headers,
						rows,
						jsonData,
						originalFormat: 'excel',
					});
				} catch (error) {
					reject(new Error(`Error parsing Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`));
				}
			};

			reader.onerror = () => {
				reject(new Error('Error reading Excel file'));
			};

			reader.readAsArrayBuffer(file);
		});
	};

	const parseJSONFile = async (file: File): Promise<ParsedFileData> => {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();

			reader.onload = (e) => {
				try {
					const text = e.target?.result as string;
					const jsonData = JSON.parse(text);

					if (!Array.isArray(jsonData)) {
						throw new Error('JSON file must contain an array of objects');
					}

					if (jsonData.length === 0) {
						throw new Error('Empty JSON array');
					}

					// Extract headers from first object
					const headers = Object.keys(jsonData[0]);

					// Convert to rows format
					const rows = jsonData.map((obj) => headers.map((header) => String(obj[header] || '')));

					resolve({
						headers,
						rows,
						jsonData,
						originalFormat: 'json',
					});
				} catch (error) {
					reject(new Error(`Error parsing JSON file: ${error instanceof Error ? error.message : 'Unknown error'}`));
				}
			};

			reader.onerror = () => {
				reject(new Error('Error reading JSON file'));
			};

			reader.readAsText(file);
		});
	};

	const parseTextFile = async (file: File): Promise<ParsedFileData> => {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();

			reader.onload = (e) => {
				try {
					const text = e.target?.result as string;
					const lines = text.split('\n').filter((line) => line.trim());

					if (lines.length === 0) {
						throw new Error('Empty text file');
					}

					// Try to detect delimiter
					const firstLine = lines[0];
					let delimiter = ',';
					if (firstLine.includes('\t')) delimiter = '\t';
					else if (firstLine.includes(';')) delimiter = ';';
					else if (firstLine.includes('|')) delimiter = '|';

					const headers = firstLine.split(delimiter).map((h) => h.trim());
					const rows = lines.slice(1).map((line) => line.split(delimiter).map((cell) => cell.trim()));

					// Convert to JSON format
					const jsonData = rows.map((row) => {
						const obj: Record<string, unknown> = {};
						headers.forEach((header, index) => {
							obj[header] = row[index] || '';
						});
						return obj;
					});

					resolve({
						headers,
						rows,
						jsonData,
						originalFormat: 'text',
					});
				} catch (error) {
					reject(new Error(`Error parsing text file: ${error instanceof Error ? error.message : 'Unknown error'}`));
				}
			};

			reader.onerror = () => {
				reject(new Error('Error reading text file'));
			};

			reader.readAsText(file);
		});
	};

	const handleFileUpload = async (file: File) => {
		const validExtensions = ['.csv', '.tsv', '.xlsx', '.xls', '.xlsm', '.xlsb', '.json', '.txt'];
		const fileExt = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));

		if (!validExtensions.includes(fileExt)) {
			setErrors({
				csvData: 'Please upload a valid file (CSV, TSV, Excel, JSON, or TXT)',
			});
			return;
		}

		if (file.size > 10 * 1024 * 1024) {
			// 10MB limit
			setErrors({
				csvData: 'File size must be less than 10MB',
			});
			return;
		}

		setIsUploading(true);
		setErrors({});

		try {
			const parsedData = await parseFile(file);

			if (parsedData.rows.length === 0) {
				throw new Error('No data found in the file');
			}

			// Convert back to CSV format for compatibility with existing validation
			const csvContent = [parsedData.headers.join(','), ...parsedData.rows.map((row) => row.join(','))].join('\n');

			// PII scan
			const pii = scanPII(parsedData.headers, parsedData.jsonData);

			updateData({
				csvFile: file,
				csvContent: csvContent,
				csvHeaders: parsedData.headers,
				csvData: parsedData.jsonData, // This is now Record<string, any>[]
				fileName: file.name, // Store the original filename
				piiDetected: pii.detected,
				piiAcknowledged: false,
				piiFindings: pii.findings,
			});

			onValidation(csvContent);
		} catch (error) {
			console.error('Error processing file:', error);
			setErrors({
				csvData: `Error processing file: ${error instanceof Error ? error.message : 'Unknown error'}`,
			});
		} finally {
			setIsUploading(false);
		}
	};

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragOver(false);
		const file = e.dataTransfer.files[0];
		if (file) handleFileUpload(file);
	};

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragOver(true);
	};

	const handleDragLeave = () => {
		setIsDragOver(false);
	};

	const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) handleFileUpload(file);
	};

	const handleRemoveFile = () => {
		updateData({
			csvFile: null,
			csvContent: '',
			csvData: [], // This will be Record<string, any>[]
			csvHeaders: [],
			piiDetected: false,
			piiAcknowledged: false,
			piiFindings: { names: 0, creditCards: 0, addresses: 0, samples: { names: [], creditCards: [], addresses: [] } },
		});
		if (fileInputRef.current) {
			fileInputRef.current.value = '';
		}
	};

	const renderFilePreview = () => {
		if (!data.csvFile) return null;

		return (
			<div className='mt-4 p-4 bg-green-50 border border-green-200 rounded-lg'>
				<div className='flex items-center'>
					<CheckCircleIcon className='h-5 w-5 text-green-500 mr-2' />
					<span className='font-medium text-green-800'>File uploaded successfully</span>
					<button onClick={handleRemoveFile} className='ml-auto text-red-600 hover:text-red-800' aria-label='Remove file'>
						<TrashIcon className='h-5 w-5' />
					</button>
				</div>
				<div className='mt-2 text-sm text-gray-600'>
					<p>File: {data.csvFile.name}</p>
					<p>Size: {(data.csvFile.size / 1024).toFixed(2)} KB</p>
					<p>Rows: {data.csvData?.length || 0}</p>
					<p>Columns: {data.csvHeaders?.length || 0}</p>
				</div>
			</div>
		);
	};

	const renderPIIWarning = () => {
		if (!data.csvFile) return null;
		if (!data.piiDetected) return null;
		const acknowledged = !!data.piiAcknowledged;
		const findings = data.piiFindings || { names: 0, creditCards: 0, addresses: 0, samples: { names: [], creditCards: [], addresses: [] } };

		if (acknowledged) {
			return (
				<div className='rounded-md bg-yellow-50 p-4 mt-3'>
					<div className='flex'>
						<InformationCircleIcon className='h-5 w-5 text-yellow-600' aria-hidden='true' />
						<div className='ml-3'>
							<h3 className='text-sm font-medium text-yellow-800'>PII Warning Accepted</h3>
							<p className='mt-1 text-sm text-yellow-700'>You chose to proceed with potential PII present. Consider removing PII unless it is critical for rule generation.</p>
						</div>
					</div>
				</div>
			);
		}

		return (
			<div className='rounded-md bg-yellow-50 p-4 mt-3'>
				<div className='flex items-start'>
					<ExclamationTriangleIcon className='h-5 w-5 text-yellow-600 mr-2' aria-hidden='true' />
					<div className='flex-1'>
						<h3 className='text-sm font-medium text-yellow-800'>Potential PII Detected</h3>
						<p className='mt-1 text-sm text-yellow-800'>
							We found possible PII. Remove it unless critical for rule generation.
						</p>
						<p className='mt-1 text-sm text-yellow-800'>
							Names: {findings.names} • 16-digit cards: {findings.creditCards} • Addresses: {findings.addresses}
						</p>
					</div>
					<div className='ml-4 flex items-center space-x-2'>
						<button onClick={() => updateData({ piiAcknowledged: true })} className='inline-flex items-center rounded-md bg-yellow-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-yellow-500'>
							Proceed Anyway
						</button>
						<button onClick={handleRemoveFile} className='inline-flex items-center rounded-md border border-yellow-700 px-3 py-2 text-sm font-semibold text-yellow-800 hover:bg-yellow-100'>
							Remove File
						</button>
					</div>
				</div>
			</div>
		);
	};

	const renderDataPreview = () => {
		if (!data.csvData || !Array.isArray(data.csvData) || data.csvData.length === 0) return null;
		if (!data.csvHeaders || !Array.isArray(data.csvHeaders) || data.csvHeaders.length === 0) return null;

		const previewRows = data.csvData.slice(0, 5); // Show first 5 rows in preview

		return (
			<div className='mt-6'>
				<h3 className='text-sm font-medium text-gray-700 mb-2'>Data Preview</h3>
				<div className='overflow-x-auto'>
					<div className='inline-block min-w-full align-middle'>
						<div className='overflow-hidden shadow-sm ring-1 ring-black ring-opacity-5 rounded-lg'>
							<table className='min-w-full divide-y divide-gray-300'>
								<thead className='bg-gray-50'>
									<tr>
										{data.csvHeaders.map((header, index) => (
											<th key={index} scope='col' className='py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6'>
												{header}
											</th>
										))}
									</tr>
								</thead>
								<tbody className='divide-y divide-gray-200 bg-white'>
									{previewRows.map((row, rowIndex) => {
										// Handle both object and array formats
										const isObject = typeof row === 'object' && !Array.isArray(row);

										if (!isObject && !Array.isArray(row)) {
											return null; // Skip invalid rows
										}

										return (
											<tr key={rowIndex}>
												{data.csvHeaders.map((header, cellIndex) => {
													// Get cell value based on data structure
													const cellValue = isObject ? (row as Record<string, any>)[header] : (row as string[])[cellIndex];

													return (
														<td
															key={`${rowIndex}-${cellIndex}`}
															className='whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-500 sm:pl-6 truncate max-w-xs'
															title={String(cellValue || '')}
														>
															{String(cellValue || '')}
														</td>
													);
												})}
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
					</div>
				</div>
			</div>
		);
	};

	return (
		<div className='space-y-6'>
			<div>
				<h2 className='text-lg font-medium text-gray-900'>Upload Transaction Data</h2>
				<p className='mt-1 text-sm text-gray-500'>
					Upload a file containing transaction data for analysis. Supported formats: CSV, TSV, Excel (XLSX/XLS), JSON, or TXT. The first row should contain headers.
				</p>
			</div>

			<div className='mt-4'>
				<div
					onDrop={handleDrop}
					onDragOver={handleDragOver}
					onDragLeave={handleDragLeave}
					className={`flex justify-center rounded-lg border border-dashed px-6 py-10 transition-colors ${
						isDragOver ? 'border-indigo-600 bg-indigo-50' : 'border-gray-900/25'
					}`}
				>
					<div className='text-center'>
						<CloudArrowUpIcon className='mx-auto h-12 w-12 text-gray-300' aria-hidden='true' />
						<div className='mt-4 flex text-sm leading-6 text-gray-600'>
							<label
								htmlFor='file-upload'
								className='relative cursor-pointer rounded-md bg-white font-semibold text-indigo-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-600 focus-within:ring-offset-2 hover:text-indigo-500'
							>
								<span>Upload a file</span>
								<input
									id='file-upload'
									name='file-upload'
									type='file'
									className='sr-only'
									accept='.csv, .tsv, .xlsx, .xls, .xlsm, .xlsb, .json, .txt'
									onChange={handleFileInputChange}
									ref={fileInputRef}
								/>
							</label>
							<p className='pl-1'>or drag and drop</p>
						</div>
						<p className='text-xs text-gray-500'>CSV, TSV, Excel, JSON, or TXT up to 10MB</p>
					</div>
				</div>
			</div>

			{isUploading && (
				<div className='flex items-center justify-center py-4'>
					<div className='animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600'></div>
					<span className='ml-2 text-sm text-gray-600'>Processing file...</span>
				</div>
			)}

			{errors.csvData && (
				<div className='rounded-md bg-red-50 p-4'>
					<div className='flex'>
						<ExclamationTriangleIcon className='h-5 w-5 text-red-400' aria-hidden='true' />
						<div className='ml-3'>
							<h3 className='text-sm font-medium text-red-800'>Upload Error</h3>
							<div className='mt-2 text-sm text-red-700'>
								<p>{errors.csvData}</p>
							</div>
						</div>
					</div>
				</div>
			)}

			{renderFilePreview()}
			{renderDataPreview()}
			{renderPIIWarning()}

			{data.csvData && data.csvData.length > 0 && (
				<div className='rounded-md bg-blue-50 p-4'>
					<div className='flex'>
						<InformationCircleIcon className='h-5 w-5 text-blue-400' aria-hidden='true' />
						<div className='ml-3'>
							<h3 className='text-sm font-medium text-blue-800'>File Statistics</h3>
							<div className='mt-2 text-sm text-blue-700'>
								<p>
									Successfully loaded {data.csvData.length} rows with {data.csvHeaders?.length || 0} columns.
								</p>
								<p>Preview shows the column headers, please make sure these are the correct headers</p>
							</div>
						</div>
					</div>
				</div>
			)}

			<div className='mt-6'>
				<h2 className='text-lg font-medium text-gray-900'>Custom Instructions (Optional)</h2>
				<textarea
					className='block w-full mt-1 p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500'
					rows={4}
					placeholder='e.g., Focus on high-value transactions, Consider geographic patterns, Prioritize velocity-based rules...'
					value={data.userInstructions || ''}
					onChange={(e) => updateData({ userInstructions: e.target.value })}
				/>
				<p className='mt-1 text-sm text-gray-500'>Provide specific guidance for the AI to focus on particular fraud patterns or business requirements.</p>
			</div>
		</div>
	);
};

export default DataUploadStep;
