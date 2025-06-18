import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { parse } from 'https://deno.land/std/csv/parse.ts';

// Handle HTTP requests
Deno.serve(async (req) => {
  try {
    console.log('File processor function triggered');
    
    // Check if this is a preflight request
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
        }
      });
    }
    
    // Initialize Supabase client with anon key
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const formSecret = Deno.env.get('FORM_SECRET');
    
    console.log(`SUPABASE_URL: ${supabaseUrl ? '✓ (set)' : '✗ (not set)'}`); 
    console.log(`SUPABASE_ANON_KEY: ${supabaseAnonKey ? '✓ (set)' : '✗ (not set)'}`); 
    console.log(`FORM_SECRET: ${formSecret ? '✓ (set)' : '✗ (not set)'}`); 
    
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY must be set');
    }
    
    if (!formSecret) {
      throw new Error('FORM_SECRET environment variable is not set');
    }
    
    // Create Supabase client with anon key
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

    
    // Get the payload from the request
    const payload = await req.json();
    console.log('Storage webhook payload:', JSON.stringify(payload, null, 2));
    
    // Check if this is a file creation event
    if (payload.type !== 'INSERT' || !payload.record) {
      return new Response(JSON.stringify({
        message: 'Not a file creation event, ignoring',
        type: payload.type
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const { name, bucket_id, id: fileId } = payload.record;
    
    // Only process files from the user-file-upload bucket
    if (bucket_id !== 'user-file-upload') {
      return new Response(JSON.stringify({
        message: 'File not in target bucket, ignoring',
        bucket: bucket_id
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    console.log(`Processing file: ${name} from bucket: ${bucket_id}`);
    
    // Download the file from storage
    const { data: fileData, error: downloadError } = await supabaseClient
      .storage
      .from(bucket_id)
      .download(name);
      
    if (downloadError || !fileData) {
      throw new Error(`Failed to download file: ${downloadError?.message || 'Unknown error'}`);
    }
    
    // Read file content as text
    const fileContent = await fileData.text();
    console.log(`File content preview: ${fileContent.substring(0, 200)}...`);
    
    // Parse CSV data
    const parsedData = parse(fileContent, {
      skipFirstRow: true, // Skip header row
      columns: true // Use first row as column names
    });
    
    // Extract client ID from filename or use a default
    // Assuming filename format: clientId-timestamp-originalname.csv
    let clientId = 'unknown';
    const fileNameParts = name.split('-');
    if (fileNameParts.length > 0) {
      clientId = fileNameParts[0];
    }
    
    // Log the form_secret value being used (first few characters for security)
    const secretPreview = formSecret ? `${formSecret.substring(0, 10)}...` : 'null';
    console.log(`Using form_secret: ${secretPreview}`);
    
    // Insert record into csv_uploads table, which will trigger the bright-responder function
    const insertData = {
      name: name,
      client_id: clientId,
      data: parsedData,
      file_id: fileId,
      form_secret: formSecret // Use the form_secret from environment variable
    };
    
    console.log('Inserting data with the following structure:', {
      ...insertData,
      data: `[${parsedData.length} rows]` // Don't log all the data
    });
    
    // Insert the data into the csv_uploads table
    const { error: insertError } = await supabaseClient
      .schema('api')
      .from('csv_uploads')
      .insert(insertData);
      
    if (insertError) {
      console.error('Insert error details:', insertError);
      console.error('Error code:', insertError.code);
      console.error('Error message:', insertError.message);
      console.error('Error details:', insertError.details);
      throw new Error(`Failed to insert CSV data: ${insertError.message}`);
    }
    
    console.log('Successfully processed file and inserted data');
    
    return new Response(JSON.stringify({
      success: true,
      message: 'File processed successfully',
      file_name: name,
      client_id: clientId,
      rows_processed: parsedData.length
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Error processing file:', error);
    console.error('Error stack:', error.stack);
    
    return new Response(JSON.stringify({
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
