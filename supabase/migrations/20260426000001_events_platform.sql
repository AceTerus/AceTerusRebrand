-- Events Platform: organizers, events, registrations, promoters, deals

-- Event organizers (brands, universities, companies, student bodies)
CREATE TABLE IF NOT EXISTS public.event_organizers (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT        NOT NULL,
  type            TEXT        NOT NULL CHECK (type IN ('university', 'brand', 'company', 'student_body')),
  logo_url        TEXT,
  verified        BOOLEAN     NOT NULL DEFAULT false,
  owner_user_id   UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Events
CREATE TABLE IF NOT EXISTS public.events (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title             TEXT        NOT NULL,
  description       TEXT,
  type              TEXT        NOT NULL CHECK (type IN ('competition', 'hackathon', 'workshop', 'talk', 'internship', 'deal')),
  organizer_id      UUID        REFERENCES public.event_organizers(id) ON DELETE SET NULL,
  submitter_user_id UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  university_id     UUID,
  is_sponsored      BOOLEAN     NOT NULL DEFAULT false,
  is_featured       BOOLEAN     NOT NULL DEFAULT false,
  location          TEXT,
  start_date        TIMESTAMPTZ,
  end_date          TIMESTAMPTZ,
  registration_url  TEXT,
  image_url         TEXT,
  ace_coins_reward  INTEGER     NOT NULL DEFAULT 0,
  status            TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'published', 'rejected')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Event registrations
CREATE TABLE IF NOT EXISTS public.event_registrations (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      UUID        NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referrer_id   UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);

-- Event promoters (share link / student ambassador tracking)
CREATE TABLE IF NOT EXISTS public.event_promoters (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id         UUID        NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ace_coins_earned INTEGER     NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);

-- Student deals
CREATE TABLE IF NOT EXISTS public.deals (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title            TEXT        NOT NULL,
  description      TEXT,
  brand_name       TEXT        NOT NULL,
  discount_details TEXT,
  logo_url         TEXT,
  category         TEXT,
  expiry_date      TIMESTAMPTZ,
  redemption_url   TEXT,
  is_featured      BOOLEAN     NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE public.event_organizers   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_promoters    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals              ENABLE ROW LEVEL SECURITY;

-- event_organizers
DO $$ BEGIN
  CREATE POLICY "eo_select_all" ON public.event_organizers FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "eo_insert_auth" ON public.event_organizers FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "eo_update_own" ON public.event_organizers FOR UPDATE USING (owner_user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- events: published visible to all; submitter can always see own; admins see all
DO $$ BEGIN
  CREATE POLICY "events_select" ON public.events FOR SELECT USING (
    status = 'published'
    OR submitter_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true)
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "events_insert_auth" ON public.events FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "events_update" ON public.events FOR UPDATE USING (
    submitter_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true)
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- event_registrations
DO $$ BEGIN
  CREATE POLICY "er_select_own" ON public.event_registrations FOR SELECT USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "er_insert_own" ON public.event_registrations FOR INSERT WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "er_delete_own" ON public.event_registrations FOR DELETE USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Allow admins / event owners to see registrations for their events
DO $$ BEGIN
  CREATE POLICY "er_select_event_owner" ON public.event_registrations FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id AND e.submitter_user_id = auth.uid()
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- event_promoters
DO $$ BEGIN
  CREATE POLICY "ep_select_all" ON public.event_promoters FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "ep_insert_own" ON public.event_promoters FOR INSERT WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- deals
DO $$ BEGIN
  CREATE POLICY "deals_select_all" ON public.deals FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "deals_insert_admin" ON public.deals FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true)
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Trigger: credit ace_coins_reward to registrant on sign-up ────────────────
CREATE OR REPLACE FUNCTION public.credit_registration_coins()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_reward INTEGER;
BEGIN
  SELECT ace_coins_reward INTO v_reward FROM public.events WHERE id = NEW.event_id;
  IF v_reward IS NOT NULL AND v_reward > 0 THEN
    UPDATE public.profiles SET ace_coins = ace_coins + v_reward WHERE user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_credit_registration_coins ON public.event_registrations;
CREATE TRIGGER trg_credit_registration_coins
  AFTER INSERT ON public.event_registrations
  FOR EACH ROW EXECUTE FUNCTION public.credit_registration_coins();

-- ── SECURITY DEFINER: award ACE Coins to a promoter ──────────────────────────
CREATE OR REPLACE FUNCTION public.award_event_promoter(
  p_event_id         UUID,
  p_promoter_user_id UUID,
  p_coins            INTEGER DEFAULT 50
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET ace_coins = ace_coins + p_coins
  WHERE user_id = p_promoter_user_id;

  INSERT INTO public.event_promoters (event_id, user_id, ace_coins_earned)
  VALUES (p_event_id, p_promoter_user_id, p_coins)
  ON CONFLICT (event_id, user_id)
  DO UPDATE SET ace_coins_earned = event_promoters.ace_coins_earned + p_coins;
END;
$$;
