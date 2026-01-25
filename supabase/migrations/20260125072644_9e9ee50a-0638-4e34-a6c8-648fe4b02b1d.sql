-- Add cost_split column to budget_items table
ALTER TABLE public.budget_items 
ADD COLUMN cost_split text DEFAULT '-' CHECK (cost_split IN ('groom', 'bride', 'together', '-'));