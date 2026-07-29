-- 1. Add user_id column referencing auth.users table
ALTER TABLE seo_reports 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Clean up legacy reports that don't have a user_id to ensure database sanity
DELETE FROM seo_reports WHERE user_id IS NULL;

-- 3. Ensure Row Level Security is enabled
ALTER TABLE seo_reports ENABLE ROW LEVEL SECURITY;

-- 4. Drop original anonymous policies
DROP POLICY IF EXISTS "anon_select_seo_reports" ON seo_reports;
DROP POLICY IF EXISTS "anon_insert_seo_reports" ON seo_reports;
DROP POLICY IF EXISTS "anon_update_seo_reports" ON seo_reports;
DROP POLICY IF EXISTS "anon_delete_seo_reports" ON seo_reports;

-- 5. Create secure policies for authenticated users
CREATE POLICY "users_select_own_seo_reports" ON seo_reports
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own_seo_reports" ON seo_reports
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_update_own_seo_reports" ON seo_reports
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_delete_own_seo_reports" ON seo_reports
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
