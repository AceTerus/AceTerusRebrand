import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  Bookmark,
  BookmarkCheck,
  BookOpen,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Flame,
  GraduationCap,
  Layers,
  Loader2,
  PenLine,
  ScanLine,
  Sparkles,
  Target,
  X,
  XCircle,
} from "lucide-react";
import StreakFireOverlay from "@/components/StreakFireOverlay";
import { GoalSheet } from "@/components/GoalSheet";
import QuizAnalysis from "@/components/QuizAnalysis";
import type { PerformanceAnalysis } from "@/components/QuizAnalysis";
import PerformanceTracker from "@/components/PerformanceTracker";
import type { SubjectAttempt } from "@/components/PerformanceTracker";
import Logo from "@/assets/logo.png";
import { useAuth } from "@/hooks/useAuth";
import { useStreak } from "@/hooks/useStreak";
import { useMascot } from "@/context/MascotContext";
import { fetchCategories, fetchDecks, fetchQuiz } from "@/lib/quiz-client";
import type { Category, Deck, Question, QuizPayload } from "@/types/quiz";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

type QuizView = "categories" | "decks" | "taking";

const getCategoryImage = (name: string): string | null => {
  const lower = name.toLowerCase();
  if (lower.includes("biologi"))  return "/quiz-pics/biology.jpg";
  if (lower.includes("kimia"))    return "/quiz-pics/chemistry.jpg";
  if (lower.includes("fizik"))    return "/quiz-pics/physics.jpg";
  if (lower.includes("sejarah"))  return "/quiz-pics/history.jpg";
  if (lower.includes("history"))  return "/quiz-pics/history.jpg";
  if (lower.includes("biology"))  return "/quiz-pics/biology.jpg";
  if (lower.includes("chemistry"))return "/quiz-pics/chemistry.jpg";
  if (lower.includes("physics"))  return "/quiz-pics/physics.jpg";
  if (lower.includes("general"))  return "/quiz-pics/general.jpg";
  return null;
};

