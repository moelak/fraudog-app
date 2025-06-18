import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { parse } from 'https://deno.land/std/csv/parse.ts';

/**
 * File Processor Edge Function
 * Triggered by Supabase storage webhook when files are uploaded to user-file-upload bucket
 * Parses CSV files and inserts data into api.csv_uploads table with form_secret for RLS
 * NO AUTHENTICATION REQUIRED - accepts all requests
 */
Deno.serve(async (req) => {
  console.log('File processor function triggered');
  console.log('Request method:', req.method);
  
  // Set CORS headers for all responses
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'content-type',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        ...corsHeaders,
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      }
    });
  }
  
  // Get environment variables
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const formSecret = Deno.env.get('FORM_SECRET');
  
  // Log environment variable status (without revealing values)
  console.log(`SUPABASE_URL: ${supabaseUrl ? '✓' : '✗'}`);
  console.log(`SUPABASE_SERVICE_ROLE_KEY: ${supabaseServiceKey ? '✓' : '✗'}`);
  console.log(`FORM_SECRET: ${formSecret ? '✓' : '✗'}`);
  
  // Validate environment variables
  if (!supabaseUrl || !supabaseServiceKey || !formSecret) {
    console.error('Missing required environment variables');
    return new Response(JSON.stringify({
      error: 'Configuration Error',
      message: 'Missing required environment variables'
    }), { 
      status: 500, 
      headers: { ...corsHeaders } 
    });
  }
  
  // Create Supabase client with service role key
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  
  try {
    // Parse request body
    let payload;
    try {
      payload = await req.json();
      console.log('Request payload received');
    } catch (e) {
      console.error('Error parsing request body:', e);
      return new Response(JSON.stringify({
        error: 'Invalid Request',
        message: 'Could not parse request body as JSON'
      }), { status: 400, headers: corsHeaders });
    }
    
    // Log the payload for debugging
    console.log('Payload:', JSON.stringify(payload, null, 2));
    
    // Extract file information from payload
    // Handle both direct webhook format and database trigger format
    let filePath, bucketId;
    
    if (payload.record && payload.record.name && payload.record.bucket_id) {
      // Standard webhook format
      filePath = payload.record.name;
      bucketId = payload.record.bucket_id;
    } else if (payload.record && typeof payload.record === 'object') {
      // Try to find the file info in a nested record structure
      const record = payload.record;
      filePath = record.name || record.path || '';
      bucketId = record.bucket_id || 'user-file-upload';
    } else {
      // Fallback for any other format
      console.error('Could not extract file information from payload');
      return new Response(JSON.stringify({
        error: 'Invalid Payload',
        message: 'Could not extract file information'
      }), { status: 400, headers: corsHeaders });
    }
    
    console.log(`Processing file: ${filePath} from bucket: ${bucketId}`);
    
    // Only process files from the user-file-upload bucket
    if (bucketId !== 'user-file-upload') {
      console.log(`Ignoring file from non-target bucket: ${bucketId}`);
      return new Response(JSON.stringify({
        message: 'File not in target bucket'
      }), { status: 200, headers: corsHeaders });
    }
    
    // Extract user ID from file path (format: uploads/{userId}/filename)
    const userIdMatch = filePath.match(/^uploads\/([^/]+)\//);
    const userId = userIdMatch ? userIdMatch[1] : 'unknown';
    const fileName = filePath.split('/').pop() || 'unknown-file';
    
    console.log(`Downloading file for user: ${userId}, filename: ${fileName}`);
    
    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from(bucketId)
      .download(filePath);
    
    if (downloadError || !fileData) {
      console.error('Error downloading file:', downloadError);
      return new Response(JSON.stringify({
        error: 'Storage Error',
        message: downloadError?.message || 'Failed to download file'
      }), { status: 500, headers: corsHeaders });
    }
    
    // Read and parse CSV file
    const fileContent = await fileData.text();
    if (!fileContent || fileContent.trim().length === 0) {
      console.error('File is empty');
      return new Response(JSON.stringify({
        error: 'Processing Error',
        message: 'File is empty'
      }), { status: 400, headers: corsHeaders });
    }
    
    // Parse CSV data
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });
    
    if (!records || records.length === 0) {
      console.log('No valid records found in CSV');
      return new Response(JSON.stringify({
        message: 'No valid records found in CSV'
      }), { status: 200, headers: corsHeaders });
    }
    
    console.log(`Parsed ${records.length} records from CSV`);
    
    // Prepare records for insertion with metadata and form_secret
    const timestamp = new Date().toISOString();
    const recordsToInsert = records.map(record => ({
      ...record,
      form_secret: formSecret,  // Add form_secret for RLS policy
      file_name: fileName,
      user_id: userId,
      file_path: filePath,
      bucket_id: bucketId,
      uploaded_at: timestamp,
      processed_at: timestamp
    }));
    
    // Insert records into database
    console.log(`Inserting ${recordsToInsert.length} records into api.csv_uploads`);
    const { error: insertError } = await supabase
      .from('api.csv_uploads')
      .insert(recordsToInsert);
    
    if (insertError) {
      console.error('Database insertion error:', insertError);
      return new Response(JSON.stringify({
        error: 'Database Error',
        message: insertError.message
      }), { status: 500, headers: corsHeaders });
    }
    
    console.log('CSV processing completed successfully');
    return new Response(JSON.stringify({
      success: true,
      message: 'File processed successfully',
      records_processed: records.length,
      file_name: fileName,
      user_id: userId
    }), { status: 200, headers: corsHeaders });
    
  } catch (error) {
    console.error('Unhandled error:', error);
    return new Response(JSON.stringify({
      error: 'Internal Server Error',
      message: error.message
    }), { status: 500, headers: corsHeaders });
  }
});
