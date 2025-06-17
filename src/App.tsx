import { observer } from 'mobx-react-lite';
import { SignedIn, SignedOut } from '@clerk/clerk-react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './components/Dashboard/Dashboard';
import LandingPage from './components/LandingPage/LandingPage';
import AuthLayout from './components/AuthLayout/AuthLayout';
import { useSyncClerkWithSupabase } from './hooks/useSyncClerkWithSupabase';
import { useLinkClerkToSupabase } from './hooks/useLinkClerkToSupabase';

const App = observer(() => {
  // 1. Authenticate Supabase using Clerk JWT
  useLinkClerkToSupabase();

  // 2. Then sync user to Supabase `users` table
  useSyncClerkWithSupabase();

  return (
    <>
      <SignedIn>
        <AuthLayout>
          <Routes>
            <Route path="/dashboard/*" element={<Dashboard />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </AuthLayout>
      </SignedIn>
      
      <SignedOut>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </SignedOut>
    </>
  );
});

export default App;