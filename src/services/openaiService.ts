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
 * Converts an array of objects to a CSV string
 * @param data - Array of objects to convert to CSV (matches StepperData.csvData)
 * @returns CSV formatted string with headers and data rows
 */
export const convertToCSV = (data: Record<string, any>[]): string => {
  if (data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const rows = data.map(obj => 
    headers.map(header => 
      `"${String(obj[header] || '').replace(/"/g, '""')}"`
    ).join(',')
  );
  
  return [headers.join(','), ...rows].join('\n');
};

/**
 * Parses a CSV string into an array of objects
 * @param csvContent - CSV formatted string to parse (matches StepperData.csvContent)
 * @returns Array of objects where keys are column headers and values are row values
 */
export function parseCSVData(csvContent: string): Record<string, any>[] {
  const lines = csvContent.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"/, '').replace(/"$/, ''));
  
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim().replace(/^"/, '').replace(/"$/, ''));
    return headers.reduce((obj, header, i) => {
      obj[header] = values[i] || '';
      return obj;
    }, {} as Record<string, any>);
  });
}

/**
 * Validates CSV data format and content
 * @param csvData - The CSV data to validate (matches StepperData.csvData)
 * @returns Object with validation result and optional error message
 */
export function validateCSVData(csvData: Record<string, any>[]): { valid: boolean; error?: string } {
  if (!Array.isArray(csvData) || csvData.length === 0) {
    return { valid: false, error: 'Data must be a non-empty array' };
  }
  
  const firstItem = csvData[0];
  if (typeof firstItem !== 'object' || firstItem === null) {
    return { valid: false, error: 'Data items must be objects' };
  }
  
  return { valid: true };
}

/**
 * Estimates token count for the provided data array
 * @param csvData - The data to analyze (matches StepperData.csvData)
 * @returns Token estimation details including sampling information
 */
export const estimateTokenCount = (csvData: Record<string, any>[]): TokenEstimation => {
  const originalRecords = csvData.length;
  const csvString = convertToCSV(csvData);
  
  // Rough token estimation: ~4 characters per token
  const originalTokens = Math.ceil(csvString.length / 4);
  
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
 * Samples data to reduce size while maintaining distribution
 * @param csvData - The data to sample from (matches StepperData.csvData)
 * @param targetRecords - Target number of records to sample
 * @returns Sampled array of objects
 */
export const sampleCSVData = (csvData: Record<string, any>[], targetRecords: number): Record<string, any>[] => {
  if (csvData.length <= targetRecords) return [...csvData];
  
  // Fisher-Yates shuffle algorithm for random sampling
  const shuffled = [...csvData];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled.slice(0, targetRecords);
};

/**
 * Call OpenAI Assistants API for deep analysis with streaming
 * @param data - The data to analyze as an array of objects
 * @param fileName - The name of the file being analyzed (for context)
 * @param userInstructions - Optional user instructions for the analysis
 * @param onUpdate - Optional callback for streaming updates
 */
export const callDeepAnalysis = async (
  data: Record<string, any>[],
  fileName: string = 'data.csv',
  userInstructions: string = '',
  onUpdate?: (update: StreamUpdate) => void
): Promise<DeepAnalysisResult> => {
  try {
    const csvData = convertToCSV(data);
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
 * Call OpenAI Chat Completion API for quick analysis
 * @param csvData - The data to analyze as an array of objects (matches StepperData.csvData)
 * @param fileName - The name of the file being analyzed (for context)
 * @param userInstructions - Optional user instructions for the analysis
 */
export const callQuickAnalysis = async (
  csvData: Record<string, any>[],
  fileName: string = 'transactions.csv',
  userInstructions: string = ''
): Promise<QuickAnalysisResult> => {
  const startTime = Date.now();
  
  try {
    // Get token estimation and apply sampling if needed
    const estimation = estimateTokenCount(csvData);
    const processedData = estimation.samplingApplied 
      ? sampleCSVData(csvData, estimation.processedRecords)
      : csvData;

    // Convert to CSV string for the API
    const csvString = convertToCSV(processedData);

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
        csvContent: csvString,
        fileName,
        userInstructions,
        debugInfo: {
          originalRecords: estimation.originalRecords,
          originalTokens: estimation.originalTokens,
          processedRecords: estimation.processedRecords,
          processedTokens: estimation.processedTokens,
          samplingApplied: estimation.samplingApplied
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
    }

    const result = await response.json();
    
    if (result.success) {
      return {
        success: true,
        data: result.data,
        debugInfo: {
          ...estimation,
          processingTime: Date.now() - startTime
        }
      };
    } else {
      throw new Error(result.error || 'Unknown error occurred');
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      debugInfo: {
        processingTime: Date.now() - startTime
      }
    };
  }
};
