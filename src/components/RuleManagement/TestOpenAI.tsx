import React, { useState, useCallback } from 'react';
import { Button, Card, Form, Input, Alert, Typography, Divider, Upload, message, Modal } from 'antd';
import { LoadingOutlined, UploadOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd/es/upload/interface';

const { Title } = Typography;
const { TextArea } = Input;

interface TestResult {
  success: boolean;
  data: unknown;
  rawResponse: string;
}

const TestOpenAI: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [result, setResult] = useState<TestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showLargeDatasetModal, setShowLargeDatasetModal] = useState(false);
  const [pendingFormValues, setPendingFormValues] = useState<{ testData: string } | null>(null);
  const [form] = Form.useForm();

  const parseCSV = (csvText: string): Record<string, string | number>[] => {
    if (!csvText) return [];
    const lines = csvText.split('\n').filter(line => line.trim() !== '');
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(',').map(h => h.trim());
    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim());
      return headers.reduce((obj, header, index) => {
        // Try to parse as number if possible
        const value = values[index] || '';
        obj[header] = isNaN(Number(value)) ? value : Number(value);
        return obj;
      }, {} as Record<string, string | number>);
    });
  };

  const handleUpload = useCallback(async (file: File): Promise<void> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const csvText = e.target?.result as string;
          const jsonData = parseCSV(csvText);
          form.setFieldsValue({ testData: JSON.stringify(jsonData, null, 2) });
          message.success('CSV file processed successfully');
          resolve();
        } catch (err) {
          message.error('Failed to process CSV file');
          reject(err);
        }
      };
      reader.onerror = () => {
        message.error('Failed to read file');
        reject(new Error('Failed to read file'));
      };
      reader.readAsText(file);
    });
  }, [form]);

  const uploadProps: UploadProps = {
    onRemove: () => {
      setFileList([]);
      form.setFieldsValue({ testData: '' });
      return false;
    },
    beforeUpload: (file) => {
      if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
        message.error('You can only upload CSV files!');
        return Upload.LIST_IGNORE;
      }
      setFileList([file]);
      handleUpload(file);
      return false;
    },
    fileList,
    accept: '.csv',
    maxCount: 1,
  };

  const callOpenAIAPI = async (values: { testData: string }) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Parse the test data JSON
      const testData = JSON.parse(values.testData);
      
      // Get the Supabase URL from environment variables
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) {
        throw new Error('Supabase URL is not configured');
      }
      
      // Construct the function URL
      const functionUrl = `${supabaseUrl}/functions/v1/test-openai`;
      
      const requestBody = { testData };
      

      
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify(requestBody),
      });
      
      const data = await response.json();
      
      // Extract debug information from response body (preferred) or fallback to headers
      let debugInfo;
      if (data.debugInfo) {
        debugInfo = {
          originalRecords: data.debugInfo.originalRecords.toString(),
          processedRecords: data.debugInfo.processedRecords.toString(),
          originalTokens: data.debugInfo.originalTokens.toString(),
          processedTokens: data.debugInfo.processedTokens.toString(),
          samplingApplied: data.debugInfo.samplingApplied.toString()
        };
      } else {
        debugInfo = {
          originalRecords: response.headers.get('X-Debug-Original-Records') || response.headers.get('x-debug-original-records') || '0',
          processedRecords: response.headers.get('X-Debug-Processed-Records') || response.headers.get('x-debug-processed-records') || '0',
          originalTokens: response.headers.get('X-Debug-Original-Tokens') || response.headers.get('x-debug-original-tokens') || '0',
          processedTokens: response.headers.get('X-Debug-Processed-Tokens') || response.headers.get('x-debug-processed-tokens') || '0',
          samplingApplied: response.headers.get('X-Debug-Sampling-Applied') || response.headers.get('x-debug-sampling-applied') || 'false'
        };
      }
      
      console.log('=== SAMPLING & TOKEN ANALYSIS ===');
      console.log(`📊 Original Dataset: ${debugInfo.originalRecords} transactions (~${debugInfo.originalTokens} tokens)`);
      console.log(`🎯 Processed Dataset: ${debugInfo.processedRecords} transactions (~${debugInfo.processedTokens} tokens)`);
      console.log(`🔄 Random Sampling Applied: ${debugInfo.samplingApplied === 'true' ? 'YES' : 'NO'}`);
      
      if (debugInfo.samplingApplied === 'true') {
        const reductionPercent = Math.round((1 - parseInt(debugInfo.processedRecords) / parseInt(debugInfo.originalRecords)) * 100);
        console.log(`📉 Dataset Reduced by: ${reductionPercent}% (${debugInfo.originalRecords} → ${debugInfo.processedRecords} transactions)`);
        console.log(`🪙 Token Reduction: ${debugInfo.originalTokens} → ${debugInfo.processedTokens} tokens`);
      }
      
      // Store debug info for potential UI display
      (window as typeof window & { lastDebugInfo?: typeof debugInfo }).lastDebugInfo = debugInfo;
      
      if (!response.ok) {
        console.error('API Error Response:', data);
        throw new Error(`${data.error || 'Unknown error'} - ${data.details || ''}`);
      }

      setResult(data);
    } catch (err) {
      console.error('Test failed:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const onFinish = async (values: { testData: string }) => {
    try {
      // Parse the test data to check size
      const testData = JSON.parse(values.testData);
      
      // Check if dataset is large (more than 50 records)
      if (Array.isArray(testData) && testData.length > 50) {
        setPendingFormValues(values);
        setShowLargeDatasetModal(true);
        return;
      }
      
      // Proceed with API call for smaller datasets
      await callOpenAIAPI(values);
    } catch {
      setError('Invalid JSON format');
    }
  };

  const handleProceedWithSampling = async () => {
    setShowLargeDatasetModal(false);
    if (pendingFormValues) {
      await callOpenAIAPI(pendingFormValues);
      setPendingFormValues(null);
    }
  };

  const handleCancelSampling = () => {
    setShowLargeDatasetModal(false);
    setPendingFormValues(null);
  };

  const sampleData = `[
    {
      "transaction_id": "tx123",
      "amount": 1250.00,
      "currency": "USD",
      "merchant": "Online Store",
      "card_type": "Visa",
      "card_last4": "4242",
      "ip_country": "US",
      "billing_country": "US",
      "shipping_country": "CA",
      "is_flagged": true
    },
    {
      "transaction_id": "tx124",
      "amount": 89.99,
      "currency": "EUR",
      "merchant": "Local Shop",
      "card_type": "Mastercard",
      "card_last4": "5555",
      "ip_country": "DE",
      "billing_country": "DE",
      "shipping_country": "DE",
      "is_flagged": false
    }
  ]`;

  const loadSampleData = () => {
    form.setFieldsValue({ testData: sampleData });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">OpenAI API Tester</h1>
        <Card>
        <div style={{ marginBottom: '24px' }}>
          <Upload {...uploadProps}>
            <Button icon={<UploadOutlined />} loading={loading}>
              Upload CSV File
            </Button>
          </Upload>
          <div style={{ marginTop: '8px', color: '#666', fontSize: '12px' }}>
            Upload a CSV file to automatically convert it to JSON format
          </div>
        </div>
        <Divider>OR</Divider>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{ testData: '' }}
        >
          <Form.Item
            label="Test Data (JSON array of transactions)"
            name="testData"
            rules={[
              { required: true, message: 'Please input test data' },
              {
                validator: (_: unknown, value: string) => {
                  try {
                    if (value) {
                      JSON.parse(value);
                      return Promise.resolve();
                    }
                    return Promise.reject('Please input test data');
                  } catch {
                    return Promise.reject('Invalid JSON');
                  }
                },
              },
            ]}
          >
            <TextArea
              rows={10}
              placeholder="Paste your test data as a JSON array of transactions"
              style={{ fontFamily: 'monospace' }}
            />
          </Form.Item>

          <div style={{ marginBottom: '16px' }}>
            <Button type="link" onClick={loadSampleData}>
              Load Sample Data
            </Button>
          </div>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              disabled={loading}
              icon={loading ? <LoadingOutlined /> : null}
            >
              {loading ? 'Processing...' : 'Test OpenAI'}
            </Button>
          </Form.Item>
        </Form>

        {error && (
          <Alert
            message="Error"
            description={error}
            type="error"
            showIcon
            style={{ marginTop: '16px' }}
          />
        )}

        {result && (
          <div style={{ marginTop: '24px' }}>
            <Divider orientation="left">Results</Divider>
            <Title level={4}>Generated Rules</Title>
            <pre style={{
              backgroundColor: '#f5f5f5',
              padding: '16px',
              borderRadius: '4px',
              maxHeight: '500px',
              overflow: 'auto'
            }}>
              {JSON.stringify(result.data, null, 2)}
            </pre>
            
            <div style={{ marginTop: '16px' }}>
              <Title level={5}>Raw Response</Title>
              <pre style={{
                backgroundColor: '#f5f5f5',
                padding: '16px',
                borderRadius: '4px',
                maxHeight: '300px',
                overflow: 'auto',
                fontSize: '12px'
              }}>
                {JSON.stringify(result.rawResponse, null, 2)}
              </pre>
            </div>
          </div>
        )}
        </Card>
      </div>
      
      {/* Large Dataset Warning Modal */}
      <Modal
        title={<><ExclamationCircleOutlined style={{ color: '#faad14', marginRight: 8 }} />Large Dataset Detected</>}
        open={showLargeDatasetModal}
        onOk={handleProceedWithSampling}
        onCancel={handleCancelSampling}
        okText="Proceed with Sampling"
        cancelText="Cancel"
        width={600}
      >
        <div style={{ marginBottom: 16 }}>
          <Alert
            message="Dataset Size Warning"
            description={
              <div>
                <p>Your dataset contains more than 50 transactions, which may exceed the OpenAI model's context window of 128,000 tokens.</p>
                <p><strong>What will happen:</strong></p>
                <ul style={{ marginLeft: 20, marginTop: 8 }}>
                  <li>The system will randomly sample 50 transactions from your dataset</li>
                  <li>OpenAI will analyze these samples to generate fraud detection rules</li>
                  <li>The rules will still be representative of your data patterns</li>
                </ul>
                <p style={{ marginTop: 12 }}>
                  <strong>Note:</strong> A larger context window is available at higher cost but requires admin enablement.
                </p>
              </div>
            }
            type="warning"
            showIcon
          />
        </div>
        <p>Would you like to proceed with the sampling approach, or cancel to modify your dataset?</p>
      </Modal>
    </div>
  );
};

export default TestOpenAI;
