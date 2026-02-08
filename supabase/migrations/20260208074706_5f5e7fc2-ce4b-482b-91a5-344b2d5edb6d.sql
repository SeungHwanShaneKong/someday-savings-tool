-- Add wedding_time column to budgets table for D-Day countdown
ALTER TABLE public.budgets 
ADD COLUMN IF NOT EXISTS wedding_time TIME DEFAULT NULL;