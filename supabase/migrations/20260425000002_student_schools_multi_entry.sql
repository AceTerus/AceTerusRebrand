-- Allow multiple education entries per user (LinkedIn-style education history)
ALTER TABLE public.student_schools DROP CONSTRAINT IF EXISTS student_schools_user_id_key;
