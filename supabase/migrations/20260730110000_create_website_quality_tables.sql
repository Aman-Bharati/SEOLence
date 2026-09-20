-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  domain text NOT NULL CHECK (char_length(domain) >= 3),
  name text NOT NULL CHECK (char_length(name) >= 1),
  created_at timestamptz DEFAULT now()
);

-- Create website_audits table
CREATE TABLE IF NOT EXISTS website_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  url text NOT NULL,
  overall_score integer NOT NULL DEFAULT 0,
  seo_score integer NOT NULL DEFAULT 0,
  accessibility_score integer NOT NULL DEFAULT 0,
  security_score integer NOT NULL DEFAULT 0,
  content_score integer NOT NULL DEFAULT 0,
  performance_score integer NOT NULL DEFAULT 0,
  audit_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  insights jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_audits ENABLE ROW LEVEL SECURITY;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_website_audits_project_id ON website_audits(project_id);
CREATE INDEX IF NOT EXISTS idx_website_audits_user_id ON website_audits(user_id);

-- Policies for projects
DROP POLICY IF EXISTS "users_select_own_projects" ON projects;
CREATE POLICY "users_select_own_projects" ON projects FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "users_insert_own_projects" ON projects;
CREATE POLICY "users_insert_own_projects" ON projects FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "users_update_own_projects" ON projects;
CREATE POLICY "users_update_own_projects" ON projects FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "users_delete_own_projects" ON projects;
CREATE POLICY "users_delete_own_projects" ON projects FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Policies for website_audits
DROP POLICY IF EXISTS "users_select_own_website_audits" ON website_audits;
CREATE POLICY "users_select_own_website_audits" ON website_audits FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "users_insert_own_website_audits" ON website_audits;
CREATE POLICY "users_insert_own_website_audits" ON website_audits FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "users_update_own_website_audits" ON website_audits;
CREATE POLICY "users_update_own_website_audits" ON website_audits FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "users_delete_own_website_audits" ON website_audits;
CREATE POLICY "users_delete_own_website_audits" ON website_audits FOR DELETE TO authenticated USING (auth.uid() = user_id);
