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
  // Set CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Content-Type': 'application/json',
  };

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Parse request body
    let requestData;
    try {
      requestData = await req.json();
      console.log('Received request data:', JSON.stringify(requestData, null, 2));
    } catch (e) {
      console.error('Error parsing request JSON:', e);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: corsHeaders }
      );
    }

    const { testData } = requestData;
    if (!testData) {
      return new Response(
        JSON.stringify({ error: 'No test data provided' }),
        { status: 400, headers: corsHeaders }
      );
    }

    console.log('Sending request to OpenAI API with data:', JSON.stringify(testData, null, 2));
    
    try {
      // Call OpenAI API
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a senior fraud data analyst. Analyze the provided data and return potential fraud detection rules in the following JSON format:
            {
              "rules": [{
                "rule_name": "string",
                "description": "string",
                "risk_score": number (1-100),
                "conditions": "string",
                "metadata": {}
              }]
            }`
          },
          {
            role: "user",
            content: `Analyze this test data for potential fraud patterns and return exactly 3 rules in the specified JSON format. Focus on the most critical fraud indicators.\n\n${JSON.stringify(testData, null, 2)}`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
        max_tokens: 2000
      });

      console.log('OpenAI API Response:', JSON.stringify(completion, null, 2));

      const responseContent = completion.choices[0]?.message?.content;
      if (!responseContent) {
        throw new Error('No content in OpenAI response');
      }
      console.log('OpenAI Response Content:', responseContent);

      // Parse and validate the response
      let parsedResponse: OpenAIResponse;
      try {
        parsedResponse = JSON.parse(responseContent);
        console.log('Parsed Response:', JSON.stringify(parsedResponse, null, 2));
        
        if (!parsedResponse.rules || !Array.isArray(parsedResponse.rules)) {
          throw new Error('Invalid response format: expected { rules: [...] }');
        }
        
        console.log(`Successfully parsed ${parsedResponse.rules.length} rules`);
        
        return new Response(
          JSON.stringify({
            success: true,
            data: parsedResponse,
            rawResponse: responseContent
          }),
          { headers: corsHeaders }
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
          { status: 500, headers: corsHeaders }
        );
      }

    } catch (apiError) {
      console.error('OpenAI API Error:', apiError);
      return new Response(
        JSON.stringify({
          error: 'Failed to process request with OpenAI',
          details: apiError.message
        }),
        { status: 500, headers: corsHeaders }
      );
    }

  } catch (error) {
    console.error('Unexpected error in test-openai function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});
