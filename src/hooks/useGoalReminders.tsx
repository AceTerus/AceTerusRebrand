import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Polls every 60 s for goals whose reminder_at has passed but haven't had
 * a notification inserted yet. When found, inserts a goal_reminder notification
 * and marks reminder_sent = true on the goal.
 */
export const useGoalReminders = () => {
  const { user } = useAuth();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkReminders = async (userId: string) => {
    const now = new Date().toISOString();

    // Fetch due, unsent reminders
    const { data: dueGoals, error } = await supabase
      .from("goals")
      .select("id, text, date, priority")
      .eq("user_id", userId)
      .eq("reminder_sent", false)
      .not("reminder_at", "is", null)
      .lte("reminder_at", now);

    if (error || !dueGoals || dueGoals.length === 0) return;

    for (const goal of dueGoals) {
      // Insert notification
      await supabase.from("notifications").insert({
        user_id: userId,
        actor_id: userId,
        type: "goal_reminder",
        goal_id: goal.id,
        metadata: {
          text: goal.text,
          date: goal.date,
          priority: goal.priority,
        },
      });

      // Mark reminder as sent
      await supabase
        .from("goals")
        .update({ reminder_sent: true })
        .eq("id", goal.id);
    }
  };

  useEffect(() => {
    if (!user) return;

    // Check immediately on mount
    checkReminders(user.id);

    // Then check every 60 seconds
    timerRef.current = setInterval(() => checkReminders(user.id), 60_000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [user]);
};
