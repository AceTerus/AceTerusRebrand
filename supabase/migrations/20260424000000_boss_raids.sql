-- Add ace_coins
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ace_coins INTEGER NOT NULL DEFAULT 500;

-- Boss Raids
CREATE TABLE IF NOT EXISTS public.boss_raids (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  visibility TEXT NOT NULL DEFAULT 'global' CHECK (visibility IN ('global', 'university')),
  university TEXT,
  initial_bounty INTEGER NOT NULL,
  bounty_pot INTEGER NOT NULL DEFAULT 0,
  min_entry_fee INTEGER NOT NULL DEFAULT 10,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cleared')),
  cleared_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Questions for Boss Raid
CREATE TABLE IF NOT EXISTS public.boss_raid_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  raid_id UUID NOT NULL REFERENCES public.boss_raids(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  answers JSONB NOT NULL,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Attempts
CREATE TABLE IF NOT EXISTS public.boss_raid_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  raid_id UUID NOT NULL REFERENCES public.boss_raids(id) ON DELETE CASCADE,
  challenger_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bet_amount INTEGER NOT NULL,
  score INTEGER,
  max_score INTEGER,
  status TEXT NOT NULL DEFAULT 'playing' CHECK (status IN ('playing', 'won', 'lost')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.boss_raids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boss_raid_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boss_raid_attempts ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'boss_raids' AND policyname = 'Everyone can read boss raids') THEN
    CREATE POLICY "Everyone can read boss raids" ON public.boss_raids FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'boss_raids' AND policyname = 'Users can create their own boss raids') THEN
    CREATE POLICY "Users can create their own boss raids" ON public.boss_raids FOR INSERT WITH CHECK (auth.uid() = creator_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'boss_raids' AND policyname = 'Users can update their own boss raids') THEN
    CREATE POLICY "Users can update their own boss raids" ON public.boss_raids FOR UPDATE USING (auth.uid() = creator_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'boss_raid_questions' AND policyname = 'Everyone can read boss raid questions') THEN
    CREATE POLICY "Everyone can read boss raid questions" ON public.boss_raid_questions FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'boss_raid_questions' AND policyname = 'Creator can insert questions') THEN
    CREATE POLICY "Creator can insert questions" ON public.boss_raid_questions FOR INSERT WITH CHECK (
      EXISTS(SELECT 1 FROM public.boss_raids WHERE id = raid_id AND creator_id = auth.uid())
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'boss_raid_attempts' AND policyname = 'Everyone can read attempts') THEN
    CREATE POLICY "Everyone can read attempts" ON public.boss_raid_attempts FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'boss_raid_attempts' AND policyname = 'Users can insert own attempts') THEN
    CREATE POLICY "Users can insert own attempts" ON public.boss_raid_attempts FOR INSERT WITH CHECK (auth.uid() = challenger_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'boss_raid_attempts' AND policyname = 'Users can update own attempts') THEN
    CREATE POLICY "Users can update own attempts" ON public.boss_raid_attempts FOR UPDATE USING (auth.uid() = challenger_id);
  END IF;
END $$;

-- Helper function to fetch user's coin balance from profiles
CREATE OR REPLACE FUNCTION get_user_ace_coins(target_user_id UUID)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  coins INTEGER;
BEGIN
  SELECT ace_coins INTO coins FROM public.profiles WHERE user_id = target_user_id;
  RETURN COALESCE(coins, 0);
END;
$$;

