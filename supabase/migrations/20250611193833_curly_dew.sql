/*
  # Fix RLS policies for users table

  1. Security
    - Drop existing conflicting policies
    - Create new policies that properly allow Clerk sync
    - Ensure anonymous users can upsert during sync
    - Maintain security for authenticated users
*/

-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Service role can manage all users" ON users;
DROP POLICY IF EXISTS "Allow anonymous upsert for user sync" ON users;
DROP POLICY IF EXISTS "Allow anonymous update for user sync" ON users;

-- Create new policies that work properly

-- Allow service role to do everything (for admin operations)
CREATE POLICY "Service role can manage all users"
  ON users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow anonymous users to insert new users (for Clerk sync)
CREATE POLICY "Allow anonymous insert for user sync"
  ON users
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow anonymous users to update existing users (for Clerk sync)
CREATE POLICY "Allow anonymous update for user sync"
  ON users
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Allow anonymous users to select users (needed for upsert to work)
CREATE POLICY "Allow anonymous select for user sync"
  ON users
  FOR SELECT
  TO anon
  USING (true);

-- Allow authenticated users to view their own profile
CREATE POLICY "Users can view own profile"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = clerk_id);

-- Allow authenticated users to update their own profile
CREATE POLICY "Users can update own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = clerk_id)
  WITH CHECK (auth.uid()::text = clerk_id);