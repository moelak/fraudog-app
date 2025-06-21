import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
console.log("supabaseUrl", supabaseUrl)
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Enable session persistence for better reliability
    persistSession: true,
    // Enable auto refresh to handle token expiration
    autoRefreshToken: true,
    // Detect session in URL for OAuth flows
    detectSessionInUrl: true,
  }
});

// Database types
export interface User {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
  // Add any additional user profile fields here
  first_name?: string;
  last_name?: string;
}

export interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: Omit<User, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<User, 'id' | 'created_at'>> & {
          updated_at?: string;
        };
      };
    };
  };
}