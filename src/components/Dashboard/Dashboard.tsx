import { observer } from 'mobx-react-lite';
import { UserButton } from '@clerk/clerk-react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import {
  ChartBarIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
  HomeIcon,
} from '@heroicons/react/24/outline';
import Overview from '../Overview/Overview';
import Reports from '../Reports/Reports';
import Settings from '../Settings/Settings';
import { dashboardStore } from './DashboardStore';
import { authLayoutStore } from '../AuthLayout/AuthLayoutStore';
import { useUserSync } from '../../hooks/useUserSync';

const Dashboard = observer(() => {
  const location = useLocation();
  const { error: syncError, retrySync } = useUserSync();

  const navigation = [
    { name: 'Overview', href: '/dashboard', icon: HomeIcon },
    { name: 'Reports', href: '/dashboard/reports', icon: DocumentTextIcon },
    { name: 'Analytics', href: '/dashboard/analytics', icon: ChartBarIcon },
    { name: 'Settings', href: '/dashboard/settings', icon: Cog6ToothIcon },
  ];

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
      {/* Sync Error Banner */}
      {syncError && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-red-50 border-b border-red-200 p-3">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800">
                  Failed to sync user data: {syncError}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={retrySync}
                className="text-sm text-red-800 hover:text-red-900 underline"
              >
                Retry
              </button>
              <button className="text-red-400 hover:text-red-500">
                <span className="sr-only">Dismiss</span>
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-40 w-64 bg-white shadow-lg transform ${dashboardStore.isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${syncError ? 'mt-16' : ''}`}>
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center justify-between px-4 bg-gradient-to-r from-blue-600 to-blue-700">
            <span className="text-2xl font-bold text-white">Frud-dog</span>
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
          <div className="flex items-center justify-between p-4 border-t bg-gray-50">
            <UserButton afterSignOutUrl="/" />
            <span className="text-sm text-gray-500">v1.0.0</span>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className={`sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm ${syncError ? 'mt-16' : ''}`}>
          <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
            <button
              className="text-gray-500 lg:hidden"
              onClick={dashboardStore.openSidebar}
            >
              <span className="sr-only">Open sidebar</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>
            <div className="flex items-center gap-4">
              <div className="text-sm">
                <span className="text-gray-500">Welcome back, </span>
                <span className="font-medium text-gray-900">
                  {authLayoutStore.displayName || 'Fraud Fighter!'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto bg-transparent">
          <div className="py-6">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <Routes>
                <Route path="/" element={<Overview />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/settings" element={<Settings />} />
              </Routes>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
});

export default Dashboard;