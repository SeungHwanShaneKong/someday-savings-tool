-- Clean up duplicate/old policies on budget_invitations
-- The old "Invited users can view their own invitations" policy still exists, need to drop it
DROP POLICY IF EXISTS "Invited users can view their own invitations" ON public.budget_invitations;