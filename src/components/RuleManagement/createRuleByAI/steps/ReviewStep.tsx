import React, { useState } from 'react';
import { CheckCircleIcon, ExclamationTriangleIcon, InformationCircleIcon, PencilIcon } from '@heroicons/react/24/outline';
import type { StepperData } from '@/components/RuleManagement/createRuleByAI/CreateRuleByAI';
import type { StreamingStatus } from '@/services/openaiService';

interface ReviewStepProps {
  data: StepperData;
  updateData: (updates: Partial<StepperData>) => void;
  streamingStatuses?: StreamingStatus[];
  streamingText?: string;
  streamingEvents?: string[];
  analysisContext?: string;
}

const ReviewStep: React.FC<ReviewStepProps> = ({ data, updateData, streamingStatuses, streamingText, streamingEvents, analysisContext }) => {
  const { finalRule, ruleImpactAnalysis, logOnly } = data;
  const [isEditing, setIsEditing] = useState(false);
  const [editedRule, setEditedRule] = useState(finalRule);
  const [originalRule, setOriginalRule] = useState(finalRule);

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

  const handleEditToggle = () => {
    if (isEditing) {
      // Save changes - merge edited fields with original rule
      if (editedRule && originalRule) {
        const mergedRule = {
          ...originalRule, // Start with original rule
          // Only override fields that were actually edited
          ...(editedRule.name !== originalRule.name && { name: editedRule.name }),
          ...(editedRule.description !== originalRule.description && { description: editedRule.description }),
          ...(editedRule.category !== originalRule.category && { category: editedRule.category }),
          ...(editedRule.condition !== originalRule.condition && { condition: editedRule.condition }),
          ...(editedRule.severity !== originalRule.severity && { severity: editedRule.severity }),
          ...(editedRule.decision !== originalRule.decision && { decision: editedRule.decision }),
        };
        updateData({ finalRule: mergedRule });
        setOriginalRule(mergedRule); // Update original rule reference
      }
    } else {
      // Start editing - initialize with current rule
      setEditedRule(finalRule);
      setOriginalRule(finalRule);
    }
    setIsEditing(!isEditing);
  };

  const handleFieldChange = (field: string, value: string) => {
    if (editedRule) {
      setEditedRule({
        ...editedRule,
        [field]: value
      });
    }
  };

  const handleCancelEdit = () => {
    setEditedRule(finalRule);
    setIsEditing(false);
  };

  if (!finalRule) {
    return (
      <div className="p-4 mt-2 text-red-700 bg-red-100 border border-red-200 rounded-lg" role="alert">
        No rule selected for review. Please go back and select a rule.
      </div>
    );
  }

  const displayRule = isEditing ? editedRule : finalRule;

  return (
    <div className="mt-2 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium text-gray-900">Review Generated Rule</h2>
          <p className="mt-1 text-sm text-gray-500">
            Review and edit the final rule configuration before deployment. You can enable log-only mode for testing.
          </p>
        </div>
        <button
          onClick={handleEditToggle}
          className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md border ${
            isEditing 
              ? 'border-green-300 text-green-700 bg-green-50 hover:bg-green-100' 
              : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
          }`}
        >
          <PencilIcon className="w-4 h-4 mr-1" />
          {isEditing ? 'Save Changes' : 'Edit Rule'}
        </button>
      </div>

      {/* Rule Details Card */}
      <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
        {isEditing ? (
          // Edit Mode
          <div className="space-y-4">
            <div>
              <label htmlFor="rule-name" className="block text-sm font-medium text-gray-700">
                Rule Name
              </label>
              <input
                id="rule-name"
                type="text"
                value={editedRule?.name || ''}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="rule-description" className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                id="rule-description"
                rows={3}
                value={editedRule?.description || ''}
                onChange={(e) => handleFieldChange('description', e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <label htmlFor="rule-category" className="block text-sm font-medium text-gray-700">
                  Category
                </label>
                <select
                  id="rule-category"
                  value={editedRule?.category || ''}
                  onChange={(e) => handleFieldChange('category', e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="Behavioral">Behavioral</option>
                  <option value="Geographic">Geographic</option>
                  <option value="Amount-based">Amount-based</option>
                  <option value="Device-based">Device-based</option>
                  <option value="Velocity">Velocity</option>
                  <option value="Pattern">Pattern</option>
                </select>
              </div>
              <div>
                <label htmlFor="rule-severity" className="block text-sm font-medium text-gray-700">
                  Severity
                </label>
                <select
                  id="rule-severity"
                  value={editedRule?.severity || ''}
                  onChange={(e) => handleFieldChange('severity', e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div>
                <label htmlFor="rule-decision" className="block text-sm font-medium text-gray-700">
                  Decision
                </label>
                <select
                  id="rule-decision"
                  value={editedRule?.decision || ''}
                  onChange={(e) => handleFieldChange('decision', e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="allow">Allow</option>
                  <option value="review">Review</option>
                  <option value="deny">Deny</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Source</label>
                <p className="mt-1 px-3 py-2 text-sm text-gray-500 bg-gray-50 rounded-md">
                  {editedRule?.source}
                </p>
              </div>
            </div>

            <div>
              <label htmlFor="rule-condition" className="block text-sm font-medium text-gray-700">
                Rule Condition
              </label>
              <textarea
                id="rule-condition"
                rows={4}
                value={editedRule?.condition || ''}
                onChange={(e) => handleFieldChange('condition', e.target.value)}
                className="mt-1 block w-full px-3 py-2 font-mono text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter SQL-like condition (e.g., amount > 1000 AND risk_score > 0.8)"
              />
              <p className="mt-1 text-xs text-gray-500">
                Use SQL-like syntax with field names from your transaction data. Example: amount &gt; 1000 AND risk_score &gt; 0.8
              </p>
            </div>

            <div className="flex space-x-3 pt-4 border-t border-gray-200">
              <button
                onClick={handleCancelEdit}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          // View Mode
          <div>
            <h3 className="text-lg font-medium text-gray-900">{displayRule?.name}</h3>
            <p className="mt-1 text-sm text-gray-600">
              {displayRule?.description}
            </p>

            <div className="grid grid-cols-2 gap-4 mt-4 sm:grid-cols-4">
              <div>
                <p className="text-xs font-medium text-gray-500">Category</p>
                <p className="text-sm font-medium text-gray-900">
                  {displayRule?.category}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">Severity</p>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(displayRule?.severity || '')}`}>
                  {displayRule?.severity}
                </span>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">Decision</p>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getDecisionColor(displayRule?.decision || '')}`}>
                  {displayRule?.decision}
                </span>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">Source</p>
                <p className="text-sm font-medium text-gray-900">
                  {displayRule?.source}
                </p>
              </div>
            </div>

            <div className="my-4 border-t border-gray-200"></div>

            <div>
              <h4 className="text-sm font-medium text-gray-700">Rule Condition</h4>
              <div className="p-3 mt-1 font-mono text-sm bg-gray-50 rounded-md">
                <pre className="whitespace-pre-wrap">{displayRule?.condition}</pre>
              </div>
            </div>
          </div>
        )}
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
