import { supabase } from '../lib/supabase';

/**
 * Creates the users table and sets up RLS policies
 * Run this once to set up your database schema
 */
export async function createUsersTable() {
  try {
    console.log('Creating users table...');

    // Create the users table
    const { error: tableError } = await supabase.rpc('exec_sql', {
      sql: `
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
        DROP POLICY IF EXISTS "Users can access their own data" ON users;
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
        DROP TRIGGER IF EXISTS update_users_updated_at ON users;
        CREATE TRIGGER update_users_updated_at
          BEFORE UPDATE ON users
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
      `
    });

    if (tableError) {
      throw tableError;
    }

    console.log('✅ Users table created successfully!');
    return { success: true };
  } catch (error) {
    console.error('❌ Error creating users table:', error);
    return { success: false, error };
  }
}

/**
 * Alternative method: Create table using individual queries
 * Use this if the above method doesn't work
 */
export async function createUsersTableAlternative() {
  try {
    console.log('Creating users table (alternative method)...');

    // Note: This method requires you to run these SQL commands manually
    // in the Supabase SQL Editor
    const sqlCommands = `
-- 1. Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id text UNIQUE NOT NULL,
  email text,
  first_name text,
  last_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 3. Create policy for users to access their own data
CREATE POLICY "Users can access their own data"
  ON users
  FOR ALL
  TO authenticated
  USING (clerk_id = auth.jwt() ->> 'sub')
  WITH CHECK (clerk_id = auth.jwt() ->> 'sub');

-- 4. Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_id);

-- 5. Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 6. Create trigger to automatically update updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
`;

    console.log('📋 Copy and paste this SQL into your Supabase SQL Editor:');
    console.log('🔗 Go to: https://supabase.com/dashboard/project/[your-project]/sql');
    console.log('\n' + sqlCommands);

    return { success: true, sql: sqlCommands };
  } catch (error) {
    console.error('❌ Error:', error);
    return { success: false, error };
  }
}