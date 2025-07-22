import React, { useState, useCallback } from 'react';
import { Button, Card, Form, Input, Alert, Typography, Divider, Upload, message, Modal } from 'antd';
import { LoadingOutlined, UploadOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd/es/upload/interface';

const { Title } = Typography;
const { TextArea } = Input;

interface OpenAIRule {
  rule_name: string;
  description: string;
  risk_score: number;
  conditions: string;
  outcome: string;
  metadata: {
    pattern_type: string;
    confidence_level: number;
    expected_false_positive_rate: number;
  };
}

interface OpenAIResponse {
  rules: OpenAIRule[];
}

interface DualAPIResult {
  chatCompletion: {
    success: boolean;
    data?: OpenAIResponse;
    error?: string;
    debugInfo: {
      originalRecords?: string;
      processedRecords?: string;
      originalTokens?: string;
      processedTokens?: string;
      samplingApplied?: boolean;
    };
  };
  assistantsAPI: {
    success: boolean;
    data?: OpenAIResponse;
    error?: string;
    debugInfo: Record<string, unknown>;
  };
}

interface TestResult {
  success: boolean;
  data: DualAPIResult;
  debugVersion: string;
  timestamp: string;
}

const TestOpenAI: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [result, setResult] = useState<TestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showLargeDatasetModal, setShowLargeDatasetModal] = useState(false);
  const [pendingFormValues, setPendingFormValues] = useState<{ testData: string } | null>(null);
  const [csvContent, setCsvContent] = useState<string>(''); // Store raw CSV content
  const [fileName, setFileName] = useState<string>(''); // Store original filename
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
          
          // Store both raw CSV content and filename for dual API approach
          setCsvContent(csvText);
          setFileName(file.name);
          
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
      
      // Include both parsed JSON data and raw CSV content for dual API approach
      const requestBody = { 
        testData,
        csvContent: csvContent, // Raw CSV content for Assistants API
        fileName: fileName || 'transactions.csv' // Original filename
      };
      

      
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
      
      if (data.debugInfo) {
        console.log('=== DUAL API RESULTS ===');
        
        // Chat Completions API Debug Info
        const chatDebugInfo = data.debugInfo.chatCompletion;
        console.log('\n📊 CHAT COMPLETIONS API (Sampled Data):');
        console.log(`   Original: ${chatDebugInfo.originalRecords} records (~${chatDebugInfo.originalTokens} tokens)`);
        console.log(`   Processed: ${chatDebugInfo.processedRecords} records (~${chatDebugInfo.processedTokens} tokens)`);
        console.log(`   Sampling: ${chatDebugInfo.samplingApplied ? 'Applied' : 'Not needed'}`);
        console.log(`   Status: ${data.chatCompletionRules ? '✅ Success' : '❌ Failed'}`);
        if (data.chatCompletionError) {
          console.log(`   Error: ${data.chatCompletionError}`);
        }
        
        if (chatDebugInfo.samplingApplied) {
          const reductionPercent = Math.round((1 - parseInt(chatDebugInfo.processedRecords) / parseInt(chatDebugInfo.originalRecords)) * 100);
          console.log(`   Reduction: ${reductionPercent}% (${chatDebugInfo.originalRecords} → ${chatDebugInfo.processedRecords})`);
        }
        
        // Assistants API Debug Info
        console.log('\n🤖 ASSISTANTS API (Full CSV File):');
        console.log(`   Status: ${data.assistantsAPIRules ? '✅ Success' : '❌ Failed'}`);
        if (data.assistantsAPIError) {
          console.log(`   Error: ${data.assistantsAPIError}`);
        }
        if (Object.keys(data.debugInfo.assistantsAPI).length > 0) {
          Object.entries(data.debugInfo.assistantsAPI).forEach(([key, value]) => {
            console.log(`   ${key}: ${value}`);
          });
        }
      } else {
        // Fallback for old single API format
        console.log('=== API RESPONSE ===');
        console.log('Response:', data);
      }
      
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
            <Divider orientation="left">Dual API Results</Divider>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              {/* Chat Completions API Results */}
              <Card title="Chat Completions API (Sampled Data)" size="small">
                {result.data.chatCompletion.success ? (
                  <div>
                    <Title level={5} style={{ color: '#52c41a', marginTop: 0 }}>✅ Success</Title>
                    <div style={{ marginBottom: '16px' }}>
                      <strong>Debug Info:</strong>
                      <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                        <li>Original: {result.data.chatCompletion.debugInfo.originalRecords} records (~{result.data.chatCompletion.debugInfo.originalTokens} tokens)</li>
                        <li>Processed: {result.data.chatCompletion.debugInfo.processedRecords} records (~{result.data.chatCompletion.debugInfo.processedTokens} tokens)</li>
                        <li>Sampling: {result.data.chatCompletion.debugInfo.samplingApplied ? 'Applied' : 'Not needed'}</li>
                      </ul>
                    </div>
                    <pre style={{
                      backgroundColor: '#f6ffed',
                      padding: '12px',
                      borderRadius: '4px',
                      maxHeight: '400px',
                      overflow: 'auto',
                      fontSize: '12px',
                      border: '1px solid #b7eb8f'
                    }}>
                      {JSON.stringify(result.data.chatCompletion.data, null, 2)}
                    </pre>
                  </div>
                ) : (
                  <div>
                    <Title level={5} style={{ color: '#ff4d4f', marginTop: 0 }}>❌ Failed</Title>
                    <Alert 
                      message={result.data.chatCompletion.error} 
                      type="error" 
                      style={{ marginBottom: '12px' }}
                    />
                    <pre style={{
                      backgroundColor: '#fff2f0',
                      padding: '12px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      border: '1px solid #ffccc7'
                    }}>
                      {JSON.stringify(result.data.chatCompletion.debugInfo, null, 2)}
                    </pre>
                  </div>
                )}
              </Card>
              
              {/* Assistants API Results */}
              <Card title="Assistants API (Full CSV File)" size="small">
                {result.data.assistantsAPI.success ? (
                  <div>
                    <Title level={5} style={{ color: '#52c41a', marginTop: 0 }}>✅ Success</Title>
                    <div style={{ marginBottom: '16px' }}>
                      <strong>Debug Info:</strong>
                      <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                        {Object.entries(result.data.assistantsAPI.debugInfo).map(([key, value]) => (
                          <li key={key}>{key}: {String(value)}</li>
                        ))}
                      </ul>
                    </div>
                    <pre style={{
                      backgroundColor: '#f6ffed',
                      padding: '12px',
                      borderRadius: '4px',
                      maxHeight: '400px',
                      overflow: 'auto',
                      fontSize: '12px',
                      border: '1px solid #b7eb8f'
                    }}>
                      {JSON.stringify(result.data.assistantsAPI.data, null, 2)}
                    </pre>
                  </div>
                ) : (
                  <div>
                    <Title level={5} style={{ color: '#ff4d4f', marginTop: 0 }}>❌ Failed</Title>
                    <Alert 
                      message={result.data.assistantsAPI.error} 
                      type="error" 
                      style={{ marginBottom: '12px' }}
                    />
                    <pre style={{
                      backgroundColor: '#fff2f0',
                      padding: '12px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      border: '1px solid #ffccc7'
                    }}>
                      {JSON.stringify(result.data.assistantsAPI.debugInfo, null, 2)}
                    </pre>
                  </div>
                )}
              </Card>
            </div>
            
            <div style={{ marginTop: '24px' }}>
              <Title level={5}>Full Response Debug</Title>
              <pre style={{
                backgroundColor: '#fafafa',
                padding: '12px',
                borderRadius: '4px',
                maxHeight: '200px',
                overflow: 'auto',
                fontSize: '11px',
                border: '1px solid #d9d9d9'
              }}>
                Version: {result.debugVersion} | Timestamp: {result.timestamp}
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