const Quiz = () => {
  const { user, isLoading: authLoading, isAdmin } = useAuth();
  const { streak, updateStreak } = useStreak();
  const { pushMessage } = useMascot();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const previewDeckId = searchParams.get("preview");

  // Category state
  const [categories, setCategories] = useState<Category[]>([]);

  // Deck state
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loadingDecks, setLoadingDecks] = useState(true);
  const [deckError, setDeckError] = useState<string | null>(null);

  // View state
  const [view, setView] = useState<QuizView>("categories");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Quiz session state
  const [activeDeck, setActiveDeck] = useState<Deck | null>(null);
  const [quizPayload, setQuizPayload] = useState<QuizPayload | null>(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizError, setQuizError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answeredMap, setAnsweredMap] = useState<Map<number, string>>(new Map());
  const [sessionComplete, setSessionComplete] = useState(false);
  const [submitConfirmPending, setSubmitConfirmPending] = useState(false);
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(new Set());

  // Bookmark panel
  const [showBookmarkPanel, setShowBookmarkPanel] = useState(false);
  const bookmarkPanelRef = useRef<HTMLDivElement>(null);

  // Streak fire overlay
  const [fireOverlay, setFireOverlay] = useState<{ show: boolean; newStreak: number }>({ show: false, newStreak: 0 });

  // AI performance analysis
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<PerformanceAnalysis | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Performance tracker — subject-specific history
  const [subjectHistory, setSubjectHistory] = useState<SubjectAttempt[]>([]);
  const [currentQuizScore, setCurrentQuizScore] = useState<number | null>(null);
  const [currentQuizCategory, setCurrentQuizCategory] = useState<string | null>(null);

  // Goal sheet
  const [showGoalSheet, setShowGoalSheet] = useState(false);

  // Subjective quiz state
  const [subjectiveAnswerMap, setSubjectiveAnswerMap] = useState<Map<number, string>>(new Map());
  const [checkboxAnswerMap, setCheckboxAnswerMap] = useState<Map<number, Set<string>>>(new Map());
  const [subjectiveGrading, setSubjectiveGrading] = useState(false);
  const [subjectiveResults, setSubjectiveResults] = useState<Map<number, { marksEarned: number; maxMarks: number; isCorrect: boolean; feedback: string }>>(new Map());

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  // Admin preview: jump straight into the quiz for any deck (published or not)
  useEffect(() => {
    if (authLoading || !user || !isAdmin || !previewDeckId) return;
    let cancelled = false;
    setQuizLoading(true);
    setQuizError(null);
    fetchQuiz(previewDeckId)
      .then((payload) => {
        if (cancelled) return;
        const shuffled = [...payload.questions].sort(() => Math.random() - 0.5);
        setQuizPayload({ ...payload, questions: shuffled });
        setActiveDeck(payload.deck);
        setCurrentIndex(0);
        setAnsweredMap(new Map());
        setSessionComplete(false);
        setSubmitConfirmPending(false);
        setFlaggedQuestions(new Set());
        setShowBookmarkPanel(false);
        setAnalysisResult(null);
        setAnalysisError(null);
        setAnalysisLoading(false);
        setView("taking");
      })
      .catch((e: any) => { if (!cancelled) setQuizError(e.message ?? "Failed to load the quiz deck."); })
      .finally(() => { if (!cancelled) setQuizLoading(false); });
    return () => { cancelled = true; };
  }, [authLoading, user, isAdmin, previewDeckId]);

  useEffect(() => {
    if (authLoading || !user) return;
    let cancelled = false;
    setLoadingDecks(true);
    setDeckError(null);
    Promise.all([
      fetchCategories(),
      fetchDecks(true), // published only
    ])
      .then(([cats, data]) => {
        if (!cancelled) {
          // Only show categories that have been published by admin
          setCategories(cats.filter((c) => c.is_published));
          setDecks(data ?? []);
        }
      })
      .catch((e) => { if (!cancelled) setDeckError(e.message ?? "Failed to load quizzes."); })
      .finally(() => { if (!cancelled) setLoadingDecks(false); });
    return () => { cancelled = true; };
  }, [authLoading, user]);

  useEffect(() => {
    if (!activeDeck) return;
    localStorage.setItem(
      `quiz_bookmarks_${activeDeck.id}`,
      JSON.stringify(Array.from(flaggedQuestions))
    );
  }, [flaggedQuestions, activeDeck]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (bookmarkPanelRef.current && !bookmarkPanelRef.current.contains(e.target as Node)) {
        setShowBookmarkPanel(false);
      }
    };
    if (showBookmarkPanel) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showBookmarkPanel]);

  // ── Derived values ────────────────────────────────────────────────────────────
  const deckCount = decks.length;
  const totalQuestions = useMemo(() => decks.reduce((acc, d) => acc + (d.question_count ?? 0), 0), [decks]);
  const subjectCount = categories.length;

  // Enrich categories with deck counts from the loaded decks
  const enrichedCategories = useMemo(() => {
    return categories.map((cat) => {
      const catDecks = decks.filter((d) => (d.subject ?? "General") === cat.name);
      return {
        ...cat,
        decks: catDecks,
        totalQuestions: catDecks.reduce((acc, d) => acc + (d.question_count ?? 0), 0),
      };
    });
  }, [categories, decks]);

  const filteredDecks = useMemo(
    () => decks.filter((d) => (d.subject ?? "General") === selectedCategory),
    [decks, selectedCategory]
  );

  const questions: Question[] = quizPayload?.questions ?? [];
  const currentQuestion = questions[currentIndex];
  const selectedAnswerId = answeredMap.get(currentIndex) ?? null;
  const isSubjective = quizPayload?.deck.quiz_type === "subjective";

  const answeredCount = isSubjective
    ? questions.filter((q, idx) => {
        const isCheckbox = q.answers.some((a) => !a.is_correct);
        if (isCheckbox) return (checkboxAnswerMap.get(idx)?.size ?? 0) > 0;
        return (subjectiveAnswerMap.get(idx) ?? "").trim().length > 0;
      }).length
    : answeredMap.size;

  const correctCount = useMemo(() => {
    if (!sessionComplete) return 0;
    if (isSubjective) {
      let count = 0;
      subjectiveResults.forEach((r) => { if (r.isCorrect) count++; });
      return count;
    }
    return questions.reduce((acc, q, idx) => {
      const selected = answeredMap.get(idx);
      const correctAnswer = q.answers.find((a) => a.is_correct);
      return acc + (selected === correctAnswer?.id ? 1 : 0);
    }, 0);
  }, [sessionComplete, isSubjective, answeredMap, subjectiveResults, questions]);

  const totalMaxMarks = useMemo(
    () => (isSubjective ? questions.reduce((acc, q) => acc + (q.marks ?? 1), 0) : 0),
    [isSubjective, questions]
  );

  const totalMarksEarned = useMemo(() => {
    let total = 0;
    subjectiveResults.forEach((r) => { total += r.marksEarned; });
    return total;
  }, [subjectiveResults]);

  const accuracy = questions.length ? Math.round((correctCount / questions.length) * 100) : 0;
  const isLastQuestion = currentIndex >= questions.length - 1;
  const progressPercent = questions.length ? (answeredCount / questions.length) * 100 : 0;

  const sortedBookmarks = useMemo(
    () => Array.from(flaggedQuestions).sort((a, b) => a - b),
    [flaggedQuestions]
  );

  const stats = [
    { icon: Flame, value: streak.toString(), label: "day streak", color: "text-orange-500 dark:text-orange-300", bgColor: "bg-orange-50 dark:bg-orange-400/15" },
    { icon: BookOpen, value: loadingDecks ? "..." : deckCount.toString(), label: "quizzes", color: "text-red-500 dark:text-red-300", bgColor: "bg-red-50 dark:bg-red-400/15" },
    { icon: Target, value: loadingDecks ? "..." : totalQuestions.toString(), label: "questions", color: "text-green-500 dark:text-green-300", bgColor: "bg-green-50 dark:bg-green-400/15" },
    { icon: GraduationCap, value: loadingDecks ? "..." : subjectCount.toString(), label: "subjects", color: "text-purple-500 dark:text-purple-300", bgColor: "bg-purple-50 dark:bg-purple-400/15" },
  ];

  // ── Handlers ──────────────────────────────────────────────────────────────────
  const resetSessionState = () => {
    setCurrentIndex(0);
    setAnsweredMap(new Map());
    setSessionComplete(false);
    setSubmitConfirmPending(false);
    setFlaggedQuestions(new Set());
    setShowBookmarkPanel(false);
    setAnalysisResult(null);
    setAnalysisError(null);
    setAnalysisLoading(false);
    setSubjectiveAnswerMap(new Map());
    setCheckboxAnswerMap(new Map());
    setSubjectiveGrading(false);
    setSubjectiveResults(new Map());
  };

  const handleStartQuiz = async (deck: Deck) => {
    setActiveDeck(deck);
    setQuizLoading(true);
    setQuizError(null);
    try {
      const payload = await fetchQuiz(deck.id);
      // Shuffle questions
      const shuffled = [...payload.questions].sort(() => Math.random() - 0.5);
      setQuizPayload({ ...payload, questions: shuffled });
      resetSessionState();
      try {
        const saved = localStorage.getItem(`quiz_bookmarks_${deck.id}`);
        if (saved) setFlaggedQuestions(new Set(JSON.parse(saved) as number[]));
      } catch { /* ignore */ }
      setView("taking");
    } catch (e: any) {
      setQuizError(e.message ?? "Failed to load the quiz deck.");
    } finally {
      setQuizLoading(false);
    }
  };

  const handleAnswerSelect = (choiceId: string) => {
    if (sessionComplete) return;
    setAnsweredMap((prev) => {
      const next = new Map(prev);
      next.set(currentIndex, choiceId);
      return next;
    });
    setSubmitConfirmPending(false);
  };

  const handleSubjectiveAnswer = (text: string) => {
    if (sessionComplete) return;
    setSubjectiveAnswerMap((prev) => {
      const next = new Map(prev);
      if (text.trim()) next.set(currentIndex, text);
      else next.delete(currentIndex);
      return next;
    });
  };

  const handleCheckboxToggle = (answerId: string) => {
    if (sessionComplete) return;
    setCheckboxAnswerMap((prev) => {
      const next = new Map(prev);
      const selected = new Set(next.get(currentIndex) ?? []);
      if (selected.has(answerId)) selected.delete(answerId);
      else selected.add(answerId);
      next.set(currentIndex, selected);
      return next;
    });
  };

  const handleNextQuestion = () => { if (!isLastQuestion) setCurrentIndex((prev) => prev + 1); };
  const handlePrevQuestion = () => { setCurrentIndex((prev) => Math.max(0, prev - 1)); };

  const handleSubmitQuiz = async () => {
    setSessionComplete(true);
    setShowBookmarkPanel(false);
    setSubmitConfirmPending(false);

    // Snapshot quiz state before any async operations
    const snapshotQuestions = quizPayload?.questions ?? [];
    const snapshotAnsweredMap = new Map(answeredMap);

    if (activeDeck) {
      const result = await updateStreak(activeDeck.id);
      if (result?.success && result.newStreak) {
        setFireOverlay({ show: true, newStreak: result.newStreak });

        // Milestone celebrations
        const milestones = [7, 14, 30, 60, 100];
        if (milestones.includes(result.newStreak)) {
          pushMessage(
            `🎉 ${result.newStreak}-day streak! You're on fire — I'm so proud of you! ⭐`,
            'high',
            'celebrating'
          );
        } else {
          pushMessage(
            `Great job finishing the quiz! Your streak is now ${result.newStreak} days! 🔥`,
            'normal',
            'happy'
          );
        }
      } else if (!result?.success) {
        // Already quizzed today
        pushMessage(
          `Nice work! You've already kept your ${streak}-day streak today. Keep it up! ⭐`,
          'normal',
          'happy'
        );
      }
    }

    // Subjective quiz: grade and return early (skip MCQ analysis)
    if (quizPayload?.deck.quiz_type === "subjective") {
      const snapshotSubjective = new Map(subjectiveAnswerMap);
      const snapshotCheckbox = new Map(checkboxAnswerMap);
      const resultsMap = new Map<number, { marksEarned: number; maxMarks: number; isCorrect: boolean; feedback: string }>();

      // Grade checkbox questions deterministically (no AI needed)
      const textItems: { idx: number; q: typeof snapshotQuestions[0] }[] = [];
      snapshotQuestions.forEach((q, idx) => {
        const isCheckbox = q.answers.some((a) => !a.is_correct);
        if (isCheckbox) {
          const selected = snapshotCheckbox.get(idx) ?? new Set<string>();
          const correctIds = new Set(q.answers.filter((a) => a.is_correct).map((a) => a.id));
          const allCorrectSelected = correctIds.size > 0 && [...correctIds].every((id) => selected.has(id));
          const noWrongSelected = [...selected].every((id) => correctIds.has(id));
          const isCorrect = allCorrectSelected && noWrongSelected;
          const maxMarks = q.marks ?? 1;
          resultsMap.set(idx, {
            marksEarned: isCorrect ? maxMarks : 0,
            maxMarks,
            isCorrect,
            feedback: isCorrect
              ? "All correct options selected."
              : "Some options were incorrect or missing.",
          });
        } else {
          textItems.push({ idx, q });
        }
      });

      // Grade text questions with AI
      if (textItems.length > 0) {
        setSubjectiveGrading(true);
        try {
          const items = textItems.map(({ idx, q }) => ({
            question: q.text,
            userAnswer: snapshotSubjective.get(idx) ?? "",
            modelAnswers: q.answers.filter((a) => a.is_correct).map((a) => a.text),
            maxMarks: q.marks ?? 1,
          }));
          const { data: gradeData, error: gradeError } = await supabase.functions.invoke(
            "subjective-quiz-grader",
            { body: { items } }
          );
          if (!gradeError && Array.isArray(gradeData?.results)) {
            (gradeData.results as any[]).forEach((r: any, i: number) => {
              const { idx, q } = textItems[i];
              resultsMap.set(idx, {
                marksEarned: r.marksEarned ?? 0,
                maxMarks: q.marks ?? 1,
                isCorrect: r.isCorrect ?? false,
                feedback: r.feedback ?? "",
              });
            });
          }
        } catch { /* grading failure is non-fatal */ }
        finally { setSubjectiveGrading(false); }
      }

      setSubjectiveResults(resultsMap);
      return;
    }

    // Build per-question data for analysis
    const questionsData = snapshotQuestions.map((q) => {
      const selectedId = snapshotAnsweredMap.get(snapshotQuestions.indexOf(q)) ?? null;
      const correctAnswer = q.answers.find((a) => a.is_correct);
      const wasSkipped = selectedId === null;
      const isCorrect = !wasSkipped && selectedId === correctAnswer?.id;
      return { text: q.text, is_correct: isCorrect, was_skipped: wasSkipped };
    });

    const snapshotCorrect = questionsData.filter((q) => q.is_correct).length;
    const snapshotWrong = questionsData.filter((q) => !q.is_correct && !q.was_skipped).length;
    const snapshotSkipped = questionsData.filter((q) => q.was_skipped).length;
    const snapshotTotal = snapshotQuestions.length;
    const snapshotScore = snapshotTotal > 0 ? Math.round((snapshotCorrect / snapshotTotal) * 100 * 100) / 100 : 0;
    const deckCategory = activeDeck?.subject ?? "General";

    // Save result to database
    const { data: { session } } = await supabase.auth.getSession();
    if (session && activeDeck) {
      await supabase.from("quiz_performance_results" as any).insert({
        user_id: session.user.id,
        deck_id: activeDeck.id,
        deck_name: activeDeck.name,
        category: deckCategory,
        score: snapshotScore,
        correct_count: snapshotCorrect,
        wrong_count: snapshotWrong,
        skipped_count: snapshotSkipped,
        total_count: snapshotTotal,
        questions_data: questionsData,
      });
    }

    // Fetch subject-specific history for the performance tracker (exclude current attempt)
    if (session && activeDeck) {
      const { data: subjectRows } = await supabase
        .from("quiz_performance_results" as any)
        .select("score, completed_at, deck_name")
        .eq("user_id", session.user.id)
        .eq("category", deckCategory)
        .order("completed_at", { ascending: false })
        .limit(10);
      // The just-inserted row is the newest; drop it so it's not double-counted
      const pastRows = (subjectRows ?? []).slice(1);
      setSubjectHistory(pastRows as SubjectAttempt[]);
      setCurrentQuizScore(snapshotScore);
      setCurrentQuizCategory(deckCategory);
    }

    // Call AI analysis
    if (session && activeDeck) {
      setAnalysisLoading(true);
      setAnalysisError(null);
      try {
        // Fetch history from client side (avoids Supabase client in edge function)
        const { data: historyRows } = await supabase
          .from("quiz_performance_results" as any)
          .select("deck_name, category, score, correct_count, total_count, completed_at")
          .eq("user_id", session.user.id)
          .order("completed_at", { ascending: false })
          .limit(10);

        const current = {
          deck_name: activeDeck.name,
          category: deckCategory,
          score: snapshotScore,
          correct_count: snapshotCorrect,
          wrong_count: snapshotWrong,
          skipped_count: snapshotSkipped,
          total_count: snapshotTotal,
          questions_data: questionsData,
        };
        const history = historyRows ?? [];

        const { data: resData, error: fnError } = await supabase.functions.invoke(
          "quiz-performance-analyzer",
          { body: { current, history } }
        );
        if (fnError) {
          let msg = fnError.message ?? "Edge function error";
          try {
            const body = await (fnError as any).context?.json();
            if (body?.error) msg = body.error;
          } catch {}
          throw new Error(msg);
        }
        const analysis = resData.analysis;
        setAnalysisResult(analysis);

        // Surface AI insight via mascot
        if (analysis?.weak_areas?.length > 0) {
          pushMessage(
            `Ace AI spotted it: you can improve on "${analysis.weak_areas[0]}". Check your analysis below! 🧠`,
            'normal',
            'happy'
          );
        } else if (analysis?.trend === 'improving') {
          pushMessage(
            `AI says you're improving! Keep up this momentum — you're getting sharper every quiz! 📈`,
            'normal',
            'happy'
          );
        }

        // Save analysis back to the most recent result row
        const { data: latestRow } = await supabase
          .from("quiz_performance_results" as any)
          .select("id")
          .eq("user_id", session.user.id)
          .eq("deck_id", activeDeck.id)
          .order("completed_at", { ascending: false })
          .limit(1)
          .single();
        if (latestRow?.id) {
          await supabase
            .from("quiz_performance_results" as any)
            .update({ ai_analysis: analysis })
            .eq("id", latestRow.id);
        }
      } catch (e: any) {
        setAnalysisError(e.message ?? "Could not generate analysis.");
      } finally {
        setAnalysisLoading(false);
      }
    }
  };

  const handleToggleFlag = (index: number) => {
    setFlaggedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index); else next.add(index);
      return next;
    });
  };

  const handleJumpToBookmark = (idx: number) => {
    setCurrentIndex(idx);
    setShowBookmarkPanel(false);
  };

  // ── Auth guard ────────────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  if (!user) return null;

  const isInActiveQuiz = view === "taking" && !sessionComplete && !quizLoading && !!questions.length;
  const unansweredCount = questions.length - answeredCount;

  return (
    <div className="min-h-screen pb-20 lg:pb-12 bg-transparent">
      <div className="container mx-auto px-4 max-w-6xl pt-8">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <img src={Logo} alt="AceTerus Logo" className="w-16 h-16 object-contain rounded-2xl" />
          </div>
          <p className="text-muted-foreground">Practice with authentic exam papers and track your progress</p>
          <button
            onClick={() => setShowGoalSheet(true)}
            className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-primary text-primary-foreground text-sm font-semibold shadow-glow hover:opacity-90 hover:scale-[1.02] transition-all"
          >
            <CalendarDays className="w-4 h-4" />
            My Goals
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} className="shadow-elegant hover:shadow-glow transition-shadow">
                <CardContent className="p-4 text-center">
                  <div className={`w-12 h-12 ${stat.bgColor} rounded-lg flex items-center justify-center mx-auto mb-3`}>
                    <Icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                  <div className="text-2xl font-bold text-primary mb-1">{stat.value}</div>
                  <div className="text-xs text-muted-foreground">{stat.label}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {deckError && (
          <Alert variant="destructive" className="mb-8">
            <AlertTitle>Unable to load quizzes</AlertTitle>
            <AlertDescription>{deckError}</AlertDescription>
          </Alert>
        )}

        {/* View: Categories */}
        {view === "categories" && (
          <div className="mb-10">
            {/* OMR Scanner banner */}
            <div className="mb-6 rounded-xl border border-primary/20 bg-primary/5 p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                <ScanLine className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-base">OMR Answer Sheet Scanner</h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Upload or photograph a filled answer sheet to grade it instantly with optical mark recognition.
                </p>
              </div>
              <Button
                className="bg-gradient-primary shadow-glow shrink-0"
                onClick={() => navigate("/omr-scan")}
              >
                <ScanLine className="w-4 h-4 mr-2" />
                Open Scanner
              </Button>
            </div>

            <h2 className="text-2xl font-bold mb-6">Select a Category</h2>
            {loadingDecks ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i} className="shadow-elegant">
                    <CardContent className="p-6 space-y-3">
                      <Skeleton className="h-6 w-3/4" /><Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-4 w-1/3" /><Skeleton className="h-10 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : enrichedCategories.length === 0 ? (
              <Card className="shadow-elegant">
                <CardContent className="py-6 text-center text-muted-foreground">No quizzes available yet.</CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {enrichedCategories.map((cat) => {
                  const catImage = getCategoryImage(cat.name);
                  return (
                    <Card key={cat.name} className="shadow-elegant hover:shadow-glow transition-shadow flex flex-col overflow-hidden">
                      {/* Subject image banner */}
                      {catImage ? (
                        <div className="relative h-40 shrink-0">
                          <img
                            src={catImage}
                            alt={cat.name}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />
                          <div className="absolute bottom-3 left-4 flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-white/15 backdrop-blur-sm flex items-center justify-center">
                              <BookOpenCheck className="w-4 h-4 text-white" />
                            </div>
                            <h3 className="text-lg font-bold text-white drop-shadow">{cat.name}</h3>
                          </div>
                        </div>
                      ) : (
                        <CardHeader className="pb-2 space-y-2">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                              <BookOpenCheck className="w-5 h-5 text-primary" />
                            </div>
                            <CardTitle className="text-xl">{cat.name}</CardTitle>
                          </div>
                        </CardHeader>
                      )}

                      <CardContent className="flex-1 flex flex-col space-y-4 pt-4">
                        {cat.description && (
                          <p className="text-sm text-muted-foreground">{cat.description}</p>
                        )}
                        {cat.decks.length === 0 ? (
                          <p className="text-sm text-muted-foreground italic mt-auto">
                            Quizzes will be added soon.
                          </p>
                        ) : (
                          <>
                            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-2"><BookOpen className="w-4 h-4 text-primary" />{cat.decks.length} {cat.decks.length === 1 ? "quiz" : "quizzes"}</span>
                              <span className="flex items-center gap-2"><Layers className="w-4 h-4 text-primary" />{cat.totalQuestions.toLocaleString()} questions</span>
                            </div>
                            <Button className="w-full bg-gradient-primary shadow-glow mt-auto" onClick={() => { setSelectedCategory(cat.name); setView("decks"); }}>
                              View Quizzes <ChevronRight className="ml-2 h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* View: Decks */}
        {view === "decks" && (
          <div className="mb-10">
            <div className="flex items-center gap-4 mb-6">
              <Button variant="outline" onClick={() => setView("categories")} className="flex items-center gap-2">
                <ChevronLeft className="h-4 w-4" /> Back to Categories
              </Button>
              <h2 className="text-2xl font-bold">{selectedCategory}</h2>
            </div>
            {quizError && (
              <Alert variant="destructive" className="mb-6">
                <AlertTitle>Unable to load quiz</AlertTitle>
                <AlertDescription>{quizError}</AlertDescription>
              </Alert>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredDecks.map((deck) => (
                <Card key={deck.id} className="shadow-elegant hover:shadow-glow transition-shadow flex flex-col">
                  <CardHeader className="space-y-2">
                    <CardTitle className="text-xl">{deck.name}</CardTitle>
                    {deck.subject && <Badge variant="secondary" className="w-fit">{deck.subject}</Badge>}
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col space-y-4">
                    <p className="text-sm text-muted-foreground">{deck.description ?? "No description provided."}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Layers className="w-4 h-4 text-primary" />{deck.question_count.toLocaleString()} questions
                    </div>
                    <Button
                      className="w-full bg-gradient-primary shadow-glow"
                      disabled={quizLoading && activeDeck?.id === deck.id}
                      onClick={() => handleStartQuiz(deck)}
                    >
                      {quizLoading && activeDeck?.id === deck.id
                        ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Preparing...</>
                        : "Start"}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
            {filteredDecks.length === 0 && (
              <Card className="shadow-elegant mt-6">
                <CardContent className="py-6 text-center text-muted-foreground">No quizzes in this category.</CardContent>
              </Card>
            )}
          </div>
        )}

        {/* View: Taking */}
        {view === "taking" && (
          <div className="space-y-6 mb-10">
            {quizLoading ? (
              <Card className="shadow-elegant">
                <CardContent className="p-6 space-y-4">
                  <Skeleton className="h-6 w-1/3" /><Skeleton className="h-4 w-2/3" /><Skeleton className="h-48 w-full" />
                </CardContent>
              </Card>
            ) : quizError ? (
              <Alert variant="destructive">
                <AlertTitle>Unable to load quiz</AlertTitle>
                <AlertDescription>{quizError}</AlertDescription>
              </Alert>
            ) : !quizPayload || !questions.length ? (
              <Card className="shadow-elegant">
                <CardContent className="py-6 text-center text-muted-foreground">This deck has no questions yet.</CardContent>
              </Card>
            ) : sessionComplete ? (
              /* Results view */
              <div className="space-y-8">
                <div className="rounded-xl border p-8 text-center bg-gradient-to-br from-background to-muted/30">
                  <p className="text-sm uppercase tracking-wider text-muted-foreground mb-2">Quiz submitted</p>
                  <h3 className="text-3xl font-bold text-primary mb-1">{activeDeck?.name}</h3>
                  {isSubjective ? (
                    subjectiveGrading ? (
                      <div className="flex flex-col items-center gap-2 mt-4">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-muted-foreground text-sm">AI is grading your answers…</p>
                      </div>
                    ) : (
                      <>
                        <p className="text-5xl font-extrabold mt-4 mb-1 text-primary">
                          {totalMarksEarned} <span className="text-2xl font-semibold text-muted-foreground">/ {totalMaxMarks}</span>
                        </p>
                        <p className="text-muted-foreground text-sm">marks earned</p>
                      </>
                    )
                  ) : (
                    <>
                      <p className="text-5xl font-extrabold mt-4 mb-1 text-primary">
                        {correctCount} <span className="text-2xl font-semibold text-muted-foreground">/ {questions.length}</span>
                      </p>
                      <p className="text-muted-foreground text-sm">questions correct</p>
                    </>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {(isSubjective ? [
                    { label: "Marks", value: `${totalMarksEarned}/${totalMaxMarks}`, className: "text-primary" },
                    { label: "Answered", value: answeredCount, className: "text-green-600 dark:text-green-400" },
                    { label: "Skipped", value: questions.length - answeredCount, className: "text-muted-foreground" },
                  ] : [
                    { label: "Score", value: `${accuracy}%`, className: "text-primary" },
                    { label: "Correct", value: correctCount, className: "text-green-600 dark:text-green-400" },
                    { label: "Wrong", value: answeredCount - correctCount, className: "text-red-500 dark:text-red-400" },
                    { label: "Skipped", value: questions.length - answeredCount, className: "text-muted-foreground" },
                  ]).map((s) => (
                    <div key={s.label} className="rounded-xl border p-4 text-center">
                      <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
                      <p className={`text-2xl font-bold ${s.className}`}>{s.value}</p>
                    </div>
                  ))}
                </div>

                {/* AI Performance Analysis */}
                <QuizAnalysis
                  analysis={analysisResult}
                  loading={analysisLoading}
                  error={analysisError}
                />

                {/* Subject Performance Tracker */}
                {currentQuizScore !== null && currentQuizCategory && (
                  <PerformanceTracker
                    category={currentQuizCategory}
                    currentScore={currentQuizScore}
                    history={subjectHistory}
                  />
                )}

                {/* Set Goals CTA */}
                <Button
                  onClick={() => setShowGoalSheet(true)}
                  className="w-full h-12 bg-gradient-primary text-primary-foreground rounded-2xl text-[15px] font-semibold shadow-glow flex items-center gap-2"
                >
                  <CalendarDays className="w-5 h-5" />
                  Set Goals — Plan your study sprint
                </Button>

                <div>
                  <h4 className="text-xl font-bold mb-4">Answer Review</h4>
                  <div className="space-y-6">
                    {questions.map((q, idx) => {
                      const isBookmarked = flaggedQuestions.has(idx);

                      if (isSubjective) {
                        const result = subjectiveResults.get(idx);
                        const isCheckbox = q.answers.some((a) => !a.is_correct);
                        const userAnswer = subjectiveAnswerMap.get(idx) ?? "";
                        const selectedIds = checkboxAnswerMap.get(idx) ?? new Set<string>();
                        const modelAnswers = q.answers.filter((a) => a.is_correct);
                        const isSkipped = isCheckbox ? selectedIds.size === 0 : !userAnswer.trim();
                        const borderColor = isSkipped
                          ? "border-l-muted-foreground/30"
                          : result?.isCorrect
                          ? "border-l-green-500"
                          : "border-l-red-500";

                        return (
                          <Card key={idx} className={cn("shadow-elegant border-l-4", borderColor)}>
                            <CardHeader className="pb-3">
                              <div className="flex items-center gap-3 flex-wrap">
                                <Badge variant="outline" className="shrink-0">Q{idx + 1}</Badge>
                                {subjectiveGrading ? (
                                  <Badge variant="outline" className="text-xs gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Grading…</Badge>
                                ) : isSkipped ? (
                                  <Badge variant="outline" className="text-xs text-muted-foreground border-muted-foreground/40">Skipped</Badge>
                                ) : result ? (
                                  <Badge
                                    variant="outline"
                                    className={cn("text-xs", result.isCorrect
                                      ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300 border-green-300 dark:border-green-500/40"
                                      : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300 border-red-300 dark:border-red-500/40")}
                                  >
                                    {result.isCorrect
                                      ? <><CheckCircle2 className="w-3 h-3 mr-1" /> {result.marksEarned}/{result.maxMarks} marks</>
                                      : <><XCircle className="w-3 h-3 mr-1" /> {result.marksEarned}/{result.maxMarks} marks</>}
                                  </Badge>
                                ) : null}
                                {isBookmarked && (
                                  <Badge className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 border-amber-300 dark:border-amber-500/40" variant="outline">
                                    <BookmarkCheck className="w-3 h-3 mr-1" /> Bookmarked
                                  </Badge>
                                )}
                              </div>
                              <p className="text-base mt-2">{q.text}</p>
                            </CardHeader>
                            <CardContent className="space-y-3 pt-0">
                              {q.image_url && (
                                <img src={q.image_url} alt="Question" className="w-full max-h-48 object-contain rounded-xl border bg-muted/20 mb-3" />
                              )}
                              {/* Answer display */}
                              {isCheckbox ? (
                                <div className="space-y-1.5">
                                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Your Selections</p>
                                  {q.answers.map((a) => {
                                    const wasSelected = selectedIds.has(a.id);
                                    const isRight = a.is_correct;
                                    return (
                                      <div key={a.id} className={cn("rounded-lg border px-3 py-2 text-sm flex items-center gap-3",
                                        isRight && wasSelected ? "border-green-500 bg-green-50 dark:bg-green-500/10 text-green-800 dark:text-green-200"
                                          : !isRight && wasSelected ? "border-red-500 bg-red-50 dark:bg-red-500/10 text-red-800 dark:text-red-200"
                                          : isRight && !wasSelected ? "border-amber-400 bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-200"
                                          : "border-border bg-muted/20 text-muted-foreground"
                                      )}>
                                        <span className="shrink-0">
                                          {isRight && wasSelected ? <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                                            : !isRight && wasSelected ? <XCircle className="w-4 h-4 text-red-500" />
                                            : isRight ? <CheckCircle2 className="w-4 h-4 text-amber-500" />
                                            : <span className="w-4 h-4 block rounded border-2 border-muted-foreground/30" />}
                                        </span>
                                        <span className="flex-1">{a.text}</span>
                                        <span className="shrink-0 text-xs font-medium">
                                          {isRight && wasSelected ? "✓ Correct" : !isRight && wasSelected ? "✗ Wrong" : isRight ? "Missed" : ""}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <>
                                  <div className="rounded-lg border p-3 space-y-1">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Your Answer</p>
                                    <p className="text-sm leading-relaxed">{userAnswer || <span className="italic text-muted-foreground">No answer given</span>}</p>
                                  </div>
                                  {modelAnswers.length > 0 && (
                                    <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-500/30 p-3 space-y-1">
                                      <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide">Model Answer</p>
                                      {modelAnswers.map((a, i) => (
                                        <p key={i} className="text-sm text-blue-900 dark:text-blue-200 leading-relaxed">{a.text}</p>
                                      ))}
                                    </div>
                                  )}
                                </>
                              )}
                              {/* AI feedback */}
                              {result?.feedback && (
                                <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-1">
                                  <p className="text-xs font-semibold text-primary uppercase tracking-wide">AI Feedback</p>
                                  <p className="text-sm">{result.feedback}</p>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        );
                      }

                      // Objective review
                      const selected = answeredMap.get(idx) ?? null;
                      const correctAnswer = q.answers.find((a) => a.is_correct);
                      const isCorrect = selected === correctAnswer?.id;
                      const isSkipped = selected === null;

                      return (
                        <Card key={idx} className={cn("shadow-elegant border-l-4", isSkipped ? "border-l-muted-foreground/30" : isCorrect ? "border-l-green-500" : "border-l-red-500")}>
                          <CardHeader className="pb-3">
                            <div className="flex items-center gap-3 flex-wrap">
                              <Badge variant="outline" className="shrink-0">Q{idx + 1}</Badge>
                              {isSkipped ? (
                                <Badge variant="outline" className="text-xs text-muted-foreground border-muted-foreground/40">Skipped</Badge>
                              ) : isCorrect ? (
                                <Badge className="text-xs bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300 border-green-300 dark:border-green-500/40" variant="outline">
                                  <CheckCircle2 className="w-3 h-3 mr-1" /> Correct
                                </Badge>
                              ) : (
                                <Badge className="text-xs bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300 border-red-300 dark:border-red-500/40" variant="outline">
                                  <XCircle className="w-3 h-3 mr-1" /> Wrong
                                </Badge>
                              )}
                              {isBookmarked && (
                                <Badge className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 border-amber-300 dark:border-amber-500/40" variant="outline">
                                  <BookmarkCheck className="w-3 h-3 mr-1" /> Bookmarked
                                </Badge>
                              )}
                            </div>
                            <p className="text-base mt-2">{q.text}</p>
                          </CardHeader>
                          <CardContent className="space-y-2 pt-0">
                            {q.image_url && (
                              <img src={q.image_url} alt="Question image" className="w-full max-h-48 object-contain rounded-xl border bg-muted/20 mb-3" />
                            )}
                            {q.answers.map((a) => {
                              const isThisCorrect = a.is_correct;
                              const isThisSelected = a.id === selected;
                              const isThisWrong = isThisSelected && !isThisCorrect;
                              return (
                                <div key={a.id} className={cn("rounded-lg border px-4 py-3 text-sm",
                                  isThisCorrect ? "border-green-500 bg-green-50 dark:bg-green-500/10 text-green-800 dark:text-green-200"
                                    : isThisWrong ? "border-red-500 bg-red-50 dark:bg-red-500/10 text-red-800 dark:text-red-200"
                                    : "border-border bg-muted/20 text-muted-foreground"
                                )}>
                                  {a.image_url && (
                                    <img src={a.image_url} alt="Answer option" className="w-full max-h-36 object-contain rounded-lg border bg-muted/20 mb-2" />
                                  )}
                                  <div className="flex items-center gap-3">
                                    <span className="shrink-0">
                                      {isThisCorrect ? <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                                        : isThisWrong ? <XCircle className="w-4 h-4 text-red-500" />
                                        : <span className="w-4 h-4 block rounded-full border-2 border-muted-foreground/30" />}
                                    </span>
                                    {a.text && <span className="flex-1">{a.text}</span>}
                                    {isThisCorrect && <span className="shrink-0 text-xs font-semibold text-green-700 dark:text-green-300">Correct answer</span>}
                                    {isThisWrong && <span className="shrink-0 text-xs font-semibold text-red-600 dark:text-red-400">Your answer</span>}
                                  </div>
                                </div>
                              );
                            })}
                            {q.explanation && (
                              <div className="mt-3 rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-1">
                                <p className="text-xs font-semibold text-primary uppercase tracking-wide">Explanation</p>
                                <p className="text-sm">{q.explanation}</p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>

                {flaggedQuestions.size > 0 && (
                  <Card className="shadow-elegant">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <BookmarkCheck className="w-5 h-5 text-amber-500" /> Bookmarked Questions ({flaggedQuestions.size})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {sortedBookmarks.map((idx) => {
                        const q = questions[idx];
                        if (!q) return null;
                        const correctAnswer = q.answers.find((a) => a.is_correct);
                        const wasCorrect = answeredMap.get(idx) === correctAnswer?.id;
                        const wasSkipped = !answeredMap.has(idx);
                        return (
                          <div key={idx} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                            <Badge variant="outline" className="shrink-0">Q{idx + 1}</Badge>
                            <p className="text-sm text-muted-foreground line-clamp-2 flex-1">{q.text}</p>
                            <Badge variant="outline" className={cn("shrink-0 text-xs", wasSkipped ? "text-muted-foreground" : wasCorrect ? "border-green-500 text-green-600 dark:text-green-400" : "border-red-500 text-red-600 dark:text-red-400")}>
                              {wasSkipped ? "Skipped" : wasCorrect ? "Correct" : "Wrong"}
                            </Badge>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                )}

                <div className="flex flex-wrap gap-3">
                  <Button className="bg-gradient-primary shadow-glow" onClick={resetSessionState}>Retake deck</Button>
                  <Button variant="outline" disabled={!activeDeck} onClick={() => activeDeck && handleStartQuiz(activeDeck)}>Load fresh order</Button>
                  <Button variant="outline" onClick={() => { resetSessionState(); setView("decks"); }}>Back to category</Button>
                </div>

                {/* Goal Sheet */}
                <GoalSheet
                  open={showGoalSheet}
                  onClose={() => setShowGoalSheet(false)}
                  deckName={activeDeck?.name ?? ""}
                  subject={activeDeck?.subject ?? null}
                  accuracy={accuracy}
                  wrongQuestions={
                    questions
                      .filter((q, idx) => {
                        const correct = q.answers.find((a) => a.is_correct);
                        return answeredMap.get(idx) !== correct?.id;
                      })
                      .map((q) => q.text)
                      .slice(0, 3)
                  }
                />
              </div>

            ) : (
              /* Quiz taking view */
              currentQuestion && (
                <Card className="shadow-elegant">
                  <CardHeader className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <p className="text-sm uppercase tracking-wide text-muted-foreground">Question {currentIndex + 1} of {questions.length}</p>
                        <p className="text-xs text-muted-foreground">{answeredCount} answered · {unansweredCount} remaining</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Progress value={progressPercent} className="h-2 w-40 sm:w-60" />
                        <Button
                          variant={flaggedQuestions.has(currentIndex) ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleToggleFlag(currentIndex)}
                          className={cn("gap-1.5 transition-all", flaggedQuestions.has(currentIndex) ? "bg-amber-500 hover:bg-amber-600 border-amber-500 text-white shadow-md" : "text-muted-foreground hover:text-amber-500 hover:border-amber-400")}
                        >
                          {flaggedQuestions.has(currentIndex)
                            ? <><BookmarkCheck className="w-4 h-4" /><span className="hidden sm:inline text-xs font-medium">Marked</span></>
                            : <><Bookmark className="w-4 h-4" /><span className="hidden sm:inline text-xs font-medium">Mark</span></>}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-6">
                    <p className="text-lg leading-relaxed">{currentQuestion.text}</p>

                    {currentQuestion.image_url && (
                      <img
                        src={currentQuestion.image_url}
                        alt="Question image"
                        className="w-full max-h-72 object-contain rounded-xl border bg-muted/20"
                      />
                    )}

                    {isSubjective ? (() => {
                      const isCheckbox = currentQuestion.answers.some((a) => !a.is_correct);
                      const selectedIds = checkboxAnswerMap.get(currentIndex) ?? new Set<string>();
                      if (isCheckbox) {
                        return (
                          <div className="space-y-3">
                            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Select all correct options
                            </p>
                            {currentQuestion.answers.map((a) => {
                              const checked = selectedIds.has(a.id);
                              return (
                                <button
                                  key={a.id}
                                  onClick={() => handleCheckboxToggle(a.id)}
                                  className={cn(
                                    "w-full rounded-lg border px-4 py-3 text-left transition-all flex items-center gap-3",
                                    checked
                                      ? "border-primary bg-primary/8 dark:bg-primary/15 ring-1 ring-primary"
                                      : "border-border hover:border-primary/50 hover:bg-muted/60"
                                  )}
                                >
                                  <span className={cn("shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors", checked ? "border-primary bg-primary" : "border-muted-foreground/40")}>
                                    {checked && <span className="w-2 h-2 block bg-white rounded-sm" />}
                                  </span>
                                  <span className="text-sm">{a.text}</span>
                                </button>
                              );
                            })}
                            {currentQuestion.marks != null && (
                              <p className="text-xs text-muted-foreground">{currentQuestion.marks} mark{currentQuestion.marks !== 1 ? "s" : ""}</p>
                            )}
                          </div>
                        );
                      }
                      return (
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <PenLine className="w-4 h-4" />
                              <span>Write your answer below</span>
                            </div>
                            <Textarea
                              placeholder="Type your answer here..."
                              value={subjectiveAnswerMap.get(currentIndex) ?? ""}
                              onChange={(e) => handleSubjectiveAnswer(e.target.value)}
                              className="min-h-[140px] text-sm resize-none"
                              disabled={sessionComplete}
                            />
                          </div>
                          {currentQuestion.answers.filter((a) => a.is_correct).length > 0 && (
                            <div className="rounded-xl border border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-500/30 p-4 space-y-2">
                              <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide">Model Answer</p>
                              {currentQuestion.answers.filter((a) => a.is_correct).map((a, i) => (
                                <p key={i} className="text-sm text-blue-900 dark:text-blue-200 leading-relaxed">{a.text}</p>
                              ))}
                              {currentQuestion.marks != null && (
                                <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
                                  {currentQuestion.marks} mark{currentQuestion.marks !== 1 ? "s" : ""}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })() : (
                      <div className="space-y-3">
                        {currentQuestion.answers.length ? (
                          currentQuestion.answers.map((a) => {
                            const isSelected = selectedAnswerId === a.id;
                            return (
                              <button
                                key={a.id}
                                onClick={() => handleAnswerSelect(a.id)}
                                className={cn(
                                  "w-full rounded-lg border px-4 py-3 text-left transition-all",
                                  isSelected
                                    ? "border-primary bg-primary/8 dark:bg-primary/15 ring-1 ring-primary text-foreground"
                                    : "border-border hover:border-primary/50 hover:bg-muted/60"
                                )}
                              >
                                {a.image_url && (
                                  <img
                                    src={a.image_url}
                                    alt="Answer option"
                                    className="w-full max-h-40 object-contain rounded-lg border bg-muted/20 mb-2"
                                  />
                                )}
                                <div className="flex items-center gap-3">
                                  <span className={cn("shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center", isSelected ? "border-primary bg-primary" : "border-muted-foreground/40")}>
                                    {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                                  </span>
                                  {a.text && <span className="text-sm whitespace-normal">{a.text}</span>}
                                </div>
                              </button>
                            );
                          })
                        ) : (
                          <Alert><AlertTitle>No answers found</AlertTitle><AlertDescription>This question has no answer options yet.</AlertDescription></Alert>
                        )}
                      </div>
                    )}

                    {submitConfirmPending && (
                      <Alert className="border-orange-300 bg-orange-50 dark:bg-orange-500/10 dark:border-orange-500/40">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <AlertTitle className="text-orange-800 dark:text-orange-300">Submit quiz?</AlertTitle>
                            <AlertDescription className="text-orange-700 dark:text-orange-400 mt-1">
                              {unansweredCount > 0 ? `You have ${unansweredCount} unanswered question${unansweredCount > 1 ? "s" : ""}. You cannot change answers after submitting.` : "You cannot change your answers after submitting."}
                            </AlertDescription>
                          </div>
                          <div className="flex gap-2 shrink-0 mt-0.5">
                            <Button size="sm" variant="outline" onClick={() => setSubmitConfirmPending(false)}>Cancel</Button>
                            <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white border-0" onClick={handleSubmitQuiz}>Confirm Submit</Button>
                          </div>
                        </div>
                      </Alert>
                    )}

                    <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border/40">
                      <Button variant="outline" disabled={currentIndex === 0} onClick={handlePrevQuestion}><ChevronLeft className="mr-2 h-4 w-4" /> Previous</Button>
                      <Button variant="outline" disabled={isLastQuestion} onClick={handleNextQuestion}>Next <ChevronRight className="ml-2 h-4 w-4" /></Button>
                      <div className="flex-1" />
                      <Button variant="outline" className="border-orange-400 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/60" onClick={() => { setSubmitConfirmPending(true); setShowBookmarkPanel(false); }}>
                        <Sparkles className="mr-2 h-4 w-4" /> Submit Quiz
                      </Button>
                      <Button variant="outline" onClick={() => { resetSessionState(); setView("decks"); }}>Exit</Button>
                    </div>
                  </CardContent>
                </Card>
              )
            )}
          </div>
        )}
      </div>

      {/* Streak fire overlay */}
      {fireOverlay.show && (
        <StreakFireOverlay
          streak={fireOverlay.newStreak}
          onDismiss={() => setFireOverlay({ show: false, newStreak: 0 })}
        />
      )}

      {/* Floating bookmarks panel */}
      {isInActiveQuiz && flaggedQuestions.size > 0 && (
        <div ref={bookmarkPanelRef} className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
          {showBookmarkPanel && (
            <div className="w-72 rounded-xl border bg-background shadow-2xl overflow-hidden animate-in slide-in-from-bottom-2 duration-200">
              <div className="flex items-center justify-between px-4 py-3 border-b bg-amber-50 dark:bg-amber-500/10">
                <div className="flex items-center gap-2">
                  <BookmarkCheck className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">Bookmarks ({flaggedQuestions.size})</span>
                </div>
                <button onClick={() => setShowBookmarkPanel(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="max-h-64 overflow-y-auto divide-y">
                {sortedBookmarks.map((idx) => {
                  const q = questions[idx];
                  if (!q) return null;
                  const isCurrent = idx === currentIndex;
                  const isAnswered = answeredMap.has(idx);
                  return (
                    <button key={idx} onClick={() => handleJumpToBookmark(idx)} className={cn("w-full text-left px-4 py-3 flex items-start gap-3 transition-colors hover:bg-muted/60", isCurrent && "bg-amber-50 dark:bg-amber-500/10")}>
                      <Badge variant={isCurrent ? "default" : "outline"} className={cn("shrink-0 mt-0.5 text-xs", isCurrent && "bg-amber-500 border-amber-500 text-white")}>Q{idx + 1}</Badge>
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-snug flex-1">{q.text || "(No prompt)"}</p>
                      {isAnswered && <span className="shrink-0 w-2 h-2 rounded-full bg-primary mt-1" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <Button onClick={() => setShowBookmarkPanel((prev) => !prev)} className="gap-2 shadow-lg bg-amber-500 hover:bg-amber-600 text-white">
            <BookmarkCheck className="w-4 h-4" />
            <span className="font-medium">Bookmarks</span>
            <Badge className="bg-white text-amber-600 text-xs px-1.5 py-0 ml-0.5 font-bold">{flaggedQuestions.size}</Badge>
          </Button>
        </div>
      )}

      {/* Standalone Goal Sheet — opened from header button before/between quizzes */}
      {!sessionComplete && (
        <GoalSheet
          open={showGoalSheet}
          onClose={() => setShowGoalSheet(false)}
        />
      )}
    </div>
  );
};

export default Quiz;
