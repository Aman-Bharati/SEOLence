-- Migration to allow NULL values for performance_score in website_audits and crawl_results
ALTER TABLE website_audits ALTER COLUMN performance_score DROP NOT NULL;
ALTER TABLE website_audits ALTER COLUMN performance_score DROP DEFAULT;

ALTER TABLE crawl_results ALTER COLUMN performance_score DROP NOT NULL;
ALTER TABLE crawl_results ALTER COLUMN performance_score DROP DEFAULT;
