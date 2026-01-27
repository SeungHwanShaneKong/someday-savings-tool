-- Deny anonymous users from reading shared_budgets table
-- This prevents attackers from querying all share tokens
CREATE POLICY "Deny anonymous access to shared budgets"
  ON public.shared_budgets FOR SELECT
  TO anon
  USING (false);

-- Add DELETE policy so users can revoke/delete their shared links
CREATE POLICY "Users can delete their shared links"
  ON public.shared_budgets FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.budgets
      WHERE budgets.id = shared_budgets.budget_id
      AND budgets.user_id = auth.uid()
    )
  );