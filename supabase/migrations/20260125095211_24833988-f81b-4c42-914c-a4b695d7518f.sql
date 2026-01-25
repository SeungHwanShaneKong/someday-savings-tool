-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can insert page views" ON public.page_views;

-- Keep only the stricter policy that validates user_id