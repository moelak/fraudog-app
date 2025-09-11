import React from 'react';
import { 
  CloudArrowUpIcon, 
  TrashIcon, 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  InformationCircleIcon 
} from '@heroicons/react/24/outline';
import type { StepperData } from '@/components/RuleManagement/createRuleByAI/CreateRuleManagement';

interface DataUploadStepProps {
  data: StepperData;
  updateData: (updates: Partial<StepperData>) => void;
  onValidation: (csvContent: string) => void;
}

const DataUploadStep: React.FC<DataUploadStepProps> = ({
  data,
  updateData,
  onValidation
}) => {
  const [isDragOver, setIsDragOver] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const [errors, setErrors] = React.useState<{[key: string]: string}>({});
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const parseCSV = (text: string): { headers: string[]; rows: string[][] } => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length === 0) throw new Error('Empty CSV file');
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const rows = lines.slice(1).map(line => 
      line.split(',').map(cell => cell.trim().replace(/"/g, ''))
    );
    
    return { headers, rows };
  };

  const handleFileUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setErrors({ csvData: 'Please upload a CSV file' });
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      setErrors({ csvData: 'File size must be less than 10MB' });
      return;
    }

    setIsUploading(true);
    try {
      const text = await file.text();
      const { headers, rows } = parseCSV(text);
      
      updateData({
        csvFile: file,
        csvContent: text,
        csvData: rows.slice(0, 1000) // Limit to first 1000 rows for preview
      });
      
      onValidation(text);
      setErrors({});
    } catch (error) {
      setErrors({ csvData: `Error parsing CSV: ${error instanceof Error ? error.message : 'Unknown error'}` });
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
      csvFile: undefined,
      csvContent: '',
      csvData: undefined
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const renderFilePreview = () => {
    if (!data.csvFile) return null;

    return (
      <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center">
          <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
          <span className="font-medium text-green-800">File uploaded successfully</span>
          <button
            onClick={handleRemoveFile}
            className="ml-auto text-red-600 hover:text-red-800"
            aria-label="Remove file"
          >
            <TrashIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-2 text-sm text-gray-600">
          <p>File: {data.csvFile.name}</p>
          <p>Size: {(data.csvFile.size / 1024).toFixed(2)} KB</p>
        </div>
      </div>
    );
  };

  const renderDataPreview = () => {
    if (!data.csvData?.length) return null;

    const headers = data.csvContent.split('\n')[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const previewRows = data.csvData.slice(0, 5); // Show first 5 rows in preview

    return (
      <div className="mt-6">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Data Preview</h3>
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full align-middle">
            <div className="overflow-hidden shadow-sm ring-1 ring-black ring-opacity-5 rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    {headers.map((header, index) => (
                      <th 
                        key={index}
                        scope="col"
                        className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {previewRows.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {row.map((cell: string, cellIndex: number) => (
                        <td 
                          key={`${rowIndex}-${cellIndex}`}
                          className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-500 sm:pl-6 truncate max-w-xs"
                          title={cell}
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        {data.csvData.length > 5 && (
          <p className="mt-2 text-sm text-gray-500">
            Showing 5 of {data.csvData.length} rows. Only the first 1000 rows are displayed in the preview.
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-medium text-gray-900">Upload Transaction Data</h2>
        <p className="mt-1 text-sm text-gray-500">
          Upload a CSV file containing transaction data for analysis. The first row should contain headers.
        </p>
      </div>

      <div 
        className={`mt-4 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-lg ${
          isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <div className="space-y-1 text-center">
          <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
          <div className="flex text-sm text-gray-600">
            <label
              htmlFor="file-upload"
              className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
            >
              <span>Upload a file</span>
              <input
                id="file-upload"
                name="file-upload"
                type="file"
                className="sr-only"
                accept=".csv"
                onChange={handleFileInputChange}
                ref={fileInputRef}
              />
            </label>
            <p className="pl-1">or drag and drop</p>
          </div>
          <p className="text-xs text-gray-500">CSV up to 10MB</p>
        </div>
      </div>

      {isUploading && (
        <div className="mt-4">
          <div className="h-1 w-full bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600 rounded-full animate-pulse"></div>
          </div>
          <p className="mt-1 text-sm text-gray-500">Processing file...</p>
        </div>
      )}

      {errors.csvData && (
        <div className="mt-4 p-4 bg-red-50 border-l-4 border-red-400">
          <div className="flex">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{errors.csvData}</p>
            </div>
          </div>
        </div>
      )}

      {!isUploading && data.csvFile && (
        <div className="space-y-4">
          {renderFilePreview()}
          {renderDataPreview()}
        </div>
      )}

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <div className="flex">
          <div className="flex-shrink-0">
            <InformationCircleIcon className="h-5 w-5 text-blue-400" aria-hidden="true" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">Data Privacy</h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>Your data is processed securely and never stored permanently. We only use it to generate fraud detection rules.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <h2 className="text-lg font-medium text-gray-900">Custom Instructions (Optional)</h2>
        <textarea
          className="block w-full mt-1 p-2 border border-gray-300 rounded-lg"
          rows={4}
          placeholder="e.g., Focus on high-value transactions, Consider geographic patterns, Prioritize velocity-based rules..."
          value={data.userInstructions}
          onChange={(e) => updateData({ userInstructions: e.target.value })}
        />
        <p className="mt-1 text-sm text-gray-500">
          Provide specific guidance for the AI to focus on particular fraud patterns or business requirements.
        </p>
      </div>
    </div>
  );
};

export default DataUploadStep;
