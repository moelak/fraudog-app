import { makeAutoObservable } from "mobx";

interface SystemMetric {
  name: string;
  value: string;
  status: 'healthy' | 'warning' | 'critical';
}

interface Alert {
  id: number;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  acknowledged: boolean;
}

interface SystemLog {
  id: number;
  level: 'info' | 'warning' | 'error' | 'debug';
  message: string;
  timestamp: string;
}

export class MonitoringStore {
  systemMetrics: SystemMetric[] = [
    { name: 'System Uptime', value: '99.9%', status: 'healthy' },
    { name: 'Response Time', value: '125ms', status: 'healthy' },
    { name: 'Error Rate', value: '0.02%', status: 'healthy' },
    { name: 'CPU Usage', value: '45%', status: 'warning' },
  ];

  activeAlerts: Alert[] = [
    {
      id: 1,
      title: 'High CPU Usage',
      description: 'CPU usage has exceeded 80% for the last 5 minutes',
      severity: 'high',
      timestamp: '2 min ago',
      acknowledged: false
    },
    {
      id: 2,
      title: 'Unusual Transaction Pattern',
      description: 'Detected unusual spike in transaction volume from IP 192.168.1.100',
      severity: 'medium',
      timestamp: '15 min ago',
      acknowledged: false
    },
    {
      id: 3,
      title: 'Failed Login Attempts',
      description: 'Multiple failed login attempts detected for user account',
      severity: 'high',
      timestamp: '1 hour ago',
      acknowledged: false
    }
  ];

  systemLogs: SystemLog[] = [
    {
      id: 1,
      level: 'info',
      message: 'Fraud detection rule "High Transaction Amount" triggered',
      timestamp: '2024-01-15 14:30:25'
    },
    {
      id: 2,
      level: 'warning',
      message: 'Database connection pool reaching capacity',
      timestamp: '2024-01-15 14:28:15'
    },
    {
      id: 3,
      level: 'error',
      message: 'Failed to process transaction ID: TXN-123456',
      timestamp: '2024-01-15 14:25:10'
    },
    {
      id: 4,
      level: 'info',
      message: 'User authentication successful for user ID: USR-789',
      timestamp: '2024-01-15 14:22:05'
    },
    {
      id: 5,
      level: 'warning',
      message: 'Rate limit exceeded for API endpoint /api/transactions',
      timestamp: '2024-01-15 14:20:30'
    }
  ];

  constructor() {
    makeAutoObservable(this);
    this.startRealTimeUpdates();
  }

  startRealTimeUpdates() {
    // Simulate real-time updates
    setInterval(() => {
      this.updateMetrics();
      this.addRandomLog();
    }, 5000);
  }

  updateMetrics() {
    // Simulate metric updates
    this.systemMetrics.forEach(metric => {
      if (metric.name === 'Response Time') {
        const responseTime = Math.floor(Math.random() * 200) + 100;
        metric.value = `${responseTime}ms`;
        metric.status = responseTime > 300 ? 'critical' : responseTime > 200 ? 'warning' : 'healthy';
      } else if (metric.name === 'CPU Usage') {
        const cpuUsage = Math.floor(Math.random() * 100);
        metric.value = `${cpuUsage}%`;
        metric.status = cpuUsage > 80 ? 'critical' : cpuUsage > 60 ? 'warning' : 'healthy';
      }
    });
  }

  addRandomLog() {
    const levels: SystemLog['level'][] = ['info', 'warning', 'error', 'debug'];
    const messages = [
      'Transaction processed successfully',
      'Database query executed',
      'User session expired',
      'Cache miss for key: user_data',
      'API rate limit check passed',
      'Fraud rule evaluation completed'
    ];

    const newLog: SystemLog = {
      id: this.systemLogs.length + 1,
      level: levels[Math.floor(Math.random() * levels.length)],
      message: messages[Math.floor(Math.random() * messages.length)],
      timestamp: new Date().toLocaleString()
    };

    this.systemLogs.unshift(newLog);
    if (this.systemLogs.length > 50) {
      this.systemLogs.pop();
    }
  }

  acknowledgeAlert(id: number) {
    const alert = this.activeAlerts.find(a => a.id === id);
    if (alert) {
      alert.acknowledged = true;
      // Remove acknowledged alerts after a delay
      setTimeout(() => {
        this.activeAlerts = this.activeAlerts.filter(a => a.id !== id);
      }, 1000);
    }
  }

  addAlert(alert: Omit<Alert, 'id' | 'timestamp' | 'acknowledged'>) {
    const newAlert: Alert = {
      ...alert,
      id: Math.max(...this.activeAlerts.map(a => a.id)) + 1,
      timestamp: 'Just now',
      acknowledged: false
    };
    this.activeAlerts.unshift(newAlert);
  }

  clearAllAlerts() {
    this.activeAlerts = [];
  }
}

export const monitoringStore = new MonitoringStore();