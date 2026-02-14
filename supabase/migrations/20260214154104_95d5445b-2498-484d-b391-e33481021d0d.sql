
-- Fix budget_collaborators: restrict all policies to authenticated role only
DROP POLICY IF EXISTS "Budget owners can delete collaborators" ON public.budget_collaborators;
DROP POLICY IF EXISTS "Budget owners can insert collaborators" ON public.budget_collaborators;
DROP POLICY IF EXISTS "Budget owners can update collaborators" ON public.budget_collaborators;
DROP POLICY IF EXISTS "Collaborators can remove themselves" ON public.budget_collaborators;
DROP POLICY IF EXISTS "Collaborators can view their collaborations" ON public.budget_collaborators;

-- Recreate with TO authenticated
CREATE POLICY "Budget owners can delete collaborators"
ON public.budget_collaborators FOR DELETE
TO authenticated
USING (EXISTS (SELECT 1 FROM budgets WHERE budgets.id = budget_collaborators.budget_id AND budgets.user_id = auth.uid()));

CREATE POLICY "Budget owners can insert collaborators"
ON public.budget_collaborators FOR INSERT
TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM budgets WHERE budgets.id = budget_collaborators.budget_id AND budgets.user_id = auth.uid()));

CREATE POLICY "Budget owners can update collaborators"
ON public.budget_collaborators FOR UPDATE
TO authenticated
USING (EXISTS (SELECT 1 FROM budgets WHERE budgets.id = budget_collaborators.budget_id AND budgets.user_id = auth.uid()));

CREATE POLICY "Collaborators can remove themselves"
ON public.budget_collaborators FOR DELETE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Collaborators can view their collaborations"
ON public.budget_collaborators FOR SELECT
TO authenticated
USING (user_id = auth.uid());
