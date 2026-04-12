-- [CL-FK-BUDGET-DELETE-20260412-124100]
-- Fix: user_checklist_items.budget_id FK lacks ON DELETE SET NULL
-- When a budget is deleted, checklist items should be preserved (progress data)
-- but their budget_id should be set to NULL

ALTER TABLE public.user_checklist_items
  DROP CONSTRAINT user_checklist_items_budget_id_fkey,
  ADD CONSTRAINT user_checklist_items_budget_id_fkey
    FOREIGN KEY (budget_id) REFERENCES public.budgets(id) ON DELETE SET NULL;
