import type { OpenAIResponse } from '@/utils/ruleConverter';

export interface TokenEstimation {
  originalRecords: number;
  originalTokens: number;
  processedRecords: number;
  processedTokens: number;
  samplingApplied: boolean;
  estimatedCost: number;
}

export interface QuickAnalysisResult {
  success: boolean;
  data?: OpenAIResponse;
  debugInfo?: {
    originalRecords: number;
    originalTokens: number;
    processedRecords: number;
    processedTokens: number;
    samplingApplied: boolean;
    processingTime: number;
  };
  error?: string;
}

export interface StreamingStatus {
  step: number;
  status: string;
  text: string;
}

export interface StreamUpdate {
  type: 'status' | 'text_delta' | 'step_created' | 'step_progress' | 'step_completed' | 'run_created' | 'message_created' | 'message_completed' | 'completed' | 'error';
  step?: number;
  status?: string;
  text?: string;
  fullText?: string;
  eventType?: string;
  data?: any;
  message?: string;
  runId?: string;
  threadId?: string;
  assistantId?: string;
  fileId?: string;
}

export interface DeepAnalysisResult {
  success: boolean;
  data?: OpenAIResponse;
  threadId?: string;
  assistantId?: string;
  error?: string;
}

/**
 * Estimate token count for CSV data
 */
export const estimateTokenCount = (csvData: string): TokenEstimation => {
  const lines = csvData.split('\n').filter(line => line.trim());
  const originalRecords = Math.max(0, lines.length - 1); // Subtract header
  
  // Rough token estimation: ~4 characters per token
  const originalTokens = Math.ceil(csvData.length / 4);
  
  // Apply sampling if dataset is large (>1000 records or >50k tokens)
  const shouldSample = originalRecords > 1000 || originalTokens > 50000;
  
  let processedRecords = originalRecords;
  let processedTokens = originalTokens;
  
  if (shouldSample) {
    // Sample to ~800 records or ~40k tokens, whichever is smaller
    const recordSampleRatio = Math.min(800 / originalRecords, 1);
    const tokenSampleRatio = Math.min(40000 / originalTokens, 1);
    const sampleRatio = Math.min(recordSampleRatio, tokenSampleRatio);
    
    processedRecords = Math.ceil(originalRecords * sampleRatio);
    processedTokens = Math.ceil(originalTokens * sampleRatio);
  }
  
  // Estimate cost: $0.01 per 1K tokens (rough GPT-4 pricing)
  const estimatedCost = (processedTokens / 1000) * 0.01;
  
  return {
    originalRecords,
    originalTokens,
    processedRecords,
    processedTokens,
    samplingApplied: shouldSample,
    estimatedCost
  };
};

/**
 * Sample CSV data for processing
 */
export const sampleCSVData = (csvData: string, targetRecords: number): string => {
  const lines = csvData.split('\n');
  if (lines.length <= targetRecords + 1) return csvData; // +1 for header
  
  const header = lines[0];
  const dataLines = lines.slice(1).filter(line => line.trim());
  
  // Simple random sampling
  const sampledLines = [];
  const sampleRatio = targetRecords / dataLines.length;
  
  for (let i = 0; i < dataLines.length; i++) {
    if (Math.random() < sampleRatio || sampledLines.length < targetRecords) {
      sampledLines.push(dataLines[i]);
      if (sampledLines.length >= targetRecords) break;
    }
  }
  
  return [header, ...sampledLines].join('\n');
};

/**
 * Call OpenAI Chat Completion API for quick analysis
 */
