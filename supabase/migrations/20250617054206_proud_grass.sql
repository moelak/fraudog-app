/*
  # Clean up custom users table and related objects

  1. Changes
    - Drop the custom users table and all related objects
    - Remove triggers, functions, and policies
    - Clean up any references to the custom table

  2. Notes
    - This ensures the custom users table is properly removed
    - We rely on Supabase's built-in auth.users table instead
    - All user authentication is handled through Supabase Auth
*/

-- Drop the trigger first (if it exists)
DROP TRIGGER IF EXISTS update_users_updated_at ON users;

-- Drop all policies on the users table
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Service role can manage all users" ON users;
DROP POLICY IF EXISTS "Allow anonymous insert for user sync" ON users;
DROP POLICY IF EXISTS "Allow anonymous update for user sync" ON users;
DROP POLICY IF EXISTS "Allow anonymous select for user sync" ON users;

-- Drop the custom users table (CASCADE will drop dependent objects)
DROP TABLE IF EXISTS users CASCADE;

-- Drop the trigger function
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Drop any remaining indexes (they should be dropped with the table, but just in case)
DROP INDEX IF EXISTS idx_users_clerk_id;
DROP INDEX IF EXISTS idx_users_email;