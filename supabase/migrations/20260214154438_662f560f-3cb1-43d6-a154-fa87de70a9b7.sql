
-- Remove invitee SELECT policy to prevent email enumeration attacks
-- Invitation acceptance is handled securely via accept_budget_invitation() SECURITY DEFINER RPC
-- which validates both token AND email, so direct SELECT access for invitees is unnecessary
DROP POLICY IF EXISTS "Authenticated users can view invitations sent to their verified" ON public.budget_invitations;
