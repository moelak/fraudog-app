import { createClient } from 'jsr:@supabase/supabase-js@2';
import OpenAI from 'https://deno.land/x/openai@v4.20.0/mod.ts';

interface RuleResult {
  rule_name: string;
  description: string;
  risk_score: number;
  conditions: string;
  metadata?: Record<string, unknown>;
}

const openai = new OpenAI({
  apiKey: Deno.env.get('OPENAI_API_KEY'),
});

Deno.serve(async (req) => {
  console.log('Edge function triggered');
  console.log('Request method:', req.method);
  console.log('Request headers:', Object.fromEntries(req.headers.entries()));
  try {
    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    // Check if request has a body
    const contentLength = req.headers.get('content-length');
    console.log('Content-Length:', contentLength);
    if (!contentLength || contentLength === '0') {
      console.log('No request body received');
      return new Response(JSON.stringify({
        error: 'No request body received',
        received_headers: Object.fromEntries(req.headers.entries())
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    // Get raw body first for debugging
    const rawBody = await req.text();
    console.log('Raw body:', rawBody);
    if (!rawBody) {
      console.log('Empty body received');
      return new Response(JSON.stringify({
        error: 'Empty body received'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    // Parse JSON payload
    let payload;
    try {
      payload = JSON.parse(rawBody);
      console.log('Parsed payload:', JSON.stringify(payload, null, 2));
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return new Response(JSON.stringify({
        error: 'Invalid JSON payload',
        raw_body: rawBody.substring(0, 500) // First 500 chars for debugging
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    // Check webhook payload structure
    if (!payload.record) {
      console.log('No record found in payload');
      return new Response(JSON.stringify({
        error: 'No record found in webhook payload',
        payload_keys: Object.keys(payload)
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    const record = payload.record;
    console.log('Record:', JSON.stringify(record, null, 2));
    // Validate required fields
    if (!record.name || !record.client_id || !record.data) {
      console.log('Missing required fields in record');
      return new Response(JSON.stringify({
        error: 'Missing required fields in record',
        record_keys: Object.keys(record),
        required: [
          'name',
          'client_id',
          'data'
        ]
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    const fileName = record.name;
    const clientId = record.client_id;
    const csvData = record.data;
    console.log('Processing:', {
      fileName,
      clientId,
      dataLength: csvData.length
    });
    // Validate CSV data structure
    if (!Array.isArray(csvData) || csvData.length === 0) {
      throw new Error('CSV data is not a valid array or is empty');
    }

    // Prepare data for OpenAI
    const dataSample = JSON.stringify(csvData.slice(0, 5), null, 2); // Only send first 5 rows as example
    
    try {
      // Call OpenAI API
      const completion = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          {
            role: "system",
            content: `You are a senior fraud data analyst with a decade of experience in the remittance, payment, and crypto industries. Your job is to investigate the data sent to you to examine and identify patterns for high fraud risk that has resulted in chargebacks. You will also identify patterns that do not fit high fraud risk so as to not confuse good customers from fraudsters, causing further friction on good customers. 
            Return a JSON array of rule conditions with the following structure for each pattern:
            {
              "rule_name": "string",
              "description": "string",
              "risk_score": number (1-100),
              "conditions": "string",
              "metadata": {}
            }
            The data shared is a CSV file of chargebacks in the period. The conditions created should be using AND conditions, using column titles as the data features Create both boolean and numeric conditions. The risk_score metric is based on the percentage of transactions in the file that fit the conditions.   `
          },
          {
            role: "user",
            content: `Analyze this transaction data for potential fraud:\n\n${dataSample}\n\nReturn a summary of the patterns found, and suggest rules to be created in each JSON array that can be used to identify future fraud activity based on the applied file.`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
        max_tokens: 5000
      });

      // Parse the response
      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content in OpenAI response');
      }

      let ruleResults: RuleResult[] = [];
      try {
        const parsedContent = JSON.parse(content);
        // Handle both direct array and object with array property responses
        ruleResults = Array.isArray(parsedContent) 
          ? parsedContent 
          : parsedContent.results || parsedContent.violations || [];
      } catch (parseError) {
        console.error('Error parsing OpenAI response:', parseError);
        throw new Error('Failed to parse OpenAI response as JSON');
      }

      // Insert results into database
      const { data: insertData, error: insertError } = await supabaseClient
        .from('rules')
        .insert(ruleResults.map(rule => ({
          client_id: clientId,
          file_name: fileName,
          ...rule,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          status: 'active',
          form_secret: Deno.env.get('FORM_SECRET') // Include form_secret for RLS
        })))
        .select();

      if (insertError) {
        console.error('Error inserting rules:', insertError);
        throw new Error(`Failed to save rules: ${insertError.message}`);
      }

      return new Response(JSON.stringify({
        success: true,
        message: 'Data processed successfully with OpenAI',
        rules_processed: ruleResults.length,
        rules: ruleResults
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (openaiError) {
      console.error('OpenAI API error:', openaiError);
      throw new Error(`OpenAI processing failed: ${openaiError.message}`);
    }
  } catch (error) {
    console.error('Edge function error:', error);
    console.error('Error stack:', error.stack);
    return new Response(JSON.stringify({
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
});
