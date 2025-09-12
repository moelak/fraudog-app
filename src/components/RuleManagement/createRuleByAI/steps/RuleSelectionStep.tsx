import React from 'react';
import { CheckCircleIcon, ShieldCheckIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import type { StepperData } from '@/components/RuleManagement/createRuleByAI/CreateRuleByAI';
import type { OpenAIRule } from '@/utils/ruleConverter';

interface RuleSelectionStepProps {
  data: StepperData;
  updateData: (updates: Partial<StepperData>) => void;
}

const RuleSelectionStep: React.FC<RuleSelectionStepProps> = ({
  data,
  updateData
}) => {
  const handleRuleSelect = (index: number) => {
    updateData({ selectedRuleIndex: index });
  };

  const getSeverityColor = (severity: string | number) => {
    if (typeof severity === 'number') {
      if (severity >= 80) return 'bg-red-100 text-red-800';
      if (severity >= 50) return 'bg-yellow-100 text-yellow-800';
      return 'bg-blue-100 text-blue-800';
    }

    const severityLower = severity.toLowerCase();
    if (severityLower === 'high' || severityLower === 'error') return 'bg-red-100 text-red-800';
    if (severityLower === 'medium' || severityLower === 'warning') return 'bg-yellow-100 text-yellow-800';
    if (severityLower === 'low' || severityLower === 'info') return 'bg-blue-100 text-blue-800';
    if (severityLower === 'success') return 'bg-green-100 text-green-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getDecisionColor = (decision: string) => {
    if (decision === 'deny') return 'bg-red-100 text-red-800';
    if (decision === 'allow') return 'bg-green-100 text-green-800';
    return 'bg-yellow-100 text-yellow-800';
  };

  const formatCondition = (condition: string) => {
    return condition
      .replace(/AND/g, '\nAND')
      .replace(/OR/g, '\nOR')
      .replace(/\(/g, '(\n  ')
      .replace(/\)/g, '\n)');
  };

  if (data.generatedRules.length === 0) {
    return (
      <div className="text-center py-4">
        <h3 className="text-lg font-medium text-gray-500 mb-2">No rules generated yet</h3>
        <p className="text-sm text-gray-500">
          Please run the analysis in the previous step to generate fraud detection rules.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-medium text-gray-900">Generated Fraud Detection Rules</h2>
        <p className="mt-1 text-sm text-gray-500">
          Select the rule that best fits your fraud detection needs.
        </p>
      </div>

      <div className="space-y-4">
        {data.generatedRules.map((rule, index) => (
          <div
            key={index}
            onClick={() => handleRuleSelect(index)}
            className={`relative p-4 border rounded-lg cursor-pointer transition-colors ${
              data.selectedRuleIndex === index
                ? 'border-blue-500 ring-2 ring-blue-200 bg-blue-50'
                : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
            }`}
          >
            {data.selectedRuleIndex === index && (
              <CheckCircleIcon
                className="absolute top-4 right-4 h-6 w-6 text-blue-500"
                aria-hidden="true"
              />
            )}

            <div className="space-y-3">
              <div>
                <h3 className="text-lg font-medium text-gray-900">{rule.rule_name}</h3>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(
                      rule.risk_score || 'medium'
                    )}`}
                  >
                    Risk: {rule.risk_score || 'N/A'}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-300">
                    {rule.metadata?.category || 'Pattern-based'}
                  </span>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getDecisionColor(
                      rule.decision || 'review'
                    )}`}
                  >
                    {rule.decision || 'Review'}
                  </span>
                </div>
              </div>

              <p className="text-sm text-gray-600">{rule.description}</p>

              <div className="border-t border-gray-200 my-3"></div>

              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Rule Condition:</h4>
                <div className="p-3 bg-gray-50 rounded-md font-mono text-sm overflow-x-auto">
                  <pre className="whitespace-pre-wrap m-0">{formatCondition(rule.conditions)}</pre>
                </div>
              </div>

              {rule.metadata?.improvements && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Key Improvements:</h4>
                  <p className="text-sm text-gray-600">{rule.metadata.improvements}</p>
                </div>
              )}

              {data.selectedRuleIndex === index && data.ruleImpactAnalysis && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <h4 className="text-sm font-medium text-gray-800 mb-3">Estimated Impact Analysis:</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="text-center">
                      <ShieldCheckIcon className="h-6 w-6 mx-auto mb-1 text-green-500" />
                      <p className="text-xl font-semibold text-green-600">
                        {data.ruleImpactAnalysis.wouldCatch}
                      </p>
                      <p className="text-xs text-gray-500">Potential Catches</p>
                    </div>
                    <div className="text-center">
                      <ExclamationTriangleIcon className="h-6 w-6 mx-auto mb-1 text-yellow-500" />
                      <p className="text-xl font-semibold text-yellow-600">
                        {data.ruleImpactAnalysis.falsePositives}
                      </p>
                      <p className="text-xs text-gray-500">False Positives</p>
                    </div>
                    <div className="text-center">
                      <svg
                        className="h-6 w-6 mx-auto mb-1 text-blue-500"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <p className="text-xl font-semibold text-blue-600">
                        ${data.ruleImpactAnalysis.potentialFraudPrevented.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500">Potential Fraud Prevented</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {data.selectedRuleIndex >= 0 ? (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <CheckCircleIcon className="h-5 w-5 text-green-400" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">
                Rule Selected: {data.generatedRules[data.selectedRuleIndex].rule_name}
              </h3>
              <p className="mt-1 text-sm text-green-700">
                You can proceed to the next step to review and configure the final rule settings.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-blue-400"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                Please select a rule to continue to the final review step.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RuleSelectionStep;
