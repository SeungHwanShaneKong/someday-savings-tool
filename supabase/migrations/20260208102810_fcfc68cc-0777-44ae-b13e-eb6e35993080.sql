-- Create enum for collaboration roles
CREATE TYPE public.collaborator_role AS ENUM ('owner', 'editor', 'viewer');

-- Create enum for invitation status
CREATE TYPE public.invitation_status AS ENUM ('pending', 'accepted', 'declined', 'expired');

-- Create budget_collaborators table for managing access
CREATE TABLE public.budget_collaborators (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    budget_id UUID NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    role collaborator_role NOT NULL DEFAULT 'viewer',
    invited_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (budget_id, user_id)
);

-- Create budget_invitations table for pending invitations
CREATE TABLE public.budget_invitations (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    budget_id UUID NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role collaborator_role NOT NULL DEFAULT 'editor',
    invited_by UUID NOT NULL,
    status invitation_status NOT NULL DEFAULT 'pending',
    token TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    responded_at TIMESTAMP WITH TIME ZONE,
    UNIQUE (budget_id, email, status)
);

-- Create in-app notifications table
CREATE TABLE public.notifications (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT,
    data JSONB,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.budget_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Add indexes for performance
CREATE INDEX idx_budget_collaborators_budget_id ON public.budget_collaborators(budget_id);
CREATE INDEX idx_budget_collaborators_user_id ON public.budget_collaborators(user_id);
CREATE INDEX idx_budget_invitations_email ON public.budget_invitations(email);
CREATE INDEX idx_budget_invitations_token ON public.budget_invitations(token);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);

-- Enable realtime for budget_items table (for live collaboration)
ALTER PUBLICATION supabase_realtime ADD TABLE public.budget_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- RLS Policies for budget_collaborators
-- Owners can view all collaborators
CREATE POLICY "Budget owners can view collaborators"
ON public.budget_collaborators FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.budgets 
        WHERE budgets.id = budget_collaborators.budget_id 
        AND budgets.user_id = auth.uid()
    )
);

-- Collaborators can view other collaborators on their budgets
CREATE POLICY "Collaborators can view other collaborators"
ON public.budget_collaborators FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.budget_collaborators bc 
        WHERE bc.budget_id = budget_collaborators.budget_id 
        AND bc.user_id = auth.uid()
    )
);

-- Owners can manage collaborators
CREATE POLICY "Budget owners can insert collaborators"
ON public.budget_collaborators FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.budgets 
        WHERE budgets.id = budget_collaborators.budget_id 
        AND budgets.user_id = auth.uid()
    )
);

CREATE POLICY "Budget owners can update collaborators"
ON public.budget_collaborators FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.budgets 
        WHERE budgets.id = budget_collaborators.budget_id 
        AND budgets.user_id = auth.uid()
    )
);

CREATE POLICY "Budget owners can delete collaborators"
ON public.budget_collaborators FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.budgets 
        WHERE budgets.id = budget_collaborators.budget_id 
        AND budgets.user_id = auth.uid()
    )
);

-- Collaborators can leave (delete themselves)
CREATE POLICY "Collaborators can remove themselves"
ON public.budget_collaborators FOR DELETE
USING (user_id = auth.uid());

-- RLS Policies for budget_invitations
CREATE POLICY "Budget owners can view invitations"
ON public.budget_invitations FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.budgets 
        WHERE budgets.id = budget_invitations.budget_id 
        AND budgets.user_id = auth.uid()
    )
);

CREATE POLICY "Budget owners can create invitations"
ON public.budget_invitations FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.budgets 
        WHERE budgets.id = budget_invitations.budget_id 
        AND budgets.user_id = auth.uid()
    )
);

CREATE POLICY "Budget owners can update invitations"
ON public.budget_invitations FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.budgets 
        WHERE budgets.id = budget_invitations.budget_id 
        AND budgets.user_id = auth.uid()
    )
);

CREATE POLICY "Budget owners can delete invitations"
ON public.budget_invitations FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.budgets 
        WHERE budgets.id = budget_invitations.budget_id 
        AND budgets.user_id = auth.uid()
    )
);

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own notifications"
ON public.notifications FOR DELETE
USING (user_id = auth.uid());

-- System can insert notifications (via service role)
CREATE POLICY "Service role can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (true);

-- Update budget_items RLS to allow collaborators
CREATE POLICY "Collaborators can view budget items"
ON public.budget_items FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.budget_collaborators bc
        WHERE bc.budget_id = budget_items.budget_id
        AND bc.user_id = auth.uid()
    )
);

CREATE POLICY "Editor collaborators can insert budget items"
ON public.budget_items FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.budget_collaborators bc
        WHERE bc.budget_id = budget_items.budget_id
        AND bc.user_id = auth.uid()
        AND bc.role IN ('owner', 'editor')
    )
);

CREATE POLICY "Editor collaborators can update budget items"
ON public.budget_items FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.budget_collaborators bc
        WHERE bc.budget_id = budget_items.budget_id
        AND bc.user_id = auth.uid()
        AND bc.role IN ('owner', 'editor')
    )
);

CREATE POLICY "Editor collaborators can delete budget items"
ON public.budget_items FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.budget_collaborators bc
        WHERE bc.budget_id = budget_items.budget_id
        AND bc.user_id = auth.uid()
        AND bc.role IN ('owner', 'editor')
    )
);

-- Update budgets RLS to allow collaborators to view
CREATE POLICY "Collaborators can view budgets"
ON public.budgets FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.budget_collaborators bc
        WHERE bc.budget_id = budgets.id
        AND bc.user_id = auth.uid()
    )
);

-- Function to accept invitation
CREATE OR REPLACE FUNCTION public.accept_budget_invitation(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_invitation budget_invitations;
    v_user_id UUID;
    v_user_email TEXT;
BEGIN
    -- Get current user
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
    END IF;
    
    -- Get user email
    SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
    
    -- Find valid invitation
    SELECT * INTO v_invitation
    FROM public.budget_invitations
    WHERE token = p_token
    AND status = 'pending'
    AND expires_at > now()
    AND LOWER(email) = LOWER(v_user_email);
    
    IF v_invitation IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired invitation');
    END IF;
    
    -- Create collaborator record
    INSERT INTO public.budget_collaborators (budget_id, user_id, role, invited_by)
    VALUES (v_invitation.budget_id, v_user_id, v_invitation.role, v_invitation.invited_by)
    ON CONFLICT (budget_id, user_id) DO UPDATE SET role = EXCLUDED.role;
    
    -- Update invitation status
    UPDATE public.budget_invitations
    SET status = 'accepted', responded_at = now()
    WHERE id = v_invitation.id;
    
    RETURN jsonb_build_object('success', true, 'budget_id', v_invitation.budget_id);
END;
$$;

-- Function to check user's role in a budget
CREATE OR REPLACE FUNCTION public.get_budget_role(p_budget_id UUID, p_user_id UUID DEFAULT auth.uid())
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_role TEXT;
BEGIN
    -- Check if owner
    IF EXISTS (SELECT 1 FROM public.budgets WHERE id = p_budget_id AND user_id = p_user_id) THEN
        RETURN 'owner';
    END IF;
    
    -- Check collaborator role
    SELECT role::text INTO v_role
    FROM public.budget_collaborators
    WHERE budget_id = p_budget_id AND user_id = p_user_id;
    
    RETURN v_role;
END;
$$;

-- Trigger to update updated_at
CREATE TRIGGER update_budget_collaborators_updated_at
BEFORE UPDATE ON public.budget_collaborators
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();