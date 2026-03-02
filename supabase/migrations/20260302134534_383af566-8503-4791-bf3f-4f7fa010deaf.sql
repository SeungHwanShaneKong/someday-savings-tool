
-- Create missing tables from Phase 1-A migration

-- 1. checklist_templates
CREATE TABLE IF NOT EXISTS public.checklist_templates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  period text NOT NULL,
  sort_order integer NOT NULL,
  title text NOT NULL,
  description text,
  category_link text,
  sub_category_link text,
  nudge_message text,
  depends_on uuid REFERENCES public.checklist_templates(id),
  created_at timestamptz DEFAULT now()
);

-- 2. user_checklist_items
CREATE TABLE IF NOT EXISTS public.user_checklist_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  template_id uuid REFERENCES public.checklist_templates(id),
  budget_id uuid REFERENCES public.budgets(id),
  title text NOT NULL,
  period text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_completed boolean DEFAULT false,
  completed_at timestamptz,
  due_date date,
  notes text,
  depends_on uuid REFERENCES public.user_checklist_items(id),
  category_link text,
  sub_category_link text,
  is_custom boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. ai_conversations
CREATE TABLE IF NOT EXISTS public.ai_conversations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  feature text NOT NULL,
  messages jsonb NOT NULL DEFAULT '[]',
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. budget_insights
CREATE TABLE IF NOT EXISTS public.budget_insights (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  budget_id uuid REFERENCES public.budgets(id) NOT NULL,
  insight_type text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  metadata jsonb,
  is_dismissed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- 5. crawl_jobs
CREATE TABLE IF NOT EXISTS public.crawl_jobs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  source text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  records_processed integer DEFAULT 0,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crawl_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone reads templates"
  ON public.checklist_templates FOR SELECT
  USING (true);

CREATE POLICY "Users manage own checklist items"
  ON public.user_checklist_items FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users manage own conversations"
  ON public.ai_conversations FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users view own budget insights"
  ON public.budget_insights FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.budgets b
      WHERE b.id = budget_id AND b.user_id = auth.uid()
    )
  );

CREATE POLICY "Admin manages crawl jobs"
  ON public.crawl_jobs FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_checklist_items_user_id ON public.user_checklist_items(user_id);
CREATE INDEX IF NOT EXISTS idx_user_checklist_items_period ON public.user_checklist_items(period);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_feature ON public.ai_conversations(user_id, feature);
CREATE INDEX IF NOT EXISTS idx_budget_insights_budget_id ON public.budget_insights(budget_id);
CREATE INDEX IF NOT EXISTS idx_checklist_templates_period ON public.checklist_templates(period);
