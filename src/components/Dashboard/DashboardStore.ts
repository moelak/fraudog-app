import { makeAutoObservable } from "mobx";

interface Notification {
  id: number;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'alert' | 'info' | 'warning' | 'success';
}

export class DashboardStore {
  isSidebarOpen = true;
  showNotifications = false;
  notifications: Notification[] = [
    {
      id: 1,
      title: 'High Risk Transaction Detected',
      message: 'Transaction of $15,000 flagged for manual review',
      timestamp: '5 minutes ago',
      read: false,
      type: 'alert'
    },
    {
      id: 2,
      title: 'New Fraud Rule Activated',
      message: 'Rule "Multiple Failed Logins" is now active',
      timestamp: '1 hour ago',
      read: false,
      type: 'info'
    },
    {
      id: 3,
      title: 'System Maintenance Complete',
      message: 'Fraud detection system maintenance completed successfully',
      timestamp: '2 hours ago',
      read: true,
      type: 'success'
    },
    {
      id: 4,
      title: 'Chargeback Dispute Update',
      message: 'Chargeback case #TXN-001234 has been resolved in your favor',
      timestamp: '3 hours ago',
      read: true,
      type: 'success'
    }
  ];

  constructor() {
    makeAutoObservable(this);
  }

  openSidebar() {
    this.isSidebarOpen = true;
  }

  closeSidebar() {
    this.isSidebarOpen = false;
  }

  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  toggleNotifications() {
    this.showNotifications = !this.showNotifications;
  }

  markAsRead(id: number) {
    const notification = this.notifications.find(n => n.id === id);
    if (notification) {
      notification.read = true;
    }
  }

  markAllAsRead() {
    this.notifications.forEach(notification => {
      notification.read = true;
    });
  }

  addNotification(notification: Omit<Notification, 'id'>) {
    const newNotification: Notification = {
      ...notification,
      id: Math.max(...this.notifications.map(n => n.id)) + 1
    };
    this.notifications.unshift(newNotification);
  }

  get unreadNotifications() {
    return this.notifications.filter(n => !n.read).length;
  }

  removeNotification(id: number) {
    this.notifications = this.notifications.filter(n => n.id !== id);
  }

  clearAllNotifications() {
    this.notifications = [];
  }
}

export const dashboardStore = new DashboardStore();