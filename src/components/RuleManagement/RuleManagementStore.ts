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
  isCalculating?: boolean; // Track if this rule is still calculating
  hasCalculated?: boolean; // Track if this rule has already been calculated
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
  isCalculatingMetrics = false; // Track if we're calculating metrics for the table
  calculatedRules = new Set<string>(); // Track which rules have been calculated
  isTableLoading = false; // Track if the entire table is loading
  tableLoadingProgress = 0; // Track loading progress (0-100)

  constructor() {
    makeAutoObservable(this);
  }

  // Helper function to generate mock data for a rule with iterations
  generateMockDataWithIterations = async (rule: Rule): Promise<Rule> => {
    // Check if this rule has already been calculated
    if (this.calculatedRules.has(rule.id)) {
      return rule;
    }

    // Mark rule as being calculated
    this.calculatedRules.add(rule.id);
    
    // Mark rule as calculating
    const ruleWithCalculating = { ...rule, isCalculating: true, hasCalculated: false };
    
    // Number of iterations (5-10 random iterations)
    const iterations = Math.floor(Math.random() * 6) + 5; // 5-10 iterations
    
    let finalRule = ruleWithCalculating;
    
    for (let i = 0; i < iterations; i++) {
      // Generate new values for each iteration
      const catches = Math.floor(Math.random() * 101) + 50; // 50-150
      const maxFalsePositives = Math.min(40, catches - 1);
      const false_positives = Math.floor(Math.random() * maxFalsePositives) + 1;
      const effectiveness = Math.round((1 - (false_positives / catches)) * 1000) / 10;
      
      finalRule = {
        ...finalRule,
        catches,
        false_positives,
        effectiveness,
        isCalculating: i < iterations - 1, // Only false on the last iteration
        hasCalculated: i === iterations - 1 // True only on the last iteration
      };
      
      // Update the rule in the appropriate array during iterations
      if (rule.status === 'in progress') {
        const index = this.inProgressRules.findIndex(r => r.id === rule.id);
        if (index !== -1) {
          this.inProgressRules[index] = finalRule;
          // Re-sort by effectiveness after each update (only if not calculating)
          if (!finalRule.isCalculating) {
            this.inProgressRules.sort((a, b) => b.effectiveness - a.effectiveness);
          }
        }
      } else {
        const index = this.rules.findIndex(r => r.id === rule.id);
        if (index !== -1) {
          this.rules[index] = finalRule;
        }
      }
      
      // Wait between iterations (200-500ms)
      if (i < iterations - 1) {
        await new Promise(resolve => setTimeout(resolve, Math.random() * 300 + 200));
      }
    }
    
    return finalRule;
  }

  // Helper function to generate mock data for a rule (single iteration)
  generateMockData = (rule: Rule): Rule => {
    // Check if this rule has already been calculated
    if (rule.hasCalculated || this.calculatedRules.has(rule.id)) {
      return rule;
    }

    // Generate catches between 50-150
    const catches = Math.floor(Math.random() * 101) + 50; // 50-150
    
    // Generate false positives between 1-40, ensuring it's less than catches
    const maxFalsePositives = Math.min(40, catches - 1);
    const false_positives = Math.floor(Math.random() * maxFalsePositives) + 1; // 1 to maxFalsePositives
    
    // Calculate effectiveness: 1 - (falsePositives / catches)
    const effectiveness = Math.round((1 - (false_positives / catches)) * 1000) / 10; // Round to 1 decimal
    
    this.calculatedRules.add(rule.id);
    
    return {
      ...rule,
      catches,
      false_positives,
      effectiveness,
      isCalculating: false,
      hasCalculated: true
    };
  }

  setRules = async (newRules: Rule[]) => {
    // Start table loading
    this.isTableLoading = true;
    this.tableLoadingProgress = 0;

    // Filter out rules with status 'in progress' for main rules display
    const mainRules = newRules.filter(rule => ['active', 'inactive', 'warning'].includes(rule.status));
    
    // Only process rules that haven't been calculated yet
    const uncalculatedMainRules = mainRules.filter(rule => !this.calculatedRules.has(rule.id));
    const alreadyCalculatedMainRules = mainRules.filter(rule => this.calculatedRules.has(rule.id));
    
    // Keep already calculated rules as they are
    const existingCalculatedRules = alreadyCalculatedMainRules.map(rule => {
      const existingRule = this.rules.find(r => r.id === rule.id);
      return existingRule || rule;
    });
    
    // Set initial rules with calculating state for new rules only
    const initialRules = [
      ...existingCalculatedRules,
      ...uncalculatedMainRules.map(rule => ({ 
        ...rule, 
        isCalculating: true, 
        hasCalculated: false,
        catches: 0, 
        false_positives: 0, 
        effectiveness: 0 
      }))
    ];
    
    this.rules = initialRules;
    this.isCalculatingMetrics = uncalculatedMainRules.length > 0;
    
    // Update progress
    this.tableLoadingProgress = 25;
    
    // Generate mock data with iterations for new main rules only
    if (uncalculatedMainRules.length > 0) {
      const totalRules = uncalculatedMainRules.length;
      let completedRules = 0;
      
      await Promise.all(
        uncalculatedMainRules.map(async (rule) => {
          await this.generateMockDataWithIterations(rule);
          completedRules++;
          // Update progress (25% to 75% for main rules)
          this.tableLoadingProgress = 25 + (completedRules / totalRules) * 50;
        })
      );
      this.isCalculatingMetrics = false;
    } else {
      this.tableLoadingProgress = 75;
    }
    
    // Handle in progress rules
    const inProgressRules = newRules.filter(rule => rule.status === 'in progress');
    const uncalculatedInProgressRules = inProgressRules.filter(rule => !this.calculatedRules.has(rule.id));
    const alreadyCalculatedInProgressRules = inProgressRules.filter(rule => this.calculatedRules.has(rule.id));
    
    // Keep already calculated in progress rules
    const existingCalculatedInProgressRules = alreadyCalculatedInProgressRules.map(rule => {
      const existingRule = this.inProgressRules.find(r => r.id === rule.id);
      return existingRule || rule;
    });
    
    // Set initial in progress rules
    this.inProgressRules = this.deduplicateRules([
      ...existingCalculatedInProgressRules,
      ...uncalculatedInProgressRules.map(rule => ({ 
        ...rule, 
        isCalculating: true, 
        hasCalculated: false,
        catches: 0, 
        false_positives: 0, 
        effectiveness: 0 
      }))
    ]);
    
    // Generate mock data for new in progress rules with iterations
    if (uncalculatedInProgressRules.length > 0) {
      const totalInProgressRules = uncalculatedInProgressRules.length;
      let completedInProgressRules = 0;
      
      await Promise.all(
        uncalculatedInProgressRules.map(async (rule) => {
          await this.generateMockDataWithIterations(rule);
          completedInProgressRules++;
          // Update progress (75% to 95% for in progress rules)
          this.tableLoadingProgress = 75 + (completedInProgressRules / totalInProgressRules) * 20;
        })
      );
    } else {
      this.tableLoadingProgress = 95;
    }

    // Final loading delay to ensure smooth transition
    await new Promise(resolve => setTimeout(resolve, 500));
    this.tableLoadingProgress = 100;
    
    // Small delay before hiding loading
    await new Promise(resolve => setTimeout(resolve, 200));
    this.isTableLoading = false;
  }

  addInProgressRule = async (rule: Rule) => {
    if (rule.status === 'in progress') {
      // Check if rule already exists to prevent duplicates
      const existingIndex = this.inProgressRules.findIndex(existingRule => existingRule.id === rule.id);
      
      if (existingIndex !== -1) {
        // Rule already exists, don't recalculate
        return;
      }
      
      // Start with calculating state
      const ruleWithCalculating = { 
        ...rule, 
        isCalculating: true, 
        hasCalculated: false,
        catches: 0, 
        false_positives: 0, 
        effectiveness: 0 
      };
      
      // Add new rule
      this.inProgressRules.push(ruleWithCalculating);
      
      // Generate mock data with iterations
      await this.generateMockDataWithIterations(ruleWithCalculating);
      
      // Ensure the array remains deduplicated
      this.inProgressRules = this.deduplicateRules(this.inProgressRules);
    }
  }

  removeInProgressRule = (ruleId: string) => {
    this.inProgressRules = this.inProgressRules.filter(rule => rule.id !== ruleId);
    // Remove from calculated rules set so it can be recalculated if added again
    this.calculatedRules.delete(ruleId);
  }

  updateInProgressRule = async (updatedRule: Rule) => {
    const index = this.inProgressRules.findIndex(rule => rule.id === updatedRule.id);
    if (index !== -1) {
      if (updatedRule.status === 'in progress') {
        // Check if already calculated
        if (this.calculatedRules.has(updatedRule.id)) {
          // Keep existing calculated values
          const existingRule = this.inProgressRules[index];
          this.inProgressRules[index] = {
            ...updatedRule,
            catches: existingRule.catches,
            false_positives: existingRule.false_positives,
            effectiveness: existingRule.effectiveness,
            isCalculating: false,
            hasCalculated: true
          };
        } else {
          // Start with calculating state
          const ruleWithCalculating = { 
            ...updatedRule, 
            isCalculating: true, 
            hasCalculated: false,
            catches: 0, 
            false_positives: 0, 
            effectiveness: 0 
          };
          this.inProgressRules[index] = ruleWithCalculating;
          
          // Generate mock data with iterations
          await this.generateMockDataWithIterations(ruleWithCalculating);
        }
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

  // Helper method to get effectiveness color class
  getEffectivenessColorClass = (effectiveness: number): string => {
    if (effectiveness >= 90) return 'text-green-600';
    if (effectiveness >= 70) return 'text-yellow-600';
    return 'text-red-600';
  }

  // Helper method to get effectiveness background color class
  getEffectivenessBackgroundClass = (effectiveness: number): string => {
    if (effectiveness >= 90) return 'bg-green-500';
    if (effectiveness >= 70) return 'bg-yellow-500';
    return 'bg-red-500';
  }

  // Method to clear calculated rules (useful for testing)
  clearCalculatedRules = () => {
    this.calculatedRules.clear();
  }

  // Get loading status message based on progress
  getLoadingMessage = (): string => {
    if (this.tableLoadingProgress < 25) {
      return 'Loading rules from database...';
    } else if (this.tableLoadingProgress < 75) {
      return 'Calculating fraud detection metrics...';
    } else if (this.tableLoadingProgress < 95) {
      return 'Processing generated rules...';
    } else {
      return 'Finalizing data...';
    }
  }
}

export const ruleManagementStore = new RuleManagementStore();