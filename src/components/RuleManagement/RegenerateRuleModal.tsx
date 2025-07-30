import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Button, Typography, Card, Alert, message } from 'antd';

const { Title, Text } = Typography;
const { TextArea } = Input;

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

interface RegenerateRuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegenerate: (instructions: string, ruleContext: OpenAIRule) => Promise<void>;
  currentRule: OpenAIRule | null;
}

const RegenerateRuleModal: React.FC<RegenerateRuleModalProps> = ({
  isOpen,
  onClose,
  onRegenerate,
  currentRule,
}) => {
  const [form] = Form.useForm();
  const [customInstructions, setCustomInstructions] = useState('');
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setCustomInstructions('');
      form.resetFields();
    }
  }, [isOpen, form]);

  const handleSubmit = async () => {
    if (!currentRule) {
      message.error('No rule selected for regeneration');
      return;
    }

    try {
      setIsRegenerating(true);
      await onRegenerate(customInstructions, currentRule);
      message.success('Rule regenerated successfully!');
      onClose();
    } catch (error) {
      console.error('Error regenerating rule:', error);
      message.error('Failed to regenerate rule. Please try again.');
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleCancel = () => {
    if (!isRegenerating) {
      onClose();
    }
  };

  if (!isOpen || !currentRule) return null;

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          🔄 <span>Regenerate Rule</span>
        </div>
      }
      open={isOpen}
      onCancel={handleCancel}
      footer={null}
      width={700}
      destroyOnClose
      maskClosable={!isRegenerating}
    >
      <div style={{ marginBottom: '24px' }}>
        {/* Current Rule Context */}
        <Card 
          title="Current Rule Context" 
          size="small" 
          style={{ marginBottom: '20px' }}
        >
          <div style={{ marginBottom: '12px' }}>
            <Text strong>Rule Name:</Text>
            <div style={{ marginTop: '4px', fontSize: '14px' }}>{currentRule.rule_name}</div>
          </div>
          
          <div style={{ marginBottom: '12px' }}>
            <Text strong>Description:</Text>
            <div style={{ marginTop: '4px', fontSize: '14px' }}>{currentRule.description}</div>
          </div>
          
          <div style={{ marginBottom: '12px' }}>
            <Text strong>Current Conditions:</Text>
            <div style={{ 
              marginTop: '4px', 
              fontFamily: 'monospace', 
              backgroundColor: '#f5f5f5', 
              padding: '8px', 
              borderRadius: '4px',
              fontSize: '12px'
            }}>
              {currentRule.conditions}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px', fontSize: '12px' }}>
            <span><Text strong>Risk Score:</Text> {currentRule.risk_score}</span>
            <span><Text strong>Decision:</Text> {currentRule.decision}</span>
            <span><Text strong>Category:</Text> {currentRule.metadata?.pattern_type || 'General'}</span>
          </div>
        </Card>

        {/* Custom Instructions */}
        <Form form={form} layout="vertical">
          <Form.Item
            label={
              <span style={{ fontWeight: 600 }}>
                Additional Instructions (Optional)
              </span>
            }
            help="Provide specific guidance for how you'd like this rule to be improved or modified"
          >
            <TextArea
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              placeholder="Example: Make this rule more specific to high-value transactions, or adjust the risk threshold to reduce false positives..."
              rows={4}
              maxLength={500}
              showCount
            />
          </Form.Item>
        </Form>

        {/* Info Alert */}
        <Alert
          message="Rule Regeneration"
          description="The AI will analyze the current rule context along with your additional instructions to generate an improved version of this fraud detection rule."
          type="info"
          showIcon
          style={{ marginTop: '16px' }}
        />
      </div>

      {/* Footer Buttons */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'flex-end', 
        gap: '12px',
        paddingTop: '16px',
        borderTop: '1px solid #f0f0f0'
      }}>
        <Button 
          onClick={handleCancel}
          disabled={isRegenerating}
        >
          Cancel
        </Button>
        <Button 
          type="primary"
          onClick={handleSubmit}
          loading={isRegenerating}
          style={{ minWidth: '100px' }}
        >
          {isRegenerating ? 'Regenerating...' : 'Generate'}
        </Button>
      </div>
    </Modal>
  );
};

export default RegenerateRuleModal;
