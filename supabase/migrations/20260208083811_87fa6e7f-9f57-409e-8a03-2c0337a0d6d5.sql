-- Fix shared_budgets RLS policies for proper security

-- Step 1: Drop all existing SELECT policies to clean up duplicates
DROP POLICY IF EXISTS "Deny anonymous access to shared budgets" ON public.shared_budgets;
DROP POLICY IF EXISTS "Owners can view their shared links" ON public.shared_budgets;
DROP POLICY IF EXISTS "Users can view their shared links" ON public.shared_budgets;

-- Step 2: Drop existing INSERT/UPDATE/DELETE policies for cleanup
DROP POLICY IF EXISTS "Users can insert shared links for their budgets" ON public.shared_budgets;
DROP POLICY IF EXISTS "Users can update their shared links" ON public.shared_budgets;
DROP POLICY IF EXISTS "Users can delete their shared links" ON public.shared_budgets;

-- Step 3: Create proper policies that only allow AUTHENTICATED budget owners

-- SELECT: Only authenticated budget owners can view their sharing links
CREATE POLICY "Authenticated owners can view their shared links"
  ON public.shared_budgets
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM budgets
      WHERE budgets.id = shared_budgets.budget_id
        AND budgets.user_id = auth.uid()
    )
  );

-- INSERT: Only authenticated budget owners can create sharing links
CREATE POLICY "Authenticated owners can create shared links"
  ON public.shared_budgets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM budgets
      WHERE budgets.id = shared_budgets.budget_id
        AND budgets.user_id = auth.uid()
    )
  );

-- UPDATE: Only authenticated budget owners can update their sharing links
CREATE POLICY "Authenticated owners can update shared links"
  ON public.shared_budgets
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM budgets
      WHERE budgets.id = shared_budgets.budget_id
        AND budgets.user_id = auth.uid()
    )
  );

-- DELETE: Only authenticated budget owners can delete their sharing links
CREATE POLICY "Authenticated owners can delete shared links"
  ON public.shared_budgets
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM budgets
      WHERE budgets.id = shared_budgets.budget_id
        AND budgets.user_id = auth.uid()
    )
  );