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
import { useRules } from '@/hooks/useRules';
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
  streamingText: string; // To hold the full text from text_delta events
  streamingEvents: string[]; // To hold all streaming events as text
  
  // OpenAI metadata
  threadId?: string;
  assistantId?: string;
  analysisContext?: string; // Store AI analysis for context
}

const CreateRuleByAI: React.FC = () => {
  const navigate = useNavigate();
  const { addRule } = useRuleManagementStore();
  const { createRule } = useRules();
  
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
    streamingStatuses: [], // Changed from null to empty array
    streamingText: '',
    streamingEvents: [],
    analysisContext: '', // Initialize analysisContext field
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
    streamingStatuses: [], // Changed from null to empty array
    streamingText: '',
    streamingEvents: [],
    analysisContext: '', // Initialize analysisContext field
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
        // Advance UI immediately and run analysis in the background
        advance();
        runAnalysis();
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

    // Set processing to true, but do not await the full analysis here
    // The UI will show a loading state, and the promise will resolve in the background
    updateData({ 
      isProcessing: true, 
      processingError: null,
      streamingStatuses: [],
      generatedRules: [], // Clear previous rules
      streamingText: '', // Reset streaming text
      streamingEvents: [], // Reset streaming events
    });

    const performAnalysis = async () => {
      try {
        let result;
        if (data.analysisType === 'quick') {
          result = await callQuickAnalysis(data.csvContent, data.fileName, data.userInstructions);
        } else {
          result = await callDeepAnalysis(
            data.csvContent, 
            data.fileName,
            data.userInstructions,
            (update) => {
              if (update.type === 'status') {
                setData(prev => ({
                  ...prev,
                  streamingStatuses: [...prev.streamingStatuses, { 
                    step: update.step || 0, 
                    status: update.status || update.message || '', 
                    text: update.text || update.message || '' 
                  }],
                  streamingEvents: [...prev.streamingEvents, `[${update.type}] ${update.text || update.status || update.message || ''}`]
                }));
              } else if (update.type === 'text_delta') {
                setData(prev => ({
                  ...prev,
                  streamingText: update.fullText || ''
                }));
              } else if (update.type === 'completed') {
                setData(prev => ({
                  ...prev,
                  streamingEvents: [...prev.streamingEvents, `[${update.type}] ${update.text || update.message || 'Analysis completed'}`],
                  generatedRules: update.data?.rules || [],
                  analysisContext: prev.streamingText, // Store AI analysis for context
                  isProcessing: false
                }));
              } else if (update.type === 'error') {
                setData(prev => ({
                  ...prev,
                  streamingEvents: [...prev.streamingEvents, `[${update.type}] ERROR: ${update.text || update.message || 'Unknown error'}`],
                  isProcessing: false
                }));
              } else if (['step_created', 'step_progress', 'step_completed', 'run_created', 'message_created', 'message_completed'].includes(update.type)) {
                setData(prev => ({
                  ...prev,
                  streamingEvents: [...prev.streamingEvents, `[${update.type}] ${update.text || update.message || JSON.stringify(update)}`]
                }));
              } else {
                // Handle any other event types
                setData(prev => ({
                  ...prev,
                  streamingEvents: [...prev.streamingEvents, `[${update.type || 'unknown'}] ${update.text || update.message || JSON.stringify(update)}`]
                }));
              }
            }
          );
        }
        
        if (result.success && result.data) {
          updateData({
            generatedRules: result.data.rules,
            threadId: result.threadId,
            assistantId: result.assistantId,
            isProcessing: false, // Turn off processing only on success
            processingError: null,
          });
        } else {
          updateData({
            processingError: result.error || 'Analysis failed',
            isProcessing: false, // Turn off processing on failure
          });
        }
      } catch (error) {
        updateData({
          processingError: error instanceof Error ? error.message : 'Unknown error',
          isProcessing: false, // Turn off processing on catch
        });
      }
    };

    performAnalysis();
  };

  const saveRule = async () => {
    if (!data.finalRule) {
      updateData({ processingError: 'No rule to save' });
      return;
    }

    updateData({ isProcessing: true, processingError: null });

    try {
      // Convert DatabaseRule to CreateRuleData format
      const ruleToSave = {
        name: data.finalRule.name,
        description: data.finalRule.description,
        category: data.finalRule.category,
        condition: data.finalRule.condition,
        status: data.finalRule.status as 'active' | 'inactive' | 'warning',
        severity: data.finalRule.severity,
        log_only: data.logOnly, // Apply log_only setting from Step 4
        source: 'AI' as const,
        decision: data.finalRule.decision
      };

      // Save to public.rules table via Supabase
      await createRule(ruleToSave);
      
      // Close the AI rule stepper and return to rule management
      ruleManagementStore.setDisplayAIRuleStepper(false);
      resetForm();
    } catch (error) {
      updateData({
        processingError: error instanceof Error ? error.message : 'Failed to save rule',
        isProcessing: false,
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
            streamingStatuses={data.streamingStatuses}
            streamingText={data.streamingText}
            streamingEvents={data.streamingEvents}
          />
        );
      case 3:
        return (
          <ReviewStep
            data={data}
            updateData={updateData}
            streamingStatuses={data.streamingStatuses}
            streamingText={data.streamingText}
            streamingEvents={data.streamingEvents}
            analysisContext={data.analysisContext}
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
