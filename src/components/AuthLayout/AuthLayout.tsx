import { observer } from 'mobx-react-lite';
import { useUser } from '@clerk/clerk-react';
import { authLayoutStore } from './AuthLayoutStore';
import { useSyncClerkWithSupabase } from '../../hooks/useSyncClerkWithSupabase';

interface AuthLayoutProps {
  children: React.ReactNode;
}

const AuthLayout = observer(({ children }: AuthLayoutProps) => {
  const { user, isLoaded } = useUser();
  const { syncStatus } = useSyncClerkWithSupabase();

  // Update store with user data
  if (isLoaded && user && !authLayoutStore.isUserSynced) {
    authLayoutStore.setUser({
      id: user.id,
      email: user.primaryEmailAddress?.emailAddress || '',
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      imageUrl: user.imageUrl || '',
      username: user.username || '',
    });
    authLayoutStore.setUserSynced(true);
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show sync status if there's an error
  if (syncStatus === 'error') {
    console.warn('Failed to sync user data with Supabase');
  }

  return <>{children}</>;
});

export default AuthLayout;