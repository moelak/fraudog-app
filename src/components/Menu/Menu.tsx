import { useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import {
	// ChartBarIcon,
	DocumentTextIcon,
	Cog6ToothIcon,
	HomeIcon,
	ShieldCheckIcon,
	EyeIcon,
	BellIcon,
	CreditCardIcon,
	//ChatBubbleLeftRightIcon,
	UsersIcon,
} from '@heroicons/react/24/outline';
import Overview from '../Overview/Overview';
import Reports from '../Reports/Reports';
import Settings from '../Settings/Settings';
// TODO: see comment below
// import Visualization from '../Visualization/Visualization';
// import TestOpenAI from '../RuleManagement/TestOpenAI';
import Chargebacks from '../Chargebacks/Chargebacks';
import ChatAssistant from '../ChatAssistant/ChatAssistant';
import UserManagement from '../UserManagement/UserManagement';
import AIChat from '../AIChat/AIChat';
import AIChatButton from '../AIChat/AIChatButton';
import AccountMenu from '../Auth/AccountMenu';
import AccountManagementModal from '../Auth/AccountManagementModal';
import { menuStore } from './MenuStore';
import { settingsStore } from '../Settings/SettingsStore';
import RuleManagementContainer from '../RuleManagement/RuleManagementContainer';
import { useNotifications } from '@/hooks/useNotifications';
import MonitoringContainer from '../Monitoring/MonitoringContainer';

const Menu = observer(() => {
	const location = useLocation();
	const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
	const [showNotifications, setShowNotifications] = useState(false); // 👈 new local state
	const dropdownRef = useRef<HTMLDivElement | null>(null);

	const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
	const navigation = [
		{ name: 'Overview', href: '/dashboard', icon: HomeIcon },
		{ name: 'Rule Management', href: '/dashboard/rules', icon: ShieldCheckIcon },
		// TODO: The Rule Generation Tester to be moved to an Admin view, so that it can be used to improve prompts. Visualization will also be incorporated once we have more data streaming through.
		// { name: 'Rule Generation Tester', href: '/dashboard/test-rulegeneration', icon: ShieldCheckIcon },
		// { name: 'Visualization', href: '/dashboard/visualization', icon: ChartBarIcon },
		{ name: 'Monitoring', href: '/dashboard/monitoring', icon: EyeIcon },
		{ name: 'Chargebacks', href: '/dashboard/chargebacks', icon: CreditCardIcon },
		{ name: 'Reports', href: '/dashboard/reports', icon: DocumentTextIcon },
		// { name: 'Chat Assistant', href: '/dashboard/assistant', icon: ChatBubbleLeftRightIcon },
		{ name: 'User Management', href: '/dashboard/users', icon: UsersIcon },
		{ name: 'Settings', href: '/dashboard/settings', icon: Cog6ToothIcon },
	];

	const handleOpenSidebar = () => {
		menuStore.openSidebar();
	};

	const handleCloseSidebar = () => {
		menuStore.closeSidebar();
	};

	const handleOverlayClick = () => {
		menuStore.closeSidebar();
	};

	const toggleNotifications = () => setShowNotifications((prev) => !prev);

	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
				setShowNotifications(false);
			}
		}

		if (showNotifications) {
			document.addEventListener('mousedown', handleClickOutside);
		} else {
			document.removeEventListener('mousedown', handleClickOutside);
		}

		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [showNotifications]);

	function formatNotificationTime(dateString: string): string {
		const date = new Date(dateString);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffHours = diffMs / (1000 * 60 * 60);

		if (diffHours < 1) {
			const diffMinutes = Math.floor(diffMs / (1000 * 60));
			return `${diffMinutes}m ago`;
		}
		if (diffHours < 24) {
			return `${Math.floor(diffHours)}h ago`;
		}
		return date.toLocaleString(undefined, {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		});
	}

	return (
		<div className='flex h-screen bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden'>
			{/* Sidebar */}
			<div
				className={`fixed inset-y-0 left-0 z-40 w-64 bg-white shadow-lg transform ${
					menuStore.isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
				} transition-transform duration-300 ease-in-out xl:relative xl:translate-x-0`}
			>
				<div className='flex h-full flex-col'>
					<div className='flex h-16 items-center justify-between px-4 bg-gradient-to-r from-blue-600 to-blue-700'>
						<span className='text-2xl font-bold text-white'>Fraud-dog</span>
						<button
							className='xl:hidden text-white hover:text-gray-200 transition-colors p-1 rounded-md hover:bg-white/10'
							onClick={handleCloseSidebar}
							type='button'
							aria-label='Close sidebar'
						>
							<svg className='h-6 w-6' fill='none' viewBox='0 0 24 24' strokeWidth='1.5' stroke='currentColor'>
								<path strokeLinecap='round' strokeLinejoin='round' d='M6 18L18 6M6 6l12 12' />
							</svg>
						</button>
					</div>
					<nav className='flex-1 space-y-1 px-2 py-4'>
						{navigation.map((item) => {
							const isActive = location.pathname === item.href;
							return (
								<Link
									key={item.name}
									to={item.href}
									onClick={handleCloseSidebar} // Close sidebar when navigation item is clicked on mobile
									className={`${
										isActive ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
									} group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition duration-150 ease-in-out`}
								>
									<item.icon className={`${isActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'} mr-3 flex-shrink-0 h-5 w-5`} />
									{item.name}
								</Link>
							);
						})}
					</nav>
				</div>
			</div>

			{/* Main content */}
			<div className='flex-1 flex flex-col overflow-hidden'>
				<div className='sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm'>
					<div className='flex h-16 items-center justify-between px-4 sm:px-6 xl:px-8'>
						{/* Left side - Mobile menu button */}
						<button
							className='text-gray-500 hover:text-gray-700 xl:hidden p-2 rounded-md hover:bg-gray-100 transition-colors'
							onClick={handleOpenSidebar}
							type='button'
							aria-label='Open sidebar'
						>
							<svg className='h-6 w-6' fill='none' viewBox='0 0 24 24' strokeWidth='1.5' stroke='currentColor'>
								<path strokeLinecap='round' strokeLinejoin='round' d='M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5' />
							</svg>
						</button>

						{/* Right side - Notifications and Account Menu */}
						<div className='flex items-center gap-4 ml-auto'>
							{/* Notification Bell */}
							<div className='relative'>
								<button
									onClick={toggleNotifications}
									className='relative p-2 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-full transition-colors'
								>
									<span className='sr-only'>View notifications</span>
									<BellIcon className='h-6 w-6' />
									{unreadCount > 0 && (
										<span className='absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs font-medium rounded-full flex items-center justify-center'>
											{unreadCount > 9 ? '9+' : unreadCount}
										</span>
									)}
								</button>

								{showNotifications && (
									<div ref={dropdownRef} className='absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-[9999] overflow-hidden'>
										{/* Header */}
										<div className='px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50'>
											<h3 className='text-sm font-semibold text-gray-700'>Notifications</h3>
											{unreadCount > 0 && (
												<button
													onClick={async () => {
														await markAllAsRead(); // 👈 updates all for this user
														setShowNotifications(false); // optional: close dropdown after action
													}}
													className='text-xs font-medium text-blue-600 hover:text-blue-800'
												>
													Mark all read
												</button>
											)}
										</div>

										{/* List */}

										<div className='max-h-96 overflow-y-auto divide-y divide-gray-100'>
											{notifications.length === 0 ? (
												<div className='p-4 text-center text-gray-400'>No notifications</div>
											) : (
												notifications.map((n) => (
													<div
														key={n.id}
														className={`flex items-start gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer ${!n.is_read ? 'bg-blue-50/40' : ''}`}
														onClick={async () => {
															await markAsRead(n.id); // 👈 mark single notification as read
														}}
													>
														{/* Icon */}
														<div className='flex-shrink-0 mt-1'>
															{n.type === 'rule.created' && <span className='w-2.5 h-2.5 bg-green-500 rounded-full block' />}
															{n.type === 'rule.updated' && <span className='w-2.5 h-2.5 bg-yellow-500 rounded-full block' />}
															{n.type === 'rule.deleted' && <span className='w-2.5 h-2.5 bg-red-500 rounded-full block' />}
															{!['rule.created', 'rule.updated', 'rule.deleted'].includes(n.type) && (
																<span className='w-2.5 h-2.5 bg-gray-400 rounded-full block' />
															)}
														</div>

														{/* Content */}
														<div className='flex-1 min-w-0'>
															<p className='text-sm font-medium text-gray-900 truncate'>{n.title}</p>
															<div className='flex items-center justify-between mt-1'>
																<span className='text-xs text-gray-400'>{formatNotificationTime(n.created_at)}</span>
																{n.full_name && <span className='text-xs text-gray-500'>by {n.full_name}</span>}
															</div>
														</div>

														{/* Unread dot */}
														{!n.is_read && <span className='flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2' />}
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

				<main className='flex-1 overflow-y-auto bg-transparent'>
					<div className='py-6'>
						<div className='mx-auto max-w-7xl px-4 sm:px-6 xl:px-8'>
							<Routes>
								<Route path='/' element={<Overview />} />
								<Route path='/rules' element={<RuleManagementContainer />} />
								{/*<Route path='/test-rulegeneration' element={<TestOpenAI />} />*/}
								{/* <Route path='/visualization' element={<Visualization />} /> */}
								<Route path='/monitoring' element={<MonitoringContainer />} />
								<Route path='/chargebacks' element={<Chargebacks />} />
								<Route path='/reports' element={<Reports />} />
								<Route path='/assistant' element={<ChatAssistant />} />
								<Route path='/users' element={<UserManagement />} />
								<Route path='/settings' element={<Settings />} />
							</Routes>
						</div>
					</div>
				</main>
			</div>

			{/* Overlay for mobile sidebar */}
			{menuStore.isSidebarOpen && <div className='fixed inset-0 z-30 bg-black bg-opacity-50 xl:hidden' onClick={handleOverlayClick} aria-hidden='true' />}

			{/* AI Chat Components */}
			{settingsStore.settings.enableChatAssistant && (
				<>
					<AIChatButton />
					<AIChat />
				</>
			)}

			{/* Account Management Modal */}
			<AccountManagementModal isOpen={isAccountModalOpen} onClose={() => setIsAccountModalOpen(false)} />
		</div>
	);
});

export default Menu;
