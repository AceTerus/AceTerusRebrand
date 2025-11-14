import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useStreak = () => {
  const { user } = useAuth();
  const [streak, setStreak] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchStreak();
    }
  }, [user]);

  const fetchStreak = async () => {
    if (!user) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('streak, last_quiz_date')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        // Check if streak should be reset
        const today = new Date().toISOString().split('T')[0];
        const lastQuizDate = profile.last_quiz_date;

        if (lastQuizDate) {
          const daysDiff = Math.floor(
            (new Date(today).getTime() - new Date(lastQuizDate).getTime()) / 
            (1000 * 60 * 60 * 24)
          );

          if (daysDiff > 1) {
            // Reset streak if more than 1 day has passed
            await supabase
              .from('profiles')
              .update({ streak: 0 })
              .eq('user_id', user.id);
            setStreak(0);
          } else {
            setStreak(profile.streak || 0);
          }
        } else {
          setStreak(profile.streak || 0);
        }
      }
    } catch (error) {
      console.error('Error fetching streak:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateStreak = async (examId: string) => {
    if (!user) return;

    try {
      const today = new Date().toISOString().split('T')[0];

      // Get current profile data
      const { data: profile } = await supabase
        .from('profiles')
        .select('streak, last_quiz_date')
        .eq('user_id', user.id)
        .single();

      if (!profile) return;

      const lastQuizDate = profile.last_quiz_date;
      let newStreak = profile.streak || 0;

      // Check if quiz was already completed today
      if (lastQuizDate === today) {
        // Already completed a quiz today, don't increment
        return { success: false, message: 'Streak already updated today' };
      }

      // Check if this is a consecutive day
      if (lastQuizDate) {
        const daysDiff = Math.floor(
          (new Date(today).getTime() - new Date(lastQuizDate).getTime()) / 
          (1000 * 60 * 60 * 24)
        );

        if (daysDiff === 1) {
          // Consecutive day - increment streak
          newStreak = (profile.streak || 0) + 1;
        } else if (daysDiff > 1) {
          // Missed days - reset to 1
          newStreak = 1;
        }
      } else {
        // First quiz ever
        newStreak = 1;
      }

      // Record quiz completion
      await supabase.from('quiz_completions').insert({
        user_id: user.id,
        exam_id: examId,
      });

      // Update streak and last quiz date
      await supabase
        .from('profiles')
        .update({
          streak: newStreak,
          last_quiz_date: today,
        })
        .eq('user_id', user.id);

      setStreak(newStreak);
      return { success: true, newStreak };
    } catch (error) {
      console.error('Error updating streak:', error);
      return { success: false, message: 'Failed to update streak' };
    }
  };

  return { streak, isLoading, updateStreak, refreshStreak: fetchStreak };
};
