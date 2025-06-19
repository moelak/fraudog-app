import { useState, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import {
  ChartBarIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
  HomeIcon,
  ShieldCheckIcon,
  EyeIcon,
  BellIcon,
  CreditCardIcon,
  ChatBubbleLeftRightIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';
import Overview from '../Overview/Overview';
import Reports from '../Reports/Reports';
import Settings from '../Settings/Settings';
import RuleManagement from '../RuleManagement/RuleManagement';
import Visualization from '../Visualization/Visualization';
import Monitoring from '../Monitoring/Monitoring';
import Chargebacks from '../Chargebacks/Chargebacks';
import ChatAssistant from '../ChatAssistant/ChatAssistant';
import UserManagement from '../UserManagement/UserManagement';
import AIChat from '../AIChat/AIChat';
import AIChatButton from '../AIChat/AIChatButton';
import AccountMenu from '../Auth/AccountMenu';
import AccountManagementModal from '../Auth/AccountManagementModal';
import { dashboardStore } from './DashboardStore';
import { supabase } from '../../lib/supabase'; 


const Dashboard = observer(() => {
  const location = useLocation();
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);

useEffect(() => {
  const hashParams = new URLSearchParams(window.location.hash.slice(1));
  const access_token = hashParams.get('access_token');
  const refresh_token = hashParams.get('refresh_token');

  if (access_token && refresh_token) {
    supabase.auth
      .setSession({ access_token, refresh_token })
      .then(({ error }) => {
        if (error) {
          console.error('Failed to set session from URL:', error);
        }
        // Always clean the URL after processing
        window.history.replaceState({}, document.title, window.location.pathname);
      });
  } else if (window.location.hash) {
    // Even if no tokens, remove hash for clean UX
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}, []);


  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
    { name: 'Rule Management', href: '/dashboard/rules', icon: ShieldCheckIcon },
    { name: 'Visualization', href: '/dashboard/visualization', icon: ChartBarIcon },
    { name: 'Monitoring', href: '/dashboard/monitoring', icon: EyeIcon },
    { name: 'Chargebacks', href: '/dashboard/chargebacks', icon: CreditCardIcon },
    { name: 'Reports', href: '/dashboard/reports', icon: DocumentTextIcon },
    { name: 'Chat Assistant', href: '/dashboard/assistant', icon: ChatBubbleLeftRightIcon },
    { name: 'User Management', href: '/dashboard/users', icon: UsersIcon },
    { name: 'Settings', href: '/dashboard/settings', icon: Cog6ToothIcon },
  ];

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-40 w-64 bg-white shadow-lg transform ${dashboardStore.isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0`}>
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center justify-between px-4 bg-gradient-to-r from-blue-600 to-blue-700">
            <span className="text-2xl font-bold text-white">Fraud-dog</span>
            <button
              className="lg:hidden text-white"
              onClick={dashboardStore.closeSidebar}
            >
              <span className="sr-only">Close sidebar</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <nav className="flex-1 space-y-1 px-2 py-4">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`${
                    isActive
                      ? 'bg-blue-50 text-blue-700 shadow-sm'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  } group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition duration-150 ease-in-out`}
                >
                  <item.icon
                    className={`${
                      isActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                    } mr-3 flex-shrink-0 h-5 w-5`}
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
            {/* Left side - Mobile menu button */}
            <button
              className="text-gray-500 lg:hidden"
              onClick={dashboardStore.openSidebar}
            >
              <span className="sr-only">Open sidebar</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>
            
            {/* Right side - Notifications and Account Menu */}
            <div className="flex items-center gap-4 ml-auto">
              {/* Notification Bell */}
              <div className="relative">
                <button
                  onClick={dashboardStore.toggleNotifications}
                  className="relative p-2 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-full transition-colors"
                >
                  <span className="sr-only">View notifications</span>
                  <BellIcon className="h-6 w-6" />
                  {dashboardStore.unreadNotifications > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs font-medium rounded-full flex items-center justify-center">
                      {dashboardStore.unreadNotifications > 9 ? '9+' : dashboardStore.unreadNotifications}
                    </span>
                  )}
                </button>
                
                {/* Notification Dropdown */}
                {dashboardStore.showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                    <div className="p-4 border-b border-gray-100">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium text-gray-900">Notifications</h3>
                        {dashboardStore.unreadNotifications > 0 && (
                          <button
                            onClick={dashboardStore.markAllAsRead}
                            className="text-sm text-blue-600 hover:text-blue-800"
                          >
                            Mark all as read
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {dashboardStore.notifications.length === 0 ? (
                        <div className="p-4 text-center text-gray-500">
                          No notifications
                        </div>
                      ) : (
                        dashboardStore.notifications.map((notification) => (
                          <div
                            key={notification.id}
                            className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                              !notification.read ? 'bg-blue-50' : ''
                            }`}
                            onClick={() => dashboardStore.markAsRead(notification.id)}
                          >
                            <div className="flex items-start">
                              <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-2 ${
                                !notification.read ? 'bg-blue-500' : 'bg-gray-300'
                              }`} />
                              <div className="ml-3 flex-1">
                                <p className="text-sm font-medium text-gray-900">
                                  {notification.title}
                                </p>
                                <p className="text-sm text-gray-500 mt-1">
                                  {notification.message}
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                  {notification.timestamp}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Account Menu */}
              <AccountMenu onManageAccount={() => setIsAccountModalOpen(true)} />
            </div>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto bg-transparent">
          <div className="py-6">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <Routes>
                <Route path="/" element={<Overview />} />
                <Route path="/rules" element={<RuleManagement />} />
                <Route path="/visualization" element={<Visualization />} />
                <Route path="/monitoring" element={<Monitoring />} />
                <Route path="/chargebacks" element={<Chargebacks />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/assistant" element={<ChatAssistant />} />
                <Route path="/users" element={<UserManagement />} />
                <Route path="/settings" element={<Settings />} />
              </Routes>
            </div>
          </div>
        </main>
      </div>
      
      {/* Overlay for mobile sidebar */}
      {dashboardStore.isSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black bg-opacity-50 lg:hidden"
          onClick={dashboardStore.closeSidebar}
        />
      )}

      {/* AI Chat Components */}
      <AIChatButton />
      <AIChat />

      {/* Account Management Modal */}
      <AccountManagementModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
      />
    </div>
  );
});

export default Dashboard;