import { observer } from 'mobx-react-lite';
import { useUser } from '@clerk/clerk-react';
import { useSupabaseUserSync } from '../../hooks/useSupabaseUserSync';
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
  const { supabaseUser, isLoading, error, syncUserToSupabase } = useSupabaseUserSync();

  if (!user) return null;

  const getSyncStatusIcon = () => {
    if (isLoading) {
      return <ArrowPathIcon className="h-5 w-5 text-blue-600 animate-spin" />;
    }
    if (error) {
      return <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />;
    }
    if (supabaseUser) {
      return <CheckCircleIcon className="h-5 w-5 text-green-600" />;
    }
    return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />;
  };

  const getSyncStatusText = () => {
    if (isLoading) return 'Syncing...';
    if (error) return `Sync failed: ${error}`;
    if (supabaseUser) return 'Synced with database';
    return 'Not synced';
  };

  const handleManualSync = () => {
    syncUserToSupabase();
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-medium text-gray-900">User Profile</h2>
        <div className="flex items-center space-x-2">
          {getSyncStatusIcon()}
          <span className={`text-sm ${
            isLoading ? 'text-blue-600' :
            error ? 'text-red-600' :
            supabaseUser ? 'text-green-600' :
            'text-yellow-600'
          }`}>
            {getSyncStatusText()}
          </span>
          {error && (
            <button
              onClick={handleManualSync}
              className="ml-2 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Retry Sync
            </button>
          )}
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
              <div className="flex items-center space-x-2">
                <span className="text-gray-600">Clerk ID: {supabaseUser.clerk_id}</span>
              </div>
              <div className="flex items-center space-x-2">
                <EnvelopeIcon className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">{supabaseUser.email}</span>
              </div>
              <div className="flex items-center space-x-2">
                <CalendarIcon className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">
                  Created: {new Date(supabaseUser.created_at).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <CalendarIcon className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">
                  Updated: {new Date(supabaseUser.updated_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-500">
              {isLoading ? 'Loading...' : error ? 'Failed to load database record' : 'No database record found'}
            </div>
          )}
        </div>
      </div>

      {/* Debug Info (only show if there's an error) */}
      {error && (
        <div className="mt-6 pt-6 border-t border-gray-100">
          <details className="text-sm">
            <summary className="cursor-pointer text-gray-700 font-medium">
              Debug Information
            </summary>
            <div className="mt-2 p-3 bg-red-50 rounded-lg">
              <p className="text-red-700 font-medium">Error Details:</p>
              <p className="text-red-600 text-xs mt-1">{error}</p>
              <p className="text-red-700 mt-2">Possible causes:</p>
              <ul className="mt-1 text-red-600 text-xs list-disc list-inside space-y-1">
                <li>Row Level Security (RLS) policies are too restrictive</li>
                <li>Missing environment variables for Supabase</li>
                <li>Network connectivity issues</li>
                <li>Database table structure mismatch</li>
              </ul>
            </div>
          </details>
        </div>
      )}
    </div>
  );
});

export default UserProfile;