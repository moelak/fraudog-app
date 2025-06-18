import { createClient } from 'jsr:@supabase/supabase-js@2';
Deno.serve(async (req)=>{
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
    // Get ngrok URL
    const { data: ngrokData, error: ngrokError } = await supabaseClient.schema('api').from('ngrok_config').select('url').limit(1).single();
    if (ngrokError || !ngrokData?.url) {
      console.error('Ngrok error:', ngrokError);
      throw new Error(`Could not get ngrok URL: ${ngrokError?.message}`);
    }
    console.log('Ngrok URL:', ngrokData.url);
    // Validate CSV data structure
    if (!Array.isArray(csvData) || csvData.length === 0) {
      throw new Error('CSV data is not a valid array or is empty');
    }
    // Convert JSON data back to CSV format
    const headers = Object.keys(csvData[0] || {});
    if (headers.length === 0) {
      throw new Error('No headers found in CSV data');
    }
    const csvContent = [
      headers.join(','),
      ...csvData.map((row)=>headers.map((h)=>{
          const value = row[h] || '';
          // Escape commas and quotes in CSV values
          return typeof value === 'string' && (value.includes(',') || value.includes('"')) ? `"${value.replace(/"/g, '""')}"` : value;
        }).join(','))
    ].join('\n');
    console.log('CSV content preview:', csvContent.substring(0, 200) + '...');
    // Create FormData with CSV
    const formData = new FormData();
    formData.append('client_id', clientId);
    const csvBlob = new Blob([
      csvContent
    ], {
      type: 'text/csv'
    });
    formData.append('csv', csvBlob, fileName);
    console.log('Sending to server:', `${ngrokData.url}/api/upload`);
    // Send to your server with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(()=>controller.abort(), 30000); // 30 second timeout
    try {
      const response = await fetch(`${ngrokData.url}/api/upload`, {
        method: 'POST',
        body: formData,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      console.log('Server response status:', response.status);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server error response:', errorText);
        throw new Error(`Server responded with ${response.status}: ${errorText}`);
      }
      const responseText = await response.text();
      console.log('Server response:', responseText);
      return new Response(JSON.stringify({
        success: true,
        message: 'Data forwarded successfully',
        server_response: responseText
      }), {
        headers: {
          'Content-Type': 'application/json'
        }
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        throw new Error('Request to server timed out');
      }
      throw fetchError;
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
