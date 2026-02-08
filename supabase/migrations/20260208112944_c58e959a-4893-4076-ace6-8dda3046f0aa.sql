-- Add INSERT policy for notifications table
-- Only allow users to create notifications for themselves (self-notifications)
-- or system processes (which would use service role)
CREATE POLICY "Users can create their own notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);