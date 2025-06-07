import { useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';

interface CreateUserPayload {
  clerkId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  imageUrl?: string;
  username?: string;
}

export const useAuthSync = () => {
  const { user, isLoaded } = useUser();

  useEffect(() => {
    const syncUserWithBackend = async () => {
      if (!user || !isLoaded) return;

      try {
        const payload: CreateUserPayload = {
          clerkId: user.id,
          email: user.primaryEmailAddress?.emailAddress || '',
          firstName: user.firstName || undefined,
          lastName: user.lastName || undefined,
          imageUrl: user.imageUrl || undefined,
          username: user.username || undefined,
        };

        // Only sync if we have essential data
        if (!payload.email) {
          console.warn('User email not available, skipping backend sync');
          return;
        }

        const response = await fetch('/api/users/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await user.getToken()}`,
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error(`Failed to sync user: ${response.statusText}`);
        }

        const result = await response.json();
        console.log('User synced successfully:', result);
      } catch (error) {
        console.error('Error syncing user with backend:', error);
        // You might want to show a toast notification here
      }
    };

    syncUserWithBackend();
  }, [user, isLoaded]);

  return { user, isLoaded };
};