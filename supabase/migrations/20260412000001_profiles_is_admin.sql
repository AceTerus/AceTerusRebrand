-- Add is_admin flag to profiles so RLS policies can gate admin-only operations
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;
