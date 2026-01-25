-- Create a table to store budget snapshots for version control
CREATE TABLE public.budget_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  budget_id UUID NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT '스냅샷',
  snapshot_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.budget_snapshots ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own snapshots"
ON public.budget_snapshots
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own snapshots"
ON public.budget_snapshots
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own snapshots"
ON public.budget_snapshots
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_budget_snapshots_budget_id ON public.budget_snapshots(budget_id);
CREATE INDEX idx_budget_snapshots_user_id ON public.budget_snapshots(user_id);