import React, { useState } from 'react';
import { 
  BoltIcon, 
  CpuChipIcon, 
  CurrencyDollarIcon,
  ClockIcon,
  DocumentTextIcon,
  CalculatorIcon,
  InformationCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline';
import type { StepperData } from '@/components/RuleManagement/createRuleByAI/CreateRuleByAI';
import type { TokenEstimation } from '@/services/openaiService';

interface AnalysisSelectionStepProps {
  data: StepperData;
  updateData: (updates: Partial<StepperData>) => void;
  onTokenEstimation: (csvContent: string) => void;
  inProgress?: boolean;
}

const AnalysisSelectionStep: React.FC<AnalysisSelectionStepProps> = ({
  data,
  updateData,
  onTokenEstimation,
  inProgress
}) => {
  const [showCostBreakdown, setShowCostBreakdown] = useState(false);

  React.useEffect(() => {
    if (data.csvContent && !data.tokenEstimation) {
      onTokenEstimation(data.csvContent);
    }
  }, [data.csvContent, data.tokenEstimation, onTokenEstimation]);

  const handleAnalysisTypeChange = (type: 'quick' | 'deep') => {
    if (!inProgress) {
      updateData({ analysisType: type });
    }
  };

  const formatCost = (tokens: number, pricePerToken: number): string => {
    const cost = (tokens * pricePerToken).toFixed(2);
    return `$${cost}`;
  };

  const CostEstimateButton = ({ cost, onClick }: { cost: string; onClick: () => void }) => (
    <button
      onClick={onClick}
      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 hover:bg-green-200 transition-colors cursor-pointer group"
    >
      <CurrencyDollarIcon className="h-3.5 w-3.5 mr-1" />
      {cost}
      <InformationCircleIcon className="h-3.5 w-3.5 ml-1 opacity-60 group-hover:opacity-100" />
    </button>
  );

  const AnalysisOptionCard = ({
    type,
    title,
    description,
    icon,
    cost,
    time,
    rules,
    features,
    isSelected
  }: {
    type: 'quick' | 'deep';
    title: string;
    description: string;
    icon: React.ReactNode;
    cost: string;
    time: string;
    rules: string;
    features: { label: string; color: string }[];
    isSelected: boolean;
  }) => (
    <div 
      className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
        isSelected 
          ? 'border-blue-500 bg-blue-50' 
          : 'border-gray-200 hover:border-blue-300'
      }`}
      onClick={() => handleAnalysisTypeChange(type)}
    >
      <div className="flex items-start gap-4">
        <div className={`p-1.5 rounded-full ${isSelected ? 'bg-blue-100' : 'bg-gray-100'}`}>
          <div className={`h-6 w-6 ${isSelected ? 'text-blue-600' : 'text-gray-600'}`}>
            {icon}
          </div>
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">{title}</h3>
            <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
              isSelected 
                ? 'border-blue-600 bg-blue-600' 
                : 'border-gray-300 bg-white'
            }`}>
              {isSelected && (
                <div className="h-2 w-2 rounded-full bg-white"></div>
              )}
            </div>
          </div>
          <p className="mt-1 text-sm text-gray-600">{description}</p>
          
          <div className="mt-3 flex flex-wrap gap-2">
            {data.tokenEstimation ? (
              <CostEstimateButton 
                cost={cost} 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCostBreakdown(!showCostBreakdown);
                }}
              />
            ) : (
              <div className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <CurrencyDollarIcon className="h-3.5 w-3.5 mr-1" />
                {cost}
              </div>
            )}
            <div className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              <ClockIcon className="h-3.5 w-3.5 mr-1" />
              {time}
            </div>
            <div className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              <DocumentTextIcon className="h-3.5 w-3.5 mr-1" />
              {rules}
            </div>
            {features.map((feature, index) => (
              <div 
                key={index}
                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                  feature.color === 'secondary' 
                    ? 'bg-purple-100 text-purple-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {feature.label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Token Estimation Display */}
      {data.tokenEstimation && (
        <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Data Analysis Summary</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <p className="text-sm font-medium text-gray-500">Total Records</p>
              <p className="text-xl font-semibold text-gray-900">
                {Array.isArray(data.csvData) ? data.csvData.length.toLocaleString() : 'N/A'}
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <p className="text-sm font-medium text-gray-500">Estimated Tokens</p>
              <p className="text-xl font-semibold text-gray-900">
                {data.tokenEstimation.processedTokens.toLocaleString()}
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <p className="text-sm font-medium text-gray-500">Data Size</p>
              <p className="text-xl font-semibold text-gray-900">
                {(data.tokenEstimation.processedTokens * 4 / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Analysis Type Selection */}
      <div className="space-y-6">
        <h2 className="text-lg font-medium text-gray-900">Choose Analysis Type</h2>
        <div className="space-y-4">
          <AnalysisOptionCard
            type="quick"
            title="Quick Analysis"
            description="Fast rule generation. Analyzes patterns and generates 1 fraud detection in under 30 seconds"
            icon={<BoltIcon />}
            cost={data.tokenEstimation ? formatCost(data.tokenEstimation.processedTokens, 0.00001) : 'Calculating...'}
            time="~30 seconds"
            rules="1 rule"
            features={[]}
            isSelected={data.analysisType === 'quick'}
          />

          <AnalysisOptionCard
            type="deep"
            title="Deep Analysis"
            description="Comprehensive analysis using statistical analysis, pattern detection, and generates detailed rules with explanations."
            icon={<CpuChipIcon />}
            cost={data.tokenEstimation ? formatCost(data.tokenEstimation.processedTokens * 2, 0.00003) : 'Calculating...'}
            time="2-3 minutes"
            rules="3 rules"
            features={[{ label: "Detailed insights", color: "secondary" }]}
            isSelected={data.analysisType === 'deep'}
          />
        </div>
      </div>

      {/* Cost Breakdown Dropdown */}
      {data.tokenEstimation && showCostBreakdown && (
        <div className="p-6 bg-gray-50 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900 flex items-center">
              <CalculatorIcon className="h-5 w-5 mr-2 text-gray-600" />
              Cost Breakdown
            </h2>
            <button
              onClick={() => setShowCostBreakdown(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <ChevronUpIcon className="h-5 w-5" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <h3 className="font-medium text-gray-700 mb-3 flex items-center">
                <BoltIcon className="h-5 w-5 text-blue-500 mr-2" />
                Quick Analysis
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Estimated Cost:</span>
                  <span className="font-medium">
                    {formatCost(data.tokenEstimation.processedTokens, 0.00001)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Input Tokens:</span>
                  <span>{data.tokenEstimation.originalTokens.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Output Tokens (est.):</span>
                  <span>{(data.tokenEstimation.processedTokens * 0.2).toFixed(0)}</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm">
              <h3 className="font-medium text-gray-700 mb-3 flex items-center">
                <CpuChipIcon className="h-5 w-5 text-purple-500 mr-2" />
                Deep Analysis
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Estimated Cost:</span>
                  <span className="font-medium">
                    {formatCost(data.tokenEstimation.processedTokens * 2, 0.00003)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Input Tokens:</span>
                  <span>{(data.tokenEstimation.originalTokens * 1.5).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Output Tokens (est.):</span>
                  <span>{(data.tokenEstimation.processedTokens * 0.5).toFixed(0)}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded-r">
            <div className="flex">
              <div className="flex-shrink-0">
                <CalculatorIcon className="h-5 w-5 text-yellow-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  Cost estimates are approximate and based on the number of tokens in your dataset. 
                  Actual usage may vary depending on the complexity of the analysis.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalysisSelectionStep;
