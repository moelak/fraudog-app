import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Button, Select, Typography, message } from 'antd';

const { Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

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
}

const AddRuleFromAIModal: React.FC<AddRuleFromAIModalProps> = ({
  isOpen,
  onClose,
  aiRule,
}) => {
  const [form] = Form.useForm();
  const [isSaving, setIsSaving] = useState(false);

  // Map AI rule data to form fields
  const mapAIRuleToFormData = (aiRule: OpenAIRule) => {
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
      status: 'in progress',
      severity: severity,
      log_only: false,
    };
  };

  // Populate form when modal opens
  useEffect(() => {
    if (isOpen && aiRule) {
      const formData = mapAIRuleToFormData(aiRule);
      form.setFieldsValue(formData);
    }
  }, [isOpen, aiRule, form]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setIsSaving(true);
      
      console.log('Saving AI rule to database:', values);
      
      // TODO: Implement actual API call to save rule to database
      // This would call your existing createRule API
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      message.success('Rule added successfully!');
      onClose();
    } catch (error) {
      console.error('Error saving rule:', error);
      message.error('Failed to save rule. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  if (!aiRule) return null;

  return (
    <Modal
      title="Add AI-Generated Rule"
      open={isOpen}
      onCancel={handleCancel}
      footer={[
        <Button key="cancel" onClick={handleCancel} disabled={isSaving}>
          Cancel
        </Button>,
        <Button key="save" type="primary" onClick={handleSave} loading={isSaving}>
          Save Rule
        </Button>,
      ]}
      width={700}
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="name"
          label="Rule Name"
          rules={[{ required: true, message: 'Rule name is required' }]}
        >
          <Input placeholder="Enter rule name" />
        </Form.Item>

        <div style={{ display: 'flex', gap: '16px' }}>
          <Form.Item
            name="category"
            label="Category"
            rules={[{ required: true, message: 'Category is required' }]}
            style={{ flex: 1 }}
          >
            <Select>
              <Option value="Behavioral">Behavioral</Option>
              <Option value="Payment Method">Payment Method</Option>
              <Option value="Technical">Technical</Option>
              <Option value="Identity">Identity</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="severity"
            label="Severity"
            rules={[{ required: true, message: 'Severity is required' }]}
            style={{ flex: 1 }}
          >
            <Select>
              <Option value="low">Low</Option>
              <Option value="medium">Medium</Option>
              <Option value="high">High</Option>
            </Select>
          </Form.Item>
        </div>

        <Form.Item
          name="condition"
          label="Rule Condition"
          rules={[{ required: true, message: 'Rule condition is required' }]}
        >
          <TextArea
            rows={4}
            placeholder="Enter rule condition logic"
            style={{ fontFamily: 'monospace' }}
          />
        </Form.Item>

        <Form.Item
          name="description"
          label="Description"
          rules={[{ required: true, message: 'Description is required' }]}
        >
          <TextArea
            rows={3}
            placeholder="Describe what this rule does and when it triggers"
          />
        </Form.Item>

        <div style={{ 
          backgroundColor: '#f5f5f5', 
          padding: '12px', 
          borderRadius: '6px',
          marginTop: '16px'
        }}>
          <Text strong style={{ color: '#1890ff' }}>
            🤖 AI-Generated Rule Outcomes
          </Text>
          <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
            <div><strong>Risk Score:</strong> {aiRule.risk_score}</div>
            <div><strong>Decision:</strong> {aiRule.decision}</div>
            <div><strong>Pattern Type:</strong> {aiRule.metadata?.pattern_type || 'General'}</div>
            <div><strong>Confidence on Rule Effectiveness:</strong> {aiRule.metadata?.confidence_level}%</div>
            <div><strong>Expected False Positive Rate:</strong> {aiRule.metadata?.expected_false_positive_rate}%</div>
          </div>
        </div>
      </Form>
    </Modal>
  );
};

export default AddRuleFromAIModal;
