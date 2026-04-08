-- Extend notifications table with new columns
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS upload_id UUID REFERENCES public.uploads(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS quiz_category_id UUID REFERENCES public.quiz_categories(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Widen the type CHECK to include new notification types
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'follow', 'like', 'comment',
    'material_like', 'material_comment',
    'quiz_published',
    'streak_milestone', 'streak_broken'
  ));

-- ─────────────────────────────────────────────
-- Material like notification
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_upload_like_notification()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_owner UUID;
BEGIN
  SELECT user_id INTO v_owner FROM public.uploads WHERE id = NEW.upload_id;
  IF v_owner IS NULL OR v_owner = NEW.user_id THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.notifications (user_id, actor_id, type, upload_id)
  VALUES (v_owner, NEW.user_id, 'material_like', NEW.upload_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_upload_like_insert
  AFTER INSERT ON public.upload_likes
  FOR EACH ROW EXECUTE FUNCTION public.handle_upload_like_notification();

-- ─────────────────────────────────────────────
-- Material comment notification
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_upload_comment_notification()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_owner UUID;
BEGIN
  SELECT user_id INTO v_owner FROM public.uploads WHERE id = NEW.upload_id;
  IF v_owner IS NULL OR v_owner = NEW.user_id THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.notifications (user_id, actor_id, type, upload_id)
  VALUES (v_owner, NEW.user_id, 'material_comment', NEW.upload_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_upload_comment_insert
  AFTER INSERT ON public.upload_comments
  FOR EACH ROW EXECUTE FUNCTION public.handle_upload_comment_notification();

-- ─────────────────────────────────────────────
-- Streak milestone / streak broken notifications
-- Fires whenever profiles.streak is updated.
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_streak_notification()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Streak broken: had a meaningful streak (>=7), now reset
  IF OLD.streak >= 7 AND NEW.streak <= 1 AND NEW.streak <> OLD.streak THEN
    INSERT INTO public.notifications (user_id, actor_id, type, metadata)
    VALUES (
      NEW.user_id,
      NEW.user_id,
      'streak_broken',
      jsonb_build_object('old_streak', OLD.streak)
    );
  END IF;

  -- Streak milestone reached (7 / 14 / 30 / 60 / 100 days)
  IF NEW.streak <> OLD.streak AND NEW.streak = ANY(ARRAY[7, 14, 30, 60, 100]) THEN
    INSERT INTO public.notifications (user_id, actor_id, type, metadata)
    VALUES (
      NEW.user_id,
      NEW.user_id,
      'streak_milestone',
      jsonb_build_object('streak', NEW.streak)
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_streak_update
  AFTER UPDATE OF streak ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_streak_notification();

-- ─────────────────────────────────────────────
-- RPC: fan-out quiz published notification to all users
-- Called from the app when an admin publishes a category.
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_quiz_published(
  p_category_id   UUID,
  p_admin_id      UUID,
  p_category_name TEXT
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.notifications (user_id, actor_id, type, quiz_category_id, metadata)
  SELECT
    p.user_id,
    p_admin_id,
    'quiz_published',
    p_category_id,
    jsonb_build_object('category_name', p_category_name)
  FROM public.profiles p
  WHERE p.user_id <> p_admin_id;
END;
$$;
