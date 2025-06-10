import { makeAutoObservable } from "mobx";

export interface Rule {
  id: number;
  name: string;
  description: string;
  category: string;
  condition: string;
  severity: 'low' | 'medium' | 'high';
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export class RuleManagementStore {
  rules: Rule[] = [
    {
      id: 1,
      name: 'High Transaction Amount',
      description: 'Flag transactions over $10,000',
      category: 'Payment Method',
      condition: 'transaction.amount > 10000',
      severity: 'high',
      status: 'active',
      createdAt: '2024-01-15',
      updatedAt: '2024-01-15'
    },
    {
      id: 2,
      name: 'Multiple Failed Attempts',
      description: 'Flag accounts with more than 3 failed login attempts',
      category: 'Behavioral',
      condition: 'user.failed_attempts > 3',
      severity: 'medium',
      status: 'active',
      createdAt: '2024-01-10',
      updatedAt: '2024-01-12'
    },
    {
      id: 3,
      name: 'Unusual Location',
      description: 'Flag transactions from unusual geographic locations',
      category: 'Technical',
      condition: 'location.distance_from_usual > 500',
      severity: 'medium',
      status: 'active',
      createdAt: '2024-01-08',
      updatedAt: '2024-01-08'
    },
    {
      id: 4,
      name: 'Identity Verification Failed',
      description: 'Flag when identity verification fails multiple times',
      category: 'Identity',
      condition: 'identity.verification_failures >= 2',
      severity: 'high',
      status: 'inactive',
      createdAt: '2024-01-05',
      updatedAt: '2024-01-06'
    }
  ];

  isCreateModalOpen = false;
  isEditModalOpen = false;
  editingRule: Rule | null = null;

  constructor() {
    makeAutoObservable(this);
  }

  openCreateModal() {
    this.isCreateModalOpen = true;
  }

  closeCreateModal() {
    this.isCreateModalOpen = false;
  }

  editRule(id: number) {
    const rule = this.rules.find(r => r.id === id);
    if (rule) {
      this.editingRule = rule;
      this.isEditModalOpen = true;
      // For now, just log the action
      console.log('Editing rule:', rule.name);
    }
  }

  closeEditModal() {
    this.isEditModalOpen = false;
    this.editingRule = null;
  }

  viewRuleHistory(id: number) {
    const rule = this.rules.find(r => r.id === id);
    if (rule) {
      // For now, just log the action
      console.log('Viewing history for rule:', rule.name);
      // In a real app, this would open a history modal or navigate to a history page
    }
  }

  deleteRule(id: number) {
    this.rules = this.rules.filter(rule => rule.id !== id);
  }

  toggleRuleStatus(id: number) {
    const rule = this.rules.find(r => r.id === id);
    if (rule) {
      rule.status = rule.status === 'active' ? 'inactive' : 'active';
      rule.updatedAt = new Date().toISOString().split('T')[0];
    }
  }

  addRule(ruleData: Omit<Rule, 'id' | 'createdAt' | 'updatedAt'>) {
    const newRule: Rule = {
      ...ruleData,
      id: Math.max(...this.rules.map(r => r.id)) + 1,
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0]
    };
    this.rules.unshift(newRule);
  }

  updateRule(id: number, updates: Partial<Rule>) {
    const rule = this.rules.find(r => r.id === id);
    if (rule) {
      Object.assign(rule, updates);
      rule.updatedAt = new Date().toISOString().split('T')[0];
    }
  }

  getRulesByCategory(category: string) {
    return this.rules.filter(rule => rule.category === category);
  }

  getRulesByStatus(status: 'active' | 'inactive') {
    return this.rules.filter(rule => rule.status === status);
  }

  getRulesBySeverity(severity: 'low' | 'medium' | 'high') {
    return this.rules.filter(rule => rule.severity === severity);
  }
}

export const ruleManagementStore = new RuleManagementStore();