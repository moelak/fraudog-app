import React, { useState, useCallback } from 'react';
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  Button,
  Typography,
  Paper,
  Alert,
  CircularProgress,
  Backdrop
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useRuleManagementStore } from '@/hooks/useRuleManagementStore';
import { 
  callQuickAnalysis, 
  callDeepAnalysis, 
  estimateTokenCount,
  validateCSVData,
  parseCSVData,
  type TokenEstimation,
  type StreamingStatus
} from '@/services/openaiService';
import {
  convertOpenAIRuleToDatabase,
  calculateRuleImpact,
  type OpenAIRule,
  type UserContext,
  type DatabaseRule
} from '@/utils/ruleConverter';

// Step Components
import DataUploadStep from './steps/DataUploadStep';
import AnalysisSelectionStep from './steps/AnalysisSelectionStep';
import RuleSelectionStep from './steps/RuleSelectionStep';
import ReviewStep from './steps/ReviewStep';

const steps = [
  'Select Data',
  'Token Analysis',
  'Output Rules',
  'Review'
];

export interface StepperData {
  // Step 1: Data Upload
  csvFile: File | null;
  csvContent: string;
  csvData: string[][]; // Fixed: Changed from any[] to string[][]
  csvHeaders: string[];
  userInstructions: string;
  
  // Step 2: Analysis Selection
  analysisType: 'quick' | 'deep';
  tokenEstimation: TokenEstimation | null;
  
  // Step 3: Rule Selection
  generatedRules: OpenAIRule[];
  selectedRuleIndex: number;
  ruleImpactAnalysis: {
    wouldCatch: number;
    falsePositives: number;
    potentialFraudPrevented: number;
  } | null;
  
  // Step 4: Review
  finalRule: DatabaseRule | null;
  logOnly: boolean;
  
  // Processing state
  isProcessing: boolean;
  processingError: string | null;
  streamingStatus: StreamingStatus | null;
  
  // OpenAI metadata
  threadId?: string;
  assistantId?: string;
}

