import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import OpenAI from 'https://esm.sh/openai@5.0.0'

// Types
interface TransactionRecord {
  transaction_id?: string;
  amount?: number;
  currency?: string;
  merchant?: string;
  card_type?: string;
  card_last4?: string;
  ip_country?: string;
  billing_country?: string;
  shipping_country?: string;
  is_flagged?: boolean;
  [key: string]: any;
}

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

interface APIResponse {
  success: boolean;
  data?: { rules: OpenAIRule[] };
  error?: string;
  debugInfo: {
    originalRecords: number;
    processedRecords: number;
    samplingApplied: boolean;
    originalTokens: number;
    processedTokens: number;
    processingTime: number;
  };
  debugVersion: string;
  timestamp: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
      }
    });
  }

  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  try {
    // Validate request method
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: corsHeaders }
      );
    }

    // Parse request body
    const { csvContent, fileName } = await req.json();

    if (!csvContent || !fileName) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields: csvContent and fileName' 
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate CSV content size (max 10MB)
    if (csvContent.length > 10 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ 
          error: 'CSV content too large. Maximum size is 10MB.' 
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: Deno.env.get('OPENAI_API_KEY'),
    });

    if (!Deno.env.get('OPENAI_API_KEY')) {
      throw new Error('OpenAI API key not configured');
    }

    const startTime = Date.now();

    // Parse CSV content to JSON
    const lines = csvContent.split('\n').filter(line => line.trim() !== '');
    if (lines.length < 2) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid CSV format. Must have at least header and one data row.' 
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const parsedData: TransactionRecord[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      if (values.length === headers.length) {
        const record: TransactionRecord = {};
        headers.forEach((header, index) => {
          const value = values[index];
          // Try to parse as number if it looks like one
          if (!isNaN(Number(value)) && value !== '') {
            record[header] = Number(value);
          } else if (value.toLowerCase() === 'true') {
            record[header] = true;
          } else if (value.toLowerCase() === 'false') {
            record[header] = false;
          } else {
            record[header] = value;
          }
        });
        parsedData.push(record);
      }
    }

    if (parsedData.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'No valid data rows found in CSV' 
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Calculate original token estimate
    const originalDataString = JSON.stringify(parsedData);
    const originalTokenEstimate = Math.ceil(originalDataString.length / 4);

    // Apply sampling if needed using Fisher-Yates shuffle
    const sampleData = (data: TransactionRecord[], maxSize: number = 50): TransactionRecord[] => {
      if (data.length <= maxSize) {
        return data;
      }
      
      // Fisher-Yates shuffle algorithm for proper random sampling
      const shuffled = [...data];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      
      return shuffled.slice(0, maxSize);
    };

    const shouldSample = parsedData.length > 50;
    const processedData = shouldSample ? sampleData(parsedData, 50) : parsedData;
    
    // Calculate processed token estimate
    const processedDataString = JSON.stringify(processedData);
    const processedTokenEstimate = Math.ceil(processedDataString.length / 4);

    console.log(`Processing ${parsedData.length} records${shouldSample ? ` (sampled to ${processedData.length})` : ''}`);

    // Create prompt for Chat Completions API
    const prompt = `You are a senior fraud data analyst. Analyze the following transaction data and generate exactly 3 fraud detection rules in JSON format:

${JSON.stringify(processedData, null, 2)}

Generate rules in this exact format:
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

Focus on identifying patterns that indicate potential fraud. Provide data-driven insights based on the transaction patterns you observe.`;

    // Call OpenAI Chat Completions API
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a senior fraud detection analyst. Always respond with valid JSON containing exactly 3 fraud detection rules."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      throw new Error('No response received from OpenAI');
    }

    // Extract and parse JSON from response
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
      throw new Error(`Failed to parse JSON from OpenAI response: ${parseError.message}. Raw content: ${responseText}`);
    }
    
    if (!parsedResponse.rules || !Array.isArray(parsedResponse.rules)) {
      throw new Error(`Invalid response format: expected { rules: [...] }. Got: ${JSON.stringify(parsedResponse)}`);
    }

    if (parsedResponse.rules.length !== 3) {
      console.warn(`Expected 3 rules, got ${parsedResponse.rules.length}`);
    }

    const processingTime = Date.now() - startTime;

    const response: APIResponse = {
      success: true,
      data: parsedResponse,
      debugInfo: {
        originalRecords: parsedData.length,
        processedRecords: processedData.length,
        samplingApplied: shouldSample,
        originalTokens: originalTokenEstimate,
        processedTokens: processedTokenEstimate,
        processingTime
      },
      debugVersion: 'v1.0.0-chatcompletion',
      timestamp: new Date().toISOString()
    };

    console.log(`Chat Completions API completed successfully in ${processingTime}ms`);

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: corsHeaders
    });

  } catch (error) {
    console.error('Error in openai-chatcompletion function:', error);
    
    const errorResponse = {
      success: false,
      error: error.message || 'Internal server error',
      debugInfo: {
        originalRecords: 0,
        processedRecords: 0,
        samplingApplied: false,
        originalTokens: 0,
        processedTokens: 0,
        processingTime: 0
      },
      debugVersion: 'v1.0.0-chatcompletion',
      timestamp: new Date().toISOString()
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: corsHeaders
    });
  }
});
