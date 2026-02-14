
-- Fix page_views: restrict INSERT to authenticated users only, preventing anonymous tracking correlation
DROP POLICY IF EXISTS "Users can insert their own page views" ON public.page_views;

CREATE POLICY "Authenticated users can insert their own page views"
ON public.page_views
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to update their own page views (for duration tracking)
CREATE POLICY "Authenticated users can update their own page views"
ON public.page_views
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);
