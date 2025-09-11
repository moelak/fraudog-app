import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Card,
  CardContent,
  CardActions,
  Chip,
  Alert,
  Divider,
  Grid
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Security as SecurityIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { StepperData } from '../CreateRuleByAI';
import { OpenAIRule } from '../../../utils/ruleConverter';

interface RuleSelectionStepProps {
  data: StepperData;
  updateData: (updates: Partial<StepperData>) => void;
}

const RuleSelectionStep: React.FC<RuleSelectionStepProps> = ({
  data,
  updateData
}) => {
  const handleRuleSelect = (index: number) => {
    updateData({ selectedRuleIndex: index });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'default';
    }
  };

  const formatCondition = (condition: string) => {
    // Format SQL-like conditions for better readability
    return condition
      .replace(/AND/g, '\nAND')
      .replace(/OR/g, '\nOR')
      .replace(/\(/g, '(\n  ')
      .replace(/\)/g, '\n)');
  };

  if (data.generatedRules.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No rules generated yet
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Please run the analysis in the previous step to generate fraud detection rules.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box>
        <Typography variant="h6" gutterBottom>
          Generated Fraud Detection Rules
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Select the rule that best fits your fraud detection needs. Each rule has been analyzed for potential impact on your transaction data.
        </Typography>
      </Box>

      {/* Rules Grid */}
      <Grid container spacing={3}>
        {data.generatedRules.map((rule, index) => (
          <Grid item xs={12} key={index}>
            <Card 
              sx={{ 
                border: data.selectedRuleIndex === index ? '2px solid' : '1px solid',
                borderColor: data.selectedRuleIndex === index ? 'primary.main' : 'grey.300',
                position: 'relative',
                '&:hover': { 
                  borderColor: 'primary.main',
                  boxShadow: 2
                }
              }}
            >
              {data.selectedRuleIndex === index && (
                <CheckCircleIcon 
                  sx={{ 
                    position: 'absolute', 
                    top: 16, 
                    right: 16, 
                    color: 'primary.main',
                    fontSize: 28
                  }} 
                />
              )}
              
              <CardContent>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    {rule.rule_name}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                    <Chip 
                      label={rule.risk_score || 'Medium'} 
                      color={getSeverityColor(rule.risk_score || 'medium')}
                      size="small"
                    />
                    <Chip 
                      label={rule.metadata?.pattern_type || 'Pattern-based'} 
                      variant="outlined"
                      size="small"
                    />
                    <Chip 
                      label={rule.decision || 'Review'} 
                      color={rule.decision === 'deny' ? 'error' : rule.decision === 'allow' ? 'success' : 'warning'}
                      size="small"
                    />
                  </Box>
                </Box>

                <Typography variant="body2" color="text.secondary" paragraph>
                  {rule.description}
                </Typography>

                <Divider sx={{ my: 2 }} />

                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Rule Condition:
                  </Typography>
                  <Paper sx={{ p: 2, bgcolor: 'grey.50', fontFamily: 'monospace', fontSize: '0.875rem' }}>
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                      {formatCondition(rule.conditions)}
                    </pre>
                  </Paper>
                </Box>

                {rule.metadata?.improvements && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Key Improvements:
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {rule.metadata.improvements}
                    </Typography>
                  </Box>
                )}

                {/* Impact Analysis (if available) */}
                {data.selectedRuleIndex === index && data.ruleImpactAnalysis && (
                  <Box sx={{ mt: 2, p: 2, bgcolor: 'info.50', borderRadius: 1 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Estimated Impact Analysis:
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={4}>
                        <Box sx={{ textAlign: 'center' }}>
                          <SecurityIcon sx={{ color: 'success.main', mb: 1 }} />
                          <Typography variant="h6" color="success.main">
                            {data.ruleImpactAnalysis.wouldCatch}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Potential Catches
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={4}>
                        <Box sx={{ textAlign: 'center' }}>
                          <WarningIcon sx={{ color: 'warning.main', mb: 1 }} />
                          <Typography variant="h6" color="warning.main">
                            {data.ruleImpactAnalysis.falsePositives}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            False Positives
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={4}>
                        <Box sx={{ textAlign: 'center' }}>
                          <TrendingUpIcon sx={{ color: 'primary.main', mb: 1 }} />
                          <Typography variant="h6" color="primary.main">
                            ${data.ruleImpactAnalysis.potentialFraudPrevented.toLocaleString()}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Fraud Prevented
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  </Box>
                )}
              </CardContent>

              <CardActions sx={{ justifyContent: 'flex-end', p: 2 }}>
                <Button
                  variant={data.selectedRuleIndex === index ? "contained" : "outlined"}
                  onClick={() => handleRuleSelect(index)}
                  startIcon={data.selectedRuleIndex === index ? <CheckCircleIcon /> : undefined}
                >
                  {data.selectedRuleIndex === index ? 'Selected' : 'Use This Rule'}
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Selection Summary */}
      {data.selectedRuleIndex >= 0 && (
        <Alert severity="success">
          <Typography variant="body2">
            <strong>Rule Selected:</strong> {data.generatedRules[data.selectedRuleIndex].rule_name}
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            You can proceed to the next step to review and configure the final rule settings.
          </Typography>
        </Alert>
      )}

      {/* No Selection Warning */}
      {data.selectedRuleIndex < 0 && (
        <Alert severity="info">
          <Typography variant="body2">
            Please select a rule to continue to the final review step.
          </Typography>
        </Alert>
      )}
    </Box>
  );
};

export default RuleSelectionStep;
