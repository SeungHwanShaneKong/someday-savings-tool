-- Update RPC to also return budget owner's user_id for authorization check
DROP FUNCTION IF EXISTS public.get_shared_budget_items_by_token(text);

CREATE OR REPLACE FUNCTION public.get_shared_budget_items_by_token(p_share_token text)
RETURNS TABLE(
  budget_id uuid,
  budget_owner_id uuid,
  category text,
  sub_category text,
  amount numeric,
  is_paid boolean,
  notes text,
  quantity integer,
  unit_price numeric,
  custom_name text,
  is_custom boolean,
  cost_split text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    bi.budget_id,
    b.user_id as budget_owner_id,
    bi.category,
    bi.sub_category,
    bi.amount,
    bi.is_paid,
    bi.notes,
    bi.quantity,
    bi.unit_price,
    bi.custom_name,
    bi.is_custom,
    bi.cost_split
  FROM public.budget_items bi
  INNER JOIN public.shared_budgets sb ON sb.budget_id = bi.budget_id
  INNER JOIN public.budgets b ON b.id = bi.budget_id
  WHERE sb.share_token = p_share_token
    AND sb.is_active = true;
$$;