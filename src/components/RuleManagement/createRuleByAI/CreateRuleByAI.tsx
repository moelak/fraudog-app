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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { ruleManagementStore } from '@/components/RuleManagement/RuleManagementStore';
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
  fileName: string;
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
  streamingStatuses: StreamingStatus[]; // Changed from single object to array
  
  // OpenAI metadata
  threadId?: string;
  assistantId?: string;
}

const CreateRuleByAI: React.FC = () => {
  const navigate = useNavigate();
  const { addRule } = useRuleManagementStore();
  
  const [activeStep, setActiveStep] = useState(0);
  const [openExitConfirm, setOpenExitConfirm] = useState(false);
  const [nextButtonError, setNextButtonError] = useState<string | null>(null);
  const [data, setData] = useState<StepperData>({
    csvFile: null,
    csvContent: '',
    csvData: [] as string[][], // Fix: Explicitly type as string[][]
    csvHeaders: [],
    fileName: '', // Initialize fileName field
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
    streamingStatuses: [] // Changed from null to empty array
  });

  // Initial data for change detection
  const initialData: StepperData = {
    csvFile: null,
    csvContent: '',
    csvData: [] as Record<string, any>[],
    csvHeaders: [],
    fileName: '', // Initialize fileName field
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
    streamingStatuses: [] // Changed from null to empty array
  };

  // Mock user context - in production, get from auth
  const userContext: UserContext = {
    user_id: 1,
    organization_id: 'org_123'
  };

  const updateData = useCallback((updates: Partial<StepperData>) => {
    setData(prev => ({ ...prev, ...updates }));
  }, []);

  const resetForm = () => {
    setData(initialData);
    setActiveStep(0);
  };

  const handleExitClick = () => {
    const hasChanges = JSON.stringify(data) !== JSON.stringify(initialData);
    if (hasChanges) {
      setOpenExitConfirm(true); // show confirmation
    } else {
      ruleManagementStore.setDisplayAIRuleStepper(false); // safe to exit
      resetForm();
    }
  };

  const cancelExit = () => {
    setOpenExitConfirm(false);
  };

  const confirmExit = () => {
    setOpenExitConfirm(false);
    ruleManagementStore.setDisplayAIRuleStepper(false);
    resetForm();
  };

  const handleNext = async () => {
    if (!canProceed() || data.isProcessing) {
      let errorMsg = 'Please complete the current step to continue.';
      if (data.isProcessing) {
        errorMsg = 'Analysis is currently in progress.';
      } else {
        switch (activeStep) {
          case 0:
            errorMsg = 'Please upload a CSV file to proceed.';
            break;
          case 1:
            errorMsg = 'Token analysis must be complete.';
            break;
          case 2:
            errorMsg = 'Please select a rule to continue.';
            break;
          case 3:
            errorMsg = 'A final rule must be configured.';
            break;
        }
      }
      setNextButtonError(errorMsg);
      setTimeout(() => setNextButtonError(null), 3000); // Clear error after 3s
      return;
    }

    const advance = () => setActiveStep(prev => prev + 1);

    switch (activeStep) {
      case 1: // Token Analysis
        runAnalysis();
        advance();
        break;
      case 2: // Output Rules
        if (data.selectedRuleIndex >= 0 && data.generatedRules[data.selectedRuleIndex]) {
          const selectedRule = data.generatedRules[data.selectedRuleIndex];
          const impact = calculateRuleImpact(selectedRule, data.csvData);
          const finalRule = convertOpenAIRuleToDatabase(selectedRule, userContext);
          updateData({ ruleImpactAnalysis: impact, finalRule });
        }
        advance();
        break;
      case 3: // Review
        await saveRule(); // This function handles navigation, so we don't advance
        break;
      default:
        advance(); // Default behavior for other steps (e.g., step 0)
        break;
    }
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
      streamingStatuses: [] // Reset streaming statuses
    });

    try {
      if (data.analysisType === 'quick') {
        const result = await callQuickAnalysis(data.csvContent, data.fileName, data.userInstructions);
        
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
          data.fileName,
          data.userInstructions,
          (status) => updateData(prev => ({ ...prev, streamingStatuses: [...prev.streamingStatuses, status] }))
        );
        
        if (result.success && result.data) {
          updateData({
            generatedRules: result.data.rules,
            threadId: result.threadId,
            assistantId: result.assistantId,
            isProcessing: false
          });
        } else {
          updateData({
            processingError: result.error || 'Analysis failed',
            isProcessing: false
          });
        }
      }
    } catch (error) {
      updateData({
        processingError: error instanceof Error ? error.message : 'Unknown error',
        isProcessing: false
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
      
      // Close the AI rule stepper and return to rule management
      ruleManagementStore.setDisplayAIRuleStepper(false);
      resetForm();
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
          {/* Exit button on left */}
          <Button 
            variant="outlined" 
            color="secondary" 
            onClick={handleExitClick}
          >
            Exit
          </Button>

          {/* Back/Next buttons on right */}
          <Box sx={{ flex: '1 1 auto' }} />
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {nextButtonError && (
              <Typography variant="caption" color="error" sx={{ mr: 2, fontStyle: 'italic' }}>
                {nextButtonError}
              </Typography>
            )}
            {activeStep > 0 && (
              <Button 
                onClick={handleBack} 
                sx={{ mr: 1 }}
              >
                Back
              </Button>
            )}
            {activeStep < steps.length - 1 ? (
              <Button 
                variant="contained" 
                onClick={handleNext}
                sx={{
                  ...((!canProceed() || data.isProcessing) && {
                    backgroundColor: '#e0e0e0',
                    color: 'rgba(0, 0, 0, 0.38)',
                    cursor: 'not-allowed',
                  })
                }}
              >
                Next
              </Button>
            ) : (
              <Button 
                variant="contained" 
                color="success" 
                onClick={handleNext}
                sx={{
                  ...((!canProceed() || data.isProcessing) && {
                    backgroundColor: '#e0e0e0',
                    color: 'rgba(0, 0, 0, 0.38)',
                    cursor: 'not-allowed',
                  })
                }}
              >
                Save Rule
              </Button>
            )}
          </Box>
        </Box>
      </Paper>

      {/* Exit Confirmation Dialog */}
      <Dialog open={openExitConfirm} onClose={cancelExit}>
        <DialogTitle>Are you sure?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            You have unsaved data. If you exit now, all progress will be lost. Do you really want to exit?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelExit} color="primary">
            No, stay here
          </Button>
          <Button onClick={confirmExit} color="secondary" variant="contained">
            Yes, exit
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CreateRuleByAI;
