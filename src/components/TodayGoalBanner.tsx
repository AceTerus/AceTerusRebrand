import { useState, useEffect } from "react";
import { X, Target, Clock, Plus, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format, parseISO, differenceInMinutes, differenceInHours, isPast } from "date-fns";
import { cn } from "@/lib/utils";

const C = {
  cyan: "#3BD6F5", blue: "#2F7CFF", indigo: "#2E2BE5",
  ink: "#0F172A", skySoft: "#DDF3FF", indigoSoft: "#D6D4FF", sun: "#FFD65C", pop: "#FF7A59",
};
const DISPLAY = "font-['Baloo_2'] tracking-tight";

interface Goal {
  id: string;
  text: string;
  priority: "low" | "medium" | "high";
  deadline: string | null;
}

interface TodayGoalBannerProps {
  onSetGoal?: () => void;
  inline?: boolean;
}

const P_BG: Record<string, string> = { low: C.cyan, medium: C.sun, high: C.pop };
const P_TC: Record<string, string> = { low: C.ink, medium: C.ink, high: "#fff" };

function timeLeft(deadline: string): { label: string; overdue: boolean } {
  const d = parseISO(deadline);
  if (isPast(d)) return { label: "Overdue!", overdue: true };
  const mins = differenceInMinutes(d, new Date());
  if (mins < 60) return { label: `${mins}m left`, overdue: false };
  const hrs = differenceInHours(d, new Date());
  if (hrs < 24) return { label: `${hrs}h left`, overdue: false };
  return { label: `${Math.floor(hrs / 24)}d left`, overdue: false };
}

export const TodayGoalBanner = ({ onSetGoal, inline = false }: TodayGoalBannerProps) => {
  const { user } = useAuth();
  const [goal, setGoal] = useState<Goal | null | "empty">(null);
  const [dismissed, setDismissed] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);

  useEffect(() => {
    if (!user) return;
    const today = format(new Date(), "yyyy-MM-dd");
    supabase
      .from("goals" as any)
      .select("id, text, priority, deadline")
      .eq("user_id", user.id)
      .eq("date", today)
      .eq("completed", false)
      .order("deadline", { ascending: true, nullsFirst: false })
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0) setGoal(data[0] as unknown as Goal);
        else setGoal("empty");
      });
  }, [user]);

  // Refresh countdown every minute
  useEffect(() => {
    const id = setInterval(() => {
      setGoal(g => (g && g !== "empty" ? { ...g } : g));
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  if (!user || goal === null || dismissed) return null;

  /* ── No goals today ── */
  if (goal === "empty") {
    const inner = (
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-[12px] border-[2px] border-[#0F172A] shadow-[2px_2px_0_0_#0F172A] flex items-center justify-center shrink-0" style={{ background: C.indigo }}>
          <Target className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`${DISPLAY} font-extrabold text-sm`} style={{ color: C.ink }}>No goals set for today</p>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">Plan your study session and stay on track.</p>
        </div>
        {onSetGoal && !inline && (
          <button
            onClick={onSetGoal}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border-[2px] border-[#0F172A] bg-white font-extrabold font-['Baloo_2'] text-xs shadow-[2px_2px_0_0_#0F172A] hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_#0F172A] transition-all cursor-pointer"
          >
            <Plus className="w-3 h-3" /> Set goal
          </button>
        )}
      </div>
    );
    if (inline) return <>{inner}</>;
    return (
      <div className="border-[2.5px] border-[#0F172A] rounded-[18px] shadow-[3px_3px_0_0_#0F172A] p-3.5" style={{ background: C.indigoSoft ?? "#D6D4FF" }}>
        {inner}
      </div>
    );
  }

  /* ── Has a goal ── */
  const tl = goal.deadline ? timeLeft(goal.deadline) : null;

  const handleComplete = async () => {
    if (completing || goal === "empty" || goal === null) return;
    setCompleting(true);
    setJustCompleted(true);
    await supabase.from("goals" as any).update({ completed: true }).eq("id", goal.id);
    setTimeout(() => setGoal("empty"), 1200);
    setCompleting(false);
  };

  const inner = (
    <div className="flex items-center gap-3">
      <div
        className="w-9 h-9 rounded-[12px] border-[2px] border-[#0F172A] shadow-[2px_2px_0_0_#0F172A] flex items-center justify-center shrink-0"
        style={{ background: justCompleted ? "#22c55e" : P_BG[goal.priority] }}
      >
        {justCompleted
          ? <CheckCircle2 className="w-4 h-4 text-white" />
          : <Target className="w-4 h-4" style={{ color: P_TC[goal.priority] }} />
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn(`${DISPLAY} font-extrabold text-sm leading-snug truncate`, justCompleted && "line-through opacity-60")} style={{ color: C.ink }}>
          {goal.text}
        </p>
        <p className={cn("text-xs font-bold mt-0.5 flex items-center gap-1", justCompleted ? "text-emerald-500" : tl?.overdue ? "text-[#FF7A59]" : "text-slate-500")}>
          {justCompleted ? (
            <><CheckCircle2 className="w-3 h-3 shrink-0" /> Completed!</>
          ) : tl ? (
            <><Clock className="w-3 h-3 shrink-0" />{tl.label}</>
          ) : (
            <span className="text-slate-400">Today's goal · {goal.priority} priority</span>
          )}
        </p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={handleComplete}
          disabled={completing || justCompleted}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border-[2px] border-[#0F172A] font-extrabold font-['Baloo_2'] text-[11px] shadow-[2px_2px_0_0_#0F172A] hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_#0F172A] transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none text-white"
          style={{ background: justCompleted ? "#22c55e" : "#22c55e" }}
          aria-label="Mark as completed"
        >
          <CheckCircle2 className="w-3 h-3" />
          {justCompleted ? "Done!" : "Done"}
        </button>
        {!inline && (
          <button
            onClick={() => setDismissed(true)}
            className="w-7 h-7 rounded-[10px] border-[1.5px] border-[#0F172A]/20 bg-white/70 flex items-center justify-center hover:bg-white transition-colors cursor-pointer"
            aria-label="Dismiss"
          >
            <X className="w-3 h-3 text-slate-400" />
          </button>
        )}
      </div>
    </div>
  );

  if (inline) return <>{inner}</>;
  return (
    <div
      className="border-[2.5px] border-[#0F172A] rounded-[18px] shadow-[3px_3px_0_0_#0F172A] p-3.5"
      style={{ background: tl?.overdue ? "#FFF0ED" : C.skySoft }}
    >
      {inner}
    </div>
  );
};
