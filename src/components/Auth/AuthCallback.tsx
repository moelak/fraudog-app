// src/pages/AuthCallback.tsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const access_token = hashParams.get('access_token');
    const refresh_token = hashParams.get('refresh_token');

    if (access_token && refresh_token) {
      supabase.auth.setSession({ access_token, refresh_token }).then(({ error }) => {
        if (error) console.error('Error setting session:', error);
        window.history.replaceState({}, document.title, '/dashboard');
        navigate('/dashboard');
      });
    } else {
      navigate('/');
    }
  }, [navigate]);

  return (
    <div className="h-screen flex items-center justify-center text-gray-600 text-lg">
      Authenticating...
    </div>
  );
};

export default AuthCallback;
