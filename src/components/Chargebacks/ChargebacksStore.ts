import { makeAutoObservable } from "mobx";
import {
  CreditCardIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import type { ComponentType, SVGProps } from "react";

interface Stat {
  name: string;
  value: string;
  change: string;
  changeType: 'increase' | 'decrease';
  icon: ComponentType<SVGProps<SVGSVGElement>>;  // ✅ correct type
  color: string;
}

interface Chargeback {
  id: number;
  transactionId: string;
  amount: number;
  reason: string;
  status: 'pending' | 'won' | 'lost' | 'disputed';
  date: string;
  customerName: string;
  merchantName: string;
}

export class ChargebacksStore {
  stats: Stat[] = [
    {
      name: 'Total Chargebacks',
      value: '47',
      change: '+12%',
      changeType: 'increase',
      icon: CreditCardIcon,
      color: 'blue'
    },
    {
      name: 'Pending Disputes',
      value: '8',
      change: '+3',
      changeType: 'increase',
      icon: ClockIcon,
      color: 'yellow'
    },
    {
      name: 'Won Cases',
      value: '32',
      change: '+8',
      changeType: 'increase',
      icon: CheckCircleIcon,
      color: 'green'
    },
    {
      name: 'Chargeback Rate',
      value: '0.8%',
      change: '-0.2%',
      changeType: 'decrease',
      icon: ExclamationTriangleIcon,
      color: 'red'
    }
  ];

  chargebacks: Chargeback[] = [
    {
      id: 1,
      transactionId: 'TXN-001234',
      amount: 2500,
      reason: 'Fraudulent Transaction',
      status: 'pending',
      date: '2024-01-15',
      customerName: 'John Doe',
      merchantName: 'Tech Store Inc.'
    },
    {
      id: 2,
      transactionId: 'TXN-001235',
      amount: 1200,
      reason: 'Product Not Received',
      status: 'disputed',
      date: '2024-01-14',
      customerName: 'Jane Smith',
      merchantName: 'Fashion Outlet'
    },
    {
      id: 3,
      transactionId: 'TXN-001236',
      amount: 850,
      reason: 'Duplicate Charge',
      status: 'won',
      date: '2024-01-13',
      customerName: 'Bob Johnson',
      merchantName: 'Electronics Plus'
    },
    {
      id: 4,
      transactionId: 'TXN-001237',
      amount: 3200,
      reason: 'Unauthorized Transaction',
      status: 'lost',
      date: '2024-01-12',
      customerName: 'Alice Brown',
      merchantName: 'Luxury Goods Co.'
    },
    {
      id: 5,
      transactionId: 'TXN-001238',
      amount: 450,
      reason: 'Service Not Provided',
      status: 'pending',
      date: '2024-01-11',
      customerName: 'Charlie Wilson',
      merchantName: 'Service Pro LLC'
    }
  ];

  selectedChargeback: Chargeback | null = null;
  isDetailsModalOpen = false;

  constructor() {
    makeAutoObservable(this);
  }

  viewDetails(id: number) {
    const chargeback = this.chargebacks.find(c => c.id === id);
    if (chargeback) {
      this.selectedChargeback = chargeback;
      this.isDetailsModalOpen = true;
    }
  }

  closeDetailsModal() {
    this.isDetailsModalOpen = false;
    this.selectedChargeback = null;
  }

  disputeChargeback(id: number) {
    const chargeback = this.chargebacks.find(c => c.id === id);
    if (chargeback) {
      chargeback.status = 'disputed';
      // Update stats
      this.updateStats();
    }
  }

  updateChargebackStatus(id: number, status: Chargeback['status']) {
    const chargeback = this.chargebacks.find(c => c.id === id);
    if (chargeback) {
      chargeback.status = status;
      this.updateStats();
    }
  }

  addChargeback(chargebackData: Omit<Chargeback, 'id'>) {
    const newChargeback: Chargeback = {
      ...chargebackData,
      id: Math.max(...this.chargebacks.map(c => c.id)) + 1
    };
    this.chargebacks.unshift(newChargeback);
    this.updateStats();
  }

  updateStats() {
    const totalChargebacks = this.chargebacks.length;
    const pendingDisputes = this.chargebacks.filter(c => c.status === 'pending').length;
    const wonCases = this.chargebacks.filter(c => c.status === 'won').length;
    const chargebackRate = ((totalChargebacks / 1000) * 100).toFixed(1); // Assuming 1000 total transactions

    this.stats[0].value = totalChargebacks.toString();
    this.stats[1].value = pendingDisputes.toString();
    this.stats[2].value = wonCases.toString();
    this.stats[3].value = `${chargebackRate}%`;
  }

  filterChargebacks(status?: Chargeback['status']) {
    if (!status) return this.chargebacks;
    return this.chargebacks.filter(c => c.status === status);
  }

  getChargebacksByDateRange(startDate: string, endDate: string) {
    return this.chargebacks.filter(c => c.date >= startDate && c.date <= endDate);
  }
}

export const chargebacksStore = new ChargebacksStore();