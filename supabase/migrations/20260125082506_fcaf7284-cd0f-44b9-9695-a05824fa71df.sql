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
INSERT INTO public.user_roles (user_id, role)
VALUES ('f628fbf6-5f2f-4ca1-86e0-21eb2395bc40', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;