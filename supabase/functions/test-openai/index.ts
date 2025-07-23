import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import OpenAI from 'https://esm.sh/openai@5';

// Types
interface TransactionRecord {
  [key: string]: any;
}

interface OpenAIResponse {
  rules: Array<{
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
  }>;
}

interface APIResponse {
  success: boolean;
  chatCompletionRules?: OpenAIResponse;
  assistantsAPIRules?: OpenAIResponse;
  chatCompletionError?: string;
  assistantsAPIError?: string;
  debugInfo: {
    chatCompletion: {
      originalRecords?: string;
      processedRecords?: string;
      originalTokens?: string;
      processedTokens?: string;
      samplingApplied?: boolean;
    };
    assistantsAPI: {
      fileId?: string;
      vectorStoreId?: string;
      assistantId?: string;
      threadId?: string;
      runId?: string;
      processingTime?: number;
    };
  };
  debugVersion: string;
  timestamp: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json'
};

serve(async (req) => {
  console.log('=== FUNCTION START ===');
  console.log('Request method:', req.method);
  console.log('Request URL:', req.url);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request');
    return new Response('ok', { headers: corsHeaders });
  }

  // Initialize debug headers with CORS headers (will be updated with debug info later)
  const debugHeaders = new Headers({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  });

  try {
    // Validate OpenAI API key
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key is not configured' }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Parse request body
    let requestData;
    try {
      requestData = await req.json();
    } catch (e) {
      console.error('Error parsing request JSON:', e);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: debugHeaders }
      );
    }

    const { testData, csvContent, fileName } = requestData;
    
    // Debug logging
    console.log('Request data keys:', Object.keys(requestData));
    console.log('testData type:', typeof testData);
    console.log('testData length:', Array.isArray(testData) ? testData.length : 'not array');
    console.log('csvContent length:', csvContent ? csvContent.length : 'not provided');
    console.log('fileName:', fileName);
    
    if (!testData) {
      console.error('No testData found in request');
      return new Response(
        JSON.stringify({ error: 'No test data provided' }),
        { status: 400, headers: debugHeaders }
      );
    }
    
    // Parse testData if it's a string
    let parsedTestData;
    try {
      if (typeof testData === 'string') {
        parsedTestData = JSON.parse(testData);
      } else {
        parsedTestData = testData;
      }
    } catch (parseError) {
      console.error('Error parsing testData:', parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid testData format - must be valid JSON' }),
        { status: 400, headers: debugHeaders }
      );
    }
    
    if (!Array.isArray(parsedTestData)) {
      console.error('testData is not an array:', typeof parsedTestData);
      return new Response(
        JSON.stringify({ error: 'testData must be an array of transaction records' }),
        { status: 400, headers: debugHeaders }
      );
    }

    // Initialize OpenAI with v2 Assistants API support
    const openai = new OpenAI({
      apiKey: openaiApiKey,
      defaultHeaders: {
        'OpenAI-Beta': 'assistants=v2'
      }
    });

    // Helper function for Chat Completions API (existing approach)
    const callChatCompletionsAPI = async (processedData: TransactionRecord[], originalData: TransactionRecord[]) => {
      try {
        console.log('Chat Completions API: Starting call...');
        console.log('Chat Completions API: Data length:', processedData.length);
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: `You are a senior fraud data analyst. Analyze the provided transaction data and generate exactly 3 fraud detection rules in JSON format:
              {
                "rules": [{
                  "rule_name": "descriptive name",
                  "description": "detailed explanation",
                  "risk_score": number (1-100),
                  "conditions": "SQL-like conditions",
                  "outcome": "string (friction applied to payment apps e.g. KYC, 3DS, Manual Review)",
                  "metadata": {
                    "pattern_type": "string",
                    "confidence_level": number (1-100),
                    "expected_false_positive_rate": number (0-1)
                  }
                }]
              }`
            },
            {
              role: 'user',
              content: `Analyze this transaction data and generate 3 fraud detection rules: ${JSON.stringify(processedData)}`
            }
          ],
          temperature: 0.3,
          max_tokens: 2000
        });

        console.log('Chat Completions API: OpenAI call completed');
        console.log('Chat Completions API: Response received, processing...');
        
        const responseContent = completion.choices[0]?.message?.content;
        if (!responseContent) {
          throw new Error('No response content from OpenAI');
        }

        // Extract JSON from response (handle markdown code blocks)
        let jsonString = responseContent.trim();
        
        // Remove markdown code blocks if present
        const jsonMatch = jsonString.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          jsonString = jsonMatch[1].trim();
        }
        
        // If no code blocks, try to find JSON object
        if (!jsonMatch) {
          const jsonStart = jsonString.indexOf('{');
          const jsonEnd = jsonString.lastIndexOf('}');
          if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
            jsonString = jsonString.substring(jsonStart, jsonEnd + 1);
          }
        }

        let parsedResponse;
        try {
          parsedResponse = JSON.parse(jsonString);
        } catch (parseError) {
          throw new Error(`Failed to parse JSON response: ${parseError.message}. Raw content: ${responseContent}`);
        }
        
        if (!parsedResponse.rules || !Array.isArray(parsedResponse.rules)) {
          throw new Error(`Invalid response format: expected { rules: [...] }. Got: ${JSON.stringify(parsedResponse)}`);
        }

        return {
          success: true,
          data: parsedResponse,
          debugInfo: {
            originalRecords: Array.isArray(originalData) ? originalData.length.toString() : '0',
            processedRecords: Array.isArray(processedData) ? processedData.length.toString() : '0',
            originalTokens: estimateTokens(JSON.stringify(originalData)).toString(),
            processedTokens: estimateTokens(JSON.stringify(processedData)).toString(),
            samplingApplied: Array.isArray(originalData) && Array.isArray(processedData) && originalData.length > processedData.length
          }
        };
      } catch (error) {
        return {
          success: false,
          error: error.message,
          debugInfo: {
            originalRecords: Array.isArray(originalData) ? originalData.length.toString() : '0',
            processedRecords: '0',
            originalTokens: estimateTokens(JSON.stringify(originalData)).toString(),
            processedTokens: '0',
            samplingApplied: false
          }
        };
      }
    };

    // Helper function for Assistants API v2 with File Search
    const callAssistantsAPI = async () => {
      if (!csvContent || !fileName) {
        return {
          success: false,
          error: 'CSV content and filename required for Assistants API',
          debugInfo: {}
        };
      }

      const startTime = Date.now();
      
      try {
        console.log('Assistants API: Starting process...');
        
        // Step 1: Upload CSV file for code interpreter
        console.log('Assistants API: Step 1 - Uploading CSV file for code interpreter...');
        console.log('Assistants API: openai.files available:', typeof openai.files);
        const file = await openai.files.create({
          file: new File([csvContent], fileName, { type: 'text/csv' }),
          purpose: 'assistants'
        });
        console.log('Assistants API: Step 1 - File uploaded successfully:', file.id);

        // Step 2: Create Assistant with Code Interpreter (v5.x API)
        console.log('Assistants API: Step 2 - Creating assistant with code interpreter...');
        console.log('Assistants API: openai.assistants available:', typeof openai.assistants);
        console.log('Assistants API: openai.beta.assistants available:', typeof openai.beta?.assistants);
        const assistant = await openai.beta.assistants.create({
          name: "Fraud Detection Analyst",
          instructions: `You are a senior fraud data analyst. Analyze the uploaded CSV transaction data and generate exactly 3 fraud detection rules in JSON format:
          {
            "rules": [{
              "rule_name": "descriptive name",
              "description": "detailed explanation",
              "risk_score": number (1-100),
              "conditions": "SQL-like conditions",
              "outcome": "string (friction applied to payment apps e.g. KYC, 3DS, Manual Review)",
              "metadata": {
                "pattern_type": "string",
                "confidence_level": number (1-100),
                "expected_false_positive_rate": number (0-1)
              }
            }]
          }
          
          Focus on identifying patterns in the transaction data that indicate potential fraud. Use your code interpreter to thoroughly analyze the CSV data and provide data-driven insights.`,
          tools: [{ type: "code_interpreter" }],
          model: "gpt-4o"
        });
        console.log('Assistants API: Step 2 - Assistant created successfully:', assistant.id);

        // Step 3-5: Create thread and run in one call (v5.x API)
        console.log('Assistants API: Step 3-5 - Creating thread and run with message...');
        console.log('Assistants API: openai.beta.threads.createAndRun available:', typeof openai.beta?.threads?.createAndRun);
        console.log('Assistants API: Using assistant ID:', assistant.id);
        console.log('Assistants API: Using file ID:', file.id);
        
        const run = await openai.beta.threads.createAndRun({
          assistant_id: assistant.id,
          thread: {
            messages: [{
              role: "user",
              content: "Please analyze the uploaded CSV transaction data and generate exactly 3 fraud detection rules. Use your code interpreter to thoroughly examine the data patterns, identify anomalies, and create rules that would effectively detect fraudulent transactions while minimizing false positives.",
              attachments: [{
                file_id: file.id,
                tools: [{ type: "code_interpreter" }]
              }]
            }]
          }
        });
        
        console.log('Assistants API: Step 3-5 - Run object:', JSON.stringify(run, null, 2));
        console.log('Assistants API: Step 3-5 - Run created successfully:', run.id);
        console.log('Assistants API: Step 3-5 - Thread ID:', run.thread_id);
        
        if (!run || !run.id || !run.thread_id) {
          throw new Error(`Create and run failed - missing IDs. Run object: ${JSON.stringify(run)}`);
        }

        // Step 6: Poll for completion
        console.log('Assistants API: Step 6 - Starting polling...');
        console.log('Assistants API: openai.beta.threads.runs.retrieve available:', typeof openai.beta?.threads?.runs?.retrieve);
        console.log('Assistants API: Polling with thread ID:', run.thread_id);
        console.log('Assistants API: Polling with run ID:', run.id);
        
        // Validate parameters before retrieve call
        console.log('Assistants API: Parameter validation:');
        console.log('  - run.thread_id type:', typeof run.thread_id, 'value:', run.thread_id);
        console.log('  - run.id type:', typeof run.id, 'value:', run.id);
        console.log('  - run.thread_id length:', run.thread_id?.length);
        console.log('  - run.id length:', run.id?.length);
        
        if (!run.thread_id || !run.id) {
          throw new Error(`Invalid parameters for retrieve: thread.id=${run.thread_id}, run.id=${run.id}`);
        }
        
        let runStatus;
        try {
          console.log('Assistants API: Attempting retrieve call...');
          runStatus = await openai.beta.threads.runs.retrieve(
            run.id, {thread_id: run.thread_id}
          );
          console.log('Assistants API: Initial run status:', runStatus.status);
        } catch (retrieveError) {
          console.error('Assistants API: Error during initial retrieve:', retrieveError);
          console.error('Assistants API: Error details:', {
            name: retrieveError.name,
            message: retrieveError.message,
            stack: retrieveError.stack
          });
          
          // Try alternative approach - check if it's an API structure issue
          console.log('Assistants API: Checking alternative API paths...');
          console.log('Assistants API: openai.beta.threads?.runs?.retrieve available:', typeof openai.beta?.threads?.runs?.retrieve);
          
          throw new Error(`Failed to retrieve run status: ${retrieveError.message}`);
        }
        
        let attempts = 0;
        const maxAttempts = 30; // 30 seconds max wait
        
        while (runStatus.status === 'queued' || runStatus.status === 'in_progress') {
          if (attempts >= maxAttempts) {
            throw new Error('Assistant API timeout - run did not complete in time');
          }
          console.log(`Assistants API: Polling attempt ${attempts + 1}/${maxAttempts}, status: ${runStatus.status}`);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
          
          try {
            runStatus = await openai.beta.threads.runs.retrieve(
              run.id, {thread_id: run.thread_id}
            );
          } catch (pollError) {
            console.error('Assistants API: Error during polling retrieve:', pollError);
            throw new Error(`Failed to retrieve run status during polling: ${pollError.message}`);
          }
          
          attempts++;
        }

        if (runStatus.status !== 'completed') {
          throw new Error(`Assistant run failed with status: ${runStatus.status}`);
        }

        // Get the messages
        const messages = await openai.beta.threads.messages.list(thread.id);
        const assistantMessage = messages.data.find(msg => msg.role === 'assistant');
        
        if (!assistantMessage || !assistantMessage.content[0] || assistantMessage.content[0].type !== 'text') {
          throw new Error('No valid response from assistant');
        }

        const responseText = assistantMessage.content[0].text.value;
        
        // Extract JSON from response (handle markdown code blocks and various formats)
        let jsonString = responseText.trim();
        
        // Remove markdown code blocks if present
        const jsonMatch = jsonString.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          jsonString = jsonMatch[1].trim();
        }
        
        // If no code blocks, try to find JSON object with rules
        if (!jsonMatch) {
          const rulesMatch = jsonString.match(/\{[\s\S]*?"rules"[\s\S]*?\}/);
          if (rulesMatch) {
            jsonString = rulesMatch[0];
          } else {
            // Fallback: find any JSON object
            const jsonStart = jsonString.indexOf('{');
            const jsonEnd = jsonString.lastIndexOf('}');
            if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
              jsonString = jsonString.substring(jsonStart, jsonEnd + 1);
            }
          }
        }

        let parsedResponse;
        try {
          parsedResponse = JSON.parse(jsonString);
        } catch (parseError) {
          throw new Error(`Failed to parse JSON from assistant response: ${parseError.message}. Raw content: ${responseText}`);
        }
        
        if (!parsedResponse.rules || !Array.isArray(parsedResponse.rules)) {
          throw new Error(`Invalid response format from assistant: expected { rules: [...] }. Got: ${JSON.stringify(parsedResponse)}`);
        }

        const processingTime = Date.now() - startTime;

        return {
          success: true,
          data: parsedResponse,
          debugInfo: {
            fileId: file.id,
            assistantId: assistant.id,
            threadId: run.thread_id,
            runId: run.id,
            processingTime
          }
        };
      } catch (error) {
        console.error('Assistants API: Error occurred:', error);
        console.error('Assistants API: Error message:', error.message);
        console.error('Assistants API: Error stack:', error.stack);
        console.error('Assistants API: OpenAI client structure:', {
          files: typeof openai.files,
          beta: typeof openai.beta,
          vectorStores: typeof openai.vectorStores, // Moved to stable in v5.x
          betaAssistants: typeof openai.beta?.assistants,
          betaThreads: typeof openai.beta?.threads
        });
        
        return {
          success: false,
          error: `Assistants API Error: ${error.message}`,
          debugInfo: {
            processingTime: Date.now() - startTime,
            errorDetails: {
              message: error.message,
              stack: error.stack,
              openaiStructure: {
                files: typeof openai.files,
                beta: typeof openai.beta,
                vectorStores: typeof openai.vectorStores, // Moved to stable in v5.x
                betaAssistants: typeof openai.beta?.assistants,
                betaThreads: typeof openai.beta?.threads
              }
            }
          }
        };
      }
    };
    
    // Helper function to randomly sample data using Fisher-Yates shuffle
    const sampleData = (data: TransactionRecord[], maxSize: number = 50): TransactionRecord[] => {
      if (!Array.isArray(data)) {
        return data;
      }
      
      if (data.length <= maxSize) {
        return data;
      }
      
      // Fisher-Yates shuffle algorithm for proper random sampling
      const shuffled = [...data];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      
      const sampled = shuffled.slice(0, maxSize);
      console.log(`Sampling complete. Returning ${sampled.length} records`);
      return sampled;
    };

    // Helper function to estimate tokens
    const estimateTokens = (text: string): number => {
      return Math.ceil(text.length / 4);
    };

    console.log('testData validation passed');
    console.log('parsedTestData type:', typeof parsedTestData);
    console.log('parsedTestData is array:', Array.isArray(parsedTestData));
    console.log('parsedTestData length:', parsedTestData.length);
    console.log('First record keys:', parsedTestData[0] ? Object.keys(parsedTestData[0]) : 'no first record');
    
    // Estimate token count (rough approximation: 1 token ≈ 4 characters)
    const originalDataString = JSON.stringify(parsedTestData);
    const originalTokenEstimate = Math.ceil(originalDataString.length / 4);
    console.log(`Original data size: ${originalDataString.length} chars, ~${originalTokenEstimate} tokens`);
    
    // Force sampling if data is large
    let shouldSample = false;
    if (parsedTestData.length > 50) {
      shouldSample = true;
      console.log(`Sampling triggered: ${parsedTestData.length} records > 50`);
    } else if (originalTokenEstimate > 50000) {
      shouldSample = true;
      console.log(`Sampling triggered: ${originalTokenEstimate} tokens > 50000`);
    }
    
    // Apply sampling if needed
    const processedData = shouldSample ? sampleData(parsedTestData as TransactionRecord[], 50) : parsedTestData as TransactionRecord[];
    
    console.log(`Processed data type: ${typeof processedData}, isArray: ${Array.isArray(processedData)}`);
    if (Array.isArray(processedData)) {
      console.log(`Processed data length: ${processedData.length}`);
    }
    
    // Calculate final token estimate
    const processedDataString = JSON.stringify(processedData);
    const processedTokenEstimate = Math.ceil(processedDataString.length / 4);
    console.log(`Processed data size: ${processedDataString.length} chars, ~${processedTokenEstimate} tokens`);
    
    if (Array.isArray(parsedTestData) && parsedTestData.length > 50) {
      console.log(`SAMPLING SUMMARY: Original ${parsedTestData.length} -> Processed ${Array.isArray(processedData) ? processedData.length : 'not array'}`);
    }

    // Call both APIs with appropriate data
    console.log('Starting dual API calls...');
    console.log('Chat Completions API will use sampled data:', Array.isArray(processedData) ? processedData.length : 'not array', 'records');
    console.log('Assistants API will use original data:', Array.isArray(parsedTestData) ? parsedTestData.length : 'not array', 'records');
    
    // Chat Completions API with sampled data (for efficiency)
    const chatCompletionResult = await callChatCompletionsAPI(processedData, parsedTestData);
    console.log('Chat Completions API completed:', chatCompletionResult.success);
    
    // Assistants API with original full data (for comprehensive analysis)
    const assistantsAPIResult = await callAssistantsAPI();
    console.log('Assistants API completed:', assistantsAPIResult.success);

    const response: APIResponse = {
      success: chatCompletionResult.success || assistantsAPIResult.success,
      chatCompletionRules: chatCompletionResult.success ? chatCompletionResult.data : undefined,
      assistantsAPIRules: assistantsAPIResult.success ? assistantsAPIResult.data : undefined,
      chatCompletionError: chatCompletionResult.success ? undefined : chatCompletionResult.error,
      assistantsAPIError: assistantsAPIResult.success ? undefined : assistantsAPIResult.error,
      debugInfo: {
        chatCompletion: chatCompletionResult.debugInfo,
        assistantsAPI: assistantsAPIResult.debugInfo
      },
      debugVersion: 'v1.2.0',
      timestamp: new Date().toISOString()
    };

    console.log('Dual API calls completed');
    console.log('Chat Completion success:', chatCompletionResult.success);
    console.log('Assistants API success:', assistantsAPIResult.success);

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: debugHeaders
    });

  } catch (error) {
    console.error('Error in test-openai function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message,
        debugVersion: 'v1.2.0',
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: debugHeaders }
    );
  }
});
