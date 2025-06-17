/*
  # Recreate users table for Clerk integration

  1. New Tables
    - `users`
      - `id` (uuid, primary key)
      - `clerk_id` (text, unique) - Links to Clerk user ID
      - `email` (text) - User's email address
      - `first_name` (text) - User's first name
      - `last_name` (text) - User's last name
      - `created_at` (timestamptz) - When record was created
      - `updated_at` (timestamptz) - When record was last updated

  2. Security
    - Enable RLS on `users` table
    - Add policies for anonymous users to sync data
    - Add policies for authenticated users to manage their own data
    - Add policy for service role to manage all users

  3. Performance
    - Add index on clerk_id for fast lookups
    - Add index on email for user searches
    - Add trigger for automatic updated_at timestamps
*/

-- Create the users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id text UNIQUE NOT NULL,
  email text,
  first_name text,
  last_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policies for RLS

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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();