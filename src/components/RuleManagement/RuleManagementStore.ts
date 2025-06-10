import { makeAutoObservable } from "mobx";

export interface Rule {
  id: number;
  name: string;
  description: string;
  category: string;
  condition: string;
  severity: 'low' | 'medium' | 'high';
  status: 'active' | 'inactive' | 'warning';
  createdAt: string;
  updatedAt: string;
  catches: number;
  falsePositives: number;
  effectiveness: number;
}

export class RuleManagementStore {
  rules: Rule[] = [
    {
      id: 1,
      name: 'High Transaction Amount',
      description: 'Flag transactions over $10,000 from accounts less than 30 days old',
      category: 'Payment Method',
      condition: 'transaction.amount > 10000 && user.accountAge < 30',
      severity: 'high',
      status: 'active',
      createdAt: '2024-01-15',
      updatedAt: '2024-01-15',
      catches: 1247,
      falsePositives: 23,
      effectiveness: 98
    },
    {
      id: 2,
      name: 'Multiple Failed Attempts',
      description: 'Flag accounts with more than 3 failed login attempts within 1 hour',
      category: 'Behavioral',
      condition: 'user.failed_attempts > 3 && timeWindow < 3600',
      severity: 'medium',
      status: 'active',
      createdAt: '2024-01-10',
      updatedAt: '2024-01-12',
      catches: 892,
      falsePositives: 45,
      effectiveness: 95
    },
    {
      id: 3,
      name: 'Unusual Location',
      description: 'Flag transactions from geographic locations more than 500 miles from usual patterns',
      category: 'Technical',
      condition: 'location.distance_from_usual > 500',
      severity: 'medium',
      status: 'active',
      createdAt: '2024-01-08',
      updatedAt: '2024-01-08',
      catches: 456,
      falsePositives: 78,
      effectiveness: 85
    },
    {
      id: 4,
      name: 'Identity Verification Failed',
      description: 'Flag when identity verification fails multiple times for the same user',
      category: 'Identity',
      condition: 'identity.verification_failures >= 2',
      severity: 'high',
      status: 'warning',
      createdAt: '2024-01-05',
      updatedAt: '2024-01-06',
      catches: 234,
      falsePositives: 89,
      effectiveness: 72
    },
    {
      id: 5,
      name: 'Rapid Transaction Pattern',
      description: 'Detect multiple transactions in quick succession from the same account',
      category: 'Behavioral',
      condition: 'transactions.count > 5 && timeWindow < 300',
      severity: 'medium',
      status: 'inactive',
      createdAt: '2024-01-03',
      updatedAt: '2024-01-04',
      catches: 167,
      falsePositives: 34,
      effectiveness: 83
    },
    {
      id: 6,
      name: 'Device Fingerprint Mismatch',
      description: 'Flag transactions from unrecognized devices for high-value accounts',
      category: 'Technical',
      condition: 'device.fingerprint_match === false && account.value > 50000',
      severity: 'high',
      status: 'warning',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-02',
      catches: 89,
      falsePositives: 156,
      effectiveness: 36
    }
  ];

  activeTab: 'active' | 'all' | 'attention' = 'all';
  searchQuery = '';
  isCreateModalOpen = false;
  isEditModalOpen = false;
  editingRule: Rule | null = null;

  constructor() {
    makeAutoObservable(this);
  }

  setActiveTab = (tab: 'active' | 'all' | 'attention') => {
    this.activeTab = tab;
  }

  setSearchQuery = (query: string) => {
    this.searchQuery = query;
  }

  openCreateModal = () => {
    this.isCreateModalOpen = true;
  }

  closeCreateModal = () => {
    this.isCreateModalOpen = false;
  }

  editRule = (id: number) => {
    const rule = this.rules.find(r => r.id === id);
    if (rule) {
      this.editingRule = rule;
      this.isEditModalOpen = true;
      console.log('Editing rule:', rule.name);
    }
  }

  closeEditModal = () => {
    this.isEditModalOpen = false;
    this.editingRule = null;
  }

  viewRuleHistory = (id: number) => {
    const rule = this.rules.find(r => r.id === id);
    if (rule) {
      console.log('Viewing history for rule:', rule.name);
    }
  }

  deleteRule = (id: number) => {
    this.rules = this.rules.filter(rule => rule.id !== id);
  }

  toggleRuleStatus = (id: number) => {
    const rule = this.rules.find(r => r.id === id);
    if (rule) {
      if (rule.status === 'active') {
        rule.status = 'inactive';
      } else if (rule.status === 'inactive') {
        rule.status = 'active';
      }
      rule.updatedAt = new Date().toISOString().split('T')[0];
    }
  }

  addRule = (ruleData: Omit<Rule, 'id' | 'createdAt' | 'updatedAt' | 'catches' | 'falsePositives' | 'effectiveness'>) => {
    const newRule: Rule = {
      ...ruleData,
      id: Math.max(...this.rules.map(r => r.id)) + 1,
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
      catches: 0,
      falsePositives: 0,
      effectiveness: 0
    };
    this.rules.unshift(newRule);
  }

  updateRule = (id: number, updates: Partial<Rule>) => {
    const rule = this.rules.find(r => r.id === id);
    if (rule) {
      Object.assign(rule, updates);
      rule.updatedAt = new Date().toISOString().split('T')[0];
    }
  }

  get filteredRules() {
    let filtered = this.rules;

    // Filter by tab
    if (this.activeTab === 'active') {
      filtered = filtered.filter(rule => rule.status === 'active');
    } else if (this.activeTab === 'attention') {
      filtered = filtered.filter(rule => 
        rule.status === 'warning' || 
        rule.effectiveness < 70 || 
        rule.falsePositives > 100
      );
    }

    // Filter by search query
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(rule =>
        rule.name.toLowerCase().includes(query) ||
        rule.description.toLowerCase().includes(query) ||
        rule.category.toLowerCase().includes(query)
      );
    }

    return filtered;
  }

  get activeRulesCount() {
    return this.rules.filter(rule => rule.status === 'active').length;
  }

  get needsAttentionCount() {
    return this.rules.filter(rule => 
      rule.status === 'warning' || 
      rule.effectiveness < 70 || 
      rule.falsePositives > 100
    ).length;
  }

  getRulesByCategory = (category: string) => {
    return this.rules.filter(rule => rule.category === category);
  }

  getRulesByStatus = (status: 'active' | 'inactive' | 'warning') => {
    return this.rules.filter(rule => rule.status === status);
  }

  getRulesBySeverity = (severity: 'low' | 'medium' | 'high') => {
    return this.rules.filter(rule => rule.severity === severity);
  }
}

export const ruleManagementStore = new RuleManagementStore();