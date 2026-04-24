-- Add ace_coins if not exist and set default to 1000
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ace_coins INTEGER NOT NULL DEFAULT 1000;

-- Change default to 1000 for existing column
ALTER TABLE public.profiles ALTER COLUMN ace_coins SET DEFAULT 1000;

-- Update existing users who have 500 or 0 coins to 1000 (retroactive onboarding)
-- Be careful not to overwrite users who have earned more than 1000 coins organically.
-- Assuming 500 was the previous default
UPDATE public.profiles SET ace_coins = 1000 WHERE ace_coins <= 500;
