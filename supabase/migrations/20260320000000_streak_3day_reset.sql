-- Migration: update streak reset rule from >1 day to >=3 days inactivity
--
-- Previously the client reset the streak after any single missed day.
-- The new rule: streak only resets when the gap since last_quiz_date is
-- 3 or more calendar days.  This migration adds a server-side function
-- so the rule is also enforced if streak is ever updated via direct RPC.

-- Function: called by the client (or a scheduled job) to apply the
-- 3-day inactivity reset for a specific user.
CREATE OR REPLACE FUNCTION public.reset_streak_if_inactive(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_last_date date;
  v_gap       integer;
BEGIN
  SELECT last_quiz_date
    INTO v_last_date
    FROM public.profiles
   WHERE user_id = p_user_id;

  IF v_last_date IS NULL THEN
    RETURN;
  END IF;

  v_gap := (CURRENT_DATE - v_last_date);

  IF v_gap >= 3 THEN
    UPDATE public.profiles
       SET streak = 0
     WHERE user_id = p_user_id;
  END IF;
END;
$$;

-- Grant execute to authenticated users (each user can only reset their own
-- streak because the function uses p_user_id and RLS protects the table).
GRANT EXECUTE ON FUNCTION public.reset_streak_if_inactive(uuid) TO authenticated;

-- Ensure RLS is still enabled on profiles (idempotent)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
