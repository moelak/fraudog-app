import { makeAutoObservable } from "mobx";
import {
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

interface Stat {
  name: string;
  value: string;
  change: string;
  changeType: 'increase' | 'decrease';
  icon: any;
  color: string;
}

interface Alert {
  id: number;
  type: string;
  timestamp: string;
  risk: 'High' | 'Medium' | 'Low';
  status: string;
}

export class OverviewStore {
  stats: Stat[] = [
    { 
      name: 'Total Alerts', 
      value: '2,651', 
      change: '+12.5%', 
      changeType: 'increase',
      icon: ShieldCheckIcon,
      color: 'blue'
    },
    { 
      name: 'False Positives', 
      value: '145', 
      change: '-8.3%', 
      changeType: 'decrease',
      icon: ExclamationTriangleIcon,
      color: 'yellow'
    },
    { 
      name: 'Response Time', 
      value: '1.2m', 
      change: '-25.0%', 
      changeType: 'decrease',
      icon: ClockIcon,
      color: 'indigo'
    },
    { 
      name: 'Success Rate', 
      value: '98.5%', 
      change: '+4.75%', 
      changeType: 'increase',
      icon: CheckCircleIcon,
      color: 'green'
    },
  ];

  recentAlerts: Alert[] = [
    { id: 1, type: 'Identity Theft', timestamp: '5 min ago', risk: 'High', status: 'Open' },
    { id: 2, type: 'Payment Fraud', timestamp: '15 min ago', risk: 'Medium', status: 'Investigating' },
    { id: 3, type: 'Account Takeover', timestamp: '1 hour ago', risk: 'High', status: 'Resolved' },
    { id: 4, type: 'Financial Fraud', timestamp: '2 hours ago', risk: 'Low', status: 'False Positive' },
  ];

  fraudDetectionData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Fraud Attempts Detected',
        data: [65, 59, 80, 81, 56, 55],
        fill: true,
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderColor: 'rgb(59, 130, 246)',
        tension: 0.4,
      },
    ],
  };

  fraudTypeData = {
    labels: ['Identity Theft', 'Financial Fraud', 'Account Takeover', 'Payment Fraud'],
    datasets: [
      {
        data: [30, 25, 20, 25],
        backgroundColor: [
          'rgba(239, 68, 68, 0.7)',
          'rgba(59, 130, 246, 0.7)',
          'rgba(245, 158, 11, 0.7)',
          'rgba(16, 185, 129, 0.7)',
        ],
        borderColor: [
          'rgba(239, 68, 68, 0.9)',
          'rgba(59, 130, 246, 0.9)',
          'rgba(245, 158, 11, 0.9)',
          'rgba(16, 185, 129, 0.9)',
        ],
        borderWidth: 2,
      },
    ],
  };

  constructor() {
    makeAutoObservable(this);
  }

  updateStat(name: string, value: string, change: string) {
    const stat = this.stats.find(s => s.name === name);
    if (stat) {
      stat.value = value;
      stat.change = change;
    }
  }

  addAlert(alert: Omit<Alert, 'id'>) {
    const newAlert = {
      ...alert,
      id: Math.max(...this.recentAlerts.map(a => a.id)) + 1
    };
    this.recentAlerts.unshift(newAlert);
    if (this.recentAlerts.length > 10) {
      this.recentAlerts.pop();
    }
  }

  updateAlertStatus(id: number, status: string) {
    const alert = this.recentAlerts.find(a => a.id === id);
    if (alert) {
      alert.status = status;
    }
  }

  refreshData() {
    // Simulate data refresh
    this.fraudDetectionData.datasets[0].data = this.fraudDetectionData.datasets[0].data.map(
      () => Math.floor(Math.random() * 100) + 20
    );
  }
}

export const overviewStore = new OverviewStore();