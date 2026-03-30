-- [CL-IMPROVE-7TASKS-20260330] 사용자 기능 요청 수집 테이블
CREATE TABLE IF NOT EXISTS public.feature_requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  content text NOT NULL CHECK (char_length(content) <= 500),
  category text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.feature_requests ENABLE ROW LEVEL SECURITY;

-- 누구나 (비로그인 포함) insert 가능
CREATE POLICY "Anyone can insert feature requests"
  ON public.feature_requests
  FOR INSERT
  WITH CHECK (true);

-- 관리자만 조회 가능
CREATE POLICY "Admins can view feature requests"
  ON public.feature_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );
