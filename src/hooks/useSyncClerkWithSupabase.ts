import { useEffect, useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { supabase } from '../lib/supabase';

type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

interface SupabaseUser {
  id: string;
  clerk_id?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  created_at?: string;
}

export function useSyncClerkWithSupabase() {
  const { isSignedIn, user, isLoaded } = useUser();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const syncUser = async () => {
      if (!isLoaded || !isSignedIn || !user) {
        setSyncStatus('idle');
        setSupabaseUser(null);
        return;
      }

      try {
        setIsLoading(true);
        setSyncStatus('syncing');

        const userData = {
          clerk_id: user.id,
          email: user.primaryEmailAddress?.emailAddress,
          first_name: user.firstName,
          last_name: user.lastName,
        };

        const { error } = await supabase
          .from('users')
          .upsert(userData, { 
            onConflict: 'clerk_id',
            ignoreDuplicates: false 
          });

        if (error) {
          console.error('Supabase sync error:', error);
          setSyncStatus('error');
        } else {
          console.log('User synced successfully');
          setSyncStatus('success');
          
          // Fetch the synced user data
          const { data: fetchedUser, error: fetchError } = await supabase
            .from('users')
            .select('*')
            .eq('clerk_id', user.id)
            .single();

          if (!fetchError && fetchedUser) {
            setSupabaseUser(fetchedUser);
          }
        }
      } catch (error) {
        console.error('Sync failed:', error);
        setSyncStatus('error');
      } finally {
        setIsLoading(false);
      }
    };

    syncUser();
  }, [isLoaded, isSignedIn, user]);

  return {
    syncStatus,
    supabaseUser,
    isLoading
  };
}