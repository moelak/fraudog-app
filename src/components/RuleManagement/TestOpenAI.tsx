import React, { useState, useCallback } from 'react';
import { Button, Card, Form, Input, Alert, Typography, Divider, Upload, message } from 'antd';
import { LoadingOutlined, UploadOutlined } from '@ant-design/icons';
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

  const onFinish = async (values: { testData: string }) => {
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
      
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({ testData }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to process request');
      }

      setResult(data);
    } catch (error) {
      console.error('Test failed:', error);
      setError(error instanceof Error ? error.message : 'An error occurred while processing your request');
    } finally {
      setLoading(false);
    }
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
    </div>
  );
};

export default TestOpenAI;
