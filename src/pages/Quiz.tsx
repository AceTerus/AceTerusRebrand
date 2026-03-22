import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Bookmark,
  BookmarkCheck,
  BookOpen,
  BookOpenCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Flame,
  GraduationCap,
  Layers,
  Loader2,
  Sparkles,
  Target,
  X,
  XCircle,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Logo from "@/assets/logo.png";
import { useAuth } from "@/hooks/useAuth";
import { useStreak } from "@/hooks/useStreak";
import { fetchDecks, fetchQuiz } from "@/lib/quiz-client";
import type { Deck, Question, QuizPayload } from "@/types/quiz";
import { cn } from "@/lib/utils";

type QuizView = "categories" | "decks" | "taking";

const Quiz = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { streak, updateStreak } = useStreak();
  const navigate = useNavigate();

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

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (authLoading || !user) return;
    let cancelled = false;
    setLoadingDecks(true);
    setDeckError(null);
    fetchDecks()
      .then((data) => { if (!cancelled) setDecks(data ?? []); })
      .catch((e) => { if (!cancelled) setDeckError(e.message ?? "Failed to load decks."); })
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
  const subjectCount = useMemo(() => new Set(decks.map((d) => d.subject ?? "General").filter(Boolean)).size, [decks]);

  const categories = useMemo(() => {
    const map = new Map<string, { decks: Deck[]; totalQuestions: number }>();
    for (const deck of decks) {
      const cat = deck.subject ?? "General";
      const existing = map.get(cat) ?? { decks: [], totalQuestions: 0 };
      existing.decks.push(deck);
      existing.totalQuestions += deck.question_count ?? 0;
      map.set(cat, existing);
    }
    return Array.from(map.entries()).map(([name, data]) => ({ name, ...data }));
  }, [decks]);

  const filteredDecks = useMemo(
    () => decks.filter((d) => (d.subject ?? "General") === selectedCategory),
    [decks, selectedCategory]
  );

  const questions: Question[] = quizPayload?.questions ?? [];
  const currentQuestion = questions[currentIndex];
  const selectedAnswerId = answeredMap.get(currentIndex) ?? null;
  const answeredCount = answeredMap.size;

  const correctCount = useMemo(() => {
    if (!sessionComplete) return 0;
    return questions.reduce((acc, q, idx) => {
      const selected = answeredMap.get(idx);
      const correctAnswer = q.answers.find((a) => a.is_correct);
      return acc + (selected === correctAnswer?.id ? 1 : 0);
    }, 0);
  }, [sessionComplete, answeredMap, questions]);

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

  const handleNextQuestion = () => { if (!isLastQuestion) setCurrentIndex((prev) => prev + 1); };
  const handlePrevQuestion = () => { setCurrentIndex((prev) => Math.max(0, prev - 1)); };

  const handleSubmitQuiz = () => {
    setSessionComplete(true);
    setShowBookmarkPanel(false);
    setSubmitConfirmPending(false);
    if (activeDeck) updateStreak(activeDeck.id);
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
    <div className="min-h-screen pb-12 bg-gradient-to-br from-background via-muted/20 to-background">
      <Navbar />
      <div className="container mx-auto px-4 max-w-6xl pt-24">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <img src={Logo} alt="AceTerus Logo" className="w-16 h-16" />
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">AceTerus</h1>
          </div>
          <p className="text-muted-foreground">Practice with authentic exam papers and track your progress</p>
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
            ) : categories.length === 0 ? (
              <Card className="shadow-elegant">
                <CardContent className="py-6 text-center text-muted-foreground">No quizzes available yet.</CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {categories.map((cat) => (
                  <Card key={cat.name} className="shadow-elegant hover:shadow-glow transition-shadow flex flex-col">
                    <CardHeader className="space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <BookOpenCheck className="w-5 h-5 text-primary" />
                        </div>
                        <CardTitle className="text-xl">{cat.name}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col space-y-4">
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-2"><BookOpen className="w-4 h-4 text-primary" />{cat.decks.length} {cat.decks.length === 1 ? "quiz" : "quizzes"}</span>
                        <span className="flex items-center gap-2"><Layers className="w-4 h-4 text-primary" />{cat.totalQuestions.toLocaleString()} questions</span>
                      </div>
                      <Button className="w-full bg-gradient-primary shadow-glow mt-auto" onClick={() => { setSelectedCategory(cat.name); setView("decks"); }}>
                        View Quizzes <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
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
                  <p className="text-5xl font-extrabold mt-4 mb-1 text-primary">
                    {correctCount} <span className="text-2xl font-semibold text-muted-foreground">/ {questions.length}</span>
                  </p>
                  <p className="text-muted-foreground text-sm">questions correct</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: "Score", value: `${accuracy}%`, className: "text-primary" },
                    { label: "Correct", value: correctCount, className: "text-green-600 dark:text-green-400" },
                    { label: "Wrong", value: answeredCount - correctCount, className: "text-red-500 dark:text-red-400" },
                    { label: "Skipped", value: questions.length - answeredCount, className: "text-muted-foreground" },
                  ].map((s) => (
                    <div key={s.label} className="rounded-xl border p-4 text-center">
                      <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
                      <p className={`text-2xl font-bold ${s.className}`}>{s.value}</p>
                    </div>
                  ))}
                </div>

                <div>
                  <h4 className="text-xl font-bold mb-4">Answer Review</h4>
                  <div className="space-y-6">
                    {questions.map((q, idx) => {
                      const selected = answeredMap.get(idx) ?? null;
                      const correctAnswer = q.answers.find((a) => a.is_correct);
                      const isCorrect = selected === correctAnswer?.id;
                      const isSkipped = selected === null;
                      const isBookmarked = flaggedQuestions.has(idx);

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
                            {q.answers.map((a) => {
                              const isThisCorrect = a.is_correct;
                              const isThisSelected = a.id === selected;
                              const isThisWrong = isThisSelected && !isThisCorrect;
                              return (
                                <div
                                  key={a.id}
                                  className={cn(
                                    "flex items-start gap-3 rounded-lg border px-4 py-3 text-sm",
                                    isThisCorrect ? "border-green-500 bg-green-50 dark:bg-green-500/10 text-green-800 dark:text-green-200"
                                      : isThisWrong ? "border-red-500 bg-red-50 dark:bg-red-500/10 text-red-800 dark:text-red-200"
                                      : "border-border bg-muted/20 text-muted-foreground"
                                  )}
                                >
                                  <span className="shrink-0 mt-0.5">
                                    {isThisCorrect ? <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                                      : isThisWrong ? <XCircle className="w-4 h-4 text-red-500" />
                                      : <span className="w-4 h-4 block rounded-full border-2 border-muted-foreground/30" />}
                                  </span>
                                  <span className="flex-1">{a.text}</span>
                                  {isThisCorrect && <span className="shrink-0 text-xs font-semibold text-green-700 dark:text-green-300">Correct answer</span>}
                                  {isThisWrong && <span className="shrink-0 text-xs font-semibold text-red-600 dark:text-red-400">Your answer</span>}
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

                    <div className="space-y-3">
                      {currentQuestion.answers.length ? (
                        currentQuestion.answers.map((a) => {
                          const isSelected = selectedAnswerId === a.id;
                          return (
                            <Button
                              key={a.id}
                              variant="outline"
                              onClick={() => handleAnswerSelect(a.id)}
                              className={cn(
                                "w-full justify-start text-left whitespace-normal transition-all",
                                isSelected ? "border-primary bg-primary/8 dark:bg-primary/15 ring-1 ring-primary text-foreground" : "hover:border-primary/50 hover:bg-muted/60"
                              )}
                            >
                              <span className={cn("shrink-0 mr-3 w-4 h-4 rounded-full border-2 flex items-center justify-center", isSelected ? "border-primary bg-primary" : "border-muted-foreground/40")}>
                                {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                              </span>
                              {a.text}
                            </Button>
                          );
                        })
                      ) : (
                        <Alert><AlertTitle>No answers found</AlertTitle><AlertDescription>This question has no answer options yet.</AlertDescription></Alert>
                      )}
                    </div>

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
    </div>
  );
};

export default Quiz;
