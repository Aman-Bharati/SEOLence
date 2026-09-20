-- Allow anonymous and authenticated users to select website_audits for public share links
DROP POLICY IF EXISTS "public_select_website_audits" ON website_audits;
CREATE POLICY "public_select_website_audits" 
ON website_audits 
FOR SELECT 
TO anon, authenticated 
USING (true);
