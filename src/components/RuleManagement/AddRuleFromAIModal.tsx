import React, { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { ruleManagementStore } from './RuleManagementStore';
import CreateRuleModal from './CreateRuleModal';
import { message } from 'antd';

interface OpenAIRule {
  rule_name: string;
  description: string;
  risk_score: number;
  conditions: string;
  decision: string;
  metadata: {
    pattern_type: string;
    confidence_level: number;
    expected_false_positive_rate: number;
  };
}

interface AddRuleFromAIModalProps {
  isOpen: boolean;
  onClose: () => void;
  aiRule: OpenAIRule | null;
  onSave?: (ruleData: any) => Promise<void>;
}

const AddRuleFromAIModal: React.FC<AddRuleFromAIModalProps> = observer(({
  isOpen,
  onClose,
  aiRule,
  onSave,
}) => {
  
  // Map AI rule data to database schema
  const mapAIRuleToDBRule = (aiRule: OpenAIRule) => {
    // Map AI metadata pattern_type to our category system
    const categoryMapping: Record<string, string> = {
      'transaction amount': 'Payment Method',
      'transaction behavior': 'Behavioral', 
      'transaction frequency': 'Behavioral',
      'device trust': 'Technical',
      'device usage': 'Technical',
      'account verification': 'Identity',
      'account activity': 'Behavioral',
      'login frequency': 'Behavioral',
      'historical behavior': 'Behavioral',
      'kyc': 'Identity',
      'default': 'Behavioral'
    };

    // Map risk score to severity
    const getSeverityFromRiskScore = (score: number): 'low' | 'medium' | 'high' => {
      if (score >= 80) return 'high';
      if (score >= 50) return 'medium';
      return 'low';
    };

    const category = categoryMapping[aiRule.metadata?.pattern_type?.toLowerCase()] || 'Behavioral';
    const severity = getSeverityFromRiskScore(aiRule.risk_score || 50);

    return {
      name: aiRule.rule_name,
      description: aiRule.description,
      category: category,
      condition: aiRule.conditions,
      status: 'active' as const,
      severity: severity,
      log_only: false,
      source: 'AI' as const,
    };
  };

  // When modal opens with AI rule data, populate the store
  useEffect(() => {
    if (isOpen && aiRule) {
      const mappedRule = mapAIRuleToDBRule(aiRule);
      
      // Set the editing rule in the store to pre-populate the form
      ruleManagementStore.editingRule = {
        id: 'temp-ai-rule', // Temporary ID for new rule
        ...mappedRule,
        catches: 0,
        false_positives: 0,
        effectiveness: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      // Mark as editing from generated rules
      ruleManagementStore.isEditingFromGenerated = true;
      
      // Open the create modal
      ruleManagementStore.isCreateModalOpen = true;
    }
  }, [isOpen, aiRule]);

  // Handle modal close
  const handleClose = () => {
    // Close the create modal
    ruleManagementStore.isCreateModalOpen = false;
    
    // Clear editing state
    ruleManagementStore.editingRule = null;
    ruleManagementStore.isEditingFromGenerated = false;
    
    // Call parent close handler
    onClose();
  };

  // Override the close handler in the store temporarily
  useEffect(() => {
    if (isOpen) {
      // Cleanup on unmount or close
      return () => {
        // Reset any overrides if needed
      };
    }
  }, [isOpen]);

  // Don't render anything if not open or no rule
  if (!isOpen || !aiRule) {
    return null;
  }

  // The CreateRuleModal will handle the actual rendering
  // We just need to make sure the store state is set correctly
  return <CreateRuleModal />;
});

export default AddRuleFromAIModal;
