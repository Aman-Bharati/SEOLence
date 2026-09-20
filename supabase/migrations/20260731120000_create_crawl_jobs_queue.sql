-- Create crawl_jobs table
CREATE TABLE IF NOT EXISTS crawl_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  total_pages integer NOT NULL DEFAULT 0,
  crawled_pages integer NOT NULL DEFAULT 0,
  total_word_count integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create queued_urls table
CREATE TABLE IF NOT EXISTS queued_urls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES crawl_jobs(id) ON DELETE CASCADE,
  url text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  UNIQUE (job_id, url)
);

-- Create crawl_results table
CREATE TABLE IF NOT EXISTS crawl_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES crawl_jobs(id) ON DELETE CASCADE,
  url text NOT NULL,
  word_count integer NOT NULL DEFAULT 0,
  seo_score integer NOT NULL DEFAULT 0,
  performance_score integer NOT NULL DEFAULT 0,
  accessibility_score integer NOT NULL DEFAULT 0,
  security_score integer NOT NULL DEFAULT 0,
  content_score integer NOT NULL DEFAULT 0,
  audit_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE crawl_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE queued_urls ENABLE ROW LEVEL SECURITY;
ALTER TABLE crawl_results ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_crawl_jobs_user_id ON crawl_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_crawl_jobs_project_id ON crawl_jobs(project_id);
CREATE INDEX IF NOT EXISTS idx_queued_urls_job_id ON queued_urls(job_id);
CREATE INDEX IF NOT EXISTS idx_crawl_results_job_id ON crawl_results(job_id);

-- Policies for authenticated users
DROP POLICY IF EXISTS "users_select_own_crawl_jobs" ON crawl_jobs;
CREATE POLICY "users_select_own_crawl_jobs" ON crawl_jobs FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "users_insert_own_crawl_jobs" ON crawl_jobs;
CREATE POLICY "users_insert_own_crawl_jobs" ON crawl_jobs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "users_update_own_crawl_jobs" ON crawl_jobs;
CREATE POLICY "users_update_own_crawl_jobs" ON crawl_jobs FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "users_delete_own_crawl_jobs" ON crawl_jobs;
CREATE POLICY "users_delete_own_crawl_jobs" ON crawl_jobs FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Queued URLs policy mapping
DROP POLICY IF EXISTS "users_all_own_queued_urls" ON queued_urls;
CREATE POLICY "users_all_own_queued_urls" ON queued_urls FOR ALL TO authenticated 
  USING (EXISTS (SELECT 1 FROM crawl_jobs WHERE crawl_jobs.id = queued_urls.job_id AND crawl_jobs.user_id = auth.uid()));

-- Crawl results policy mapping
DROP POLICY IF EXISTS "users_all_own_crawl_results" ON crawl_results;
CREATE POLICY "users_all_own_crawl_results" ON crawl_results FOR ALL TO authenticated 
  USING (EXISTS (SELECT 1 FROM crawl_jobs WHERE crawl_jobs.id = crawl_results.job_id AND crawl_jobs.user_id = auth.uid()));
