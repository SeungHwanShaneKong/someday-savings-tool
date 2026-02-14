
-- 1. Allow users to view their own page_views for transparency
CREATE POLICY "Users can view their own page views"
ON public.page_views
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 2. Allow budget owners to view all collaborators on their budgets
CREATE POLICY "Budget owners can view collaborators"
ON public.budget_collaborators
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.budgets
  WHERE budgets.id = budget_collaborators.budget_id
  AND budgets.user_id = auth.uid()
));
