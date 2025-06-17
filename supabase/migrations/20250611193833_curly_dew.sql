/*
  # Updated RLS policies for Clerk integration using custom JWT claim 'uuid'

  Assumes Clerk JWT template includes:
  {
    "uuid": "{{user.id}}",
    "email": "{{user.email}}",
    "role": "authenticated"
  }
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Service role can manage all users" ON users;
DROP POLICY IF EXISTS "Allow anonymous insert for user sync" ON users;
DROP POLICY IF EXISTS "Allow anonymous update for user sync" ON users;
DROP POLICY IF EXISTS "Allow anonymous select for user sync" ON users;

-- Allow service role to manage all users
CREATE POLICY "Service role can manage all users"
  ON users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow authenticated Clerk users to view their own data
CREATE POLICY "Users can view own profile"
  ON users
  FOR SELECT
  TO authenticated
  USING ((auth.jwt() ->> 'uuid') = clerk_id);

-- Allow authenticated Clerk users to update their own data
CREATE POLICY "Users can update own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING ((auth.jwt() ->> 'uuid') = clerk_id)
  WITH CHECK ((auth.jwt() ->> 'uuid') = clerk_id);

-- (Optional) If you need auto-insertion from the frontend (not recommended for production)
-- Otherwise, insert via server using service role
CREATE POLICY "Allow anonymous insert for user sync"
  ON users
  FOR INSERT 
  TO anon
  WITH CHECK ((auth.jwt() ->> 'uuid') = clerk_id);

-- Allow anonymous update (only if syncing from frontend)
CREATE POLICY "Allow anonymous update for user sync"
  ON users
  FOR UPDATE
  TO anon
  USING ((auth.jwt() ->> 'uuid') = clerk_id)
  WITH CHECK ((auth.jwt() ->> 'uuid') = clerk_id);

-- Allow anonymous read (optional if using upsert in frontend)
CREATE POLICY "Allow anonymous select for user sync"
  ON users
  FOR SELECT
  TO anon
  USING ((auth.jwt() ->> 'uuid') = clerk_id);
