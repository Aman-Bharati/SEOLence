-- Create keyword_targets table
CREATE TABLE IF NOT EXISTS keyword_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  keyword text NOT NULL CHECK (char_length(keyword) >= 1),
  country text NOT NULL DEFAULT 'US',
  location text NOT NULL DEFAULT '',
  language text NOT NULL DEFAULT 'en',
  device text NOT NULL DEFAULT 'desktop',
  created_at timestamptz DEFAULT now(),
  UNIQUE (project_id, keyword, country, location, language, device)
);

-- Create keyword_analysis_jobs table
CREATE TABLE IF NOT EXISTS keyword_analysis_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword_target_id uuid NOT NULL REFERENCES keyword_targets(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  error text,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Create serp_snapshots table
CREATE TABLE IF NOT EXISTS serp_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES keyword_analysis_jobs(id) ON DELETE CASCADE,
  provider text NOT NULL,
  search_engine text NOT NULL DEFAULT 'google',
  result_depth integer NOT NULL DEFAULT 100,
  raw_serp_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create serp_results table
CREATE TABLE IF NOT EXISTS serp_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id uuid NOT NULL REFERENCES serp_snapshots(id) ON DELETE CASCADE,
  position integer NOT NULL,
  url text NOT NULL,
  domain text NOT NULL,
  title text NOT NULL,
  snippet text,
  result_type text NOT NULL DEFAULT 'organic'
);

-- Create ranking_observations table
CREATE TABLE IF NOT EXISTS ranking_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES keyword_analysis_jobs(id) ON DELETE CASCADE,
  observed_position integer, -- NULL if not observed
  relevant_page_url text, -- NULL if no page matches keyword
  search_intent text, -- informational, transactional, navigational, commercial
  content_gaps jsonb DEFAULT '{}'::jsonb,
  ranking_opportunity text NOT NULL, -- Strong, Moderate, Limited, Insufficient Data
  recommendations jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE keyword_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE keyword_analysis_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE serp_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE serp_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE ranking_observations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "users_all_own_keyword_targets" ON keyword_targets;
DROP POLICY IF EXISTS "users_all_own_keyword_jobs" ON keyword_analysis_jobs;
DROP POLICY IF EXISTS "users_all_own_serp_snapshots" ON serp_snapshots;
DROP POLICY IF EXISTS "users_all_own_serp_results" ON serp_results;
DROP POLICY IF EXISTS "users_all_own_ranking_observations" ON ranking_observations;

-- keyword_targets RLS
CREATE POLICY "users_all_own_keyword_targets" ON keyword_targets FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- keyword_analysis_jobs RLS mapping
CREATE POLICY "users_all_own_keyword_jobs" ON keyword_analysis_jobs FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM keyword_targets 
    WHERE keyword_targets.id = keyword_analysis_jobs.keyword_target_id 
    AND keyword_targets.user_id = auth.uid()
  ));

-- serp_snapshots RLS mapping
CREATE POLICY "users_all_own_serp_snapshots" ON serp_snapshots FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM keyword_analysis_jobs 
    JOIN keyword_targets ON keyword_targets.id = keyword_analysis_jobs.keyword_target_id 
    WHERE keyword_analysis_jobs.id = serp_snapshots.job_id 
    AND keyword_targets.user_id = auth.uid()
  ));

-- serp_results RLS mapping
CREATE POLICY "users_all_own_serp_results" ON serp_results FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM serp_snapshots 
    JOIN keyword_analysis_jobs ON keyword_analysis_jobs.id = serp_snapshots.job_id 
    JOIN keyword_targets ON keyword_targets.id = keyword_analysis_jobs.keyword_target_id 
    WHERE serp_snapshots.id = serp_results.snapshot_id 
    AND keyword_targets.user_id = auth.uid()
  ));

-- ranking_observations RLS mapping
CREATE POLICY "users_all_own_ranking_observations" ON ranking_observations FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM keyword_analysis_jobs 
    JOIN keyword_targets ON keyword_targets.id = keyword_analysis_jobs.keyword_target_id 
    WHERE keyword_analysis_jobs.id = ranking_observations.job_id 
    AND keyword_targets.user_id = auth.uid()
  ));

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_keyword_targets_user_id ON keyword_targets(user_id);
CREATE INDEX IF NOT EXISTS idx_keyword_targets_project_id ON keyword_targets(project_id);
CREATE INDEX IF NOT EXISTS idx_keyword_analysis_jobs_target_id ON keyword_analysis_jobs(keyword_target_id);
CREATE INDEX IF NOT EXISTS idx_serp_snapshots_job_id ON serp_snapshots(job_id);
CREATE INDEX IF NOT EXISTS idx_serp_results_snapshot_id ON serp_results(snapshot_id);
CREATE INDEX IF NOT EXISTS idx_ranking_observations_job_id ON ranking_observations(job_id);
