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
  catches: number;
  false_positives: number;
  effectiveness: number;
  source: 'AI' | 'User';
  is_deleted: boolean;
  user_id: string;
  created_at: string;
  updated_at: string;
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
  expandedRows = new Set<string>(); // Track which rows are expanded
  rules: Rule[] = [];
  inProgressRules: Rule[] = []; // Track in progress rules separately
  isEditingFromGenerated = false; // Track if editing from Generated Rules section

  constructor() {
    makeAutoObservable(this);
  }

setRules = (newRules: Rule[]) => {
  // Filter out rules with status 'in progress' for main rules display
  this.rules = newRules.filter(rule => ['active', 'inactive', 'warning'].includes(rule.status));
  // Keep in progress rules separate and deduplicated
  const inProgressRules = newRules.filter(rule => rule.status === 'in progress');
  this.inProgressRules = this.deduplicateRules(inProgressRules);
}

addInProgressRule = (rule: Rule) => {
  if (rule.status === 'in progress') {
    // Check if rule already exists to prevent duplicates
    const existingIndex = this.inProgressRules.findIndex(existingRule => existingRule.id === rule.id);
    
    if (existingIndex !== -1) {
      // Update existing rule instead of adding duplicate
      this.inProgressRules[existingIndex] = rule;
    } else {
      // Add new rule
      this.inProgressRules.push(rule);
    }
    
    // Ensure the array remains deduplicated
    this.inProgressRules = this.deduplicateRules(this.inProgressRules);
  }
}

removeInProgressRule = (ruleId: string) => {
  this.inProgressRules = this.inProgressRules.filter(rule => rule.id !== ruleId);
}

updateInProgressRule = (updatedRule: Rule) => {
  const index = this.inProgressRules.findIndex(rule => rule.id === updatedRule.id);
  if (index !== -1) {
    if (updatedRule.status === 'in progress') {
      this.inProgressRules[index] = updatedRule;
    } else {
      // Rule status changed from in progress, remove from this list
      this.inProgressRules.splice(index, 1);
    }
  }
  
  // Ensure the array remains deduplicated after update
  this.inProgressRules = this.deduplicateRules(this.inProgressRules);
}

// Helper method to deduplicate rules by ID
deduplicateRules = (rules: Rule[]): Rule[] => {
  const uniqueRules = new Map<string, Rule>();
  
  rules.forEach(rule => {
    const existingRule = uniqueRules.get(rule.id);
    
    if (!existingRule) {
      // First occurrence of this rule ID
      uniqueRules.set(rule.id, rule);
    } else {
      // Rule already exists, keep the one with the latest updated_at timestamp
      const existingTime = new Date(existingRule.updated_at).getTime();
      const newTime = new Date(rule.updated_at).getTime();
      
      if (newTime > existingTime) {
        uniqueRules.set(rule.id, rule);
      }
    }
  });
  
  return Array.from(uniqueRules.values());
}

  setActiveTab = (tab: 'active' | 'all' | 'attention' | 'deleted') => {
    this.activeTab = tab;
  }

  setSearchQuery = (query: string) => {
    this.searchQuery = query;
  }

  setSearchColumn = (column: SearchColumn) => {
    this.searchColumn = column;
  }

  openCreateModal = () => {
    this.isCreateModalOpen = true;
    this.editingRule = null;
    this.isEditingFromGenerated = false;
  }

  closeCreateModal = () => {
    this.isCreateModalOpen = false;
    this.editingRule = null;
    this.isEditingFromGenerated = false;
  }

  openEditModal = (rule: Rule, fromGenerated = false) => {
    this.editingRule = rule;
    this.isEditModalOpen = true;
    this.isEditingFromGenerated = fromGenerated;
  }

  closeEditModal = () => {
    this.isEditModalOpen = false;
    this.editingRule = null;
    this.isEditingFromGenerated = false;
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

  editRule = (rule: Rule, fromGenerated = false) => {
    this.openEditModal(rule, fromGenerated);
  }

  viewRuleHistory = (id: string) => {
    console.log('Viewing history for rule:', id);
  }

  // Row expansion methods
  toggleRowExpansion = (ruleId: string) => {
    if (this.expandedRows.has(ruleId)) {
      this.expandedRows.delete(ruleId);
    } else {
      this.expandedRows.add(ruleId);
    }
  }

  isRowExpanded = (ruleId: string) => {
    return this.expandedRows.has(ruleId);
  }

  collapseAllRows = () => {
    this.expandedRows.clear();
  }

  filterRules = (rules: Rule[]) => {
    let filtered = rules;

    // Filter by tab - only show rules with allowed statuses
    if (this.activeTab === 'active') {
      filtered = filtered.filter(rule => !rule.is_deleted && rule.status === 'active');
    } else if (this.activeTab === 'all') {
      filtered = filtered.filter(rule => !rule.is_deleted && ['active', 'inactive', 'warning'].includes(rule.status));
    } else if (this.activeTab === 'attention') {
      filtered = filtered.filter(rule => 
        !rule.is_deleted && 
        ['active', 'inactive', 'warning'].includes(rule.status) && (
          rule.status === 'warning' || 
          rule.effectiveness < 70 || 
          rule.false_positives > 100
        )
      );
    } else if (this.activeTab === 'deleted') {
      filtered = filtered.filter(rule => rule.is_deleted && ['active', 'inactive', 'warning'].includes(rule.status));
    }

    // Filter by search query and selected column
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(rule => {
        switch (this.searchColumn) {
          case 'name':
            return rule.name.toLowerCase().includes(query);
          case 'category':
            return rule.category.toLowerCase().includes(query);
          case 'description':
            return rule.description.toLowerCase().includes(query);
          case 'condition':
            return rule.condition.toLowerCase().includes(query);
          case 'all':
          default:
            return (
              rule.name.toLowerCase().includes(query) ||
              rule.description.toLowerCase().includes(query) ||
              rule.category.toLowerCase().includes(query) ||
              rule.condition.toLowerCase().includes(query)
            );
        }
      });
    }

    return filtered;
  }

  getTabCounts = (rules: Rule[]) => {
    // Only count rules with allowed statuses
    const allowedRules = rules.filter(rule => ['active', 'inactive', 'warning'].includes(rule.status));
    
    return {
      active: allowedRules.filter(rule => !rule.is_deleted && rule.status === 'active').length,
      all: allowedRules.filter(rule => !rule.is_deleted).length,
      attention: allowedRules.filter(rule => 
        !rule.is_deleted && (
          rule.status === 'warning' || 
          rule.effectiveness < 70 || 
          rule.false_positives > 100
        )
      ).length,
      deleted: allowedRules.filter(rule => rule.is_deleted).length
    };
  }

  // Helper method to get search column display name
  getSearchColumnDisplayName = (column: SearchColumn): string => {
    switch (column) {
      case 'all':
        return 'All Columns';
      case 'name':
        return 'Rule';
      case 'category':
        return 'Category';
      case 'description':
        return 'Description';
      case 'condition':
        return 'Rule Condition';
      default:
        return 'All Columns';
    }
  }

  // Get available search columns
  getSearchColumns = (): Array<{ value: SearchColumn; label: string }> => {
    return [
      { value: 'all', label: 'All Columns' },
      { value: 'name', label: 'Rule' },
      { value: 'category', label: 'Category' },
      { value: 'description', label: 'Description' },
      { value: 'condition', label: 'Rule Condition' },
    ];
  }
}

export const ruleManagementStore = new RuleManagementStore();