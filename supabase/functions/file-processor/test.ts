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
} catch (e) {
  console.log('No .env file found or error loading it, using existing environment variables');
}

async function testFileProcessor() {
  console.log('Starting file processor test');
  
  try {
    // Initialize Supabase client with service role key for admin privileges
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    // Path to test CSV file - update this with your test file path
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
    
    // Extract client ID from filename or use a default
    const clientId = 'test-client';
    
    // Check if form_secret environment variable is set
    const formSecret = Deno.env.get('FORM_SECRET');
    if (!formSecret) {
      console.warn('Warning: FORM_SECRET environment variable is not set');
      console.warn('The RLS policy requires this value for successful insertion');
    }
    
    console.log(`Using form_secret: ${formSecret ? '✓ (set)' : '✗ (not set)'}`);
    
    // Insert record into csv_uploads table
    console.log('Inserting data into api.csv_uploads table...');
    const { data: insertData, error: insertError } = await supabaseClient
      .schema('api')
      .from('csv_uploads')
      .insert({
        name: fileName,
        client_id: clientId,
        data: parsedData,
        file_id: `test-${Date.now()}`,
        form_secret: formSecret // Include the form secret for RLS policy
      });
      
    if (insertError) {
      throw new Error(`Failed to insert CSV data: ${insertError.message}`);
    }
    
    console.log('✅ Successfully inserted data into api.csv_uploads');
    console.log('This should trigger the bright-responder function');
    
  } catch (error) {
    console.error('❌ Error in test:', error);
    console.error('Error stack:', error.stack);
  }
}

// Run the test
await testFileProcessor();
