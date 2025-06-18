import { useEffect, useState } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { supabase } from '../lib/supabase';

interface SyncStatus {
  status: 'idle' | 'syncing' | 'success' | 'error';
  error?: string;
}

export function useSyncClerkWithSupabase() {
  const { getToken, isSignedIn } = useAuth();
  const { user, isLoaded } = useUser();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ status: 'idle' });

  useEffect(() => {
    const syncUserData = async () => {
      if (!isSignedIn || !isLoaded || !user) {
        return;
      }

      try {
        setSyncStatus({ status: 'syncing' });

        // Get the Supabase token from Clerk
        const supabaseToken = await getToken({ template: 'supabase' });
        
        if (!supabaseToken) {
          throw new Error('Failed to get Supabase token from Clerk');
        }

        // Set the Supabase session with the Clerk JWT
        const { error: authError } = await supabase.auth.setSession({
          access_token: supabaseToken,
          refresh_token: '', // Clerk handles refresh
        });

        if (authError) {
          throw new Error(`Supabase auth error: ${authError.message}`);
        }

        // Prepare user data for upsert
        const userData = {
          clerk_id: user.id,
          email: user.primaryEmailAddress?.emailAddress || null,
          first_name: user.firstName || null,
          last_name: user.lastName || null,
        };

        // Upsert user data into Supabase
        const { error: upsertError } = await supabase
          .from('users')
          .upsert(userData, {
            onConflict: 'clerk_id',
            ignoreDuplicates: false
          });

        if (upsertError) {
          throw new Error(`Failed to sync user data: ${upsertError.message}`);
        }

        setSyncStatus({ status: 'success' });
      } catch (error) {
        console.error('Error syncing user data:', error);
        setSyncStatus({ 
          status: 'error', 
          error: error instanceof Error ? error.message : 'Unknown error occurred'
        });
      }
    };

    syncUserData();
  }, [isSignedIn, isLoaded, user, getToken]);

  return syncStatus;
}