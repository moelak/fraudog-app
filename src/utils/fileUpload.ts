import { supabase } from '../lib/supabase';
import { createClient } from '@supabase/supabase-js';

// Get form_secret from environment variables
const getFormSecret = (): string => {
  // In browser environment, we need to use environment variables that are exposed to the client
  const formSecret = import.meta.env.VITE_FORM_SECRET || process.env.VITE_FORM_SECRET;
  if (!formSecret) {
    console.warn('FORM_SECRET not found in environment variables');
    return 'default_form_secret'; // Fallback value, should be replaced with actual secret
  }
  return formSecret;
};

// Create a Supabase client with service role key for admin operations

const getServiceClient = () => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

  console.log("meta.env.VITE_SUPABASE_URL", meta.env.VITE_SUPABASE_URL)
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.warn('Missing Supabase service role credentials');
    return null;
  }
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};

export const uploadFile = async (file: File, bucketName: string = 'user-file-upload') => {
  try {
    // Try to get user ID from localStorage as a fallback
    const getUserId = async (): Promise<string> => {
      // First try to get from localStorage
      const fraudfighterUser = localStorage.getItem('fraudfighter_user');
      if (fraudfighterUser) {
        try {
          const userData = JSON.parse(fraudfighterUser);
          if (userData?.id) return userData.id;
        } catch (e) {
          console.warn('Error parsing fraudfighter_user from localStorage', e);
        }
      }
      
      // If we can't get from localStorage, try to get from the current session
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) return session.user.id;
      
      throw new Error('User not authenticated. Please log in to upload files.');
    };
    
    const userId = await getUserId();
    
    // Generate a unique file name with user ID and timestamp
    const fileName = `uploads/${userId}/${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
    
    // Upload the file to storage bucket
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Error uploading file:', error);
      throw error;
    }

    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(fileName);
    
    // Validate that the file is a CSV
    if (!file.name.toLowerCase().endsWith('.csv')) {
      throw new Error('Only CSV files are supported. Please upload a file with .csv extension.');
    }
    
    // Read the file content to insert into the database
    const fileContent = await file.text();
    
    // Basic validation that the content looks like a CSV
    const lines = fileContent.split('\n').filter(line => line.trim());
    if (lines.length < 2) { // At least header + one data row
      throw new Error('The CSV file appears to be empty or invalid. Please check the file and try again.');
    }
    
    // Check if the first line has commas (basic CSV structure check)
    if (!lines[0].includes(',')) {
      throw new Error('The file does not appear to be a valid CSV. Please check the format and try again.');
    }
    
    // Generate a random client_id (integer)
    const clientId = Math.floor(Math.random() * 1000000).toString();
    
    console.log('Attempting to insert into api.csv_uploads table...');
    
    // Get a service role client for admin operations
    const serviceClient = getServiceClient();
    
    let dbInsertSuccess = false;
    let dbErrorMessage = '';
    
    if (!serviceClient) {
      console.error('Could not create service client - missing credentials');
      dbErrorMessage = 'Database credentials not available. Please check your environment configuration.';
      // Continue with file upload but track the error
    } else {
      // Insert into the api.csv_uploads table with explicit schema using service role
      const { error: insertError } = await serviceClient
        .schema('api')
        .from('csv_uploads')
        .insert({
          name: file.name,
          client_id: clientId,
          data: fileContent, // Insert the raw CSV content
          uploaded_at: new Date().toISOString(),
          form_secret: getFormSecret(), // Use the form_secret from environment variables
          user_id: userId || '1' // Keep as string since user_id is a varchar column
        });
      
      if (insertError) {
        console.error('Error inserting into api.csv_uploads:', insertError);
        dbErrorMessage = `Database error: ${insertError.message || 'Unknown error'}`;
        
        // Try up to 3 more times with exponential backoff
        let retryCount = 0;
        const maxRetries = 3;
        
        while (retryCount < maxRetries && !dbInsertSuccess) {
          retryCount++;
          const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff: 2s, 4s, 8s
          
          console.log(`Retrying database insertion (attempt ${retryCount}/${maxRetries}) after ${delay}ms delay...`);
          
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, delay));
          
          // Try insertion again
          const { error: retryError } = await serviceClient
            .schema('api')
            .from('csv_uploads')
            .insert({
              name: file.name,
              client_id: clientId,
              data: fileContent,
              uploaded_at: new Date().toISOString(),
              form_secret: getFormSecret(),
              user_id: userId || '1'
            });
          
          if (!retryError) {
            console.log(`Successfully inserted file data into api.csv_uploads on retry ${retryCount}`);
            dbInsertSuccess = true;
            dbErrorMessage = '';
            break;
          } else {
            console.error(`Retry ${retryCount} failed:`, retryError);
            dbErrorMessage = `Database error after ${retryCount} retries: ${retryError.message || 'Unknown error'}`;
          }
        }
      } else {
        console.log('Successfully inserted file data into api.csv_uploads');
        dbInsertSuccess = true;
      }
    }
    
    // Return success for the storage upload, but include database status
    return {
      success: true, // Storage upload succeeded
      path: data.path,
      publicUrl,
      fileName: file.name,
      userId,
      dbInsertSuccess, // Whether database insertion succeeded
      dbErrorMessage // Error message if database insertion failed
    };
  } catch (error) {
    console.error('Error in uploadFile:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

export const deleteFile = async (filePath: string, bucketName: string = 'user-file-upload') => {
  try {
    const { error } = await supabase.storage
      .from(bucketName)
      .remove([filePath]);

    if (error) {
      console.error('Error deleting file:', error);
      throw error;
    }

    return { success: true };
  } catch (error) {
    console.error('Error in deleteFile:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};
