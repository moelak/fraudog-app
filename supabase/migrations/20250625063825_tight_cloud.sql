/*
  # Add in progress status to rules table

  1. Changes
    - Update the status check constraint to include 'in progress'
    - This allows rules to have status: active, inactive, warning, or in progress

  2. Notes
    - in progress status will be used for AI-generated rules that are being processed
    - These rules will be shown in the Generated Rules section of ChargebackAnalysisModal
    - Once implemented, they will be changed to 'active' status
*/

-- Drop the existing check constraint
ALTER TABLE rules DROP CONSTRAINT IF EXISTS rules_status_check;

-- Add the new check constraint that includes 'in progress'
ALTER TABLE rules ADD CONSTRAINT rules_status_check 
  CHECK (status IN ('active', 'inactive', 'warning', 'in progress'));