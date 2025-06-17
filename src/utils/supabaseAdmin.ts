import { createClient } from '@supabase/supabase-js';

// This is for server-side operations that need elevated privileges
// Only use this in secure environments (server-side, edge functions, etc.)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error('Missing VITE_SUPABASE_URL environment variable');
}

if (!supabaseServiceKey) {
  console.warn('Missing VITE_SUPABASE_SERVICE_ROLE_KEY - admin operations will not work');
}

export const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

// Helper function to create a user with admin privileges
export async function createUserWithAdmin(userData: {
  clerk_id: string;
  email?: string;
  first_name?: string;
  last_name?: string;
}) {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client not available');
  }

  const { data, error } = await supabaseAdmin
    .from('users')
    .upsert(userData, {
      onConflict: 'clerk_id',
      ignoreDuplicates: false
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

// Helper function to get all users (admin only)
export async function getAllUsers() {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client not available');
  }

  const { data, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data;
}

// Helper function to delete a user (admin only)
export async function deleteUser(userId: string) {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client not available');
  }

  const { error } = await supabaseAdmin
    .from('users')
    .delete()
    .eq('id', userId);

  if (error) {
    throw error;
  }

  return true;
}