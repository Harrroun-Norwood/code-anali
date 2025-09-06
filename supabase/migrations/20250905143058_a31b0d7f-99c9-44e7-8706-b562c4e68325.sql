-- First, let's create a comprehensive function to sync all auth users with profiles
DO $$
DECLARE
    user_record RECORD;
BEGIN
    -- Loop through all users in auth.users that don't have profiles
    FOR user_record IN 
        SELECT au.id, au.email, au.raw_user_meta_data
        FROM auth.users au
        LEFT JOIN public.profiles p ON p.user_id = au.id
        WHERE p.user_id IS NULL
    LOOP
        -- Insert missing profile for each user
        INSERT INTO public.profiles (
            user_id, 
            email, 
            first_name, 
            last_name, 
            role,
            is_active
        ) VALUES (
            user_record.id,
            user_record.email,
            COALESCE(user_record.raw_user_meta_data ->> 'first_name', 'Unknown'),
            COALESCE(user_record.raw_user_meta_data ->> 'last_name', 'User'),
            COALESCE((user_record.raw_user_meta_data ->> 'role')::user_role, 'student'),
            true
        );
    END LOOP;
    
    -- Update existing profiles to ensure they have the latest auth data
    UPDATE public.profiles 
    SET 
        email = au.email,
        first_name = COALESCE(
            CASE 
                WHEN profiles.first_name IS NULL OR profiles.first_name = '' 
                THEN au.raw_user_meta_data ->> 'first_name'
                ELSE profiles.first_name 
            END, 
            'Unknown'
        ),
        last_name = COALESCE(
            CASE 
                WHEN profiles.last_name IS NULL OR profiles.last_name = '' 
                THEN au.raw_user_meta_data ->> 'last_name'
                ELSE profiles.last_name 
            END, 
            'User'
        ),
        contact_number = COALESCE(
            profiles.contact_number,
            au.raw_user_meta_data ->> 'contact_number'
        ),
        updated_at = now()
    FROM auth.users au
    WHERE profiles.user_id = au.id;
    
END $$;

-- Clean up any orphaned profiles (profiles without corresponding auth users)
DELETE FROM public.profiles 
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Ensure all profiles have valid roles
UPDATE public.profiles 
SET role = 'student'::user_role 
WHERE role IS NULL;