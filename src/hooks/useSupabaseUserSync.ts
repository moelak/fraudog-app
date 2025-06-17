import { useEffect, useState } from 'react';
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
  const { user, isLoaded, isSignedIn } = useUser();
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const syncUserToSupabase = async () => {
    if (!user || !isSignedIn) return;

    setIsLoading(true);
    setError(null);

    try {
      const userData = {
        clerk_id: user.id,
        email: user.primaryEmailAddress?.emailAddress || null,
        first_name: user.firstName || null,
        last_name: user.lastName || null,
      };

      // First, try to insert or update the user
      const { data, error: upsertError } = await supabase
        .from('users')
        .upsert(userData, {
          onConflict: 'clerk_id',
          ignoreDuplicates: false
        })
        .select()
        .single();

      if (upsertError) {
        console.error('Error upserting user:', upsertError);
        setError(upsertError.message);
        return;
      }

      setSupabaseUser(data);
      console.log('User synced successfully:', data);

    } catch (err) {
      console.error('Sync error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserFromSupabase = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('clerk_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error fetching user:', error);
        setError(error.message);
        return;
      }

      if (data) {
        setSupabaseUser(data);
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  useEffect(() => {
    if (isLoaded && isSignedIn && user) {
      // First fetch existing user, then sync if needed
      fetchUserFromSupabase().then(() => {
        syncUserToSupabase();
      });
    } else if (isLoaded && !isSignedIn) {
      // Clear user data when signed out
      setSupabaseUser(null);
      setError(null);
    }
  }, [isLoaded, isSignedIn, user?.id]);

  return {
    supabaseUser,
    isLoading,
    error,
    syncUserToSupabase,
    fetchUserFromSupabase
  };
}