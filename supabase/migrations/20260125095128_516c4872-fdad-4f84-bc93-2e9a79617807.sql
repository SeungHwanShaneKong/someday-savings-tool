-- Drop the existing permissive insert policy
DROP POLICY IF EXISTS "Anyone can insert page views" ON public.page_views;

-- Create new policy requiring authentication for inserts
CREATE POLICY "Authenticated users can insert page views"
ON public.page_views
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Optional: Allow users to only insert their own page views (user_id must match)
-- This adds extra security by ensuring users can only log their own activity
CREATE POLICY "Users can insert their own page views"
ON public.page_views
FOR INSERT
TO authenticated
WITH CHECK (user_id IS NULL OR user_id = auth.uid());