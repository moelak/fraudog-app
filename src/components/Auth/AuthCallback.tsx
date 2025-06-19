import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const processOAuthCallback = async () => {
      const hashParams = new URLSearchParams(window.location.hash.slice(1));
      const access_token = hashParams.get('access_token');
      const refresh_token = hashParams.get('refresh_token');

      if (access_token && refresh_token) {
        const { error } = await supabase.auth.setSession({ access_token, refresh_token });

        if (error) {
          console.error('Failed to set Supabase session from callback:', error.message);
        }
      }

      // ✅ Clear the hash and redirect
      window.history.replaceState({}, '', '/dashboard');
      navigate('/dashboard', { replace: true });
    };

    processOAuthCallback();
  }, [navigate]);

  return null;
};

export default AuthCallback;
