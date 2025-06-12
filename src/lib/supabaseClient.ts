import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types based on your existing schema
export interface User {
  id: string;
  clerk_id?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  created_at?: string;
  updated_at?: string;
  // Add any other fields that exist in your users table
}

export interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: Partial<User>;
        Update: Partial<User>;
      };
      user_uploaded_csv: {
        Row: {
          id: number;
          user_id: string | null;
          file_name: string | null;
          file_data: ArrayBuffer | null;
          status: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: number;
          user_id?: string | null;
          file_name?: string | null;
          file_data?: ArrayBuffer | null;
          status?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: number;
          user_id?: string | null;
          file_name?: string | null;
          file_data?: ArrayBuffer | null;
          status?: string | null;
          created_at?: string | null;
        };
      };
    };
  };
}