const CreateRuleByAI: React.FC = () => {
  const navigate = useNavigate();
  const { addRule } = useRuleManagementStore();
  
  const [activeStep, setActiveStep] = useState(0);
  const [data, setData] = useState<StepperData>({
    csvFile: null,
    csvContent: '',
    csvData: [] as string[][], // Fix: Explicitly type as string[][]
    csvHeaders: [],
    userInstructions: '',
    analysisType: 'quick',
    tokenEstimation: null,
    generatedRules: [],
    selectedRuleIndex: -1,
    ruleImpactAnalysis: null,
    finalRule: null,
    logOnly: false,
    isProcessing: false,
    processingError: null,
    streamingStatus: null
  });

  // Mock user context - in production, get from auth
  const userContext: UserContext = {
    user_id: 1,
    organization_id: 'org_123'
  };

  const updateData = useCallback((updates: Partial<StepperData>) => {
    setData(prev => ({ ...prev, ...updates }));
  }, []);

  const handleNext = async () => {
    if (activeStep === 1) {
      // Step 2: Run analysis
      await runAnalysis();
    } else if (activeStep === 2) {
      // Step 3: Calculate impact and prepare final rule
      if (data.selectedRuleIndex >= 0 && data.generatedRules[data.selectedRuleIndex]) {
        const selectedRule = data.generatedRules[data.selectedRuleIndex];
        const impact = calculateRuleImpact(selectedRule, data.csvData);
        const finalRule = convertOpenAIRuleToDatabase(selectedRule, userContext);
        
        updateData({
          ruleImpactAnalysis: impact,
          finalRule
        });
      }
    } else if (activeStep === 3) {
      // Step 4: Save rule
      await saveRule();
      return; // Don't increment step, we'll navigate away
    }
    
    setActiveStep(prev => prev + 1);
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  const runAnalysis = async () => {
    if (!data.csvContent) {
      updateData({ processingError: 'No CSV data available' });
      return;
    }

    updateData({ 
      isProcessing: true, 
      processingError: null,
      streamingStatus: null
    });

    try {
      if (data.analysisType === 'quick') {
        const result = await callQuickAnalysis(data.csvContent, data.userInstructions);
        
        if (result.success && result.data) {
          updateData({
            generatedRules: result.data.rules,
            isProcessing: false
          });
        } else {
          updateData({
            processingError: result.error || 'Analysis failed',
            isProcessing: false
          });
        }
      } else {
        const result = await callDeepAnalysis(
          data.csvContent, 
          data.userInstructions,
          (status) => updateData({ streamingStatus: status })
        );
        
        if (result.success && result.data) {
          updateData({
            generatedRules: result.data.rules,
            threadId: result.threadId,
            assistantId: result.assistantId,
            isProcessing: false,
            streamingStatus: null
          });
        } else {
          updateData({
            processingError: result.error || 'Analysis failed',
            isProcessing: false,
            streamingStatus: null
          });
        }
      }
    } catch (error) {
      updateData({
        processingError: error instanceof Error ? error.message : 'Unknown error',
        isProcessing: false,
        streamingStatus: null
      });
    }
  };

  const saveRule = async () => {
    if (!data.finalRule) {
      updateData({ processingError: 'No rule to save' });
      return;
    }

    updateData({ isProcessing: true, processingError: null });

    try {
      // Apply log_only setting from Step 4
      const ruleToSave = {
        ...data.finalRule,
        log_only: data.logOnly
      };

      // In production, this would also save to api.ai_rule_generation table
      await addRule(ruleToSave);
      
      // Navigate back to rule management
      navigate('/rules');
    } catch (error) {
      updateData({
        processingError: error instanceof Error ? error.message : 'Failed to save rule',
        isProcessing: false
      });
    }
  };

  const canProceed = () => {
    switch (activeStep) {
      case 0:
        return data.csvContent && data.csvData.length > 0;
      case 1:
        return data.tokenEstimation !== null;
      case 2:
        return data.selectedRuleIndex >= 0 && data.generatedRules.length > 0;
      case 3:
        return data.finalRule !== null;
      default:
        return false;
    }
  };

  const getStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <DataUploadStep
            data={data}
            updateData={updateData}
            onValidation={(csvContent) => {
              const validation = validateCSVData(csvContent);
              if (validation.valid) {
                const parsedData = parseCSVData(csvContent);
                updateData({
                  csvContent,
                  csvData: parsedData,
                  processingError: null
                });
              } else {
                updateData({
                  processingError: validation.error
                });
              }
            }}
          />
        );
      case 1:
        return (
          <AnalysisSelectionStep
            data={data}
            updateData={updateData}
            onTokenEstimation={(csvContent) => {
              const estimation = estimateTokenCount(csvContent);
              updateData({ tokenEstimation: estimation });
            }}
          />
        );
      case 2:
        return (
          <RuleSelectionStep
            data={data}
            updateData={updateData}
          />
        );
      case 3:
        return (
          <ReviewStep
            data={data}
            updateData={updateData}
          />
        );
      default:
        return <Typography>Unknown step</Typography>;
    }
  };

  return (
    <Box sx={{ width: '100%', p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Create Rule with AI
      </Typography>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {data.processingError && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {data.processingError}
          </Alert>
        )}

        <Box sx={{ minHeight: 400 }}>
          {getStepContent()}
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'row', pt: 2 }}>
          <Button
            color="inherit"
            disabled={activeStep === 0 || data.isProcessing}
            onClick={handleBack}
            sx={{ mr: 1 }}
          >
            Back
          </Button>
          <Box sx={{ flex: '1 1 auto' }} />
          <Button
            onClick={handleNext}
            disabled={!canProceed() || data.isProcessing}
            variant="contained"
          >
            {data.isProcessing ? (
              <CircularProgress size={20} sx={{ mr: 1 }} />
            ) : null}
            {activeStep === steps.length - 1 ? 'Save Rule' : 'Next'}
          </Button>
        </Box>
      </Paper>

      {/* Processing Backdrop */}
      <Backdrop
        sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={data.isProcessing}
      >
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress color="inherit" sx={{ mb: 2 }} />
          <Typography variant="h6">
            {data.streamingStatus?.status || 'Processing...'}
          </Typography>
          {data.streamingStatus?.text && (
            <Typography variant="body2" sx={{ mt: 1, maxWidth: 400 }}>
              {data.streamingStatus.text}
            </Typography>
          )}
        </Box>
      </Backdrop>
    </Box>
  );
};

export default CreateRuleByAI;
