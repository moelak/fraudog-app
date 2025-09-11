import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  Chip,
  Alert,
  LinearProgress,
  FormControlLabel,
  Radio,
  RadioGroup
} from '@mui/material';
import {
  Speed as SpeedIcon,
  Psychology as PsychologyIcon,
  AttachMoney as AttachMoneyIcon
} from '@mui/icons-material';
import { StepperData } from '../CreateRuleByAI';
import { TokenEstimation } from '../../../services/openaiService';

interface AnalysisSelectionStepProps {
  data: StepperData;
  updateData: (updates: Partial<StepperData>) => void;
  onTokenEstimation: (csvContent: string) => void;
}

const AnalysisSelectionStep: React.FC<AnalysisSelectionStepProps> = ({
  data,
  updateData,
  onTokenEstimation
}) => {
  React.useEffect(() => {
    if (data.csvContent && !data.tokenEstimation) {
      onTokenEstimation(data.csvContent);
    }
  }, [data.csvContent, data.tokenEstimation, onTokenEstimation]);

  const handleAnalysisTypeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    updateData({ analysisType: event.target.value as 'quick' | 'deep' });
  };

  const formatCost = (tokens: number, pricePerToken: number): string => {
    const cost = (tokens * pricePerToken).toFixed(4);
    return `$${cost}`;
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Token Estimation Display */}
      {data.tokenEstimation && (
        <Paper sx={{ p: 3, bgcolor: 'info.50', border: '1px solid', borderColor: 'info.200' }}>
          <Typography variant="h6" gutterBottom>
            Data Analysis Summary
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Total Records
              </Typography>
              <Typography variant="h6">
                {data.csvData.length.toLocaleString()}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Estimated Tokens
              </Typography>
              <Typography variant="h6">
                {data.tokenEstimation.totalTokens.toLocaleString()}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Data Size
              </Typography>
              <Typography variant="h6">
                {(data.tokenEstimation.totalTokens * 4 / 1024).toFixed(1)} KB
              </Typography>
            </Box>
          </Box>
        </Paper>
      )}

      {/* Analysis Type Selection */}
      <Box>
        <Typography variant="h6" gutterBottom>
          Choose Analysis Type
        </Typography>
        <RadioGroup
          value={data.analysisType}
          onChange={handleAnalysisTypeChange}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Quick Analysis Option */}
            <Card 
              sx={{ 
                border: data.analysisType === 'quick' ? '2px solid' : '1px solid',
                borderColor: data.analysisType === 'quick' ? 'primary.main' : 'grey.300',
                cursor: 'pointer',
                '&:hover': { borderColor: 'primary.main' }
              }}
              onClick={() => updateData({ analysisType: 'quick' })}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                  <FormControlLabel
                    value="quick"
                    control={<Radio />}
                    label=""
                    sx={{ m: 0 }}
                  />
                  <SpeedIcon sx={{ color: 'primary.main', mt: 0.5 }} />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" gutterBottom>
                      Quick Analysis
                    </Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      Fast rule generation using GPT-4 Turbo. Analyzes patterns and generates 3-5 fraud detection rules in under 30 seconds.
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Chip 
                        icon={<AttachMoneyIcon />} 
                        label={data.tokenEstimation ? formatCost(data.tokenEstimation.totalTokens, 0.00001) : 'Calculating...'} 
                        size="small" 
                        color="success" 
                      />
                      <Chip label="~30 seconds" size="small" />
                      <Chip label="3-5 rules" size="small" />
                    </Box>
                  </Box>
                </Box>
              </CardContent>
            </Card>

            {/* Deep Analysis Option */}
            <Card 
              sx={{ 
                border: data.analysisType === 'deep' ? '2px solid' : '1px solid',
                borderColor: data.analysisType === 'deep' ? 'primary.main' : 'grey.300',
                cursor: 'pointer',
                '&:hover': { borderColor: 'primary.main' }
              }}
              onClick={() => updateData({ analysisType: 'deep' })}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                  <FormControlLabel
                    value="deep"
                    control={<Radio />}
                    label=""
                    sx={{ m: 0 }}
                  />
                  <PsychologyIcon sx={{ color: 'secondary.main', mt: 0.5 }} />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" gutterBottom>
                      Deep Analysis
                    </Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      Comprehensive analysis using OpenAI Assistants with code interpreter. Performs statistical analysis, pattern detection, and generates detailed rules with explanations.
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Chip 
                        icon={<AttachMoneyIcon />} 
                        label={data.tokenEstimation ? formatCost(data.tokenEstimation.totalTokens * 2, 0.00003) : 'Calculating...'} 
                        size="small" 
                        color="warning" 
                      />
                      <Chip label="2-3 minutes" size="small" />
                      <Chip label="5-10 rules" size="small" />
                      <Chip label="Detailed insights" size="small" color="secondary" />
                    </Box>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Box>
        </RadioGroup>
      </Box>

      {/* Cost Breakdown */}
      {data.tokenEstimation && (
        <Paper sx={{ p: 3, bgcolor: 'grey.50' }}>
          <Typography variant="h6" gutterBottom>
            Cost Breakdown
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Quick Analysis
              </Typography>
              <Typography variant="body1">
                {formatCost(data.tokenEstimation.totalTokens, 0.00001)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Input: {data.tokenEstimation.inputTokens.toLocaleString()} tokens
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Deep Analysis
              </Typography>
              <Typography variant="body1">
                {formatCost(data.tokenEstimation.totalTokens * 2, 0.00003)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Includes code interpreter usage
              </Typography>
            </Box>
          </Box>
        </Paper>
      )}

      {/* Processing Status */}
      {data.isProcessing && (
        <Alert severity="info">
          <Box>
            <Typography variant="body2" gutterBottom>
              {data.analysisType === 'quick' ? 'Running Quick Analysis...' : 'Running Deep Analysis...'}
            </Typography>
            <LinearProgress sx={{ mt: 1 }} />
            {data.streamingStatus && (
              <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
                {data.streamingStatus.status}: {data.streamingStatus.text}
              </Typography>
            )}
          </Box>
        </Alert>
      )}

      {/* Error Display */}
      {data.processingError && (
        <Alert severity="error">
          {data.processingError}
        </Alert>
      )}
    </Box>
  );
};

export default AnalysisSelectionStep;
