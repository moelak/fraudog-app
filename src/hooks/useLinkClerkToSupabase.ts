import { useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { supabase } from '../lib/supabase';

export function useLinkClerkToSupabase() {
  const { getToken, isSignedIn } = useAuth();

  useEffect(() => {
    const linkSession = async () => {
      if (!isSignedIn) {
                console.log("🔌 Clerk user not signed in — clearing Supabase session");

        // Clear Supabase session if user is not signed in to Clerk
        await supabase.auth.signOut();
        return;
      }

      try {
        // Get the JWT token from Clerk with the Supabase template
        const token = await getToken({ template: 'supabase' });
 console.log("token=>", token);
        if (token) {
  const payload = JSON.parse(atob(token.split('.')[1]));
  console.log("🧾 Decoded JWT payload:", payload);
}
        if (token) {
          // Set the session in Supabase using Clerk's token
          const { data, error } = await supabase.auth.setSession({
            access_token: token,
            refresh_token: token, // Clerk doesn't provide a separate refresh token
          });

          if (error) {
            console.error('Failed to set Supabase session:', error);
          } else {
            console.log('Successfully linked Clerk session to Supabase:', data);
          }
        } else {
          console.warn('No Clerk token available - make sure JWT template is configured');
        }
      } catch (error) {
        console.error('Error linking Clerk to Supabase:', error);
      }
    };

    linkSession();
  }, [getToken, isSignedIn]);

  // Return a function to manually refresh the session if needed
  const refreshSession = async () => {
    if (isSignedIn) {
      const token = await getToken({ template: 'supabase' });
      if (token) {
        await supabase.auth.setSession({
          access_token: token,
          refresh_token: token,
        });
      }
    }
  };

  return { refreshSession };
}