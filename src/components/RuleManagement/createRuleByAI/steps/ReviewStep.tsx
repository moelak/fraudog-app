import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Alert,
  Divider,
  Chip,
  FormControlLabel,
  Switch,
  Card,
  CardContent,
  Grid
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { StepperData } from '../CreateRuleByAI';

interface ReviewStepProps {
  data: StepperData;
  updateData: (updates: Partial<StepperData>) => void;
}

const ReviewStep: React.FC<ReviewStepProps> = ({ data, updateData }) => {
  const { finalRule, ruleImpactAnalysis, logOnly } = data;

  if (!finalRule) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        No rule selected for review. Please go back and select a rule.
      </Alert>
    );
  }

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        Review Generated Rule
      </Typography>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Review the final rule configuration before deployment. You can enable log-only mode for testing.
      </Typography>

      {/* Rule Details Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {finalRule.name}
          </Typography>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {finalRule.description}
          </Typography>

          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="text.secondary">
                Category
              </Typography>
              <Typography variant="body2">
                {finalRule.category}
              </Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="text.secondary">
                Severity
              </Typography>
              <Chip 
                label={finalRule.severity} 
                size="small"
                color={finalRule.severity === 'high' ? 'error' : finalRule.severity === 'medium' ? 'warning' : 'default'}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="text.secondary">
                Decision
              </Typography>
              <Chip 
                label={finalRule.decision} 
                size="small"
                color={finalRule.decision === 'deny' ? 'error' : finalRule.decision === 'review' ? 'warning' : 'success'}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="text.secondary">
                Source
              </Typography>
              <Typography variant="body2">
                {finalRule.source}
              </Typography>
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle2" gutterBottom>
            Rule Condition
          </Typography>
          <Paper sx={{ p: 2, bgcolor: 'grey.50', fontFamily: 'monospace', fontSize: '0.875rem' }}>
            {finalRule.condition}
          </Paper>
        </CardContent>
      </Card>

      {/* Impact Analysis */}
      {ruleImpactAnalysis && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <InfoIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Impact Analysis
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} sm={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="success.main">
                    {ruleImpactAnalysis.wouldCatch}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Transactions Caught
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="warning.main">
                    {ruleImpactAnalysis.falsePositives}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Potential False Positives
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="primary.main">
                    ${ruleImpactAnalysis.potentialFraudPrevented.toLocaleString()}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Potential Fraud Prevented
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Deployment Configuration */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            <CheckCircleIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Deployment Configuration
          </Typography>
          
          <FormControlLabel
            control={
              <Switch
                checked={logOnly}
                onChange={(e) => updateData({ logOnly: e.target.checked })}
                color="primary"
              />
            }
            label="Log-only mode (recommended for testing)"
          />
          
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, ml: 4 }}>
            {logOnly 
              ? "Rule will log matches without blocking transactions. Perfect for testing and validation."
              : "Rule will actively block transactions that match the conditions. Use with caution."
            }
          </Typography>

          {!logOnly && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <WarningIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                <strong>Production Mode:</strong> This rule will actively block transactions. 
                Consider enabling log-only mode first to validate the rule's behavior.
              </Typography>
            </Alert>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default ReviewStep;
