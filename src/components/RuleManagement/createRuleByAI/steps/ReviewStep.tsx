import React from 'react';
import { CheckCircleIcon, ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import type { StepperData } from '@/components/RuleManagement/createRuleByAI/CreateRuleByAI';

interface ReviewStepProps {
  data: StepperData;
  updateData: (updates: Partial<StepperData>) => void;
}

const ReviewStep: React.FC<ReviewStepProps> = ({ data, updateData }) => {
  const { finalRule, ruleImpactAnalysis, logOnly } = data;

  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDecisionColor = (decision: string) => {
    switch (decision?.toLowerCase()) {
      case 'deny': return 'bg-red-100 text-red-800';
      case 'review': return 'bg-yellow-100 text-yellow-800';
      case 'allow': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!finalRule) {
    return (
      <div className="p-4 mt-2 text-red-700 bg-red-100 border border-red-200 rounded-lg" role="alert">
        No rule selected for review. Please go back and select a rule.
      </div>
    );
  }

  return (
    <div className="mt-2 space-y-6">
      <div>
        <h2 className="text-lg font-medium text-gray-900">Review Generated Rule</h2>
        <p className="mt-1 text-sm text-gray-500">
          Review the final rule configuration before deployment. You can enable log-only mode for testing.
        </p>
      </div>

      {/* Rule Details Card */}
      <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
        <h3 className="text-lg font-medium text-gray-900">{finalRule.name}</h3>
        <p className="mt-1 text-sm text-gray-600">
          {finalRule.description}
        </p>

        <div className="grid grid-cols-2 gap-4 mt-4 sm:grid-cols-4">
          <div>
            <p className="text-xs font-medium text-gray-500">Category</p>
            <p className="text-sm font-medium text-gray-900">
              {finalRule.category}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">Severity</p>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(finalRule.severity)}`}>
              {finalRule.severity}
            </span>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">Decision</p>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getDecisionColor(finalRule.decision)}`}>
              {finalRule.decision}
            </span>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">Source</p>
            <p className="text-sm font-medium text-gray-900">
              {finalRule.source}
            </p>
          </div>
        </div>

        <div className="my-4 border-t border-gray-200"></div>

        <div>
          <h4 className="text-sm font-medium text-gray-700">Rule Condition</h4>
          <div className="p-3 mt-1 font-mono text-sm bg-gray-50 rounded-md">
            <pre className="whitespace-pre-wrap">{finalRule.condition}</pre>
          </div>
        </div>
      </div>

      {/* Impact Analysis */}
      {ruleImpactAnalysis && (
        <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="flex items-center mb-4">
            <InformationCircleIcon className="w-5 h-5 mr-1 text-blue-500" />
            <h3 className="text-lg font-medium text-gray-900">Impact Analysis</h3>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 text-center bg-gray-50 rounded-lg">
              <p className="text-2xl font-semibold text-green-600">
                {ruleImpactAnalysis.wouldCatch}
              </p>
              <p className="text-xs text-gray-500">
                Transactions Caught
              </p>
            </div>
            <div className="p-4 text-center bg-gray-50 rounded-lg">
              <p className="text-2xl font-semibold text-yellow-600">
                {ruleImpactAnalysis.falsePositives}
              </p>
              <p className="text-xs text-gray-500">
                Potential False Positives
              </p>
            </div>
            <div className="p-4 text-center bg-gray-50 rounded-lg">
              <p className="text-2xl font-semibold text-blue-600">
                ${ruleImpactAnalysis.potentialFraudPrevented.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500">
                Potential Fraud Prevented
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Deployment Configuration */}
      <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="flex items-center mb-4">
          <CheckCircleIcon className="w-5 h-5 mr-1 text-green-500" />
          <h3 className="text-lg font-medium text-gray-900">Deployment Configuration</h3>
        </div>
        
        <div className="flex items-start">
          <div className="flex items-center h-5">
            <input
              id="log-only"
              type="checkbox"
              checked={logOnly}
              onChange={(e) => updateData({ logOnly: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
          </div>
          <div className="ml-3 text-sm">
            <label htmlFor="log-only" className="font-medium text-gray-700">
              Log-only mode (recommended for testing)
            </label>
            <p className="mt-1 text-gray-500">
              {logOnly 
                ? "Rule will log matches without blocking transactions. Perfect for testing and validation."
                : "Rule will actively block transactions that match the conditions. Use with caution."
              }
            </p>
          </div>
        </div>

        {!logOnly && (
          <div className="flex p-4 mt-4 bg-yellow-50 rounded-lg">
            <ExclamationTriangleIcon className="flex-shrink-0 w-5 h-5 text-yellow-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Production Mode</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>This rule will actively block transactions. Consider enabling log-only mode first to validate the rule's behavior.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewStep;