-- RPC to create a Boss Raid safely (deducting coins)
CREATE OR REPLACE FUNCTION create_boss_raid(
  p_title TEXT,
  p_description TEXT,
  p_visibility TEXT,
  p_university TEXT,
  p_initial_bounty INTEGER,
  p_min_entry_fee INTEGER,
  p_questions JSONB
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_creator_id UUID;
  v_coins INTEGER;
  v_raid_id UUID;
  q record;
BEGIN
  v_creator_id := auth.uid();
  IF v_creator_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check balance
  SELECT ace_coins INTO v_coins FROM public.profiles WHERE user_id = v_creator_id;
  IF v_coins IS NULL OR v_coins < p_initial_bounty THEN
    RAISE EXCEPTION 'Insufficient ACE Coins';
  END IF;

  -- Deduct coins
  UPDATE public.profiles SET ace_coins = ace_coins - p_initial_bounty WHERE user_id = v_creator_id;

  -- Insert Raid
  INSERT INTO public.boss_raids (
    creator_id, title, description, visibility, university, initial_bounty, bounty_pot, min_entry_fee, status
  ) VALUES (
    v_creator_id, p_title, p_description, p_visibility, p_university, p_initial_bounty, 0, p_min_entry_fee, 'active'
  ) RETURNING id INTO v_raid_id;

  -- Insert Questions
  FOR q IN SELECT * FROM jsonb_array_elements(p_questions)
  LOOP
    INSERT INTO public.boss_raid_questions (raid_id, question_text, answers)
    VALUES (v_raid_id, q.value->>'text', q.value->'answers');
  END LOOP;

  RETURN v_raid_id;
END;
$$;

-- RPC to start raid attempt (deducts bet)
CREATE OR REPLACE FUNCTION start_raid_attempt(
  p_raid_id UUID,
  p_bet_amount INTEGER
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id UUID;
  v_coins INTEGER;
  v_raid public.boss_raids%ROWTYPE;
  v_attempt_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO v_raid FROM public.boss_raids WHERE id = p_raid_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Raid not found'; END IF;
  IF v_raid.status != 'active' THEN RAISE EXCEPTION 'Raid is no longer active'; END IF;
  
  -- Creator cannot play own raid
  IF v_raid.creator_id = v_user_id THEN RAISE EXCEPTION 'Cannot challenge own raid'; END IF;

  IF p_bet_amount < v_raid.min_entry_fee THEN RAISE EXCEPTION 'Bet amount too low'; END IF;

  SELECT ace_coins INTO v_coins FROM public.profiles WHERE user_id = v_user_id;
  IF v_coins IS NULL OR v_coins < p_bet_amount THEN RAISE EXCEPTION 'Insufficient ACE Coins'; END IF;

  -- Deduct bet
  UPDATE public.profiles SET ace_coins = ace_coins - p_bet_amount WHERE user_id = v_user_id;

  -- Create attempt
  INSERT INTO public.boss_raid_attempts (raid_id, challenger_id, bet_amount, status)
  VALUES (p_raid_id, v_user_id, p_bet_amount, 'playing')
  RETURNING id INTO v_attempt_id;

  RETURN v_attempt_id;
END;
$$;

-- RPC to finish raid attempt
CREATE OR REPLACE FUNCTION finish_raid_attempt(
  p_attempt_id UUID,
  p_score INTEGER,
  p_max_score INTEGER
)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_attempt public.boss_raid_attempts%ROWTYPE;
  v_raid public.boss_raids%ROWTYPE;
  v_result TEXT;
  v_total_payout INTEGER;
BEGIN
  -- We assume client evaluated score properly (or we could evaluate server side, but client is fine for prototype)
  SELECT * INTO v_attempt FROM public.boss_raid_attempts WHERE id = p_attempt_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Attempt not found'; END IF;
  IF v_attempt.status != 'playing' THEN RAISE EXCEPTION 'Attempt already finished'; END IF;
  IF v_attempt.challenger_id != auth.uid() THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  SELECT * INTO v_raid FROM public.boss_raids WHERE id = v_attempt.raid_id;
  IF v_raid.status != 'active' THEN RAISE EXCEPTION 'Raid no longer active'; END IF;

  IF p_score = p_max_score THEN
    -- Won!
    v_total_payout := v_raid.initial_bounty + v_raid.bounty_pot + v_attempt.bet_amount + (v_attempt.bet_amount * 2); -- example of extra multiplier if desired, or just bounty + pot + bet returned
    -- wait, they get the whole bounty and pot. Plus their bet back.
    v_total_payout := v_raid.initial_bounty + v_raid.bounty_pot + v_attempt.bet_amount;

    -- Update User Coins
    UPDATE public.profiles SET ace_coins = ace_coins + v_total_payout WHERE user_id = v_attempt.challenger_id;
    
    -- Update attempt & raid
    UPDATE public.boss_raid_attempts 
      SET status = 'won', score = p_score, max_score = p_max_score, completed_at = now() 
      WHERE id = p_attempt_id;
    UPDATE public.boss_raids 
      SET status = 'cleared', cleared_by = v_attempt.challenger_id, bounty_pot = 0 
      WHERE id = v_raid.id;
    
    v_result := 'won';
  ELSE
    -- Lost
    -- Add bet to pot
    UPDATE public.boss_raids SET bounty_pot = bounty_pot + v_attempt.bet_amount WHERE id = v_raid.id;
    
    -- Update attempt
    UPDATE public.boss_raid_attempts 
      SET status = 'lost', score = p_score, max_score = p_max_score, completed_at = now() 
      WHERE id = p_attempt_id;
      
    v_result := 'lost';
  END IF;

  RETURN v_result;
END;
$$;
