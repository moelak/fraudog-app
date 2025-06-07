import { makeAutoObservable } from "mobx";

interface Report {
  id: number;
  title: string;
  description: string;
  createdAt: string;
  status: 'completed' | 'pending' | 'failed';
}

export class ReportsStore {
  reports: Report[] = [
    {
      id: 1,
      title: 'Monthly Fraud Summary',
      description: 'Comprehensive overview of fraud detection activities for the current month',
      createdAt: '2024-01-15',
      status: 'completed'
    },
    {
      id: 2,
      title: 'Risk Assessment Report',
      description: 'Analysis of current risk levels and threat patterns',
      createdAt: '2024-01-10',
      status: 'completed'
    }
  ];

  isGenerating = false;

  constructor() {
    makeAutoObservable(this);
  }

  generateReport() {
    this.isGenerating = true;
    
    // Simulate report generation
    setTimeout(() => {
      const newReport: Report = {
        id: this.reports.length + 1,
        title: `Fraud Report ${new Date().toLocaleDateString()}`,
        description: 'Automated fraud detection report with latest findings',
        createdAt: new Date().toLocaleDateString(),
        status: 'completed'
      };
      
      this.reports.unshift(newReport);
      this.isGenerating = false;
    }, 2000);
  }

  deleteReport(id: number) {
    this.reports = this.reports.filter(report => report.id !== id);
  }

  updateReportStatus(id: number, status: Report['status']) {
    const report = this.reports.find(r => r.id === id);
    if (report) {
      report.status = status;
    }
  }
}

export const reportsStore = new ReportsStore();