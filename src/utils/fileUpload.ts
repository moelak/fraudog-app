import { supabase } from '../lib/supabase';

export const uploadFile = async (file: File, bucketName: string = 'user-file-upload') => {
  try {
    // Generate a unique file name
    const fileName = `${Date.now()}-${file.name}`;
    
    // Upload the file
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(fileName, file);

    if (error) {
      console.error('Error uploading file:', error);
      throw error;
    }

    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(fileName);

    return {
      success: true,
      path: data.path,
      publicUrl,
      fileName: file.name
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
