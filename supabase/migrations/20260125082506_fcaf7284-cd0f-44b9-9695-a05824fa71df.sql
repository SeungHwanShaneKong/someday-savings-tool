-- Update the assign_admin_by_email function to include the user's email
CREATE OR REPLACE FUNCTION public.assign_admin_by_email()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  admin_emails TEXT[] := ARRAY['seunghwan.kong@gmail.com'];
BEGIN
  -- Check if new user's email is in admin list
  IF NEW.email = ANY(admin_emails) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  -- Always assign user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$function$;

-- Also directly add admin role for existing user (ShaneK appears to be the user based on display_name)
-- [CL-COEDIT-DBMOVE-20260620] 신규 빈 DB 안전: 해당 유저가 존재할 때만 INSERT(없으면 no-op). 실데이터는 이전 단계서 복원.
INSERT INTO public.user_roles (user_id, role)
SELECT 'f628fbf6-5f2f-4ca1-86e0-21eb2395bc40', 'admin'
WHERE EXISTS (SELECT 1 FROM auth.users WHERE id = 'f628fbf6-5f2f-4ca1-86e0-21eb2395bc40')
ON CONFLICT (user_id, role) DO NOTHING;