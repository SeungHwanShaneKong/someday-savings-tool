-- Fix budget_invitations RLS policies for proper security
-- Ensure only authenticated users can access, and invited users can only see their own invitations

-- Drop existing policies to recreate with proper role restrictions
DROP POLICY IF EXISTS "Budget owners can view invitations" ON public.budget_invitations;
DROP POLICY IF EXISTS "Budget owners can create invitations" ON public.budget_invitations;
DROP POLICY IF EXISTS "Budget owners can update invitations" ON public.budget_invitations;
DROP POLICY IF EXISTS "Budget owners can delete invitations" ON public.budget_invitations;

-- SELECT: Budget owners can view all invitations for their budgets
CREATE POLICY "Budget owners can view invitations"
ON public.budget_invitations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM budgets
    WHERE budgets.id = budget_invitations.budget_id
    AND budgets.user_id = auth.uid()
  )
);

-- SELECT: Invited users can view their own invitation (matching their email)
CREATE POLICY "Invited users can view their own invitations"
ON public.budget_invitations
FOR SELECT
TO authenticated
USING (LOWER(email) = LOWER(auth.email()));

-- INSERT: Only budget owners can create invitations
CREATE POLICY "Budget owners can create invitations"
ON public.budget_invitations
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM budgets
    WHERE budgets.id = budget_invitations.budget_id
    AND budgets.user_id = auth.uid()
  )
);

-- UPDATE: Only budget owners can update invitations
CREATE POLICY "Budget owners can update invitations"
ON public.budget_invitations
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM budgets
    WHERE budgets.id = budget_invitations.budget_id
    AND budgets.user_id = auth.uid()
  )
);

-- DELETE: Only budget owners can delete invitations
CREATE POLICY "Budget owners can delete invitations"
ON public.budget_invitations
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM budgets
    WHERE budgets.id = budget_invitations.budget_id
    AND budgets.user_id = auth.uid()
  )
);