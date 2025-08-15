// components/RuleManagement/RuleManagementStore.ts
import { makeAutoObservable } from "mobx";

export interface Rule {
  id: string;
  name: string;
  description: string;
  category: string;
  condition: string;
  severity: 'low' | 'medium' | 'high';
  status: 'active' | 'inactive' | 'warning' | 'in progress';
  log_only: boolean;
  catches: number;             // aggregated from rules_metrics_hourly
  false_positives: number;     // aggregated (or 0 for Decision: Allow)
  chargebacks: number;         // aggregated (or 0 for Decision: Review/Deny)
  effectiveness: number | null; // % rounded to 1 decimal, or null => N/A
  source: 'AI' | 'User';
  is_deleted: boolean;
  user_id: string;
  created_at: string;
  updated_at: string;

  isCalculating?: boolean;
  hasCalculated?: boolean;

  displayName?: string;
  decision?: string;           // 'allow' | 'review' | 'deny' (string in DB)
}

export type SearchColumn = 'all' | 'name' | 'category' | 'description' | 'condition';

export class RuleManagementStore {
  activeTab: 'active' | 'all' | 'attention' | 'deleted' = 'all';
  searchQuery = '';
  searchColumn: SearchColumn = 'all';

  isCreateModalOpen = false;
  isEditModalOpen = false;
  isChargebackAnalysisOpen = false;
  isDeleteConfirmModalOpen = false;
  editingRule: Rule | null = null;
  deletingRule: Rule | null = null;

  expandedRows = new Set<string>();

  rules: Rule[] = [];
  inProgressRules: Rule[] = [];

  loadingPromise: Promise<void> | null = null;

  constructor() {
    makeAutoObservable(this);
  }

  setRules = async (newRules: Rule[]) => {
    if (this.loadingPromise) return this.loadingPromise;
    this.loadingPromise = this.performSetRules(newRules);
    try {
      await this.loadingPromise;
    } finally {
      this.loadingPromise = null;
    }
  };

  private performSetRules = async (newRules: Rule[]) => {

    const mainRules = newRules.filter(r => ['active', 'inactive', 'warning'].includes(r.status));
    const inProgressRules = newRules.filter(r => r.status === 'in progress');
    this.rules = mainRules
      .map(r => ({ ...r, isCalculating: false, hasCalculated: true }))
      .sort((a, b) => (b.effectiveness ?? 0) - (a.effectiveness ?? 0));

    this.inProgressRules = this.deduplicateRules(
      inProgressRules.map(r => ({ ...r, isCalculating: false, hasCalculated: true }))
    ).sort((a, b) => (b.effectiveness ?? 0) - (a.effectiveness ?? 0));
  };

  addInProgressRule = async (rule: Rule) => {
    if (rule.status !== 'in progress') return;
    const clean = { ...rule, isCalculating: false, hasCalculated: true };
    const idx = this.inProgressRules.findIndex(r => r.id === rule.id);
    if (idx !== -1) this.inProgressRules[idx] = clean;
    else this.inProgressRules.push(clean);
    this.inProgressRules = this.deduplicateRules(this.inProgressRules)
      .sort((a, b) => (b.effectiveness ?? 0) - (a.effectiveness ?? 0));
  };

  removeInProgressRule = (ruleId: string) => {
    this.inProgressRules = this.inProgressRules.filter(r => r.id !== ruleId);
  };

  updateInProgressRule = async (updatedRule: Rule) => {
    const idx = this.inProgressRules.findIndex(r => r.id === updatedRule.id);
    if (idx === -1) return;
    if (updatedRule.status === 'in progress') {
      this.inProgressRules[idx] = { ...updatedRule, isCalculating: false, hasCalculated: true };
    } else {
      this.inProgressRules.splice(idx, 1);
    }
    this.inProgressRules = this.deduplicateRules(this.inProgressRules)
      .sort((a, b) => (b.effectiveness ?? 0) - (a.effectiveness ?? 0));
  };

  deduplicateRules = (rules: Rule[]): Rule[] => {
    const byId = new Map<string, Rule>();
    for (const r of rules) {
      const prev = byId.get(r.id);
      if (!prev) byId.set(r.id, r);
      else {
        const prevTime = new Date(prev.updated_at).getTime();
        const curTime = new Date(r.updated_at).getTime();
        if (curTime > prevTime) byId.set(r.id, r);
      }
    }
    return Array.from(byId.values());
  };

  setActiveTab = (tab: 'active' | 'all' | 'attention' | 'deleted') => { this.activeTab = tab; };
  setSearchQuery = (query: string) => { this.searchQuery = query; };
  setSearchColumn = (column: SearchColumn) => { this.searchColumn = column; };

