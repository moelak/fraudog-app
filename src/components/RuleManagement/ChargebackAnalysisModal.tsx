import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { uploadFile } from '../../utils/fileUpload';
import { ruleManagementStore } from './RuleManagementStore';
import { 
  XMarkIcon, 
  CloudArrowUpIcon, 
  DocumentTextIcon, 
  ChartPieIcon, 
  SparklesIcon 
} from '@heroicons/react/24/outline';

interface AnalysisResult {
  id: string;
  status: string;
  result?: {
    analysis: string;
    confidence: number;
    riskLevel: string;
    fraudScore: number;
    recommendations: string[];
    [key: string]: any;
  };
}

interface AnalysisSummary {
  totalRecords: number;
  riskScore: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
}

interface Recommendation {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  action: string;
}

interface Rule {
  id: number;
  name: string;
  description: string;
  category: string;
  condition: string;
  status: string;
  severity: string;
  confidence: number;
  expectedCatches: number;
  estimatedFalsePositives: number;
  [key: string]: any;
}

// Remove unused interfaces
/*
interface AnalysisSummary {
  totalRecords: number;
  riskScore: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
}

interface Recommendation {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  action: string;
}
*/

const ChargebackAnalysisModal = observer(() => {
  const [activeTab, setActiveTab] = useState<'analysis' | 'rules'>('analysis');
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [csvPreview, setCsvPreview] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [generatedRules, setGeneratedRules] = useState<Rule[]>([]);
  
  // Filter states
  const [dateType, setDateType] = useState('Transaction Date');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [activeFilter, setActiveFilter] = useState('Amount');

  const filters = ['Amount', 'Country', 'Mismatch', 'Card', 'Age', 'Device'];

  // Sample pie chart data
  const pieChartData = [
    { label: '$0-$100', value: 35, color: '#3B82F6' },
    { label: '$100-$500', value: 28, color: '#10B981' },
    { label: '$500-$1000', value: 20, color: '#F59E0B' },
    { label: '$1000+', value: 17, color: '#EF4444' },
  ];

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'text/csv') {
      try {
        // Upload file to Supabase
        const uploadResult = await uploadFile(file);
        
        if (!uploadResult.success) {
          throw new Error(uploadResult.error || 'Failed to upload file');
        }

        // Set the file and preview
        setSelectedFile(file);
        setCsvPreview([]); // Clear preview while processing
        setIsProcessing(true);

        // Wait for AI model response
        const response = await supabase.storage
          .from('AI-model-response')
          .list(file.name);

        if (response.error) {
          throw response.error;
        }

        // Process the response
        const responseFile = response.data[0];
        const responseContent = await supabase.storage
          .from('AI-model-response')
          .download(responseFile.name);

        if (responseContent.error) {
          throw responseContent.error;
        }

        // Update state with processed data
        const processedData = JSON.parse(responseContent.data.toString());
        setAnalysisResults(processedData);
      } catch (error) {
        console.error('Error processing file:', error);
        setError(error instanceof Error ? error.message : 'Failed to process file');
      } finally {
        setIsProcessing(false);
      }
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
    
    try {
      const formData = new FormData();
      formData.append('account_id', '123');
      formData.append('csv', selectedFile);

      const response = await fetch('https://52ce-149-88-113-238.ngrok-free.app/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        // Process the response
        await response.json();
        
        // Mock generated rules based on analysis
        const mockRules: Rule[] = [
          {
            id: Date.now() + 1,
            name: 'High-Risk Transaction Pattern',
            description: 'Transactions over $500 from new accounts with mismatched billing addresses',
            category: 'risk',
            condition: 'transaction.amount > 500 && account.age < 30 && billing.address_match === false',
            status: 'active',
            severity: 'high',
            confidence: 0.92,
            expectedCatches: 156,
            estimatedFalsePositives: 12
          },
          {
            id: Date.now() + 2,
            name: 'Geographic Anomaly Detection',
            description: 'Transactions from countries with high chargeback rates for this merchant',
            category: 'geography',
            condition: 'transaction.country in ["XX", "YY"] && merchant.chargeback_rate > 0.05',
            status: 'active',
            severity: 'medium',
            confidence: 0.87,
            expectedCatches: 89,
            estimatedFalsePositives: 8
          },
          {
            id: Date.now() + 3,
            name: 'Device Fingerprint Risk',
            description: 'Multiple failed attempts from same device followed by successful transaction',
            category: 'device',
            condition: 'device.failed_attempts > 2 && transaction.success === true && timeWindow < 1800',
            status: 'active',
            severity: 'high',
            confidence: 0.78,
            expectedCatches: 67,
            estimatedFalsePositives: 15
          }
        ];

        setGeneratedRules(mockRules);
        setActiveTab('rules');
                // Show success toast
        alert('Analysis complete! Generated rules are now available in the Generated Rules tab.');
      } else {
        throw new Error('Analysis failed');
      }
    } catch (error) {
      console.error('Analysis error:', error);
      alert('Analysis failed. Please try again or check your connection.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setCsvPreview([]);
    setIsAnalyzing(false);
    setGeneratedRules([]);
    setActiveTab('analysis');
    ruleManagementStore.closeChargebackAnalysis();
  };

  const handleImplementRule = (rule: any) => {
    ruleManagementStore.addRule({
      name: rule.name,
      description: rule.description,
      category: 'Behavioral',
      condition: rule.condition,
      status: 'active',
      severity: 'medium'
    });
    
    alert(`Rule "${rule.name}" has been implemented successfully!`);
  };

  if (!ruleManagementStore.isChargebackAnalysisOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={handleClose}
        />

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          {/* Header */}
          <div className="bg-white px-6 pt-6 pb-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Chargeback Analysis</h3>
              <button
                type="button"
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('analysis')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'analysis'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Chargeback Analysis
                </button>
                <button
                  onClick={() => setActiveTab('rules')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'rules'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Generated Rules
                  {generatedRules.length > 0 && (
                    <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {generatedRules.length}
                    </span>
                  )}
                </button>
              </nav>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 pb-6 max-h-96 overflow-y-auto">
            {activeTab === 'analysis' ? (
              <div className="space-y-6">
                {/* Upload Section */}
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Upload CSV Data</h4>
                  <div
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors"
                  >
                    <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="mt-4">
                      <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-2">
                          <DocumentTextIcon className="h-5 w-5 text-gray-400" />
                          <span className="text-sm text-gray-500">Drag CSV file here or click to upload</span>
                        </div>

                        <div className="flex flex-col gap-2">
                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                            <input
                              type="file"
                              accept=".csv"
                              onChange={handleFileSelect}
                              className="hidden"
                              id="file-upload"
                            />
                            <label
                              htmlFor="file-upload"
                              className="cursor-pointer text-sm text-violet-600 hover:text-violet-700"
                            >
                              Choose file
                            </label>
                          </div>
                          {selectedFile && (
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <span>{selectedFile.name}</span>
                                <button
                                  onClick={() => {
                                    setSelectedFile(null);
                                    setCsvPreview([]);
                                  }}
                                  className="text-red-500 hover:text-red-600"
                                >
                                  <XMarkIcon className="h-4 w-4" />
                                </button>
                              </div>
                              {isProcessing ? (
                                <div className="flex items-center gap-2 text-sm text-blue-500">
                                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                    <circle
                                      className="opacity-25"
                                      cx="12"
                                      cy="12"
                                      r="10"
                                      stroke="currentColor"
                                      strokeWidth="4"
                                    />
                                    <path
                                      className="opacity-75"
                                      fill="currentColor"
                                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                    />
                                  </svg>
                                  Processing...
                                </div>
                              ) : error ? (
                                <div className="text-sm text-red-500">{error}</div>
                              ) : null}
                              
                              {analysisResults && (
                                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                                  <h3 className="text-sm font-semibold mb-2">Analysis Results</h3>
                                  <pre className="text-xs whitespace-pre-wrap">
                                    {JSON.stringify(analysisResults, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* CSV Preview */}
                  {csvPreview.length > 0 && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center mb-2">
                        <DocumentTextIcon className="h-5 w-5 text-gray-400 mr-2" />
                        <span className="text-sm font-medium text-gray-700">
                          {selectedFile?.name} - Preview
                        </span>
                      </div>
                      <div className="text-xs font-mono text-gray-600 space-y-1">
                        {csvPreview.map((line, index) => (
                          <div key={index} className="truncate">{line}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Visualization Filters */}
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Visualization Filters</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Date Type
                      </label>
                      <select
                        value={dateType}
                        onChange={(e) => setDateType(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option>Transaction Date</option>
                        <option>Chargeback Date</option>
                        <option>Settlement Date</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Date Range
                      </label>
                      <div className="flex space-x-2">
                        <input
                          type="date"
                          value={dateRange.start}
                          onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <input
                          type="date"
                          value={dateRange.end}
                          onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Filter Buttons */}
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Filter By
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {filters.map((filter) => (
                        <button
                          key={filter}
                          onClick={() => setActiveFilter(filter)}
                          className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                            activeFilter === filter
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {filter}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Pie Chart */}
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <ChartPieIcon className="h-5 w-5 mr-2" />
                    Chargebacks by Transaction Amount
                  </h4>
                  <div className="bg-gray-50 rounded-lg p-6">
                    <div className="flex items-center justify-center">
                      <div className="relative w-48 h-48">
                        <svg viewBox="0 0 200 200" className="w-full h-full">
                          {pieChartData.map((segment, index) => {
                            const total = pieChartData.reduce((sum, item) => sum + item.value, 0);
                            // Calculate percentage (unused in UI but kept for reference)
                            // const _percentage = (segment.value / total) * 100;
                            const angle = (segment.value / total) * 360;
                            const startAngle = pieChartData.slice(0, index).reduce((sum, item) => sum + (item.value / total) * 360, 0);
                            
                            const x1 = 100 + 80 * Math.cos((startAngle - 90) * Math.PI / 180);
                            const y1 = 100 + 80 * Math.sin((startAngle - 90) * Math.PI / 180);
                            const x2 = 100 + 80 * Math.cos((startAngle + angle - 90) * Math.PI / 180);
                            const y2 = 100 + 80 * Math.sin((startAngle + angle - 90) * Math.PI / 180);
                            
                            const largeArcFlag = angle > 180 ? 1 : 0;
                            
                            return (
                              <path
                                key={index}
                                d={`M 100 100 L ${x1} ${y1} A 80 80 0 ${largeArcFlag} 1 ${x2} ${y2} Z`}
                                fill={segment.color}
                                stroke="white"
                                strokeWidth="2"
                              />
                            );
                          })}
                        </svg>
                      </div>
                      <div className="ml-8 space-y-2">
                        {pieChartData.map((segment, index) => (
                          <div key={index} className="flex items-center">
                            <div
                              className="w-4 h-4 rounded mr-3"
                              style={{ backgroundColor: segment.color }}
                            />
                            <span className="text-sm text-gray-700">
                              {segment.label}: {segment.value}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Analyze Button */}
                <div className="flex justify-center">
                  <button
                    onClick={handleAnalyzePatterns}
                    disabled={!selectedFile || isAnalyzing}
                    className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isAnalyzing ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Analyzing Patterns...
                      </>
                    ) : (
                      <>
                        <SparklesIcon className="h-5 w-5 mr-2" />
                        Analyze Patterns
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Generated Rules */}
                {generatedRules.length > 0 ? (
                  <div>
                    <h4 className="text-lg font-medium text-gray-900 mb-4">Generated Fraud Detection Rules</h4>
                    <div className="space-y-4">
                      {generatedRules.map((rule) => (
                        <div key={rule.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex-1">
                              <h5 className="text-lg font-medium text-gray-900">{rule.name}</h5>
                              <p className="text-sm text-gray-600 mt-1">{rule.description}</p>
                            </div>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              rule.confidence >= 90 ? 'bg-green-100 text-green-800' :
                              rule.confidence >= 70 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {rule.confidence}% confidence
                            </span>
                          </div>
                          
                          <div className="bg-gray-50 rounded p-3 mb-4">
                            <code className="text-sm text-gray-700">{rule.condition}</code>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-4 mb-4">
                            <div className="text-center">
                              <div className="text-2xl font-bold text-green-600">{rule.expectedCatches}</div>
                              <div className="text-xs text-gray-500">Expected Catches</div>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-red-600">{rule.estimatedFalsePositives}</div>
                              <div className="text-xs text-gray-500">Est. False Positives</div>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-blue-600">
                                {Math.round((rule.expectedCatches / (rule.expectedCatches + rule.estimatedFalsePositives)) * 100)}%
                              </div>
                              <div className="text-xs text-gray-500">Effectiveness</div>
                            </div>
                          </div>
                          
                          <div className="flex justify-end space-x-3">
                            <button className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                              Preview
                            </button>
                            <button
                              onClick={() => handleImplementRule(rule)}
                              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              Implement Rule
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <SparklesIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No rules generated yet</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Upload a CSV file and run the analysis to generate fraud detection rules.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

export default ChargebackAnalysisModal;