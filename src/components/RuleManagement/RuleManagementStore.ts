// components/RuleManagement/RuleManagementStore.ts
import { makeAutoObservable } from "mobx";
import { 
  DatabaseRule, 
  AIGenerationRecord, 
  createInitialAIGenerationRecord,
  updateAIGenerationWithResponse,
  type UserContext 
} from "../../utils/ruleConverter";

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
  decision:  'allow' | 'review' | 'deny';
  
  // AI-specific fields
  ai_generation_id?: string;  // Link to ai_rule_generation table
  organization_id?: string;   // Multi-tenant support
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
  isEditingFromGenerated = false; 
  expandedRows = new Set<string>();
  displayManualRuleStepper:boolean = false;
  displayAIRuleStepper: boolean = false

  rules: Rule[] = [];
  inProgressRules: Rule[] = [];

  loadingPromise: Promise<void> | null = null;

  constructor() {
    makeAutoObservable(this);
  }

  /**
   * Add a new AI-generated rule with dual-table saving
   */
  addRule = async (rule: DatabaseRule, aiGenerationData?: Partial<AIGenerationRecord>): Promise<void> => {
    try {
      // In a real implementation, this would make API calls to save to both tables
      // For now, we'll simulate the process and add to local store
      
      const newRule: Rule = {
        id: rule.id?.toString() || Date.now().toString(),
        name: rule.name,
        description: rule.description,
        category: rule.category,
        condition: rule.condition,
        severity: rule.severity,
        status: rule.status as 'active' | 'inactive' | 'warning' | 'in progress',
        log_only: rule.log_only,
        decision: rule.decision,
        source: rule.source === 'ai_generated' ? 'AI' : 'User',
        user_id: rule.user_id?.toString() || '1',
        organization_id: rule.organization_id,
        is_deleted: rule.is_deleted || false,
        created_at: rule.created_at?.toISOString() || new Date().toISOString(),
        updated_at: rule.updated_at?.toISOString() || new Date().toISOString(),
        
        // Default metrics for new rules
        catches: 0,
        false_positives: 0,
        chargebacks: 0,
        effectiveness: null,
        
        isCalculating: false,
        hasCalculated: true
      };

      // Add AI generation metadata if provided
      if (aiGenerationData && rule.source === 'ai_generated') {
        newRule.ai_generation_id = aiGenerationData.id?.toString();
      }

      // Add to appropriate list based on status
      if (newRule.status === 'in progress') {
        await this.addInProgressRule(newRule);
      } else {
        this.rules.push(newRule);
        this.rules = this.deduplicateRules(this.rules)
          .sort((a, b) => (b.effectiveness ?? 0) - (a.effectiveness ?? 0));
      }

      console.log('Rule added successfully:', newRule.name);
    } catch (error) {
      console.error('Failed to add rule:', error);
      throw error;
    }
  };

  /**
   * Save AI-generated rule with complete metadata tracking
   */
  saveAIGeneratedRule = async (
    rule: DatabaseRule,
    userContext: UserContext,
    aiMetadata: {
      analysisType: 'quick' | 'deep';
      csvMetadata: { fileName: string; recordCount: number; sampleSize: number };
      tokenUsage: { inputTokens: number; outputTokens: number; totalTokens: number; estimatedCost: number };
      userInstructions: string;
      threadId?: string;
      assistantId?: string;
      debugInfo?: any;
    }
  ): Promise<void> => {
    try {
      // Step 1: Create AI generation record
      const aiGenerationRecord = createInitialAIGenerationRecord(
        userContext,
        aiMetadata.userInstructions,
        aiMetadata.tokenUsage.totalTokens
      );

      // Step 2: Update with response data
      const updatedAIRecord = updateAIGenerationWithResponse(
        { rules: [] }, // This would contain the actual OpenAI response
        aiMetadata.analysisType,
        aiMetadata.csvMetadata,
        aiMetadata.tokenUsage,
        aiMetadata.userInstructions,
        aiMetadata.threadId,
        aiMetadata.assistantId,
        aiMetadata.debugInfo
      );

      // Combine the records
      const completeAIRecord: Partial<AIGenerationRecord> = {
        ...aiGenerationRecord,
        ...updatedAIRecord,
        id: Date.now(), // In production, this would be generated by the database
      };

      // Step 3: Save rule with AI metadata
      await this.addRule(rule, completeAIRecord);

      console.log('AI-generated rule saved with metadata tracking');
    } catch (error) {
      console.error('Failed to save AI-generated rule:', error);
      throw error;
    }
  };

  setRules = async (newRules: Rule[]) => {
    if (this.loadingPromise) return this.loadingPromise;
    this.loadingPromise = this.performSetRules(newRules);
    try {
      await this.loadingPromise;
    } finally {
      this.loadingPromise = null;
    }
  };

  setDisplayManualRuleStepper = (value:boolean)=>{
    if(this.displayAIRuleStepper === true) {
        this.displayAIRuleStepper = false
    }
    this.displayManualRuleStepper = value
  }

  setDisplayAIRuleStepper = (value:boolean)=>{
       if(this.displayManualRuleStepper === true) {
        this.displayManualRuleStepper = false
    }
    this.displayAIRuleStepper = value
  }

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

  openChargebackAnalysis = () => { this.isChargebackAnalysisOpen = true; };
  closeChargebackAnalysis = () => { this.isChargebackAnalysisOpen = false; };
  openDeleteConfirmModal = (rule: Rule) => { this.deletingRule = rule; this.isDeleteConfirmModalOpen = true; };
  closeDeleteConfirmModal = () => { this.isDeleteConfirmModalOpen = false; this.deletingRule = null; };

  editRule = (rule: Rule) => { this.openEditModal(rule); };
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

    if (this.activeTab === 'deleted') {
  filtered = filtered.filter(r => r.is_deleted);
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
