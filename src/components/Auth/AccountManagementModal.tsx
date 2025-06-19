import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import {
  XMarkIcon,
  UserIcon,
  EnvelopeIcon,
  CalendarIcon,
  ComputerDesktopIcon,
  DevicePhoneMobileIcon,
  GlobeAltIcon,
} from '@heroicons/react/24/outline';

interface AccountManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SecurityActivity {
  id: string;
  device_info: string;
  browser: string;
  os: string;
  ip_address: string;
  created_at: string;
  last_sign_in_at: string;
  is_current: boolean;
}

const AccountManagementModal = ({ isOpen, onClose }: AccountManagementModalProps) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');
  const [securityActivity, setSecurityActivity] = useState<SecurityActivity[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && activeTab === 'security') {
      fetchSecurityActivity();
    }
  }, [isOpen, activeTab]);

  const fetchSecurityActivity = async () => {
    setLoading(true);
    try {
      // In a real implementation, you would fetch this from your backend
      // For now, we'll simulate security activity data
      const mockSecurityActivity: SecurityActivity[] = [
        {
          id: '1',
          device_info: 'Chrome on macOS',
          browser: 'Chrome 120.0.0.0',
          os: 'macOS 14.2',
          ip_address: '192.168.1.100',
          created_at: user?.created_at || new Date().toISOString(),
          last_sign_in_at: new Date().toISOString(),
          is_current: true,
        },
        {
          id: '2',
          device_info: 'Safari on iPhone',
          browser: 'Safari 17.2',
          os: 'iOS 17.2',
          ip_address: '192.168.1.101',
          created_at: user?.created_at || new Date().toISOString(),
          last_sign_in_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
          is_current: false,
        },
        {
          id: '3',
          device_info: 'Firefox on Windows',
          browser: 'Firefox 121.0',
          os: 'Windows 11',
          ip_address: '10.0.0.50',
          created_at: user?.created_at || new Date().toISOString(),
          last_sign_in_at: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
          is_current: false,
        },
      ];

      setSecurityActivity(mockSecurityActivity);
    } catch (error) {
      console.error('Error fetching security activity:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDeviceIcon = (deviceInfo: string) => {
    if (deviceInfo.toLowerCase().includes('iphone') || deviceInfo.toLowerCase().includes('android')) {
      return DevicePhoneMobileIcon;
    }
    return ComputerDesktopIcon;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!isOpen || !user) return null;

  const displayName = user.user_metadata?.first_name && user.user_metadata?.last_name
    ? `${user.user_metadata.first_name} ${user.user_metadata.last_name}`
    : user.email?.split('@')[0] || 'User';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          {/* Header */}
          <div className="bg-white px-6 pt-6 pb-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Account Management</h2>
              <button
                type="button"
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'profile'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Profile
                </button>
                <button
                  onClick={() => setActiveTab('security')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'security'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Security
                </button>
              </nav>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 pb-6 max-h-96 overflow-y-auto">
            {activeTab === 'profile' ? (
              <div className="space-y-6">
                {/* Profile Header */}
                <div className="flex items-center space-x-4">
                  <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
                    <UserIcon className="h-8 w-8 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">{displayName}</h3>
                    <p className="text-gray-600">{user.email}</p>
                  </div>
                </div>

                {/* Profile Details */}
                <div className="grid grid-cols-1 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Account Information</h4>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <UserIcon className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-700">Full Name</p>
                          <p className="text-sm text-gray-600">{displayName}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-700">Email Address</p>
                          <p className="text-sm text-gray-600">{user.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <CalendarIcon className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-700">Member Since</p>
                          <p className="text-sm text-gray-600">
                            {formatDate(user.created_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Security Activity</h4>
                  <p className="text-sm text-gray-600 mb-6">
                    Monitor your account's security activity and active devices.
                  </p>
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-gray-600">Loading security activity...</span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {securityActivity.map((activity) => {
                      const DeviceIcon = getDeviceIcon(activity.device_info);
                      
                      return (
                        <div
                          key={activity.id}
                          className={`border rounded-lg p-4 ${
                            activity.is_current ? 'border-blue-200 bg-blue-50' : 'border-gray-200'
                          }`}
                        >
                          <div className="flex items-start space-x-4">
                            <div className={`p-2 rounded-lg ${
                              activity.is_current ? 'bg-blue-100' : 'bg-gray-100'
                            }`}>
                              <DeviceIcon className={`h-5 w-5 ${
                                activity.is_current ? 'text-blue-600' : 'text-gray-600'
                              }`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <h5 className="text-sm font-medium text-gray-900">
                                  {activity.device_info}
                                  {activity.is_current && (
                                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                      Current Session
                                    </span>
                                  )}
                                </h5>
                              </div>
                              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-600">
                                <div>
                                  <span className="font-medium">Browser:</span> {activity.browser}
                                </div>
                                <div>
                                  <span className="font-medium">OS:</span> {activity.os}
                                </div>
                                <div className="flex items-center">
                                  <GlobeAltIcon className="h-3 w-3 mr-1" />
                                  <span className="font-medium">IP:</span> {activity.ip_address}
                                </div>
                                <div className="flex items-center">
                                  <CalendarIcon className="h-3 w-3 mr-1" />
                                  <span className="font-medium">Last Sign In:</span> {formatDate(activity.last_sign_in_at)}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountManagementModal;