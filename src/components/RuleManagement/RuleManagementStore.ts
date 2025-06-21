import { makeAutoObservable } from "mobx";

export interface Rule {
  id: string;
  name: string;
  description: string;
  category: string;
  condition: string;
  severity: 'low' | 'medium' | 'high';
  status: 'active' | 'inactive' | 'warning';
  log_only: boolean;
  catches: number;
  false_positives: number;
  effectiveness: number;
  source: 'AI' | 'User';
  is_deleted: boolean;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export class RuleManagementStore {
  activeTab: 'active' | 'all' | 'attention' | 'deleted' = 'all';
  searchQuery = '';
  isCreateModalOpen = false;
  isEditModalOpen = false;
  isChargebackAnalysisOpen = false;
  isDeleteConfirmModalOpen = false;
  editingRule: Rule | null = null;
  deletingRule: Rule | null = null;

  constructor() {
    makeAutoObservable(this);
  }

  setActiveTab = (tab: 'active' | 'all' | 'attention' | 'deleted') => {
    this.activeTab = tab;
  }

  setSearchQuery = (query: string) => {
    this.searchQuery = query;
  }

  openCreateModal = () => {
    this.isCreateModalOpen = true;
    this.editingRule = null;
  }

  closeCreateModal = () => {
    this.isCreateModalOpen = false;
    this.editingRule = null;
  }

  openEditModal = (rule: Rule) => {
    this.editingRule = rule;
    this.isEditModalOpen = true;
  }

  closeEditModal = () => {
    this.isEditModalOpen = false;
    this.editingRule = null;
  }

  openChargebackAnalysis = () => {
    this.isChargebackAnalysisOpen = true;
  }

  closeChargebackAnalysis = () => {
    this.isChargebackAnalysisOpen = false;
  }

  openDeleteConfirmModal = (rule: Rule) => {
    this.deletingRule = rule;
    this.isDeleteConfirmModalOpen = true;
  }

  closeDeleteConfirmModal = () => {
    this.isDeleteConfirmModalOpen = false;
    this.deletingRule = null;
  }

  editRule = (rule: Rule) => {
    this.openEditModal(rule);
  }

  viewRuleHistory = (id: string) => {
    console.log('Viewing history for rule:', id);
  }

  filterRules = (rules: Rule[]) => {
    let filtered = rules;

    // Filter by tab
    if (this.activeTab === 'active') {
      filtered = filtered.filter(rule => !rule.is_deleted && rule.status === 'active');
    } else if (this.activeTab === 'all') {
      filtered = filtered.filter(rule => !rule.is_deleted);
    } else if (this.activeTab === 'attention') {
      filtered = filtered.filter(rule => 
        !rule.is_deleted && (
          rule.status === 'warning' || 
          rule.effectiveness < 70 || 
          rule.false_positives > 100
        )
      );
    } else if (this.activeTab === 'deleted') {
      filtered = filtered.filter(rule => rule.is_deleted);
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

  getTabCounts = (rules: Rule[]) => {
    return {
      active: rules.filter(rule => !rule.is_deleted && rule.status === 'active').length,
      all: rules.filter(rule => !rule.is_deleted).length,
      attention: rules.filter(rule => 
        !rule.is_deleted && (
          rule.status === 'warning' || 
          rule.effectiveness < 70 || 
          rule.false_positives > 100
        )
      ).length,
      deleted: rules.filter(rule => rule.is_deleted).length
    };
  }
}

export const ruleManagementStore = new RuleManagementStore();