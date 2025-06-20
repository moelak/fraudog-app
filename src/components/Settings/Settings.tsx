import { observer } from 'mobx-react-lite';
import { settingsStore } from './SettingsStore';
import { useAuth } from '../../hooks/useAuth';
import { 
  UserIcon, 
  EnvelopeIcon, 
  CalendarIcon,
} from '@heroicons/react/24/outline';

const Settings = observer(() => {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="mt-2 text-gray-600">Manage your account and application preferences</p>
      </div>

      {/* User Profile Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-6">User Profile</h2>
        
        <div className="flex items-center space-x-4 mb-6">
          <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
            <UserIcon className="h-8 w-8 text-blue-600" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900">
              {user?.user_metadata?.first_name} {user?.user_metadata?.last_name}
            </h3>
            <p className="text-gray-600">{user?.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-900">Account Information</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center space-x-2">
                <UserIcon className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">ID: {user?.id}</span>
              </div>
              <div className="flex items-center space-x-2">
                <EnvelopeIcon className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">{user?.email}</span>
              </div>
              <div className="flex items-center space-x-2">
                <CalendarIcon className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">
                  Joined: {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Application Settings */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Application Settings</h2>
        
        <div className="space-y-6">
          {/* Notification Settings */}
          <div className="border-b pb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Notifications</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Email Alerts</label>
                  <p className="text-sm text-gray-500">Receive email notifications for high-risk alerts</p>
                </div>
                <button
                  onClick={() => settingsStore.toggleSetting('emailAlerts')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settingsStore.settings.emailAlerts ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settingsStore.settings.emailAlerts ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">SMS Notifications</label>
                  <p className="text-sm text-gray-500">Receive SMS for critical fraud alerts</p>
                </div>
                <button
                  onClick={() => settingsStore.toggleSetting('smsNotifications')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settingsStore.settings.smsNotifications ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settingsStore.settings.smsNotifications ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Security Settings */}
          <div className="border-b pb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Security</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Two-Factor Authentication</label>
                  <p className="text-sm text-gray-500">Add an extra layer of security to your account</p>
                </div>
                <button
                  onClick={() => settingsStore.toggleSetting('twoFactorAuth')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settingsStore.settings.twoFactorAuth ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settingsStore.settings.twoFactorAuth ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Alert Threshold */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Alert Threshold</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Risk Score Threshold: {settingsStore.settings.alertThreshold}
                </label>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={settingsStore.settings.alertThreshold}
                  onChange={(e) => settingsStore.updateAlertThreshold(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Low (1)</span>
                  <span>High (100)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="pt-6">
            <button
              onClick={settingsStore.saveSettings}
              disabled={settingsStore.isSaving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {settingsStore.isSaving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

export default Settings;