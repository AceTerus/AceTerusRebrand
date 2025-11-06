-- First, delete any orphaned profiles (profiles where the user no longer exists)
DELETE FROM public.profiles
WHERE user_id NOT IN (
  SELECT id FROM auth.users
);

-- Now add the foreign key constraint with CASCADE delete
-- This ensures when a user account is deleted, their profile is also deleted
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;