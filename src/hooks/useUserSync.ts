import { useEffect, useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { userService } from '../services/userService';

interface SyncState {
  isLoading: boolean;
  error: string | null;
  isSuccess: boolean;
}

export const useUserSync = () => {
  const { user, isLoaded } = useUser();
  const [syncState, setSyncState] = useState<SyncState>({
    isLoading: false,
    error: null,
    isSuccess: false,
  });

  useEffect(() => {
    const syncUserWithBackend = async () => {
      if (!user || !isLoaded || syncState.isSuccess) return;

      setSyncState(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        const token = await user.getToken();
        
        const payload = {
          clerkId: user.id,
          email: user.primaryEmailAddress?.emailAddress || '',
          firstName: user.firstName || undefined,
          lastName: user.lastName || undefined,
          imageUrl: user.imageUrl || undefined,
          username: user.username || undefined,
        };

        if (!payload.email) {
          throw new Error('User email not available');
        }

        await userService.syncUser(payload, token);
        
        setSyncState({
          isLoading: false,
          error: null,
          isSuccess: true,
        });

        console.log('User synced successfully with backend');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        setSyncState({
          isLoading: false,
          error: errorMessage,
          isSuccess: false,
        });
        console.error('Error syncing user with backend:', error);
      }
    };

    syncUserWithBackend();
  }, [user, isLoaded, syncState.isSuccess]);

  const retrySync = () => {
    setSyncState(prev => ({ ...prev, isSuccess: false }));
  };

  return {
    ...syncState,
    retrySync,
    user,
    isLoaded,
  };
};