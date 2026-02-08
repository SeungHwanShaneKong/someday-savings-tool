-- Fix page_views RLS: Ensure SELECT is admin-only with 'authenticated' role

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Admins can view page views" ON public.page_views;

-- Recreate with proper role specification (authenticated only, not public)
CREATE POLICY "Admins can view page views"
  ON public.page_views
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Add budget_snapshots UPDATE policy for better UX
CREATE POLICY "Users can update their own snapshots"
  ON public.budget_snapshots
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);