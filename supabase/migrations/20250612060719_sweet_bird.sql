/*
  # Drop custom users table

  1. Changes
    - Drop the custom users table and all related objects
    - Remove triggers, functions, and policies
    - Clean up any references to the custom table

  2. Notes
    - We now use Supabase's built-in auth.users table
    - All user authentication is handled through Supabase Auth
    - RLS policies should reference auth.uid() instead of custom user IDs
*/

-- Drop the custom users table and all related objects
DROP TABLE IF EXISTS users CASCADE;

-- Drop the trigger function if it exists
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Note: The auth.users table is managed by Supabase and doesn't need to be created
-- Users will be automatically created in auth.users when they sign up through Clerk
-- with proper JWT integration