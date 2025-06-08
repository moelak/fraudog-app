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

const Dashboard = observer(() => {
  const location = useLocation();

  const navigation = [
    { name: 'Overview', href: '/dashboard', icon: HomeIcon },
    { name: 'Reports', href: '/dashboard/reports', icon: DocumentTextIcon },
    { name: 'Analytics', href: '/dashboard/analytics', icon: ChartBarIcon },
    { name: 'Settings', href: '/dashboard/settings', icon: Cog6ToothIcon },
  ];

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-40 w-64 bg-white shadow-lg transform ${dashboardStore.isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0`}>
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
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
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