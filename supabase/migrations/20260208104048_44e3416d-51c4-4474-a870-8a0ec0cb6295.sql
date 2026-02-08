-- Fix infinite recursion in RLS policies for budget_collaborators

-- Drop problematic policies
DROP POLICY IF EXISTS "Collaborators can view other collaborators" ON public.budget_collaborators;
DROP POLICY IF EXISTS "Collaborators can view budgets" ON public.budgets;

-- Create non-recursive policy for budget_collaborators (use direct user_id check)
CREATE POLICY "Collaborators can view their collaborations" 
ON public.budget_collaborators 
FOR SELECT 
USING (user_id = auth.uid());

-- Create non-recursive policy for budgets (check direct ownership OR collaborator via subquery that doesn't trigger recursion)
CREATE POLICY "Collaborators can view shared budgets" 
ON public.budgets 
FOR SELECT 
USING (
  id IN (
    SELECT budget_id FROM public.budget_collaborators WHERE user_id = auth.uid()
  )
);