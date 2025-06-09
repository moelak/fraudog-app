import { makeAutoObservable } from "mobx";

export class VisualizationStore {
  fraudTrendData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    datasets: [
      {
        label: 'Fraud Attempts',
        data: [65, 59, 80, 81, 56, 55, 40, 45, 60, 70, 85, 90],
        fill: true,
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderColor: 'rgb(239, 68, 68)',
        tension: 0.4,
      },
      {
        label: 'Prevented Fraud',
        data: [60, 55, 75, 78, 52, 50, 38, 42, 58, 68, 82, 87],
        fill: true,
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderColor: 'rgb(16, 185, 129)',
        tension: 0.4,
      },
    ],
  };

  transactionVolumeData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        label: 'Total Transactions',
        data: [1200, 1900, 3000, 5000, 2000, 3000, 2500],
        backgroundColor: 'rgba(59, 130, 246, 0.7)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 1,
      },
      {
        label: 'Flagged Transactions',
        data: [120, 190, 300, 500, 200, 300, 250],
        backgroundColor: 'rgba(245, 158, 11, 0.7)',
        borderColor: 'rgb(245, 158, 11)',
        borderWidth: 1,
      },
    ],
  };

  riskScoreData = {
    labels: ['Low Risk (0-30)', 'Medium Risk (31-70)', 'High Risk (71-100)'],
    datasets: [
      {
        data: [60, 25, 15],
        backgroundColor: [
          'rgba(16, 185, 129, 0.7)',
          'rgba(245, 158, 11, 0.7)',
          'rgba(239, 68, 68, 0.7)',
        ],
        borderColor: [
          'rgb(16, 185, 129)',
          'rgb(245, 158, 11)',
          'rgb(239, 68, 68)',
        ],
        borderWidth: 2,
      },
    ],
  };

  geographicData = {
    labels: ['North America', 'Europe', 'Asia', 'South America', 'Africa', 'Oceania'],
    datasets: [
      {
        label: 'Fraud Attempts',
        data: [45, 35, 25, 15, 10, 5],
        backgroundColor: 'rgba(239, 68, 68, 0.7)',
        borderColor: 'rgb(239, 68, 68)',
        borderWidth: 1,
      },
    ],
  };

  realTimeData = {
    labels: Array.from({ length: 20 }, (_, i) => i),
    datasets: [
      {
        label: 'Real-time Fraud Score',
        data: Array.from({ length: 20 }, () => Math.floor(Math.random() * 100)),
        fill: false,
        backgroundColor: 'rgba(139, 92, 246, 0.7)',
        borderColor: 'rgb(139, 92, 246)',
        tension: 0.4,
      },
    ],
  };

  constructor() {
    makeAutoObservable(this);
    this.startRealTimeUpdates();
  }

  startRealTimeUpdates() {
    setInterval(() => {
      this.updateRealTimeData();
    }, 2000);
  }

  updateRealTimeData() {
    // Shift data and add new point
    this.realTimeData.datasets[0].data.shift();
    this.realTimeData.datasets[0].data.push(Math.floor(Math.random() * 100));
  }

  refreshAllData() {
    // Simulate data refresh for all charts
    this.fraudTrendData.datasets.forEach(dataset => {
      dataset.data = dataset.data.map(() => Math.floor(Math.random() * 100) + 20);
    });

    this.transactionVolumeData.datasets.forEach(dataset => {
      dataset.data = dataset.data.map(() => Math.floor(Math.random() * 5000) + 1000);
    });

    this.riskScoreData.datasets[0].data = [
      Math.floor(Math.random() * 40) + 40,
      Math.floor(Math.random() * 30) + 20,
      Math.floor(Math.random() * 20) + 10
    ];

    this.geographicData.datasets[0].data = this.geographicData.datasets[0].data.map(
      () => Math.floor(Math.random() * 50) + 10
    );
  }
}

export const visualizationStore = new VisualizationStore();