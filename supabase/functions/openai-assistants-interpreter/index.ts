import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import OpenAI from 'https://esm.sh/openai@5.0.0'

// Types
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
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  try {
    // Validate request method
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { csvContent, fileName } = await req.json();

    if (!csvContent || !fileName) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields: csvContent and fileName' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate CSV content size (max 10MB)
    if (csvContent.length > 10 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ 
          error: 'CSV content too large. Maximum size is 10MB.' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sanitize filename to prevent path traversal
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: Deno.env.get('OPENAI_API_KEY'),
    });

    if (!Deno.env.get('OPENAI_API_KEY')) {
      throw new Error('OpenAI API key not configured');
    }

    // Create streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Helper function to send SSE event
          const sendEvent = (event: string, data: Record<string, unknown>) => {
            const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
            controller.enqueue(encoder.encode(message));
          };

          sendEvent('status', { message: 'Starting file upload...', step: 1 });
          
          // Step 1: Upload CSV file with expiration
          const file = await openai.files.create({
            file: new File([csvContent], sanitizedFileName, { type: 'text/csv' }),
            purpose: 'assistants'
          });
          sendEvent('status', { message: `File uploaded: ${file.id}`, step: 1, fileId: file.id });

          // Step 2: Create Assistant
          sendEvent('status', { message: 'Creating assistant...', step: 2 });
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
            model: "gpt-4o-mini"
          });
          sendEvent('status', { message: `Assistant created: ${assistant.id}`, step: 2, assistantId: assistant.id });

          // Step 3: Create thread and run with streaming
          sendEvent('status', { message: 'Creating thread and starting analysis...', step: 3 });
          const runStream = await openai.beta.threads.createAndRun({
            assistant_id: assistant.id,
            stream: true,
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

          let runId = null;
          let threadId = null;
          let responseText = '';
          let isCompleted = false;
          let hasError = false;
          let errorMessage = '';

          // Step 4: Process streaming events
          sendEvent('status', { message: 'Processing analysis...', step: 4 });
          
          for await (const event of runStream) {
            switch (event.event) {
              case 'thread.run.created':
                runId = event.data.id;
                threadId = event.data.thread_id;
                sendEvent('run_created', { runId, threadId });
                break;
                
              case 'thread.run.queued':
                sendEvent('status', { message: 'Analysis queued...', step: 4 });
                break;
                
              case 'thread.run.in_progress':
                sendEvent('status', { message: 'Analysis in progress...', step: 4 });
                break;
                
              case 'thread.run.step.created':
                sendEvent('step_created', { type: event.data.type });
                break;
                
              case 'thread.run.step.in_progress':
                sendEvent('step_progress', { type: event.data.type });
                break;
                
              case 'thread.run.step.completed':
                sendEvent('step_completed', { type: event.data.type });
                break;
                
              case 'thread.message.created':
                sendEvent('message_created', {});
                break;
                
              case 'thread.message.delta':
                if (event.data.delta.content) {
                  for (const content of event.data.delta.content) {
                    if (content.type === 'text' && content.text) {
                      const textDelta = content.text.value || '';
                      responseText += textDelta;
                      sendEvent('text_delta', { text: textDelta, fullText: responseText });
                    }
                  }
                }
                break;
                
              case 'thread.message.completed':
                sendEvent('message_completed', {});
                break;
                
              case 'thread.run.completed':
                sendEvent('status', { message: 'Analysis completed!', step: 5 });
                isCompleted = true;
                break;
                
              case 'thread.run.failed':
                hasError = true;
                errorMessage = event.data.last_error?.message || 'Unknown error';
                sendEvent('error', { message: errorMessage });
                break;
                
              case 'thread.run.cancelled':
              case 'thread.run.expired':
                hasError = true;
                errorMessage = `Run ${event.event.split('.').pop()}`;
                sendEvent('error', { message: errorMessage });
                break;
            }
          }
          
          if (hasError) {
            sendEvent('error', { message: `Assistant run failed: ${errorMessage}` });
            controller.close();
            return;
          }
          
          if (!isCompleted) {
            sendEvent('error', { message: 'Stream ended without completion' });
            controller.close();
            return;
          }
          
          if (!responseText.trim()) {
            sendEvent('error', { message: 'No response text received from assistant' });
            controller.close();
            return;
          }
          
          // Step 5: Parse and send final result
          sendEvent('status', { message: 'Parsing results...', step: 5 });
          
          // Extract JSON from response
          let jsonString = responseText.trim();
          const jsonMatch = jsonString.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
          if (jsonMatch) {
            jsonString = jsonMatch[1].trim();
          } else {
            const rulesMatch = jsonString.match(/\{[\s\S]*?"rules"[\s\S]*?\}/);
            if (rulesMatch) {
              jsonString = rulesMatch[0];
            } else {
              const jsonStart = jsonString.indexOf('{');
              const jsonEnd = jsonString.lastIndexOf('}');
              if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
                jsonString = jsonString.substring(jsonStart, jsonEnd + 1);
              }
            }
          }
          
          try {
            const parsedResponse = JSON.parse(jsonString);
            sendEvent('completed', {
              success: true,
              data: parsedResponse,
              debugInfo: {
                fileId: file.id,
                assistantId: assistant.id,
                threadId: threadId || undefined,
                runId: runId || undefined
              }
            });
          } catch (parseError) {
            sendEvent('error', {
              message: `Failed to parse JSON: ${parseError.message}`,
              rawResponse: responseText
            });
          }
          
          controller.close();
        } catch (error) {
          const message = `event: error\ndata: ${JSON.stringify({ message: error.message })}\n\n`;
          controller.enqueue(encoder.encode(message));
          controller.close();
        }
      }
    });
    
    return new Response(stream, {
      headers: corsHeaders
    });

  } catch (error) {
    console.error('Error in openai-assistants-interpreter function:', error);
    
    const errorResponse = {
      success: false,
      error: error.message || 'Internal server error',
      debugVersion: 'v1.0.0-assistants',
      timestamp: new Date().toISOString()
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
