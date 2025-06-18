import { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { supabase } from '../lib/supabase';

interface SupabaseUser {
  id: string;
  clerk_id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  created_at: string;
  updated_at: string;
}

export function useSupabaseUserSync() {
  const { user } = useUser();
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const syncUserToSupabase = async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      const userData = {
        clerk_id: user.id,
        email: user.primaryEmailAddress?.emailAddress || null,
        first_name: user.firstName || null,
        last_name: user.lastName || null,
      };

      const { data, error: upsertError } = await supabase
        .from('users')
        .upsert(userData, {
          onConflict: 'clerk_id',
          ignoreDuplicates: false
        })
        .select()
        .single();

      if (upsertError) {
        throw upsertError;
      }

      setSupabaseUser(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sync user';
      setError(errorMessage);
      console.error('Error syncing user to Supabase:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSupabaseUser = async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('clerk_id', user.id)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          // User not found, try to sync
          await syncUserToSupabase();
          return;
        }
        throw fetchError;
      }

      setSupabaseUser(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch user';
      setError(errorMessage);
      console.error('Error fetching user from Supabase:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchSupabaseUser();
    } else {
      setSupabaseUser(null);
      setError(null);
    }
  }, [user]);

  return {
    supabaseUser,
    isLoading,
    error,
    syncUserToSupabase,
    refetch: fetchSupabaseUser
  };
}