import { useState, useEffect, useCallback } from "react";
import {
  X, Plus, Sparkles, ScanLine, RotateCcw, BookOpen,
  Check, Trash2, Bell, CalendarClock, Flag, ChevronDown, ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format, isSameDay, parseISO, isPast } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

// ── Types ──────────────────────────────────────────────────────────────────────

interface GoalSheetProps {
  open: boolean;
  onClose: () => void;
  deckName?: string;
  subject?: string | null;
  accuracy?: number;
  wrongQuestions?: string[];
}

interface Goal {
  id: string;
  user_id: string;
  text: string;
  date: string;           // 'yyyy-MM-dd'
  deadline: string | null;
  reminder_at: string | null;
  reminder_sent: boolean;
  priority: "low" | "medium" | "high";
  completed: boolean;
  created_at: string;
}

type Priority = "low" | "medium" | "high";

// ── Helpers ────────────────────────────────────────────────────────────────────

const buildAiMessage = (deckName: string, accuracy: number): string => {
  if (accuracy >= 85)
    return `Outstanding work on "${deckName}"! You've mastered most of it. Let's lock in the remaining gaps with a focused sprint so you're 100% exam-ready.`;
  if (accuracy >= 60)
    return `Good progress on "${deckName}" — you scored ${accuracy}%. The questions you missed are the fastest path to a higher score. Want me to schedule targeted reviews?`;
  return `I've analysed your "${deckName}" session. You scored ${accuracy}%, so there's solid room to grow. A 3-day study sprint can make a real difference.`;
};

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; bg: string; border: string; dot: string }> = {
  low:    { label: "Low",    color: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10",  border: "border-emerald-300 dark:border-emerald-500/40", dot: "bg-emerald-500" },
  medium: { label: "Medium", color: "text-amber-700 dark:text-amber-400",     bg: "bg-amber-50 dark:bg-amber-500/10",      border: "border-amber-300 dark:border-amber-500/40",   dot: "bg-amber-500"   },
  high:   { label: "High",   color: "text-rose-700 dark:text-rose-400",       bg: "bg-rose-50 dark:bg-rose-500/10",        border: "border-rose-300 dark:border-rose-500/40",     dot: "bg-rose-500"    },
};

const PriorityBadge = ({ priority }: { priority: Priority }) => {
  const cfg = PRIORITY_CONFIG[priority];
  return (
    <span className={cn("inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border", cfg.color, cfg.bg, cfg.border)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
      {cfg.label}
    </span>
  );
};

// Combine a local date string + time string into an ISO timestamp
const toISOTimestamp = (date: string, time: string): string => {
  return new Date(`${date}T${time}`).toISOString();
};

// ── Add Goal Form ──────────────────────────────────────────────────────────────

interface AddGoalFormProps {
  selectedDate: Date;
  suggestions: { id: string; label: string }[];
  onSave: (goal: {
    text: string;
    priority: Priority;
    deadline: string | null;
    reminder_at: string | null;
  }) => Promise<void>;
  onCancel: () => void;
}

const AddGoalForm = ({ selectedDate, suggestions, onSave, onCancel }: AddGoalFormProps) => {
  const [text, setText] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [hasDeadline, setHasDeadline] = useState(false);
  const [deadlineDate, setDeadlineDate] = useState(format(selectedDate, "yyyy-MM-dd"));
  const [deadlineTime, setDeadlineTime] = useState("23:59");
  const [hasReminder, setHasReminder] = useState(false);
  const [reminderDate, setReminderDate] = useState(format(selectedDate, "yyyy-MM-dd"));
  const [reminderTime, setReminderTime] = useState("09:00");
  const [saving, setSaving] = useState(false);

  const handleSuggestion = (label: string) => setText(label);

  const handleSave = async () => {
    if (!text.trim()) return;
    setSaving(true);
    await onSave({
      text: text.trim(),
      priority,
      deadline: hasDeadline ? toISOTimestamp(deadlineDate, deadlineTime) : null,
      reminder_at: hasReminder ? toISOTimestamp(reminderDate, reminderTime) : null,
    });
    setSaving(false);
  };

  return (
    <div className="rounded-2xl border border-border bg-muted/30 p-4 space-y-4">
      {/* Goal text */}
      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
          What's your goal?
        </label>
        <Input
          placeholder="e.g. Finish Chapter 3 revision…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="rounded-xl"
          autoFocus
        />
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-2">Quick-add suggestions:</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => handleSuggestion(s.label)}
                className="text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors font-medium"
              >
                {s.label.length > 40 ? s.label.slice(0, 40) + "…" : s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Priority */}
      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
          <Flag className="w-3 h-3" /> Priority
        </label>
        <div className="flex gap-2">
          {(["low", "medium", "high"] as Priority[]).map((p) => {
            const cfg = PRIORITY_CONFIG[p];
            const active = priority === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => setPriority(p)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold border transition-all",
                  active ? cn(cfg.color, cfg.bg, cfg.border, "shadow-sm") : "border-border text-muted-foreground hover:bg-muted"
                )}
              >
                <span className={cn("w-2 h-2 rounded-full", active ? cfg.dot : "bg-muted-foreground/40")} />
                {cfg.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Deadline */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => setHasDeadline((v) => !v)}
          className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
        >
          <CalendarClock className="w-3 h-3" />
          Deadline (optional)
          {hasDeadline ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />}
        </button>
        {hasDeadline && (
          <div className="flex gap-2">
            <input
              type="date"
              value={deadlineDate}
              onChange={(e) => setDeadlineDate(e.target.value)}
              className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <input
              type="time"
              value={deadlineTime}
              onChange={(e) => setDeadlineTime(e.target.value)}
              className="w-28 rounded-xl border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        )}
      </div>

      {/* Reminder */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => setHasReminder((v) => !v)}
          className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
        >
          <Bell className="w-3 h-3" />
          Reminder notification (optional)
          {hasReminder ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />}
        </button>
        {hasReminder && (
          <div className="space-y-1.5">
            <div className="flex gap-2">
              <input
                type="date"
                value={reminderDate}
                onChange={(e) => setReminderDate(e.target.value)}
                className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <input
                type="time"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
                className="w-28 rounded-xl border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              You'll receive a notification at this time as a reminder.
            </p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <Button variant="outline" size="sm" className="flex-1 rounded-xl" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button
          size="sm"
          className="flex-1 rounded-xl bg-gradient-primary text-primary-foreground shadow-glow"
          onClick={handleSave}
          disabled={saving || !text.trim()}
        >
          {saving ? "Saving…" : "Save Goal"}
        </Button>
      </div>
    </div>
  );
};

// ── Goal Card ──────────────────────────────────────────────────────────────────

interface GoalCardProps {
  goal: Goal;
  onToggleComplete: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
}

const GoalCard = ({ goal, onToggleComplete, onDelete }: GoalCardProps) => {
  const cfg = PRIORITY_CONFIG[goal.priority];

  return (
    <div className={cn("flex gap-3 rounded-xl border p-3 bg-background transition-opacity", goal.completed && "opacity-60")}>
      {/* Priority bar */}
      <div className={cn("w-1 rounded-full shrink-0 self-stretch", cfg.dot)} />

      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-start gap-2 justify-between">
          <p className={cn("text-sm font-medium leading-snug", goal.completed && "line-through text-muted-foreground")}>
            {goal.text}
          </p>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => onToggleComplete(goal.id, !goal.completed)}
              className={cn(
                "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",
                goal.completed
                  ? "bg-primary border-primary text-primary-foreground"
                  : "border-border hover:border-primary"
              )}
            >
              {goal.completed && <Check className="w-3 h-3" />}
            </button>
            <button
              onClick={() => onDelete(goal.id)}
              className="w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <PriorityBadge priority={goal.priority} />
          {goal.deadline && (
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              <CalendarClock className="w-3 h-3" />
              Due {format(parseISO(goal.deadline), "d MMM, HH:mm")}
              {isPast(parseISO(goal.deadline)) && !goal.completed && (
                <span className="text-rose-500 font-semibold">overdue</span>
              )}
            </span>
          )}
          {goal.reminder_at && (
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              <Bell className="w-3 h-3" />
              {goal.reminder_sent ? "Reminded" : format(parseISO(goal.reminder_at), "d MMM, HH:mm")}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────────

export const GoalSheet = ({
  open,
  onClose,
  deckName = "",
  subject = null,
  accuracy = -1,
  wrongQuestions = [],
}: GoalSheetProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const isStandalone = !deckName;

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  // ── Data loading ─────────────────────────────────────────────────────────────

  const loadGoals = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    const { data, error } = await supabase
      .from("goals")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (!error && data) setGoals(data as Goal[]);
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    if (open) loadGoals();
  }, [open, loadGoals]);

  // ── Calendar modifier: days with goals ───────────────────────────────────────

  const daysWithGoals = goals
    .map((g) => parseISO(g.date))
    .filter(Boolean);

  // ── Goals for selected date ───────────────────────────────────────────────────

  const goalsForDate = goals.filter(
    (g) => g.date === format(selectedDate, "yyyy-MM-dd")
  );

  // ── Suggestions ──────────────────────────────────────────────────────────────

  const suggestions = [
    ...(deckName ? [{ id: "retake", label: `Retake "${deckName}"` }] : []),
    { id: "omr",   label: "Scan OMR Practice Sheet" },
    { id: "ar",    label: "Review 3D Model (AR Scanner)" },
    ...(isStandalone
      ? [
          { id: "quiz",   label: "Take a Quiz" },
          { id: "browse", label: "Browse Study Materials" },
        ]
      : []),
    ...wrongQuestions.slice(0, 2).map((q, i) => ({
      id: `wrong-${i}`,
      label: `Review: "${q.length > 40 ? q.slice(0, 40) + "…" : q}"`,
    })),
  ];

  // ── CRUD ──────────────────────────────────────────────────────────────────────

  const handleSaveGoal = async (fields: {
    text: string;
    priority: Priority;
    deadline: string | null;
    reminder_at: string | null;
  }) => {
    if (!user) return;

    const { data, error } = await supabase
      .from("goals")
      .insert({
        user_id: user.id,
        text: fields.text,
        date: format(selectedDate, "yyyy-MM-dd"),
        priority: fields.priority,
        deadline: fields.deadline,
        reminder_at: fields.reminder_at,
        reminder_sent: false,
        completed: false,
      })
      .select()
      .single();

    if (error) {
      toast({ title: "Failed to save goal", variant: "destructive" });
      return;
    }

    setGoals((prev) => [...prev, data as Goal]);
    setIsAdding(false);
    toast({ title: "Goal saved!" });
  };

  const handleToggleComplete = async (id: string, completed: boolean) => {
    setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, completed } : g)));
    await supabase.from("goals").update({ completed }).eq("id", id);
  };

  const handleDelete = async (id: string) => {
    setGoals((prev) => prev.filter((g) => g.id !== id));
    await supabase.from("goals").delete().eq("id", id);
    toast({ title: "Goal removed" });
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl bg-background shadow-2xl border-t border-border animate-in slide-in-from-bottom duration-300"
        style={{ maxHeight: "93dvh", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1 sticky top-0 bg-background z-10">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        <div className="px-5 pb-10 space-y-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 pt-2">
            <div>
              <h2 className="font-bold text-xl leading-tight">Set Goals</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Plan your study sprint</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground mt-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* AI message */}
          <div className="rounded-2xl border border-primary/25 bg-primary/5 p-4 space-y-1.5">
            <div className="flex items-center gap-2 text-primary text-xs font-semibold uppercase tracking-wide">
              <Sparkles className="w-3.5 h-3.5" />
              Ace AI
            </div>
            {isStandalone ? (
              <p className="text-sm leading-relaxed text-foreground/80">
                Pick any day on the calendar, add your study goals, set a priority, and let me remind you at the right time.
              </p>
            ) : (
              <p className="text-sm leading-relaxed text-foreground/80">
                {buildAiMessage(deckName, accuracy)}
              </p>
            )}
          </div>

          {/* Full Calendar */}
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
              Select a date
            </p>
            <div className="rounded-2xl border border-border bg-background overflow-hidden">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(d) => { if (d) { setSelectedDate(d); setIsAdding(false); } }}
                className="w-full"
                modifiers={{ hasGoals: daysWithGoals }}
                modifiersClassNames={{
                  hasGoals: "after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1.5 after:h-1.5 after:rounded-full after:bg-primary relative",
                }}
                fromDate={new Date(2024, 0, 1)}
              />
            </div>
            <p className="text-xs text-muted-foreground px-1">
              Selected:{" "}
              <span className="font-semibold text-foreground">
                {format(selectedDate, "EEEE, d MMMM yyyy")}
              </span>
            </p>
          </div>

          {/* Goals for selected date */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                Goals for {format(selectedDate, "d MMM")}
              </p>
              {!isAdding && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1.5 px-3 rounded-xl"
                  onClick={() => setIsAdding(true)}
                >
                  <Plus className="w-3 h-3" /> Add Goal
                </Button>
              )}
            </div>

            {isLoading ? (
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <div key={i} className="h-16 rounded-xl bg-muted/50 animate-pulse" />
                ))}
              </div>
            ) : goalsForDate.length === 0 && !isAdding ? (
              <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">No goals for this day yet.</p>
                <Button
                  size="sm"
                  className="mt-1 h-8 text-xs gap-1.5 rounded-xl bg-gradient-primary text-primary-foreground shadow-glow"
                  onClick={() => setIsAdding(true)}
                >
                  <Plus className="w-3 h-3" /> Add your first goal
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {goalsForDate.map((g) => (
                  <GoalCard
                    key={g.id}
                    goal={g}
                    onToggleComplete={handleToggleComplete}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}

            {isAdding && (
              <AddGoalForm
                selectedDate={selectedDate}
                suggestions={suggestions}
                onSave={handleSaveGoal}
                onCancel={() => setIsAdding(false)}
              />
            )}
          </div>

          {/* Summary counts */}
          {goals.length > 0 && (
            <div className="grid grid-cols-3 gap-2 pt-1">
              {[
                { label: "Total", value: goals.length, color: "text-foreground" },
                { label: "Completed", value: goals.filter((g) => g.completed).length, color: "text-emerald-600 dark:text-emerald-400" },
                { label: "Remaining", value: goals.filter((g) => !g.completed).length, color: "text-amber-600 dark:text-amber-400" },
              ].map(({ label, value, color }) => (
                <div key={label} className="rounded-2xl bg-muted/50 px-3 py-3 text-center border border-border">
                  <p className={cn("text-xl font-bold", color)}>{value}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Done button */}
          <Button
            className="w-full bg-gradient-primary text-primary-foreground rounded-2xl h-12 text-[15px] font-semibold shadow-glow"
            onClick={onClose}
          >
            Done — let's study!
          </Button>
        </div>
      </div>
    </>
  );
};
