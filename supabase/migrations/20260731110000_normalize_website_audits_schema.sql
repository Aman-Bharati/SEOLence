-- Create audit_pages table for normalized metadata
CREATE TABLE IF NOT EXISTS audit_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id uuid NOT NULL REFERENCES website_audits(id) ON DELETE CASCADE,
  title text,
  meta_description text,
  lang text,
  canonical text,
  word_count integer,
  html_size integer
);

CREATE INDEX IF NOT EXISTS idx_audit_pages_audit_id ON audit_pages(audit_id);

-- Create audit_resources table for normalized headings, links, and image links
CREATE TABLE IF NOT EXISTS audit_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id uuid NOT NULL REFERENCES website_audits(id) ON DELETE CASCADE,
  resource_type text NOT NULL, -- 'image', 'heading'
  src text,
  alt text,
  href text,
  heading_level integer,
  heading_text text,
  is_internal boolean
);

CREATE INDEX IF NOT EXISTS idx_audit_resources_audit_id ON audit_resources(audit_id);
CREATE INDEX IF NOT EXISTS idx_audit_resources_type ON audit_resources(resource_type);

-- Create audit_issues table for normalized explainable checklists
CREATE TABLE IF NOT EXISTS audit_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id uuid NOT NULL REFERENCES website_audits(id) ON DELETE CASCADE,
  category text NOT NULL,
  check_name text NOT NULL,
  score integer NOT NULL,
  max_score integer NOT NULL,
  status text NOT NULL,
  impact text,
  measured_value text,
  formula text,
  opportunity text,
  expected_impact text
);

CREATE INDEX IF NOT EXISTS idx_audit_issues_audit_id ON audit_issues(audit_id);
CREATE INDEX IF NOT EXISTS idx_audit_issues_status ON audit_issues(status);

-- Normalization trigger function
CREATE OR REPLACE FUNCTION normalize_audit_jsonb()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert metadata into audit_pages
  INSERT INTO audit_pages (audit_id, title, meta_description, lang, canonical, word_count, html_size)
  VALUES (
    NEW.id,
    NEW.audit_data->'parsed'->>'title',
    NEW.audit_data->'parsed'->>'metaDescription',
    NEW.audit_data->'parsed'->>'lang',
    NEW.audit_data->'parsed'->>'canonical',
    COALESCE((NEW.audit_data->'parsed'->>'wordCount')::integer, 0),
    COALESCE((NEW.audit_data->'parsed'->>'rawHtmlLength')::integer, 0)
  ) ON CONFLICT DO NOTHING;

  -- Insert images from audit_data->'parsed'->'images'
  IF NEW.audit_data->'parsed'->'images' IS NOT NULL AND jsonb_typeof(NEW.audit_data->'parsed'->'images') = 'array' THEN
    INSERT INTO audit_resources (audit_id, resource_type, src, alt)
    SELECT 
      NEW.id,
      'image',
      value->>'src',
      value->>'alt'
    FROM jsonb_array_elements(NEW.audit_data->'parsed'->'images');
  END IF;

  -- Insert headings from audit_data->'parsed'->'headings'
  IF NEW.audit_data->'parsed'->'headings' IS NOT NULL AND jsonb_typeof(NEW.audit_data->'parsed'->'headings') = 'array' THEN
    INSERT INTO audit_resources (audit_id, resource_type, heading_level, heading_text)
    SELECT 
      NEW.id,
      'heading',
      (value->>'level')::integer,
      value->>'text'
    FROM jsonb_array_elements(NEW.audit_data->'parsed'->'headings');
  END IF;

  -- Insert checklist items from audit_data->'breakdown'
  IF NEW.audit_data->'breakdown' IS NOT NULL AND jsonb_typeof(NEW.audit_data->'breakdown') = 'array' THEN
    INSERT INTO audit_issues (audit_id, category, check_name, score, max_score, status, impact, measured_value, formula, opportunity, expected_impact)
    SELECT 
      NEW.id,
      value->>'category',
      value->>'check',
      (value->>'score')::integer,
      (value->>'maxScore')::integer,
      value->>'status',
      value->>'impact',
      value->>'measuredValue',
      value->>'formula',
      value->>'opportunity',
      value->>'expectedImpact'
    FROM jsonb_array_elements(NEW.audit_data->'breakdown');
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Prevent trigger errors from blocking core audits, log and proceed
    RAISE WARNING 'Audit JSONB normalization failed for ID %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Bind the normalization trigger
DROP TRIGGER IF EXISTS trg_normalize_audit_jsonb ON website_audits;
CREATE TRIGGER trg_normalize_audit_jsonb
AFTER INSERT ON website_audits
FOR EACH ROW
EXECUTE FUNCTION normalize_audit_jsonb();
