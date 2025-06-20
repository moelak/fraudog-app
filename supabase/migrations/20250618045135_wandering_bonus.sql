/*
  # Create users table with RLS

  1. New Tables
    - `users`
      - `id` (uuid, primary key)
      - `clerk_id` (text, unique, references Clerk user ID)
      - `email` (text, user's email address)
      - `first_name` (text, user's first name)
      - `last_name` (text, user's last name)
      - `created_at` (timestamp, when user was created)
      - `updated_at` (timestamp, when user was last updated)

  2. Security
    - Enable RLS on `users` table
    - Add policy for users to read/write their own data only
    - Users are identified by their Clerk ID stored in JWT custom claims
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id text UNIQUE NOT NULL,
  email text,
  first_name text,
  last_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policy for users to access their own data
-- Note: This assumes Clerk user ID is stored in auth.jwt() -> 'sub' claim
CREATE POLICY "Users can access their own data"
  ON users
  FOR ALL
  TO authenticated
  USING (clerk_id = auth.jwt() ->> 'sub')
  WITH CHECK (clerk_id = auth.jwt() ->> 'sub');

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_id);

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