import { observer } from 'mobx-react-lite';
import { SignedIn, SignedOut } from '@clerk/clerk-react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './components/Dashboard/Dashboard';
import LandingPage from './components/LandingPage/LandingPage';
import AuthLayout from './components/AuthLayout/AuthLayout';
import FileUploader from './components/FileUploader';

const App = observer(() => {
  return (
    <>
      <SignedIn>
        <AuthLayout>
          <Routes>
            <Route path="/dashboard" element={<Dashboard />}>
              <Route path="file-upload" element={<FileUploader />} />
              <Route index element={<Navigate to="file-upload" replace />} />
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