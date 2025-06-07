import { observer } from 'mobx-react-lite';
import { useAuthSync } from '../../hooks/useAuthSync';
import { authLayoutStore } from './AuthLayoutStore';

interface AuthLayoutProps {
  children: React.ReactNode;
}

const AuthLayout = observer(({ children }: AuthLayoutProps) => {
  const { user, isLoaded } = useAuthSync();

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

  return <>{children}</>;
});

export default AuthLayout;