-- Drop old permissive RLS policy
DROP POLICY IF EXISTS "users_all_own_keyword_targets" ON keyword_targets;

-- Create hardened RLS policy requiring the referenced project to belong to the authenticated user
CREATE POLICY "users_all_own_keyword_targets" ON keyword_targets FOR ALL TO authenticated
  USING (
    auth.uid() = user_id AND 
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = project_id 
      AND projects.user_id = auth.uid()
    )
  ) WITH CHECK (
    auth.uid() = user_id AND 
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = project_id 
      AND projects.user_id = auth.uid()
    )
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_keyword_analysis_jobs_target_status ON keyword_analysis_jobs(keyword_target_id, status);
CREATE INDEX IF NOT EXISTS idx_serp_results_domain ON serp_results(domain);
