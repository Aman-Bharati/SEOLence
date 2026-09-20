-- Create project_competitors table
CREATE TABLE IF NOT EXISTS project_competitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  domain text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(project_id, domain)
);

-- Enable RLS on project_competitors
ALTER TABLE project_competitors ENABLE ROW LEVEL SECURITY;

-- RLS policies for project_competitors
DROP POLICY IF EXISTS "users_select_own_competitors" ON project_competitors;
CREATE POLICY "users_select_own_competitors" 
ON project_competitors FOR SELECT TO authenticated 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "users_insert_own_competitors" ON project_competitors;
CREATE POLICY "users_insert_own_competitors" 
ON project_competitors FOR INSERT TO authenticated 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "users_delete_own_competitors" ON project_competitors;
CREATE POLICY "users_delete_own_competitors" 
ON project_competitors FOR DELETE TO authenticated 
USING (auth.uid() = user_id);


-- Create user_profiles table for agency white-label settings & subscription tier
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  agency_name text DEFAULT '',
  agency_logo_url text DEFAULT '',
  subscription_tier text DEFAULT 'free',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_profiles
DROP POLICY IF EXISTS "users_select_own_profile" ON user_profiles;
CREATE POLICY "users_select_own_profile" 
ON user_profiles FOR SELECT TO authenticated 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "users_insert_own_profile" ON user_profiles;
CREATE POLICY "users_insert_own_profile" 
ON user_profiles FOR INSERT TO authenticated 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "users_update_own_profile" ON user_profiles;
CREATE POLICY "users_update_own_profile" 
ON user_profiles FOR UPDATE TO authenticated 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);
