import { observer } from 'mobx-react-lite';
import { useUser } from '@clerk/clerk-react';
import { useSyncClerkWithSupabase } from '../../hooks/useSyncClerkWithSupabase';
import { 
  UserIcon, 
  EnvelopeIcon, 
  CalendarIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

const UserProfile = observer(() => {
  const { user } = useUser();
  const { syncStatus, supabaseUser } = useSyncClerkWithSupabase();

  if (!user) return null;

  const getSyncStatusIcon = () => {
    switch (syncStatus) {
      case 'success':
        return <CheckCircleIcon className="h-5 w-5 text-green-600" />;
      case 'error':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />;
      case 'syncing':
        return <ArrowPathIcon className="h-5 w-5 text-blue-600 animate-spin" />;
      default:
        return null;
    }
  };

  const getSyncStatusText = () => {
    switch (syncStatus) {
      case 'success':
        return 'Synced with database';
      case 'error':
        return 'Sync failed - check console for details';
      case 'syncing':
        return 'Syncing...';
      default:
        return 'Not synced';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-medium text-gray-900">User Profile</h2>
        <div className="flex items-center space-x-2">
          {getSyncStatusIcon()}
          <span className={`text-sm ${
            syncStatus === 'success' ? 'text-green-600' :
            syncStatus === 'error' ? 'text-red-600' :
            syncStatus === 'syncing' ? 'text-blue-600' :
            'text-gray-500'
          }`}>
            {getSyncStatusText()}
          </span>
        </div>
      </div>

      <div className="flex items-center space-x-4 mb-6">
        <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
          {user.imageUrl ? (
            <img 
              src={user.imageUrl} 
              alt="Profile" 
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <UserIcon className="h-8 w-8 text-blue-600" />
          )}
        </div>
        <div>
          <h3 className="text-xl font-semibold text-gray-900">
            {user.firstName} {user.lastName}
          </h3>
          <p className="text-gray-600">{user.primaryEmailAddress?.emailAddress}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Clerk Data */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-900">Clerk Authentication</h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-center space-x-2">
              <UserIcon className="h-4 w-4 text-gray-400" />
              <span className="text-gray-600">ID: {user.id}</span>
            </div>
            <div className="flex items-center space-x-2">
              <EnvelopeIcon className="h-4 w-4 text-gray-400" />
              <span className="text-gray-600">{user.primaryEmailAddress?.emailAddress}</span>
            </div>
            <div className="flex items-center space-x-2">
              <CalendarIcon className="h-4 w-4 text-gray-400" />
              <span className="text-gray-600">
                Joined: {new Date(user.createdAt!).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        {/* Supabase Data */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-900">Database Record</h4>
          {supabaseUser ? (
            <div className="space-y-2 text-sm">
              <div className="flex items-center space-x-2">
                <UserIcon className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">DB ID: {supabaseUser.id}</span>
              </div>
              {supabaseUser.clerk_id && (
                <div className="flex items-center space-x-2">
                  <span className="text-gray-600">Clerk ID: {supabaseUser.clerk_id}</span>
                </div>
              )}
              {supabaseUser.created_at && (
                <div className="flex items-center space-x-2">
                  <CalendarIcon className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">
                    Created: {new Date(supabaseUser.created_at).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-gray-500">
              {syncStatus === 'error' ? 'Failed to load database record' : 'Loading...'}
            </div>
          )}
        </div>
      </div>

      {/* Debug Info (only show if there's an error) */}
      {syncStatus === 'error' && (
        <div className="mt-6 pt-6 border-t border-gray-100">
          <details className="text-sm">
            <summary className="cursor-pointer text-gray-700 font-medium">
              Debug Information
            </summary>
            <div className="mt-2 p-3 bg-red-50 rounded-lg">
              <p className="text-red-700">
                Sync failed. This might be because:
              </p>
              <ul className="mt-2 text-red-600 text-xs list-disc list-inside space-y-1">
                <li>The users table doesn't have a 'clerk_id' column</li>
                <li>Row Level Security (RLS) is preventing access</li>
                <li>The table structure is different than expected</li>
              </ul>
              <p className="mt-2 text-red-600 text-xs">
                Check the browser console for detailed error messages.
              </p>
            </div>
          </details>
        </div>
      )}
    </div>
  );
});

export default UserProfile;