
-- Create a SECURITY DEFINER function to check if a user is a collaborator on a budget
CREATE OR REPLACE FUNCTION public.is_budget_collaborator(p_budget_id uuid, p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.budget_collaborators
    WHERE budget_id = p_budget_id
      AND user_id = p_user_id
  )
$$;

-- Drop the recursive policy
DROP POLICY IF EXISTS "Collaborators can view shared budgets" ON public.budgets;

-- Recreate using the SECURITY DEFINER function
CREATE POLICY "Collaborators can view shared budgets"
ON public.budgets
FOR SELECT
TO authenticated
USING (public.is_budget_collaborator(id, auth.uid()));
