import OpenAI from 'https://deno.land/x/openai@v4.20.0/mod.ts';

const openai = new OpenAI({
  apiKey: Deno.env.get('OPENAI_API_KEY'),
});

interface TestRuleResult {
  rule_name: string;
  description: string;
  risk_score: number;
  conditions: string;
  metadata?: Record<string, unknown>;
}

interface OpenAIResponse {
  rules: TestRuleResult[];
}

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Content-Type': 'application/json',
  };

  if (req.method === 'OPTIONS') {
    console.log('OPTIONS request, returning CORS headers');
    return new Response('ok', { headers: corsHeaders });
  }

  // Initialize debug headers with CORS headers (will be updated with debug info later)
  let debugHeaders: Record<string, string> = { ...corsHeaders };
  
  try {
    // Check if OpenAI API key is configured
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      console.error('OpenAI API key is not configured');
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

    const { testData } = requestData;
    
    if (!testData) {
      console.error('No testData found in request');
      return new Response(
        JSON.stringify({ error: 'No test data provided' }),
        { status: 400, headers: debugHeaders }
      );
    }
    
    console.log('testData validation passed');
    console.log('testData type:', typeof testData);
    console.log('testData is array:', Array.isArray(testData));
    if (Array.isArray(testData)) {
      console.log('testData length:', testData.length);
      console.log('First record keys:', testData[0] ? Object.keys(testData[0]) : 'no first record');
    }
    
    // Estimate token count (rough approximation: 1 token ≈ 4 characters)
    const originalDataString = JSON.stringify(testData);
    const originalTokenEstimate = Math.ceil(originalDataString.length / 4);
    console.log(`Original data size: ${originalDataString.length} chars, ~${originalTokenEstimate} tokens`);
    
    // Force sampling if data is large
    let shouldSample = false;
    if (Array.isArray(testData) && testData.length > 50) {
      shouldSample = true;
    } else if (originalTokenEstimate > 50000) {
      shouldSample = true;
    }

    // Update debug headers with initial data info
    debugHeaders = {
      ...debugHeaders,
      'X-Debug-Original-Records': Array.isArray(testData) ? testData.length.toString() : '0',
      'X-Debug-Processed-Records': '0', // Will be updated after processing
      'X-Debug-Original-Tokens': originalTokenEstimate.toString(),
      'X-Debug-Processed-Tokens': '0', // Will be updated after processing
      'X-Debug-Sampling-Applied': shouldSample.toString(),
    };

    // Helper function to randomly sample data using Fisher-Yates shuffle
    const sampleData = (data: any[], maxSize: number = 50): any[] => {
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

    // Handle large datasets by sampling to avoid token limits
    console.log(`Original testData type: ${typeof testData}, isArray: ${Array.isArray(testData)}`);
    if (Array.isArray(testData)) {
      console.log(`Original testData length: ${testData.length}`);
    }
    
    // Apply sampling based on our shouldSample flag
    let processedData;
    if (shouldSample) {
      console.log('APPLYING SAMPLING...');
      processedData = sampleData(testData, 50);
    } else {
      console.log('NO SAMPLING NEEDED');
      processedData = testData;
    }
    
    console.log(`Processed data type: ${typeof processedData}, isArray: ${Array.isArray(processedData)}`);
    if (Array.isArray(processedData)) {
      console.log(`Processed data length: ${processedData.length}`);
    }
    
    // Calculate final token estimate
    const processedDataString = JSON.stringify(processedData);
    const processedTokenEstimate = Math.ceil(processedDataString.length / 4);
    console.log(`Processed data size: ${processedDataString.length} chars, ~${processedTokenEstimate} tokens`);
    
    if (Array.isArray(testData) && testData.length > 50) {
      console.log(`SAMPLING SUMMARY: Original ${testData.length} -> Processed ${Array.isArray(processedData) ? processedData.length : 'not array'}`);
    }
    
    // Update debug headers with processed data info
    debugHeaders = {
      ...debugHeaders,
      'X-Debug-Processed-Records': Array.isArray(processedData) ? processedData.length.toString() : '0',
      'X-Debug-Processed-Tokens': processedTokenEstimate.toString(),
    };
    
    try {
      // APPROACH DECISION:
      // We're using Chat Completions API here because we receive pre-parsed JSON data from the frontend.
      // 
      // For ACTUAL CSV FILE UPLOADS, use the Assistants API with Code Interpreter:
      // 1. Upload CSV file: POST /v1/files (with purpose: "assistants")
      // 2. Create Assistant: POST /v1/assistants (with tools: [{"type": "code_interpreter"}])
      // 3. Create Thread: POST /v1/threads (with messages containing file_ids)
      // 4. Create Run: POST /v1/threads/{thread_id}/runs
      // 5. Poll Run status and retrieve messages when completed
      // 
      // This approach is better for complex data analysis, but adds complexity and latency.
      // Since our frontend already parses CSV to JSON, Chat Completions is more efficient.
      
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a senior fraud data analyst with expertise in creating fraud detection rules. 
            
            Analyze the provided transaction data and generate exactly 3 fraud detection rules in this JSON format:
            {
              "rules": [{
                "rule_name": "string (descriptive name for the rule)",
                "description": "string (detailed explanation of what this rule detects)",
                "risk_score": number (1-100, where 100 is highest risk),
                "conditions": "string (SQL-like conditions that define when this rule triggers)",
                "metadata": {
                  "pattern_type": "string (e.g., 'geographic', 'behavioral', 'amount-based')",
                  "confidence": "string (high/medium/low)",
                  "false_positive_risk": "string (high/medium/low)"
                }
              }]
            }
            
            Focus on the most statistically significant patterns that indicate fraud risk. Consider:
            - Geographic inconsistencies (IP vs billing vs shipping countries)
            - Transaction amount patterns
            - Merchant risk factors
            - Payment method risks
            - Flagged transaction patterns
            
            Make the conditions specific and actionable for a fraud detection system.`
          },
          {
            role: "user",
            content: `Analyze this transaction data for fraud patterns and generate 3 high-quality fraud detection rules:\n\n${JSON.stringify(processedData, null, 2)}`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
        max_tokens: 3000
      });

      const responseContent = completion.choices[0]?.message?.content;
      if (!responseContent) {
        throw new Error('No content in OpenAI response');
      }
      console.log('OpenAI Response Content:', responseContent);

      // Parse and validate the response
      let parsedResponse: OpenAIResponse;
      try {
        parsedResponse = JSON.parse(responseContent);
        
        if (!parsedResponse.rules || !Array.isArray(parsedResponse.rules)) {
          throw new Error('Invalid response format: expected { rules: [...] }');
        }
        
        // Extract debug info from headers to include in response body
        const debugInfo = {
          originalRecords: debugHeaders['X-Debug-Original-Records'] || '0',
          processedRecords: debugHeaders['X-Debug-Processed-Records'] || '0',
          originalTokens: debugHeaders['X-Debug-Original-Tokens'] || '0',
          processedTokens: debugHeaders['X-Debug-Processed-Tokens'] || '0',
          samplingApplied: debugHeaders['X-Debug-Sampling-Applied'] === 'true'
        };
        
        return new Response(
          JSON.stringify({
            success: true,
            data: parsedResponse,
            rawResponse: responseContent,
            debugVersion: 'v2.1-debug-in-body',
            timestamp: new Date().toISOString(),
            debugInfo: debugInfo
          }),
          { headers: debugHeaders }
        );

      } catch (parseError) {
        console.error('Error parsing OpenAI response:', parseError);
        console.error('Raw response content:', responseContent);
        
        return new Response(
          JSON.stringify({ 
            error: 'Failed to parse OpenAI response',
            details: parseError.message,
            response: responseContent
          }),
          { status: 500, headers: debugHeaders }
        );
      }

    } catch (apiError) {
      console.error('OpenAI API Error:', apiError);
      console.error('API Error details:', {
        name: apiError.name,
        message: apiError.message,
        stack: apiError.stack,
        status: apiError.status,
        statusText: apiError.statusText
      });
      return new Response(
        JSON.stringify({
          error: 'Failed to process request with OpenAI',
          details: apiError.message,
          errorType: apiError.name,
          status: apiError.status || 'unknown'
        }),
        { status: 500, headers: debugHeaders }
      );
    }

  } catch (error) {
    console.error('Unexpected error in test-openai function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message
      }),
      { status: 500, headers: debugHeaders }
    );
  }
});
