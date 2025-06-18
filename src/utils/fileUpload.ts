import { supabase } from '../lib/supabase';

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
    
    // Upload the file
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

    return {
      success: true,
      path: data.path,
      publicUrl,
      fileName: file.name,
      userId
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
