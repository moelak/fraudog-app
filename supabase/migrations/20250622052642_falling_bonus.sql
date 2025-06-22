/*
  # Fix RLS policies for rules table

  1. Drop existing policies that might be causing conflicts
  2. Recreate policies with proper conditions
  3. Ensure UPDATE operations work correctly

  The issue is likely that the existing policies are too restrictive
  or there's a conflict between policies.
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own rules" ON rules;
DROP POLICY IF EXISTS "Users can create their own rules" ON rules;
DROP POLICY IF EXISTS "Users can update their own rules" ON rules;
DROP POLICY IF EXISTS "Users can delete their own rules" ON rules;

-- Recreate policies with proper conditions
CREATE POLICY "Users can view their own rules"
  ON rules
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own rules"
  ON rules
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own rules"
  ON rules
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own rules"
  ON rules
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);