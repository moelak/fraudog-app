import { observer } from 'mobx-react-lite';
import { SignedIn, SignedOut } from '@clerk/clerk-react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './components/Dashboard/Dashboard';
import LandingPage from './components/LandingPage/LandingPage';
import AuthLayout from './components/AuthLayout/AuthLayout';
import { useSyncClerkWithSupabase } from './hooks/useSyncClerkWithSupabase';

// Import all dashboard components
import Overview from './components/Overview/Overview';
import RuleManagement from './components/RuleManagement/RuleManagement';
import Visualization from './components/Visualization/Visualization';
import Monitoring from './components/Monitoring/Monitoring';
import Chargebacks from './components/Chargebacks/Chargebacks';
import Reports from './components/Reports/Reports';
import ChatAssistant from './components/ChatAssistant/ChatAssistant';
import Settings from './components/Settings/Settings';

const App = observer(() => {
  // Initialize the sync hook at the app level
  useSyncClerkWithSupabase();

  return (
    <>
      <SignedIn>
        <AuthLayout>
          <Routes>
            <Route path="/dashboard" element={<Dashboard />}>
              {/* Nested routes for Dashboard */}
              <Route index element={<Overview />} />
              <Route path="rules" element={<RuleManagement />} />
              <Route path="visualization" element={<Visualization />} />
              <Route path="monitoring" element={<Monitoring />} />
              <Route path="chargebacks" element={<Chargebacks />} />
              <Route path="reports" element={<Reports />} />
              <Route path="assistant" element={<ChatAssistant />} />
              <Route path="settings" element={<Settings />} />
            </Route>
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