/*
  # Create rules table for fraud detection rules

  1. New Tables
    - `rules`
      - `id` (uuid, primary key)
      - `name` (text, rule name)
      - `description` (text, rule description)
      - `category` (text, rule category)
      - `condition` (text, rule condition/logic)
      - `status` (text, active/inactive/warning)
      - `severity` (text, low/medium/high)
      - `log_only` (boolean, whether rule only logs)
      - `catches` (integer, number of fraud cases caught)
      - `false_positives` (integer, number of false positives)
      - `effectiveness` (integer, effectiveness percentage)
      - `source` (text, AI or User generated)
      - `is_deleted` (boolean, soft delete flag)
      - `user_id` (uuid, foreign key to auth.users)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `rules` table
    - Add policies for authenticated users to manage their own rules

  3. Indexes
    - Index on user_id for efficient lookups
    - Index on is_deleted for filtering
    - Composite index on user_id and is_deleted
*/

-- Create rules table
CREATE TABLE IF NOT EXISTS rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL,
  category text NOT NULL,
  condition text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'warning')),
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high')),
  log_only boolean NOT NULL DEFAULT false,
  catches integer NOT NULL DEFAULT 0,
  false_positives integer NOT NULL DEFAULT 0,
  effectiveness integer NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'User' CHECK (source IN ('AI', 'User')),
  is_deleted boolean NOT NULL DEFAULT false,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE rules ENABLE ROW LEVEL SECURITY;

-- Create policies
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

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_rules_user_id ON rules(user_id);
CREATE INDEX IF NOT EXISTS idx_rules_is_deleted ON rules(is_deleted);
CREATE INDEX IF NOT EXISTS idx_rules_user_id_is_deleted ON rules(user_id, is_deleted);
CREATE INDEX IF NOT EXISTS idx_rules_status ON rules(status);
CREATE INDEX IF NOT EXISTS idx_rules_source ON rules(source);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_rules_updated_at
  BEFORE UPDATE ON rules
  FOR EACH ROW
  EXECUTE FUNCTION update_rules_updated_at();