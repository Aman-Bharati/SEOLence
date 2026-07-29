/*
# Create seo_reports table for SEO analyzer

1. New Tables
- `seo_reports`
  - `id` (uuid, primary key)
  - `url` (text, not null) — the analyzed URL
  - `domain` (text, not null) — normalized domain for grouping
  - `title` (text) — page <title> tag content
  - `meta_description` (text) — page meta description
  - `word_count` (integer) — total visible word count
  - `unique_words` (integer) — count of unique words
  - `readability_score` (double precision) — Flesch reading ease score 0-100
  - `seo_score` (integer) — composite SEO score 0-100
  - `top_keywords` (jsonb) — array of {word, count, density} sorted by count
  - `bigrams` (jsonb) — top two-word phrases with counts
  - `trigrams` (jsonb) — top three-word phrases with counts
  - `headings` (jsonb) — {h1: [], h2: [], h3: [], h4: [], h5: [], h6: []}
  - `meta_tags` (jsonb) — extracted meta tag info (og, twitter, etc.)
  - `images` (jsonb) — array of {src, alt, hasAlt}
  - `links` (jsonb) — counts: {internal, external, total}
  - `insights` (jsonb) — full computed analysis: strengths, weaknesses, recommendations
  - `raw_frequency` (jsonb) — complete word frequency map
  - `created_at` (timestamptz, default now())

2. Indexes
- Index on `domain` for history lookups
- Index on `created_at` desc for recent reports

3. Security
- Enable RLS on `seo_reports`.
- Single-tenant no-auth app: allow anon + authenticated full CRUD (data is intentionally shared/public for this analysis tool).
*/

CREATE TABLE IF NOT EXISTS seo_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL,
  domain text NOT NULL,
  title text,
  meta_description text,
  word_count integer DEFAULT 0,
  unique_words integer DEFAULT 0,
  readability_score double precision DEFAULT 0,
  seo_score integer DEFAULT 0,
  top_keywords jsonb DEFAULT '[]'::jsonb,
  bigrams jsonb DEFAULT '[]'::jsonb,
  trigrams jsonb DEFAULT '[]'::jsonb,
  headings jsonb DEFAULT '{}'::jsonb,
  meta_tags jsonb DEFAULT '{}'::jsonb,
  images jsonb DEFAULT '[]'::jsonb,
  links jsonb DEFAULT '{}'::jsonb,
  insights jsonb DEFAULT '{}'::jsonb,
  raw_frequency jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_seo_reports_domain ON seo_reports(domain);
CREATE INDEX IF NOT EXISTS idx_seo_reports_created_at ON seo_reports(created_at DESC);

ALTER TABLE seo_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_seo_reports" ON seo_reports;
CREATE POLICY "anon_select_seo_reports" ON seo_reports FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_seo_reports" ON seo_reports;
CREATE POLICY "anon_insert_seo_reports" ON seo_reports FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_seo_reports" ON seo_reports;
CREATE POLICY "anon_update_seo_reports" ON seo_reports FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_seo_reports" ON seo_reports;
CREATE POLICY "anon_delete_seo_reports" ON seo_reports FOR DELETE
  TO anon, authenticated USING (true);