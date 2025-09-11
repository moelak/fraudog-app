// OpenAI Rule Response Types
export interface OpenAIRule {
  rule_name: string;
  description: string;
  risk_score: number;
  conditions: string;
  decision: string;
  metadata: {
    pattern_type: string;
    confidence_level: number;
    expected_false_positive_rate: number;
    improvements?: string;
  };
}

export interface OpenAIResponse {
  rules: OpenAIRule[];
}

// Database Rule Types
export interface DatabaseRule {
  id?: number;
  user_id?: string;
  name: string;
  description: string;
  category: string;
  condition: string;
  severity: 'high' | 'medium' | 'low';
  status: 'active' | 'inactive' | 'draft';
  log_only: boolean;
  is_deleted?: boolean;
  created_at?: Date;
  updated_at?: Date;
  source: 'ai_generated';
  organization_id?: string;
  decision: 'allow' | 'deny' | 'review';
}

export interface AIGenerationRecord {
  id?: number;
  organization_id: string;
  user_id: string;
  created_at?: Date;
  updated_at?: Date;
  thread_id?: string;
  assistant_id?: string;
  description: string;
  rule_id?: string;
  status: 'processing' | 'completed' | 'failed';
  json_data?: AIGenerationJsonData;
  token_estimation: number;
  user_instructions: string;
}

export interface AIGenerationJsonData {
  analysisType: 'quick' | 'deep';
  csvMetadata: {
    fileName: string;
    recordCount: number;
    sampleSize: number;
  };
  tokenUsage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    estimatedCost: number;
  };
  generatedRules: OpenAIRule[];
  selectedRuleIndex: number;
  impactAnalysis: {
    wouldCatch: number;
    falsePositives: number;
    potentialFraudPrevented: number;
  };
  debugInfo?: any;
  userInstructions: string;
}

// User Context Type
export interface UserContext {
  user_id: number;
  organization_id: string;
}

/**
 * Convert risk score (0-100) to severity level
 */
export const convertRiskScoreToSeverity = (riskScore: number): 'high' | 'medium' | 'low' => {
  if (riskScore >= 80) return 'high';
  if (riskScore >= 60) return 'medium';
  return 'low';
};

/**
 * Normalize decision string to valid database enum
 */
export const normalizeDecision = (decision: string): 'allow' | 'deny' | 'review' => {
  const normalized = decision.toLowerCase().trim();
  if (normalized === 'allow') return 'allow';
  if (normalized === 'deny') return 'deny';
  return 'review'; // Default fallback
};

/**
 * Convert OpenAI rule to database-ready rule structure
 */
export const convertOpenAIRuleToDatabase = (
  openAIRule: OpenAIRule,
  userContext: UserContext
): DatabaseRule => {
  return {
    name: openAIRule.rule_name,
    description: openAIRule.description,
    category: openAIRule.metadata?.pattern_type || 'General',
    condition: openAIRule.conditions,
    severity: convertRiskScoreToSeverity(openAIRule.risk_score),
    decision: normalizeDecision(openAIRule.decision),
    status: 'active',
    log_only: false, // User configurable in Step 4
    source: 'ai_generated',
    user_id: userContext.user_id.toString(),
    organization_id: userContext.organization_id,
    is_deleted: false
  };
};

/**
 * Create initial AI generation record for tracking
 */
export const createInitialAIGenerationRecord = (
  userContext: UserContext,
  userInstructions: string,
  tokenEstimation: number
): Omit<AIGenerationRecord, 'id' | 'created_at' | 'updated_at'> => {
  return {
    organization_id: userContext.organization_id,
    user_id: userContext.user_id.toString(),
    description: "AI-generated fraud detection rule",
    status: 'processing',
    user_instructions: userInstructions,
    token_estimation: tokenEstimation
  };
};

/**
 * Update AI generation record with OpenAI response
 */
export const updateAIGenerationWithResponse = (
  openAIResponse: OpenAIResponse,
  analysisType: 'quick' | 'deep',
  csvMetadata: { fileName: string; recordCount: number; sampleSize: number },
  tokenUsage: { inputTokens: number; outputTokens: number; totalTokens: number; estimatedCost: number },
  userInstructions: string,
  threadId?: string,
  assistantId?: string,
  debugInfo?: any
): Partial<AIGenerationRecord> => {
  const jsonData: AIGenerationJsonData = {
    analysisType,
    csvMetadata,
    tokenUsage,
    generatedRules: openAIResponse.rules,
    selectedRuleIndex: -1, // Will be set when user selects
    impactAnalysis: {
      wouldCatch: 0,
      falsePositives: 0,
      potentialFraudPrevented: 0
    }, // Will be calculated
    debugInfo,
    userInstructions
  };

  return {
    status: 'completed',
    thread_id: threadId,
    assistant_id: assistantId,
    json_data: jsonData
  };
};

/**
 * Calculate estimated impact based on CSV data and selected rule
 */
export const calculateRuleImpact = (
  rule: OpenAIRule,
  csvData: any[]
): { wouldCatch: number; falsePositives: number; potentialFraudPrevented: number } => {
  // This is a simplified calculation - in production, you'd want more sophisticated analysis
  const totalTransactions = csvData.length;
  const estimatedCatchRate = rule.metadata?.confidence_level || 70;
  const estimatedFalsePositiveRate = rule.metadata?.expected_false_positive_rate || 0.05;
  
  const wouldCatch = Math.round(totalTransactions * (estimatedCatchRate / 100));
  const falsePositives = Math.round(wouldCatch * estimatedFalsePositiveRate);
  
  // Estimate fraud prevented based on average transaction amount
  const avgAmount = csvData.reduce((sum, row) => sum + (parseFloat(row.amount) || 0), 0) / totalTransactions;
  const potentialFraudPrevented = Math.round(wouldCatch * avgAmount);

  return {
    wouldCatch,
    falsePositives,
    potentialFraudPrevented
  };
};
