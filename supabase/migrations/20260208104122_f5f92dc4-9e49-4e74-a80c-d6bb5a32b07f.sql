-- Cleanup: Drop old restrictive policies that cause infinite recursion
DROP POLICY IF EXISTS "Budget owners can view collaborators" ON public.budget_collaborators;
DROP POLICY IF EXISTS "Collaborators can view other collaborators" ON public.budget_collaborators;