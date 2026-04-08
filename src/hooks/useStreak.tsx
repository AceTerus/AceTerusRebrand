import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

/**
 * Streak rules:
 * - Submitting a quiz on a new calendar day increments the streak by 1.
 * - Multiple quiz submissions on the same day count as one increment.
 * - If the user goes 3 or more calendar days without submitting any quiz,
 *   the streak resets to 0 (then becomes 1 on the next submission).
 * - A gap of 1 or 2 days does NOT break the streak.
 */

/** Returns the number of whole calendar days between two YYYY-MM-DD date strings. */
const daysBetween = (from: string, to: string): number =>
  Math.floor(
    (new Date(to).getTime() - new Date(from).getTime()) / (1000 * 60 * 60 * 24)
  );

/** Returns today's date as a YYYY-MM-DD string in local time. */
const todayISO = (): string => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export const useStreak = () => {
  const { user } = useAuth();
  const [streak, setStreak] = useState(0);
  const [lastQuizDate, setLastQuizDate] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) fetchStreak();
  }, [user]);

  /**
   * Loads the streak from the database and resets it to 0 if the user
   * has been inactive for 3 or more consecutive days.
   */
  const fetchStreak = async () => {
    if (!user) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('streak, last_quiz_date')
        .eq('user_id', user.id)
        .single();

      if (!profile) return;

      const lastDate = profile.last_quiz_date;
      const today = todayISO();

      if (lastDate) {
        const gap = daysBetween(lastDate, today);

        if (gap >= 3) {
          // 3+ days of inactivity — reset streak
          await supabase
            .from('profiles')
            .update({ streak: 0 })
            .eq('user_id', user.id);
          setStreak(0);
          setLastQuizDate(lastDate);
          return;
        }
      }

      setStreak(profile.streak ?? 0);
      setLastQuizDate(lastDate ?? null);
    } catch (error) {
      console.error('Error fetching streak:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Called once after a quiz is successfully submitted.
   *
   * Behaviour:
   * - Same day as last submission  → no-op (streak already counted today)
   * - 1 or 2 days since last submission → increment by 1 (gap is within tolerance)
   * - 3+ days since last submission → reset to 0 then set to 1 (streak broken)
   * - No previous submission → set to 1 (first quiz ever)
   */
  const updateStreak = async (examId: string) => {
    if (!user) return;

    try {
      const today = todayISO();

      const { data: profile } = await supabase
        .from('profiles')
        .select('streak, last_quiz_date')
        .eq('user_id', user.id)
        .single();

      if (!profile) return;

      const lastDate = profile.last_quiz_date;

      // Already counted a submission today — nothing to do
      if (lastDate === today) {
        return { success: false, message: 'Streak already updated today' };
      }

      let newStreak: number;

      if (!lastDate) {
        // First quiz ever
        newStreak = 1;
      } else {
        const gap = daysBetween(lastDate, today);

        if (gap >= 3) {
          // Streak broken — 3 or more days of inactivity
          newStreak = 1;
        } else {
          // Gap of 1 or 2 days — streak continues
          newStreak = (profile.streak ?? 0) + 1;
        }
      }

      // Record the completion
      await supabase.from('quiz_completions').insert({
        user_id: user.id,
        exam_id: examId,
      });

      // Persist the new streak and today's date
      await supabase
        .from('profiles')
        .update({ streak: newStreak, last_quiz_date: today })
        .eq('user_id', user.id);

      setStreak(newStreak);
      return { success: true, newStreak };
    } catch (error) {
      console.error('Error updating streak:', error);
      return { success: false, message: 'Failed to update streak' };
    }
  };

  return { streak, lastQuizDate, isLoading, updateStreak, refreshStreak: fetchStreak };
};
