import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { parse } from 'https://deno.land/std/csv/parse.ts';
import * as path from 'https://deno.land/std/path/mod.ts';

// Load environment variables from .env file if it exists
try {
  const env = await Deno.readTextFile('./.env');
  env.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      Deno.env.set(key.trim(), value.trim());
    }
  });
  console.log('Loaded environment variables from .env file');
} catch (_) {
  console.log('No .env file found or error loading it, using existing environment variables');
}

// This script simulates a storage webhook event
async function simulateStorageWebhook() {
  console.log('Simulating storage webhook event');
  
  try {
    // Initialize Supabase client with service role key for admin privileges
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    if (!Deno.env.get('SUPABASE_URL') || !Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env file');
    }
    
    // Path to test CSV file
    const testFilePath = './test-data.csv';
    
    // Read the test file
    const fileContent = await Deno.readTextFile(testFilePath);
    console.log(`Test file content preview: ${fileContent.substring(0, 200)}...`);
    
    // Parse CSV data
    const parsedData = parse(fileContent, {
      skipFirstRow: true, // Skip header row
      columns: true // Use first row as column names
    });
    
    console.log(`Parsed ${parsedData.length} rows from CSV`);
    console.log('Sample data:', parsedData.slice(0, 2));
    
    // Extract filename from path
    const fileName = path.basename(testFilePath);
    const clientId = 'test-client';
    
    // Check if form_secret environment variable is set
    const formSecret = Deno.env.get('FORM_SECRET');
    if (!formSecret) {
      console.warn('Warning: FORM_SECRET environment variable is not set');
      console.warn('The RLS policy requires this value for successful insertion');
    }
    
    console.log(`Using form_secret: ${formSecret ? '✓ (set)' : '✗ (not set)'}`);
    
    // Create a simulated storage webhook payload
    const simulatedPayload = {
      type: 'INSERT',
      table: 'objects',
      schema: 'storage',
      record: {
        id: `test-${Date.now()}`,
        bucket_id: 'user-file-upload',
        name: fileName,
        owner: 'test-owner',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_accessed_at: new Date().toISOString(),
        metadata: {}
      },
      old_record: null
    };
    
    console.log('Simulated webhook payload:', JSON.stringify(simulatedPayload, null, 2));
    
    // Call our file-processor function directly with the simulated payload
    const processFile = async () => {
      try {
        // Download would happen in the real function, but here we already have the file content
        console.log('Processing file...');
        
        // Insert record into csv_uploads table
        console.log('Inserting data into api.csv_uploads table...');
        const { error: insertError } = await supabaseClient
          .schema('api')
          .from('csv_uploads')
          .insert({
            name: fileName,
            client_id: clientId,
            data: parsedData,
            file_id: simulatedPayload.record.id,
            form_secret: formSecret // Include the form secret for RLS policy
          });
          
        if (insertError) {
          throw new Error(`Failed to insert CSV data: ${insertError.message}`);
        }
        
        console.log('✅ Successfully inserted data into api.csv_uploads');
        console.log('This should trigger the bright-responder function');
        
      } catch (error) {
        console.error('❌ Error processing file:', error);
        console.error('Error stack:', error.stack);
      }
    };
    
    await processFile();
    
  } catch (error) {
    console.error('❌ Error in simulation:', error);
    console.error('Error stack:', error.stack);
  }
}

// Run the simulation
await simulateStorageWebhook();
