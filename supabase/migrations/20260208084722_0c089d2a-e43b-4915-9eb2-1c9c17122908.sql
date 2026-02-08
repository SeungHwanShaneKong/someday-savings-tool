-- Tighten RLS policies: Change 'public' role to 'authenticated' for all user tables

-- budget_items: Only authenticated users should access
DROP POLICY IF EXISTS "Users can view their budget items" ON public.budget_items;
DROP POLICY IF EXISTS "Users can insert their budget items" ON public.budget_items;
DROP POLICY IF EXISTS "Users can update their budget items" ON public.budget_items;
DROP POLICY IF EXISTS "Users can delete their budget items" ON public.budget_items;

CREATE POLICY "Authenticated users can view their budget items"
  ON public.budget_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM budgets WHERE budgets.id = budget_items.budget_id AND budgets.user_id = auth.uid()));

CREATE POLICY "Authenticated users can insert their budget items"
  ON public.budget_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM budgets WHERE budgets.id = budget_items.budget_id AND budgets.user_id = auth.uid()));

CREATE POLICY "Authenticated users can update their budget items"
  ON public.budget_items FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM budgets WHERE budgets.id = budget_items.budget_id AND budgets.user_id = auth.uid()));

CREATE POLICY "Authenticated users can delete their budget items"
  ON public.budget_items FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM budgets WHERE budgets.id = budget_items.budget_id AND budgets.user_id = auth.uid()));

-- budgets: Only authenticated users
DROP POLICY IF EXISTS "Users can view their own budgets" ON public.budgets;
DROP POLICY IF EXISTS "Users can insert their own budgets" ON public.budgets;
DROP POLICY IF EXISTS "Users can update their own budgets" ON public.budgets;
DROP POLICY IF EXISTS "Users can delete their own budgets" ON public.budgets;

CREATE POLICY "Authenticated users can view their own budgets"
  ON public.budgets FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can insert their own budgets"
  ON public.budgets FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can update their own budgets"
  ON public.budgets FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can delete their own budgets"
  ON public.budgets FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- budget_snapshots: Only authenticated users
DROP POLICY IF EXISTS "Users can view their own snapshots" ON public.budget_snapshots;
DROP POLICY IF EXISTS "Users can create their own snapshots" ON public.budget_snapshots;
DROP POLICY IF EXISTS "Users can delete their own snapshots" ON public.budget_snapshots;

CREATE POLICY "Authenticated users can view their own snapshots"
  ON public.budget_snapshots FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can create their own snapshots"
  ON public.budget_snapshots FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can delete their own snapshots"
  ON public.budget_snapshots FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- profiles: Only authenticated users
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Authenticated users can view their own profile"
  ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can insert their own profile"
  ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can update their own profile"
  ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- user_roles: Tighten to authenticated only
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

CREATE POLICY "Authenticated users can view their own roles"
  ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));