import { useState, useEffect } from "react";
import { X, CalendarDays, Plus, Sparkles, ScanLine, RotateCcw, BookOpen, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format, addDays, isSameDay } from "date-fns";

interface GoalSheetProps {
  open: boolean;
  onClose: () => void;
  deckName?: string;
  subject?: string | null;
  accuracy?: number;        // 0-100
  wrongQuestions?: string[];
}

interface Goal {
  id: string;
  text: string;
  date: string; // ISO date string
  added: boolean;
}

const STORAGE_KEY = "aceterus-goals";

const loadGoals = (): Goal[] => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
  catch { return []; }
};

const saveGoals = (goals: Goal[]) =>
  localStorage.setItem(STORAGE_KEY, JSON.stringify(goals));

// ── AI-generated proactive message ────────────────────────────────────────────
const buildAiMessage = (deckName: string, accuracy: number): string => {
  if (accuracy >= 85)
    return `Outstanding work on "${deckName}"! You've mastered most of it. Let's lock in the remaining gaps with a focused sprint so you're 100% exam-ready.`;
  if (accuracy >= 60)
    return `Good progress on "${deckName}" — you scored ${accuracy}%. The questions you missed are the fastest path to a higher score. Want me to schedule targeted reviews?`;
  return `I've analysed your "${deckName}" session. You scored ${accuracy}%, so there's solid room to grow. A 3-day study sprint with practice quizzes and AR reviews can make a real difference.`;
};

// ── 7-day date strip ──────────────────────────────────────────────────────────
const DateStrip = ({
  selected,
  onSelect,
}: {
  selected: Date;
  onSelect: (d: Date) => void;
}) => {
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i));

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
      {days.map((day) => {
        const active = isSameDay(day, selected);
        return (
          <button
            key={day.toISOString()}
            onClick={() => onSelect(day)}
            className={cn(
              "flex flex-col items-center justify-center min-w-[52px] h-[60px] rounded-2xl text-xs font-semibold transition-all shrink-0",
              active
                ? "bg-gradient-primary text-primary-foreground shadow-glow scale-105"
                : "bg-muted/60 text-foreground/70 hover:bg-muted"
            )}
          >
            <span className="text-[10px] uppercase tracking-wide opacity-80">
              {format(day, "EEE")}
            </span>
            <span className="text-lg font-bold leading-tight">{format(day, "d")}</span>
          </button>
        );
      })}
    </div>
  );
};

// ── Main component ─────────────────────────────────────────────────────────────
export const GoalSheet = ({
  open,
  onClose,
  deckName = "",
  subject = null,
  accuracy = -1,
  wrongQuestions = [],
}: GoalSheetProps) => {
  const isStandalone = !deckName;
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [goals, setGoals] = useState<Goal[]>(loadGoals);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  useEffect(() => { saveGoals(goals); }, [goals]);

  // Build smart suggestions
  const suggestions: { id: string; icon: React.ElementType; label: string }[] = [
    ...(deckName ? [{ id: "retake", icon: RotateCcw, label: `Retake "${deckName}"` }] : []),
    { id: "omr",  icon: ScanLine,  label: "Scan OMR Practice Sheet" },
    { id: "ar",   icon: BookOpen,  label: "Review 3D Model (AR Scanner)" },
    ...(isStandalone ? [
      { id: "quiz",   icon: BookOpen,  label: "Take a Quiz" },
      { id: "browse", icon: BookOpen,  label: "Browse Study Materials" },
    ] : []),
    ...wrongQuestions.slice(0, 2).map((q, i) => ({
      id: `wrong-${i}`,
      icon: BookOpen,
      label: `Review: "${q.length > 45 ? q.slice(0, 45) + "…" : q}"`,
    })),
  ];

  const addGoal = (text: string, chipId: string) => {
    if (savedIds.has(chipId)) return;
    const newGoal: Goal = {
      id: `${Date.now()}-${chipId}`,
      text,
      date: format(selectedDate, "yyyy-MM-dd"),
      added: true,
    };
    setGoals((prev) => [...prev, newGoal]);
    setSavedIds((prev) => new Set(prev).add(chipId));
  };

  const savedForDate = goals.filter(
    (g) => g.date === format(selectedDate, "yyyy-MM-dd")
  );

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
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl bg-background shadow-2xl border-t border-border",
          "animate-in slide-in-from-bottom duration-300"
        )}
        style={{ maxHeight: "85dvh", overflowY: "auto" }}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        <div className="px-5 pb-10 space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <CalendarDays className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="font-bold text-lg leading-tight">Set Goals</h2>
                <p className="text-xs text-muted-foreground">Plan your study sprint</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* AI message */}
          <div className="rounded-2xl border border-primary/25 bg-primary/5 p-4 space-y-2">
            <div className="flex items-center gap-2 text-primary text-xs font-semibold uppercase tracking-wide">
              <Sparkles className="w-3.5 h-3.5" />
              Ace AI
            </div>
            {isStandalone ? (
              <>
                <p className="text-sm leading-relaxed text-foreground/80">
                  Ready to plan your studies? Pick a date and add activities to
                  keep your learning on track.
                </p>
                <p className="text-sm text-foreground/80">
                  Use the <strong>Quick-Add suggestions</strong> below or tap any
                  date to schedule your own goals.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm leading-relaxed text-foreground/80">
                  {buildAiMessage(deckName, accuracy)}
                </p>
                <p className="text-sm text-foreground/80">
                  Would you like me to add a <strong>3-day study sprint</strong> to
                  your planner? Tap a date and add the activities below.
                </p>
              </>
            )}
          </div>

          {/* Date strip */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
              Pick a date
            </p>
            <DateStrip selected={selectedDate} onSelect={setSelectedDate} />
            <p className="text-xs text-muted-foreground">
              Selected:{" "}
              <span className="font-medium text-foreground">
                {format(selectedDate, "EEEE, d MMMM yyyy")}
              </span>
            </p>
          </div>

          {/* Quick-add chips */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
              Smart suggestions
            </p>
            <div className="flex flex-col gap-2">
              {suggestions.map((s) => {
                const Icon = s.icon;
                const added = savedIds.has(s.id);
                return (
                  <button
                    key={s.id}
                    onClick={() => addGoal(s.label, s.id)}
                    disabled={added}
                    className={cn(
                      "flex items-center gap-3 w-full rounded-2xl px-4 py-3 text-sm font-medium text-left transition-all",
                      added
                        ? "bg-primary/10 text-primary border border-primary/30"
                        : "bg-muted/60 text-foreground hover:bg-muted border border-transparent hover:border-border"
                    )}
                  >
                    <span
                      className={cn(
                        "flex items-center justify-center w-7 h-7 rounded-xl shrink-0",
                        added ? "bg-primary/15" : "bg-background shadow-sm"
                      )}
                    >
                      {added ? (
                        <Check className="w-3.5 h-3.5 text-primary" />
                      ) : (
                        <Plus className="w-3.5 h-3.5 text-muted-foreground" />
                      )}
                    </span>
                    <span className="flex-1 leading-snug">{s.label}</span>
                    {!added && (
                      <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Goals added for this date */}
          {savedForDate.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                Planned for {format(selectedDate, "EEE, d MMM")}
              </p>
              <div className="space-y-1.5">
                {savedForDate.map((g) => (
                  <div
                    key={g.id}
                    className="flex items-center gap-3 rounded-xl bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30 px-4 py-2.5 text-sm text-green-800 dark:text-green-200"
                  >
                    <Check className="w-3.5 h-3.5 text-green-600 dark:text-green-400 shrink-0" />
                    {g.text}
                  </div>
                ))}
              </div>
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
