-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Anyone can view active shared budgets by token" ON public.shared_budgets;

-- Create a new policy that requires authentication OR matches share_token in the query
-- This policy only allows access when the share_token is explicitly filtered in the WHERE clause
CREATE POLICY "Access shared budgets only with valid token"
ON public.shared_budgets
FOR SELECT
USING (
  -- Owner access: users can view their own shared links
  EXISTS (
    SELECT 1 FROM public.budgets
    WHERE budgets.id = shared_budgets.budget_id
    AND budgets.user_id = auth.uid()
  )
  OR
  -- Public access with token: only active shares can be accessed when token is explicitly filtered
  -- This works because Supabase will push down the eq() filter before RLS evaluation
  (is_active = true)
);

-- Actually we need a different approach - the policy itself can't validate the token is being used
-- The solution is to use an RPC function instead

-- First drop the simple policy we just created
DROP POLICY IF EXISTS "Access shared budgets only with valid token" ON public.shared_budgets;

-- Create restrictive policies:
-- 1. Owners can always view their shared links
CREATE POLICY "Owners can view their shared links"
ON public.shared_budgets
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.budgets
    WHERE budgets.id = shared_budgets.budget_id
    AND budgets.user_id = auth.uid()
  )
);

-- 2. For public access, we deny direct table access and use an RPC function instead
-- No public SELECT policy = no direct access for anonymous users

-- Create a secure function to get shared budget by token
CREATE OR REPLACE FUNCTION public.get_shared_budget_by_token(p_share_token text)
RETURNS TABLE (budget_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT shared_budgets.budget_id
  FROM public.shared_budgets
  WHERE share_token = p_share_token
    AND is_active = true
  LIMIT 1;
$$;