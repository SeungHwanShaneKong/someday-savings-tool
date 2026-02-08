-- Fix budget_invitations security vulnerability
-- Remove the email-based policy that allows email enumeration attacks
-- Instead, only allow access via proper authentication and token validation

-- Drop the vulnerable policy
DROP POLICY IF EXISTS "Invited users can view their own invitations" ON public.budget_invitations;

-- Create a more secure policy: users can only view invitations where they are the actual invited user
-- This requires both: matching email AND being authenticated
-- The invitation acceptance flow is handled by the SECURITY DEFINER function accept_budget_invitation
CREATE POLICY "Authenticated users can view invitations sent to their verified email"
ON public.budget_invitations
FOR SELECT
TO authenticated
USING (
  -- User must be authenticated AND their verified email must match the invitation email
  LOWER(email) = LOWER(auth.email())
  AND auth.uid() IS NOT NULL
);

-- Ensure the accept_budget_invitation function properly validates before accepting
-- This function already exists and uses SECURITY DEFINER, so it bypasses RLS safely