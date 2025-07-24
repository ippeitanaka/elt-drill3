-- Create initial admin user
-- Note: This creates a user in the auth.users table and corresponding profile
-- You'll need to replace the email and set a proper password

-- First, let's create a function to create admin users
CREATE OR REPLACE FUNCTION create_admin_user(
  user_email TEXT,
  user_password TEXT,
  user_name TEXT
)
RETURNS UUID AS $$
DECLARE
  new_user_id UUID;
BEGIN
  -- Insert into auth.users (this is a simplified version - in real Supabase, use the dashboard or API)
  INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data
  ) VALUES (
    gen_random_uuid(),
    user_email,
    crypt(user_password, gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider": "email", "providers": ["email"]}',
    jsonb_build_object('name', user_name)
  ) RETURNING id INTO new_user_id;

  -- Insert into public.users with admin role
  INSERT INTO public.users (
    id,
    name,
    email,
    role,
    created_at,
    updated_at
  ) VALUES (
    new_user_id,
    user_name,
    user_email,
    'admin',
    NOW(),
    NOW()
  );

  RETURN new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create initial admin user (replace with your details)
-- SELECT create_admin_user('admin@example.com', 'admin123', '管理者');

-- Alternative: Update existing user to admin
-- UPDATE public.users SET role = 'admin' WHERE email = 'your-email@example.com';

-- Function to promote user to admin
CREATE OR REPLACE FUNCTION promote_to_admin(user_email TEXT)
RETURNS void AS $$
BEGIN
  UPDATE public.users 
  SET role = 'admin', updated_at = NOW()
  WHERE email = user_email;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User with email % not found', user_email;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_admin_user(TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION promote_to_admin(TEXT) TO service_role;