export const callQuickAnalysis = async (
  csvData: string,
  userInstructions: string = ''
): Promise<QuickAnalysisResult> => {
  const startTime = Date.now();
  
  try {
    // Get token estimation and apply sampling if needed
    const estimation = estimateTokenCount(csvData);
    const processedData = estimation.samplingApplied 
      ? sampleCSVData(csvData, estimation.processedRecords)
      : csvData;

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) {
      throw new Error('Supabase URL not configured');
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/openai-chatcompletion`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        csvContent: processedData,
        fileName: 'transactions.csv',
        userInstructions: userInstructions
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
    }

    const data = await response.json();
    
    if (data.success) {
      return {
        success: true,
        data: data.data,
        debugInfo: {
          ...estimation,
          processingTime: Date.now() - startTime
        }
      };
    } else {
      throw new Error(data.error || 'Unknown error occurred');
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

/**
 * Call OpenAI Assistants API for deep analysis with streaming
 */
export const callDeepAnalysis = async (
  csvData: string,
  fileName: string = 'transactions.csv',
  userInstructions: string = '',
  onUpdate?: (update: StreamUpdate) => void
): Promise<DeepAnalysisResult> => {
  console.log('Starting deep analysis...');

  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) {
      throw new Error('Supabase URL not configured');
    }

    const requestUrl = `${supabaseUrl}/functions/v1/openai-assistants-interpreter`;
    const requestHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
    };
    const requestBody = {
      csvContent: csvData,
      fileName: fileName,
      userInstructions: userInstructions
    };

    const response = await fetch(requestUrl, {
      method: 'POST',
      headers: requestHeaders,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
    }

    if (!response.body) {
      throw new Error('No response body');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let finalResult: DeepAnalysisResult | null = null;

    let streamClosed = false;

    try {
      while (!streamClosed) {
        const { done, value } = await reader.read();
        
        if (done) {
          streamClosed = true;
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim() === '' || !line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6);
          if (jsonStr === '[DONE]') {
            continue;
          }
          
          try {
            const parsed = JSON.parse(jsonStr);

            // Validate that we have a proper streaming update before processing
            if (!parsed || typeof parsed !== 'object') {
              console.warn('Invalid streaming data structure');
              continue;
            }

            if (onUpdate) {
              // Handle all event types
              switch (parsed.type) {
                case 'status':
                  onUpdate({
                    type: 'status',
                    step: parsed.step || 0,
                    status: parsed.status || '',
                    text: parsed.text || parsed.message || ''
                  });
                  break;
                
                case 'text_delta':
                  onUpdate({
                    type: 'text_delta',
                    fullText: parsed.fullText || ''
                  });
                  break;
                
                case 'step_created':
                case 'step_progress':
                case 'step_completed':
                case 'run_created':
                case 'message_created':
                case 'message_completed':
                  onUpdate({
                    type: parsed.type,
                    text: parsed.message || JSON.stringify(parsed),
                    eventType: parsed.type
                  });
                  break;
                
                case 'completed': 
                  // Improved data extraction with better error handling
                  let extractedData = null;
                  if (parsed.data) {
                    extractedData = parsed.data;
                  } else if (parsed.success && parsed.rules) {
                    // Handle case where rules are at top level
                    extractedData = { rules: parsed.rules };
                  }

                  onUpdate({
                    type: 'completed',
                    data: extractedData,
                    text: 'Analysis completed successfully!'
                  });
                  
                  finalResult = {
                    success: true,
                    data: extractedData,
                    threadId: parsed.debugInfo?.threadId || parsed.threadId,
                    assistantId: parsed.debugInfo?.assistantId || parsed.assistantId
                  };
                  
                  console.log(`Analysis completed: ${extractedData?.rules?.length || 0} rules generated`);
                  break;
                
                case 'error':
                  const errorMessage = parsed.message || parsed.error || 'An error occurred';
                  onUpdate({
                    type: 'error',
                    text: errorMessage
                  });
                  finalResult = { success: false, error: errorMessage };
                  console.error('Stream error:', errorMessage);
                  break;
                
                default:
                  // Handle any other event types as generic text - only if type is valid
                  if (parsed.type) {
                    onUpdate({
                      type: parsed.type,
                      text: parsed.message || parsed.status || JSON.stringify(parsed),
                      eventType: parsed.type
                    });
                  }
              }
            }

            // Legacy handling for 'final' type (keep for backwards compatibility)
            if (parsed.type === 'final') {
              finalResult = {
                success: true,
                data: parsed.data,
                threadId: parsed.threadId,
                assistantId: parsed.assistantId
              };
            }
          } catch (parseError) {
            console.error('Failed to parse streaming JSON:', parseError);
            // Continue processing other chunks instead of breaking
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return finalResult || {
      success: false,
      error: 'No final result received from stream. The connection may have been interrupted.'
    };
  } catch (error) {
    console.error('Deep Analysis API error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

/**
 * Parse CSV data into structured format
 */
export const parseCSVData = (csvContent: string): any[] => {
  const lines = csvContent.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const data = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
    const row: any = {};
    
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    
    data.push(row);
  }
  
  return data;
};

/**
 * Validate CSV format and content
 */
export const validateCSVData = (csvContent: string): { valid: boolean; error?: string } => {
  if (!csvContent || csvContent.trim().length === 0) {
    return { valid: false, error: 'CSV content is empty' };
  }
  
  const lines = csvContent.split('\n').filter(line => line.trim());
  if (lines.length < 2) {
    return { valid: false, error: 'CSV must have at least a header and one data row' };
  }
  
  // Check for common transaction fields
  const headers = lines[0].toLowerCase();
  const requiredFields = ['amount', 'transaction'];
  const hasRequiredFields = requiredFields.some(field => headers.includes(field));
  
  if (!hasRequiredFields) {
    return { 
      valid: false, 
      error: 'CSV should contain transaction-related data (amount, transaction_id, etc.)' 
    };
  }
  
  return { valid: true };
};
