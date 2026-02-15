
-- Admin RLS policies for KPI dashboard data access

-- profiles: admin 조회 허용
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- budgets: admin 조회 허용
CREATE POLICY "Admins can view all budgets"
ON public.budgets FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- budget_items: admin 조회 허용
CREATE POLICY "Admins can view all budget items"
ON public.budget_items FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- shared_budgets: admin 조회 허용
CREATE POLICY "Admins can view all shared budgets"
ON public.shared_budgets FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- budget_snapshots: admin 조회 허용
CREATE POLICY "Admins can view all budget snapshots"
ON public.budget_snapshots FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
