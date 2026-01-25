-- Add columns for per-person calculation (unit_price, quantity) and custom item names
ALTER TABLE public.budget_items 
ADD COLUMN IF NOT EXISTS unit_price integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS quantity integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS custom_name text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS is_custom boolean DEFAULT false;

-- Create index for custom items
CREATE INDEX IF NOT EXISTS idx_budget_items_is_custom ON public.budget_items(budget_id, is_custom);

COMMENT ON COLUMN public.budget_items.unit_price IS 'Unit price for per-person calculations (e.g., meal cost per person)';
COMMENT ON COLUMN public.budget_items.quantity IS 'Number of units/people for per-person calculations';
COMMENT ON COLUMN public.budget_items.custom_name IS 'User-defined name for this item (overrides default)';
COMMENT ON COLUMN public.budget_items.is_custom IS 'True if this is a user-added custom item';