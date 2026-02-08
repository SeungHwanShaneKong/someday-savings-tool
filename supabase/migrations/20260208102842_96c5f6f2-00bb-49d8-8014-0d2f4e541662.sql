-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Service role can insert notifications" ON public.notifications;

-- Note: Notifications will be inserted via Edge Functions using service_role key
-- No public INSERT policy is needed since service_role bypasses RLS