  openCreateModal = () => { this.isCreateModalOpen = true; this.editingRule = null; };
  closeCreateModal = () => { this.isCreateModalOpen = false; this.editingRule = null; };
  openEditModal = (rule: Rule) => { this.editingRule = rule; this.isEditModalOpen = true; };
  closeEditModal = () => { this.isEditModalOpen = false; this.editingRule = null; };
  openChargebackAnalysis = () => { this.isChargebackAnalysisOpen = true; };
  closeChargebackAnalysis = () => { this.isChargebackAnalysisOpen = false; };
  openDeleteConfirmModal = (rule: Rule) => { this.deletingRule = rule; this.isDeleteConfirmModalOpen = true; };
  closeDeleteConfirmModal = () => { this.isDeleteConfirmModalOpen = false; this.deletingRule = null; };

  editRule = (rule: Rule, _fromGenerated = false) => { this.openEditModal(rule); };
  viewRuleHistory = (id: string) => { console.log('Viewing history for rule:', id); };

  toggleRowExpansion = (ruleId: string) => {
    if (this.expandedRows.has(ruleId)) this.expandedRows.delete(ruleId);
    else this.expandedRows.add(ruleId);
  };
  isRowExpanded = (ruleId: string) => this.expandedRows.has(ruleId);
  collapseAllRows = () => { this.expandedRows.clear(); };

  filterRules = (rules: Rule[]) => {
    let filtered = rules;
    if (this.activeTab === 'active') {
      filtered = filtered.filter(r => !r.is_deleted && r.status === 'active');
    } else if (this.activeTab === 'all') {
      filtered = filtered.filter(r => !r.is_deleted && ['active', 'inactive', 'warning'].includes(r.status));
    } else if (this.activeTab === 'attention') {
      filtered = filtered.filter(r =>
        !r.is_deleted &&
        ['active', 'inactive', 'warning'].includes(r.status) &&
        (r.status === 'warning' || (r.effectiveness ?? 0) < 70 || (r.false_positives ?? 0) > 100)
      );
    } else if (this.activeTab === 'deleted') {
      filtered = filtered.filter(r => r.is_deleted && ['active', 'inactive', 'warning'].includes(r.status));
    }

    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      filtered = filtered.filter(r => {
        switch (this.searchColumn) {
          case 'name': return r.name.toLowerCase().includes(q);
          case 'category': return r.category.toLowerCase().includes(q);
          case 'description': return r.description.toLowerCase().includes(q);
          case 'condition': return r.condition.toLowerCase().includes(q);
          case 'all':
          default:
            return (
              r.name.toLowerCase().includes(q) ||
              r.description.toLowerCase().includes(q) ||
              r.category.toLowerCase().includes(q) ||
              r.condition.toLowerCase().includes(q)
            );
        }
      });
    }

    return filtered.sort((a, b) => (b.effectiveness ?? 0) - (a.effectiveness ?? 0));
  };

  getTabCounts = (rules: Rule[]) => {
    const allowed = rules.filter(r => ['active', 'inactive', 'warning'].includes(r.status));
    return {
      active: allowed.filter(r => !r.is_deleted && r.status === 'active').length,
      all: allowed.filter(r => !r.is_deleted).length,
      attention: allowed.filter(r =>
        !r.is_deleted && (r.status === 'warning' || (r.effectiveness ?? 0) < 70 || (r.false_positives ?? 0) > 100)
      ).length,
      deleted: allowed.filter(r => r.is_deleted).length,
    };
  };

  getSearchColumnDisplayName = (column: SearchColumn): string => {
    switch (column) {
      case 'all': return 'All Columns';
      case 'name': return 'Rule';
      case 'category': return 'Category';
      case 'description': return 'Description';
      case 'condition': return 'Rule Condition';
      default: return 'All Columns';
    }
  };

  getSearchColumns = (): Array<{ value: SearchColumn; label: string }> => ([
    { value: 'all', label: 'All Columns' },
    { value: 'name', label: 'Rule' },
    { value: 'category', label: 'Category' },
    { value: 'description', label: 'Description' },
    { value: 'condition', label: 'Rule Condition' },
  ]);

  getEffectivenessColorClass = (effectiveness: number): string => {
    if (effectiveness >= 90) return 'text-green-600';
    if (effectiveness >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };
  getEffectivenessBackgroundClass = (effectiveness: number): string => {
    if (effectiveness >= 90) return 'bg-green-500';
    if (effectiveness >= 70) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  updateRuleInStore = (updatedRule: Rule) => {
    this.rules = this.rules.map(r => (r.id === updatedRule.id ? { ...updatedRule, isCalculating: false, hasCalculated: true } : r));
    this.inProgressRules = this.inProgressRules.map(r => (r.id === updatedRule.id ? { ...updatedRule, isCalculating: false, hasCalculated: true } : r));
  };
}

export const ruleManagementStore = new RuleManagementStore();
