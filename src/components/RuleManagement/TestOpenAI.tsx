import React, { useState, useCallback } from 'react';
import { Upload, Button, Form, Input, Card, Alert, Divider, Modal, Typography, message } from 'antd';
import { LoadingOutlined, UploadOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd/es/upload/interface';

const { Title, Text } = Typography;
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

interface TestResult {
  success: boolean;
  chatCompletionRules?: OpenAIResponse;
  assistantsAPIRules?: OpenAIResponse;
  chatCompletionError?: string;
  assistantsAPIError?: string;
  debugInfo?: {
    chatCompletion?: Record<string, any>;
    assistantsAPI?: Record<string, any>;
  };
  debugVersion?: string;
  timestamp?: string;
}

interface StoredAPIResponse {
  rules: OpenAIResponse;
  debugInfo: Record<string, unknown>;
  debugVersion: string;
  timestamp: string;
  error?: string;
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
  
  // API state
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingStatus, setStreamingStatus] = useState<string>('');
  const [streamingStep, setStreamingStep] = useState<number>(0);
  const [streamingText, setStreamingText] = useState<string>('');
  const [currentAPI, setCurrentAPI] = useState<'chatcompletion' | 'assistants' | null>(null);
  
  // Client-side storage for individual API responses
  const [chatCompletionResponse, setChatCompletionResponse] = useState<StoredAPIResponse | null>(null);
  const [assistantsResponse, setAssistantsResponse] = useState<StoredAPIResponse | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  
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

  const callChatCompletionAPI = async (_values: { testData: string }) => {
    setLoading(true);
    setCurrentAPI('chatcompletion');
    setError(null);
    setResult(null);

    try {
      // Get the Supabase URL from environment variables
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) {
        throw new Error('Supabase URL is not configured');
      }
      
      // Construct the function URL
      const functionUrl = `${supabaseUrl}/functions/v1/openai-chatcompletion`;
      
      const requestBody = { 
        csvContent: csvContent,
        fileName: fileName || 'transactions.csv'
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
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Store the chat completion response client-side
        const chatResponse: StoredAPIResponse = {
          rules: data.data,
          debugInfo: data.debugInfo,
          debugVersion: data.debugVersion,
          timestamp: data.timestamp,
          error: undefined
        };
        setChatCompletionResponse(chatResponse);
        
        // Check if both APIs have completed and trigger comparison
        if (assistantsResponse) {
          setShowComparison(true);
          setResult({
            success: true,
            chatCompletionRules: chatResponse.rules,
            assistantsAPIRules: assistantsResponse.rules,
            chatCompletionError: undefined,
            assistantsAPIError: assistantsResponse.error,
            debugInfo: {
              chatCompletion: chatResponse.debugInfo,
              assistantsAPI: assistantsResponse.debugInfo
            },
            debugVersion: data.debugVersion,
            timestamp: data.timestamp
          });
        } else {
          // Show individual Quick Analysis result immediately
          setResult({
            success: true,
            chatCompletionRules: chatResponse.rules,
            assistantsAPIRules: undefined,
            chatCompletionError: undefined,
            assistantsAPIError: undefined,
            debugInfo: {
              chatCompletion: chatResponse.debugInfo,
              assistantsAPI: undefined
            },
            debugVersion: data.debugVersion,
            timestamp: data.timestamp
          });
        }
        
        // Log debug info
        console.log('=== QUICK ANALYSIS RESULTS ===');
        console.log(`📊 Original Dataset: ${data.debugInfo.originalRecords} records (~${data.debugInfo.originalTokens} tokens)`);
        console.log(`🎯 Processed Dataset: ${data.debugInfo.processedRecords} records (~${data.debugInfo.processedTokens} tokens)`);
        console.log(`🎲 Sampling Applied: ${data.debugInfo.samplingApplied ? 'YES' : 'NO'}`);
        console.log(`⏱️ Processing Time: ${data.debugInfo.processingTime}ms`);
      } else {
        throw new Error(data.error || 'Unknown error occurred');
      }
      
    } catch (error) {
      console.error('Chat Completion API error:', error);
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
      setCurrentAPI(null);
    }
  };

  const callAssistantsStreamingAPI = async (_values: { testData: string }) => {
    setLoading(true);
    setIsStreaming(true);
    setCurrentAPI('assistants');
    setError(null);
    setResult(null);
    setStreamingStatus('Initializing...');
    setStreamingStep(0);
    setStreamingText('');

    try {
      // Get the Supabase URL from environment variables
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) {
        throw new Error('Supabase URL is not configured');
      }
      
      // Construct the function URL
      const functionUrl = `${supabaseUrl}/functions/v1/openai-assistants-interpreter`;
      
      const requestBody = { 
        csvContent: csvContent,
        fileName: fileName || 'transactions.csv'
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
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Handle Server-Sent Events
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      if (!reader) {
        throw new Error('No response body reader available');
      }
      
      let buffer = '';
      
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }
        
        buffer += decoder.decode(value, { stream: true });
        
        // Process complete SSE messages
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || ''; // Keep incomplete message in buffer
        
        for (const message of lines) {
          if (message.trim()) {
            const eventLines = message.split('\n');
            let eventType = '';
            let eventData = '';
            
            for (const line of eventLines) {
              if (line.startsWith('event: ')) {
                eventType = line.substring(7);
              } else if (line.startsWith('data: ')) {
                eventData = line.substring(6);
              }
            }
            
            if (eventType && eventData) {
              try {
                const data = JSON.parse(eventData);
                
                switch (eventType) {
                  case 'status':
                    setStreamingStatus(data.message);
                    if (data.step) {
                      setStreamingStep(data.step);
                    }
                    // Removed sensitive step logging
                    break;
                    
                  case 'run_created':
                    // Removed sensitive run_id and thread_id logging
                    break;
                    
                  case 'step_created':
                  case 'step_progress':
                  case 'step_completed':
                    // Removed sensitive step event logging
                    break;
                    
                  case 'text_delta':
                    setStreamingText(data.fullText);
                    break;
                    
                  case 'completed': {
                    console.log('=== DEEP ANALYSIS RESULTS ===');
                    console.log('✅ Response completed successfully!');
                    console.log('📄 Full CSV file analyzed by Deep Analysis');
                    
                    // Store the assistants API response client-side
                    const assistantsApiResponse: StoredAPIResponse = {
                      rules: data.data,
                      debugInfo: {
                        method: 'Deep Analysis',
                        fileProcessed: 'Full CSV dataset',
                        streaming: true
                      },
                      debugVersion: 'v1.3.0-streaming',
                      timestamp: new Date().toISOString(),
                      error: undefined
                    };
                    setAssistantsResponse(assistantsApiResponse);
                    
                    // Check if both APIs have completed and trigger comparison
                    if (chatCompletionResponse) {
                      setShowComparison(true);
                      setResult({
                        success: true,
                        chatCompletionRules: chatCompletionResponse.rules,
                        assistantsAPIRules: assistantsApiResponse.rules,
                        chatCompletionError: chatCompletionResponse.error,
                        assistantsAPIError: undefined,
                        debugInfo: {
                          chatCompletion: chatCompletionResponse.debugInfo,
                          assistantsAPI: assistantsApiResponse.debugInfo
                        },
                        debugVersion: 'v1.3.0-streaming',
                        timestamp: new Date().toISOString()
                      });
                    } else {
                      // Show individual Deep Analysis result immediately
                      setResult({
                        success: true,
                        chatCompletionRules: undefined,
                        assistantsAPIRules: assistantsApiResponse.rules,
                        chatCompletionError: undefined,
                        assistantsAPIError: undefined,
                        debugInfo: {
                          chatCompletion: undefined,
                          assistantsAPI: assistantsApiResponse.debugInfo
                        },
                        debugVersion: 'v1.3.0-streaming',
                        timestamp: new Date().toISOString()
                      });
                    }
                    setStreamingStatus('Completed!');
                    break;
                  }
                    
                  case 'error':
                    throw new Error(data.message);
                }
              } catch (parseError) {
                console.error('Error parsing SSE data:', parseError, eventData);
              }
            }
          }
        }
      }
      
    } catch (error) {
      console.error('Streaming API error:', error);
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
      setIsStreaming(false);
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
      
      // This will be handled by the individual button clicks
      // No automatic API call here
    } catch {
      setError('Invalid JSON format');
    }
  };

  const handleProceedWithSampling = async () => {
    setShowLargeDatasetModal(false);
    if (pendingFormValues) {
      // Use assistants streaming API for modal flow
      await callAssistantsStreamingAPI(pendingFormValues);
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

          <Form.Item>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <Button 
                type="primary" 
                onClick={() => {
                  const formValues = form.getFieldsValue();
                  if (formValues.testData || csvContent) {
                    callChatCompletionAPI(formValues);
                  } else {
                    setError('Please provide test data or upload a CSV file');
                  }
                }}
                loading={loading && currentAPI === 'chatcompletion'}
                disabled={loading}
                icon={loading && currentAPI === 'chatcompletion' ? <LoadingOutlined /> : undefined}
                style={{ minWidth: '180px' }}
              >
                {loading && currentAPI === 'chatcompletion' ? 'Processing...' : 'Quick Analysis'}
              </Button>
              
              <Button 
                type="primary" 
                onClick={() => {
                  const formValues = form.getFieldsValue();
                  if (formValues.testData || csvContent) {
                    callAssistantsStreamingAPI(formValues);
                  } else {
                    setError('Please provide test data or upload a CSV file');
                  }
                }}
                loading={loading && currentAPI === 'assistants'}
                disabled={loading}
                icon={loading && currentAPI === 'assistants' ? <LoadingOutlined /> : undefined}
                style={{ minWidth: '180px', backgroundColor: '#722ed1', borderColor: '#722ed1' }}
              >
                {loading && currentAPI === 'assistants' ? 'Analyzing...' : 'Deep Analysis'}
              </Button>
              
              <Button onClick={loadSampleData} disabled={loading}>
                Load Sample Data
              </Button>
            </div>
            
            <div style={{ fontSize: '12px', color: '#666', lineHeight: '1.4' }}>
              <div><strong>Quick Analysis:</strong> Fast results that samples large datasets down to 50 records</div>
              <div><strong>Deep Analysis:</strong> Comprehensive analysis that uploads the file and streams response back</div>
            </div>
          </div>
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

        {/* Streaming Status Display */}
        {isStreaming && (
          <div style={{ marginTop: '24px' }}>
            <Card title="🔄 Real-time Streaming Status" size="small">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <strong>Current Step:</strong> {streamingStep}/7
                </div>
                <div>
                  <strong>Status:</strong> {streamingStatus}
                </div>
                {streamingText && (
                  <div>
                    <strong>Assistant Response:</strong>
                    <div style={{
                      backgroundColor: '#f0f8ff',
                      padding: '8px',
                      borderRadius: '4px',
                      border: '1px solid #d1e7dd',
                      fontSize: '12px',
                      maxHeight: '200px',
                      overflow: 'auto',
                      whiteSpace: 'pre-wrap'
                    }}>
                      {streamingText}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* Individual Results Display */}
        {result && !showComparison && (
          <div style={{ marginTop: '24px' }}>
            {result.chatCompletionRules && (
              <Card 
                title={<span style={{ fontSize: '16px', fontWeight: 600 }}>🚀 Quick Analysis Results</span>}
                style={{ marginBottom: '16px' }}
              >
                <div style={{ 
                  backgroundColor: '#f6ffed', 
                  padding: '12px', 
                  borderRadius: '6px', 
                  border: '1px solid #b7eb8f',
                  marginBottom: '16px'
                }}>
                  <Title level={5} style={{ color: '#52c41a', margin: '0 0 8px 0' }}>✅ Analysis Complete</Title>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    <div>📊 Original: {result.debugInfo?.chatCompletion?.originalRecords || 'N/A'} records</div>
                    <div>🎯 Processed: {result.debugInfo?.chatCompletion?.processedRecords || 'N/A'} records</div>
                    <div>🎲 Sampling: {result.debugInfo?.chatCompletion?.samplingApplied ? 'Applied' : 'Not needed'}</div>
                  </div>
                </div>
                <pre style={{
                  backgroundColor: '#f9f9f9',
                  padding: '12px',
                  borderRadius: '6px',
                  border: '1px solid #d9d9d9',
                  fontSize: '11px',
                  maxHeight: '300px',
                  overflow: 'auto'
                }}>
                  {JSON.stringify(result.chatCompletionRules, null, 2)}
                </pre>
              </Card>
            )}
            
            {result.assistantsAPIRules && (
              <Card 
                title={<span style={{ fontSize: '16px', fontWeight: 600 }}>🔍 Deep Analysis Results</span>}
                style={{ marginBottom: '16px' }}
              >
                <div style={{ 
                  backgroundColor: '#f6ffed', 
                  padding: '12px', 
                  borderRadius: '6px', 
                  border: '1px solid #b7eb8f',
                  marginBottom: '16px'
                }}>
                  <Title level={5} style={{ color: '#52c41a', margin: '0 0 8px 0' }}>✅ Analysis Complete</Title>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    <div>📁 Full CSV dataset analyzed with code interpreter</div>
                    <div>🔄 Streaming analysis completed</div>
                  </div>
                </div>
                <pre style={{
                  backgroundColor: '#f6ffed',
                  padding: '12px',
                  borderRadius: '4px',
                  maxHeight: '300px',
                  overflow: 'auto',
                  fontSize: '12px',
                  border: '1px solid #b7eb8f'
                }}>
                  {JSON.stringify(result.assistantsAPIRules, null, 2)}
                </pre>
              </Card>
            )}
          </div>
        )}

        {showComparison && result && (
          <div style={{ marginTop: '24px' }}>
            <Divider orientation="left">Dual Analysis Results Comparison</Divider>
            
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '24px'
            }}>
              {/* Quick Analysis Results */}
              <Card 
                title={<span style={{ fontSize: '16px', fontWeight: 600 }}>🚀 Quick Analysis (Sampled Data)</span>} 
                size="default"
                style={{ width: '100%' }}
              >
                {result.chatCompletionRules ? (
                  <div>
                    <div style={{ 
                      backgroundColor: '#f6ffed', 
                      padding: '8px 12px', 
                      borderRadius: '6px', 
                      border: '1px solid #b7eb8f',
                      marginBottom: '12px'
                    }}>
                      <Title level={5} style={{ color: '#52c41a', margin: '0 0 8px 0', fontSize: '13px' }}>✅ Success</Title>
                      <div style={{ fontSize: '11px', color: '#666' }}>
                        <div>📊 Original: {result.debugInfo?.chatCompletion?.originalRecords || 'N/A'} records</div>
                        <div>🎯 Processed: {result.debugInfo?.chatCompletion?.processedRecords || 'N/A'} records</div>
                        <div>🎲 Sampling: {result.debugInfo?.chatCompletion?.samplingApplied ? 'Applied' : 'Not needed'}</div>
                      </div>
                    </div>
                    <pre style={{
                      backgroundColor: '#f9f9f9',
                      padding: '12px',
                      borderRadius: '6px',
                      border: '1px solid #d9d9d9',
                      fontSize: '11px',
                      maxHeight: '250px',
                      overflow: 'auto'
                    }}>
                      {JSON.stringify(result.chatCompletionRules, null, 2)}
                    </pre>
                  </div>
                ) : (
                  <div>
                    <Title level={5} style={{ color: '#ff4d4f', marginTop: 0 }}>❌ Failed</Title>
                    <Text type="danger">{result.chatCompletionError || 'Unknown error'}</Text>
                  </div>
                )}
              </Card>
              
              {/* OpenAI Assistants API Streaming Results */}
              <Card 
                title={<span style={{ fontSize: '16px', fontWeight: 600 }}>🔍 Deep Analysis (Full CSV File)</span>}
                size="default"
                style={{ width: '100%' }}
              >
                {result.assistantsAPIRules ? (
                  <div>
                    <Title level={5} style={{ color: '#52c41a', marginTop: 0 }}>✅ Success</Title>
                    <pre style={{
                      backgroundColor: '#f6ffed',
                      padding: '12px',
                      borderRadius: '4px',
                      maxHeight: '400px',
                      overflow: 'auto',
                      fontSize: '12px',
                      border: '1px solid #b7eb8f'
                    }}>
                      {JSON.stringify(result.assistantsAPIRules, null, 2)}
                    </pre>
                  </div>
                ) : (
                  <div>
                    <Title level={5} style={{ color: '#ff4d4f', marginTop: 0 }}>❌ Failed</Title>
                    <Text type="danger">{result.assistantsAPIError || 'Unknown error'}</Text>
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
        title={<span><ExclamationCircleOutlined style={{ color: '#faad14', marginRight: 8 }} />Dataset Size Warning</span>}
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
