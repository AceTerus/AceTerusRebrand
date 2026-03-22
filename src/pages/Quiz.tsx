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
  Calendar,
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
import {
  buildOpenMcImageUrl,
  fetchOpenMcDeckSummaries,
  fetchOpenMcQuiz,
  OpenMcClientError,
} from "@/lib/openmc-client";
import type { OpenMcDeckSummary, OpenMcQuizPayload, OpenMcQuizQuestion } from "@/types/openmc";
import { cn } from "@/lib/utils";

type QuizView = 'categories' | 'decks' | 'taking';

const HtmlContent = ({ content, className }: { content?: string | null; className?: string }) => {
  if (!content) {
    return <p className={cn("text-sm text-muted-foreground italic", className)}>No content provided.</p>;
  }
  return (
    <div
      className={cn(
        "leading-relaxed text-base text-foreground space-y-4 [&_p]:mb-4 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_strong]:font-semibold [&_em]:italic",
        className
      )}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
};

const stripHtml = (html: string) => {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent ?? div.innerText ?? '';
};

const Quiz = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { streak, updateStreak } = useStreak();
  const navigate = useNavigate();

  // Deck state
  const [decks, setDecks] = useState<OpenMcDeckSummary[]>([]);
  const [loadingDecks, setLoadingDecks] = useState(true);
  const [deckError, setDeckError] = useState<string | null>(null);

  // View state
  const [view, setView] = useState<QuizView>('categories');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Quiz session state
  const [activeDeck, setActiveDeck] = useState<OpenMcDeckSummary | null>(null);
  const [quizPayload, setQuizPayload] = useState<OpenMcQuizPayload | null>(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizError, setQuizError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  // Maps question index → selected choice id (no isCorrect stored until submit)
  const [answeredMap, setAnsweredMap] = useState<Map<number, number>>(new Map());
  const [sessionComplete, setSessionComplete] = useState(false);
  const [submitConfirmPending, setSubmitConfirmPending] = useState(false);
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(new Set());

  // Bookmark panel state
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
    fetchOpenMcDeckSummaries()
      .then((payload) => { if (!cancelled) setDecks(payload ?? []); })
      .catch((error) => {
        if (cancelled) return;
        setDeckError(
          error instanceof OpenMcClientError ? error.message : "Failed to sync decks from OpenMultipleChoice."
        );
      })
      .finally(() => { if (!cancelled) setLoadingDecks(false); });
    return () => { cancelled = true; };
  }, [authLoading, user]);

  // Persist bookmarks to localStorage
  useEffect(() => {
    if (!activeDeck) return;
    localStorage.setItem(
      `quiz_bookmarks_${activeDeck.id}`,
      JSON.stringify(Array.from(flaggedQuestions))
    );
  }, [flaggedQuestions, activeDeck]);

  // Close bookmark panel on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (bookmarkPanelRef.current && !bookmarkPanelRef.current.contains(e.target as Node)) {
        setShowBookmarkPanel(false);
      }
    };
    if (showBookmarkPanel) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showBookmarkPanel]);

  // ── Derived values ───────────────────────────────────────────────────────────
  const deckCount = decks.length;
  const totalQuestions = useMemo(
    () => decks.reduce((acc, d) => acc + (d.questionCount ?? 0), 0),
    [decks]
  );
  const moduleCount = useMemo(() => {
    const s = new Set(
      decks.map((d) => d.subjectName ?? d.moduleName ?? d.name).filter(Boolean) as string[]
    );
    return s.size;
  }, [decks]);

  const categories = useMemo(() => {
    const map = new Map<string, { decks: OpenMcDeckSummary[]; totalQuestions: number }>();
    for (const deck of decks) {
      const cat = deck.subjectName ?? 'General';
      const existing = map.get(cat) ?? { decks: [], totalQuestions: 0 };
      existing.decks.push(deck);
      existing.totalQuestions += deck.questionCount ?? 0;
      map.set(cat, existing);
    }
    return Array.from(map.entries()).map(([name, data]) => ({ name, ...data }));
  }, [decks]);

  const filteredDecks = useMemo(
    () => decks.filter(d => (d.subjectName ?? 'General') === selectedCategory),
    [decks, selectedCategory]
  );

  const questions: OpenMcQuizQuestion[] = quizPayload?.questions ?? [];
  const currentQuestion = questions[currentIndex];
  const selectedAnswerId = answeredMap.get(currentIndex) ?? null;
  const answeredCount = answeredMap.size;

  const correctCount = useMemo(() => {
    if (!sessionComplete) return 0;
    return questions.reduce((acc, q, idx) => {
      const selected = answeredMap.get(idx);
      return acc + (selected === q.correctAnswerId ? 1 : 0);
    }, 0);
  }, [sessionComplete, answeredMap, questions]);

  const accuracy = questions.length ? Math.round((correctCount / questions.length) * 100) : 0;
  const isLastQuestion = currentIndex >= questions.length - 1;

  // Progress = answered questions (not position) so it feels meaningful
  const progressPercent = questions.length ? (answeredCount / questions.length) * 100 : 0;

  const sortedBookmarks = useMemo(
    () => Array.from(flaggedQuestions).sort((a, b) => a - b),
    [flaggedQuestions]
  );

  const stats = [
    { icon: Flame, value: streak.toString(), label: "day streak", color: "text-orange-500 dark:text-orange-300", bgColor: "bg-orange-50 dark:bg-orange-400/15" },
    { icon: BookOpen, value: loadingDecks ? "..." : deckCount.toString(), label: "quizzes online", color: "text-red-500 dark:text-red-300", bgColor: "bg-red-50 dark:bg-red-400/15" },
    { icon: Target, value: loadingDecks ? "..." : totalQuestions.toString(), label: "questions ready", color: "text-green-500 dark:text-green-300", bgColor: "bg-green-50 dark:bg-green-400/15" },
    { icon: GraduationCap, value: loadingDecks ? "..." : moduleCount.toString(), label: "modules covered", color: "text-purple-500 dark:text-purple-300", bgColor: "bg-purple-50 dark:bg-purple-400/15" },
  ];

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const resetSessionState = () => {
    setCurrentIndex(0);
    setAnsweredMap(new Map());
    setSessionComplete(false);
    setSubmitConfirmPending(false);
    setFlaggedQuestions(new Set());
    setShowBookmarkPanel(false);
  };

  const handleStartQuiz = async (deck: OpenMcDeckSummary) => {
    setActiveDeck(deck);
    setQuizLoading(true);
    setQuizError(null);
    try {
      const payload = await fetchOpenMcQuiz({ deckId: deck.id, shuffle: true });
      setQuizPayload(payload);
      resetSessionState();
      try {
        const saved = localStorage.getItem(`quiz_bookmarks_${deck.id}`);
        if (saved) setFlaggedQuestions(new Set(JSON.parse(saved) as number[]));
      } catch { /* ignore */ }
      setView('taking');
    } catch (error) {
      setQuizError(error instanceof OpenMcClientError ? error.message : "Failed to load the quiz deck.");
    } finally {
      setQuizLoading(false);
    }
  };

  // During quiz: just record the selection, allow changing, no locking
  const handleAnswerSelect = (choiceId: number) => {
    if (sessionComplete) return;
    setAnsweredMap(prev => {
      const next = new Map(prev);
      next.set(currentIndex, choiceId);
      return next;
    });
    setSubmitConfirmPending(false);
  };

  const handleNextQuestion = () => {
    if (!isLastQuestion) setCurrentIndex(prev => prev + 1);
  };

  const handlePrevQuestion = () => {
    setCurrentIndex(prev => Math.max(0, prev - 1));
  };

  const handleSubmitQuiz = () => {
    setSessionComplete(true);
    setShowBookmarkPanel(false);
    setSubmitConfirmPending(false);
    // Increment streak once per day on quiz submission
    if (activeDeck) {
      updateStreak(String(activeDeck.id));
    }
  };

  const handleToggleFlag = (index: number) => {
    setFlaggedQuestions(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleJumpToBookmark = (idx: number) => {
    setCurrentIndex(idx);
    setShowBookmarkPanel(false);
  };

  // ── Auth guard ───────────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  if (!user) return null;

  const isInActiveQuiz = view === 'taking' && !sessionComplete && !quizLoading && !!questions.length;
  const unansweredCount = questions.length - answeredCount;

  return (
    <div className="min-h-screen pb-12 bg-gradient-to-br from-background via-muted/20 to-background">
      <Navbar />
      <div className="container mx-auto px-4 max-w-6xl pt-24">

        {/* ── Header ── */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <img src={Logo} alt="AceTerus Logo" className="w-16 h-16" />
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">AceTerus</h1>
          </div>
          <p className="text-muted-foreground">Practice with authentic exam papers and track your progress</p>
        </div>

        {/* ── Stats ── */}
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
            <AlertTitle>Unable to reach OpenMultipleChoice</AlertTitle>
            <AlertDescription>{deckError}</AlertDescription>
          </Alert>
        )}

        {/* ── View: Categories ── */}
        {view === 'categories' && (
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
                <CardContent className="py-6 text-center text-muted-foreground">No public decks are available yet.</CardContent>
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
                        <span className="flex items-center gap-2"><BookOpen className="w-4 h-4 text-primary" />{cat.decks.length} {cat.decks.length === 1 ? 'quiz' : 'quizzes'}</span>
                        <span className="flex items-center gap-2"><Layers className="w-4 h-4 text-primary" />{cat.totalQuestions.toLocaleString()} questions</span>
                      </div>
                      <Button className="w-full bg-gradient-primary shadow-glow mt-auto" onClick={() => { setSelectedCategory(cat.name); setView('decks'); }}>
                        View Quizzes <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── View: Decks ── */}
        {view === 'decks' && (
          <div className="mb-10">
            <div className="flex items-center gap-4 mb-6">
              <Button variant="outline" onClick={() => setView('categories')} className="flex items-center gap-2">
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
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-xl">{deck.name}</CardTitle>
                      {deck.access && <Badge variant="outline" className="text-xs">{deck.access}</Badge>}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap text-sm text-muted-foreground">
                      {deck.subjectName && <Badge variant="secondary">{deck.subjectName}</Badge>}
                      {deck.moduleName && <span>{deck.moduleName}</span>}
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col space-y-4">
                    <p className="text-sm text-muted-foreground">{deck.description ?? "This deck does not include a description yet."}</p>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-2"><Layers className="w-4 h-4 text-primary" />{deck.questionCount.toLocaleString()} questions</span>
                      <span className="flex items-center gap-2"><Calendar className="w-4 h-4 text-primary" />{deck.examAt ? new Date(deck.examAt).toLocaleDateString() : "Flexible exam date"}</span>
                    </div>
                    <Button className="w-full bg-gradient-primary shadow-glow" disabled={quizLoading && activeDeck?.id === deck.id} onClick={() => handleStartQuiz(deck)}>
                      {quizLoading && activeDeck?.id === deck.id ? (<>Preparing... <Loader2 className="ml-2 h-4 w-4 animate-spin" /></>) : "Start"}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
            {filteredDecks.length === 0 && (
              <Card className="shadow-elegant mt-6">
                <CardContent className="py-6 text-center text-muted-foreground">No quizzes found in this category.</CardContent>
              </Card>
            )}
          </div>
        )}

        {/* ── View: Taking ── */}
        {view === 'taking' && (
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
                <CardContent className="py-6 text-center text-muted-foreground">This deck does not contain any questions yet.</CardContent>
              </Card>

            ) : sessionComplete ? (
              /* ════════════════════════════════════════════════════════════════
                 RESULTS VIEW — shown after submission
              ═══════════════════════════════════════════════════════════════ */
              <div className="space-y-8">

                {/* Score hero */}
                <div className="rounded-xl border p-8 text-center bg-gradient-to-br from-background to-muted/30">
                  <p className="text-sm uppercase tracking-wider text-muted-foreground mb-2">Quiz submitted</p>
                  <h3 className="text-3xl font-bold text-primary mb-1">{activeDeck?.name}</h3>
                  <p className="text-5xl font-extrabold mt-4 mb-1 text-primary">
                    {correctCount} <span className="text-2xl font-semibold text-muted-foreground">/ {questions.length}</span>
                  </p>
                  <p className="text-muted-foreground text-sm">questions correct</p>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="rounded-xl border p-4 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Score</p>
                    <p className="text-2xl font-bold text-primary">{accuracy}%</p>
                  </div>
                  <div className="rounded-xl border p-4 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Correct</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">{correctCount}</p>
                  </div>
                  <div className="rounded-xl border p-4 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Wrong</p>
                    <p className="text-2xl font-bold text-red-500 dark:text-red-400">{answeredCount - correctCount}</p>
                  </div>
                  <div className="rounded-xl border p-4 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Skipped</p>
                    <p className="text-2xl font-bold text-muted-foreground">{questions.length - answeredCount}</p>
                  </div>
                </div>

                {/* Full question review */}
                <div>
                  <h4 className="text-xl font-bold mb-4">Answer Review</h4>
                  <div className="space-y-6">
                    {questions.map((q, idx) => {
                      const selected = answeredMap.get(idx) ?? null;
                      const isCorrect = selected === q.correctAnswerId;
                      const isSkipped = selected === null;
                      const isBookmarked = flaggedQuestions.has(idx);

                      return (
                        <Card
                          key={idx}
                          className={cn(
                            "shadow-elegant border-l-4",
                            isSkipped ? "border-l-muted-foreground/30" :
                            isCorrect ? "border-l-green-500" : "border-l-red-500"
                          )}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between gap-3">
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
                            </div>
                            <HtmlContent content={q.prompt} className="text-base mt-2" />
                          </CardHeader>
                          <CardContent className="space-y-2 pt-0">
                            {/* Question images */}
                            {q.images?.length ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                                {q.images.map((image) => {
                                  const url = buildOpenMcImageUrl(image.path ?? undefined, image.url ?? undefined);
                                  if (!url) return null;
                                  return (
                                    <div key={image.id} className="rounded-xl overflow-hidden border bg-muted/30">
                                      <img src={url} alt={image.comment ?? `Q${idx + 1} image`} className="w-full h-auto object-cover" loading="lazy" />
                                      {image.comment && <p className="px-3 py-2 text-xs text-muted-foreground border-t">{image.comment}</p>}
                                    </div>
                                  );
                                })}
                              </div>
                            ) : null}

                            {/* Choices with correct/wrong highlighting */}
                            <div className="space-y-2">
                              {q.choices.map((choice) => {
                                const isThisCorrect = choice.id === q.correctAnswerId;
                                const isThisSelected = choice.id === selected;
                                const isThisWrong = isThisSelected && !isThisCorrect;

                                return (
                                  <div
                                    key={choice.id}
                                    className={cn(
                                      "flex items-start gap-3 rounded-lg border px-4 py-3 text-sm",
                                      isThisCorrect
                                        ? "border-green-500 bg-green-50 dark:bg-green-500/10 text-green-800 dark:text-green-200"
                                        : isThisWrong
                                          ? "border-red-500 bg-red-50 dark:bg-red-500/10 text-red-800 dark:text-red-200"
                                          : "border-border bg-muted/20 text-muted-foreground"
                                    )}
                                  >
                                    <span className="shrink-0 mt-0.5">
                                      {isThisCorrect ? (
                                        <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                                      ) : isThisWrong ? (
                                        <XCircle className="w-4 h-4 text-red-500" />
                                      ) : (
                                        <span className="w-4 h-4 block rounded-full border-2 border-muted-foreground/30" />
                                      )}
                                    </span>
                                    <div className="flex-1">
                                      <HtmlContent content={choice.text} className="text-sm" />
                                    </div>
                                    {isThisCorrect && (
                                      <span className="shrink-0 text-xs font-semibold text-green-700 dark:text-green-300">Correct answer</span>
                                    )}
                                    {isThisWrong && (
                                      <span className="shrink-0 text-xs font-semibold text-red-600 dark:text-red-400">Your answer</span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>

                            {/* Explanation */}
                            {q.explanation && (
                              <div className="mt-3 rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-1">
                                <p className="text-xs font-semibold text-primary uppercase tracking-wide">Explanation</p>
                                <HtmlContent content={q.explanation} className="text-sm" />
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>

                {/* Bookmarked questions summary */}
                {flaggedQuestions.size > 0 && (
                  <Card className="shadow-elegant">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <BookmarkCheck className="w-5 h-5 text-amber-500" />
                        Bookmarked Questions ({flaggedQuestions.size})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {sortedBookmarks.map((idx) => {
                        const q = questions[idx];
                        if (!q) return null;
                        const wasCorrect = answeredMap.get(idx) === q.correctAnswerId;
                        const wasSkipped = !answeredMap.has(idx);
                        return (
                          <div key={idx} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                            <Badge variant="outline" className="shrink-0">Q{idx + 1}</Badge>
                            <p className="text-sm text-muted-foreground line-clamp-2 flex-1">{stripHtml(q.prompt ?? '')}</p>
                            <Badge
                              variant="outline"
                              className={cn(
                                "shrink-0 text-xs",
                                wasSkipped ? "text-muted-foreground" :
                                wasCorrect ? "border-green-500 text-green-600 dark:text-green-400" :
                                "border-red-500 text-red-600 dark:text-red-400"
                              )}
                            >
                              {wasSkipped ? "Skipped" : wasCorrect ? "Correct" : "Wrong"}
                            </Badge>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                )}

                {/* Action buttons */}
                <div className="flex flex-wrap gap-3">
                  <Button className="bg-gradient-primary shadow-glow" onClick={resetSessionState}>
                    Retake deck
                  </Button>
                  <Button variant="outline" disabled={!activeDeck} onClick={() => activeDeck && handleStartQuiz(activeDeck)}>
                    Load fresh order
                  </Button>
                  <Button variant="outline" onClick={() => { resetSessionState(); setView('decks'); }}>
                    Back to category
                  </Button>
                </div>
              </div>

            ) : (
              /* ════════════════════════════════════════════════════════════════
                 QUIZ TAKING VIEW — no answer feedback shown
              ═══════════════════════════════════════════════════════════════ */
              currentQuestion && (
                <Card className="shadow-elegant">
                  <CardHeader className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <p className="text-sm uppercase tracking-wide text-muted-foreground">
                          Question {currentIndex + 1} of {questions.length}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {answeredCount} answered · {unansweredCount} remaining
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Progress value={progressPercent} className="h-2 w-40 sm:w-60" title={`${answeredCount} of ${questions.length} answered`} />
                        {/* Bookmark button */}
                        <Button
                          variant={flaggedQuestions.has(currentIndex) ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleToggleFlag(currentIndex)}
                          title={flaggedQuestions.has(currentIndex) ? "Remove bookmark" : "Bookmark this question"}
                          className={cn(
                            "gap-1.5 transition-all",
                            flaggedQuestions.has(currentIndex)
                              ? "bg-amber-500 hover:bg-amber-600 border-amber-500 text-white shadow-md"
                              : "text-muted-foreground hover:text-amber-500 hover:border-amber-400"
                          )}
                        >
                          {flaggedQuestions.has(currentIndex) ? (
                            <><BookmarkCheck className="w-4 h-4" /><span className="hidden sm:inline text-xs font-medium">Marked</span></>
                          ) : (
                            <><Bookmark className="w-4 h-4" /><span className="hidden sm:inline text-xs font-medium">Mark</span></>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-6">
                    <HtmlContent content={currentQuestion.prompt} className="text-lg" />

                    {/* Images */}
                    {currentQuestion.images?.length ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {currentQuestion.images.map((image) => {
                          const url = buildOpenMcImageUrl(image.path ?? undefined, image.url ?? undefined);
                          if (!url) return null;
                          return (
                            <div key={image.id} className="rounded-xl overflow-hidden border bg-muted/30">
                              <img src={url} alt={image.comment ?? `Question image ${image.id}`} className="w-full h-auto object-cover" loading="lazy" />
                              {image.comment && <p className="px-3 py-2 text-xs text-muted-foreground border-t border-border/60">{image.comment}</p>}
                            </div>
                          );
                        })}
                      </div>
                    ) : null}

                    {/* Answer choices — no correct/wrong styling, just selected highlight */}
                    <div className="space-y-3">
                      {currentQuestion.choices.length ? (
                        currentQuestion.choices.map((choice) => {
                          const isSelected = selectedAnswerId === choice.id;
                          return (
                            <Button
                              key={choice.id}
                              variant="outline"
                              onClick={() => handleAnswerSelect(choice.id)}
                              className={cn(
                                "w-full justify-start text-left whitespace-normal transition-all",
                                isSelected
                                  ? "border-primary bg-primary/8 dark:bg-primary/15 ring-1 ring-primary text-foreground"
                                  : "hover:border-primary/50 hover:bg-muted/60"
                              )}
                            >
                              <span className={cn(
                                "shrink-0 mr-3 w-4 h-4 rounded-full border-2 flex items-center justify-center",
                                isSelected ? "border-primary bg-primary" : "border-muted-foreground/40"
                              )}>
                                {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                              </span>
                              <HtmlContent content={choice.text} className="text-base" />
                            </Button>
                          );
                        })
                      ) : (
                        <Alert>
                          <AlertTitle>No answers found</AlertTitle>
                          <AlertDescription>This question has no answer options yet.</AlertDescription>
                        </Alert>
                      )}
                    </div>

                    {/* Submit confirmation banner */}
                    {submitConfirmPending && (
                      <Alert className="border-orange-300 bg-orange-50 dark:bg-orange-500/10 dark:border-orange-500/40">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <AlertTitle className="text-orange-800 dark:text-orange-300">Submit quiz?</AlertTitle>
                            <AlertDescription className="text-orange-700 dark:text-orange-400 mt-1">
                              {unansweredCount > 0
                                ? `You have ${unansweredCount} unanswered question${unansweredCount > 1 ? 's' : ''}. You cannot change answers after submitting.`
                                : "You cannot change your answers after submitting."}
                            </AlertDescription>
                          </div>
                          <div className="flex gap-2 shrink-0 mt-0.5">
                            <Button size="sm" variant="outline" onClick={() => setSubmitConfirmPending(false)}>Cancel</Button>
                            <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white border-0" onClick={handleSubmitQuiz}>
                              Confirm Submit
                            </Button>
                          </div>
                        </div>
                      </Alert>
                    )}

                    {/* Navigation + submit footer */}
                    <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border/40">
                      {/* Navigation */}
                      <Button variant="outline" disabled={currentIndex === 0} onClick={handlePrevQuestion}>
                        <ChevronLeft className="mr-2 h-4 w-4" /> Previous
                      </Button>
                      <Button variant="outline" disabled={isLastQuestion} onClick={handleNextQuestion}>
                        Next <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>

                      <div className="flex-1" />

                      {/* Submit & exit */}
                      <Button
                        variant="outline"
                        className="border-orange-400 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/60"
                        onClick={() => { setSubmitConfirmPending(true); setShowBookmarkPanel(false); }}
                      >
                        <Sparkles className="mr-2 h-4 w-4" /> Submit Quiz
                      </Button>
                      <Button variant="outline" onClick={() => { resetSessionState(); setView('decks'); }}>
                        Exit
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            )}
          </div>
        )}
      </div>

      {/* ── Floating Bookmarks Panel ── */}
      {isInActiveQuiz && flaggedQuestions.size > 0 && (
        <div ref={bookmarkPanelRef} className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
          {showBookmarkPanel && (
            <div className="w-72 rounded-xl border bg-background shadow-2xl overflow-hidden animate-in slide-in-from-bottom-2 duration-200">
              <div className="flex items-center justify-between px-4 py-3 border-b bg-amber-50 dark:bg-amber-500/10">
                <div className="flex items-center gap-2">
                  <BookmarkCheck className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">Bookmarks ({flaggedQuestions.size})</span>
                </div>
                <button onClick={() => setShowBookmarkPanel(false)} className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Close bookmarks panel">
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
                    <button
                      key={idx}
                      onClick={() => handleJumpToBookmark(idx)}
                      className={cn(
                        "w-full text-left px-4 py-3 flex items-start gap-3 transition-colors hover:bg-muted/60",
                        isCurrent && "bg-amber-50 dark:bg-amber-500/10"
                      )}
                    >
                      <Badge
                        variant={isCurrent ? "default" : "outline"}
                        className={cn("shrink-0 mt-0.5 text-xs", isCurrent && "bg-amber-500 border-amber-500 text-white")}
                      >
                        Q{idx + 1}
                      </Badge>
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-snug flex-1">
                        {stripHtml(q.prompt ?? '') || '(No prompt)'}
                      </p>
                      {isAnswered && <span className="shrink-0 w-2 h-2 rounded-full bg-primary mt-1" title="Answered" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <Button
            onClick={() => setShowBookmarkPanel(prev => !prev)}
            className="gap-2 shadow-lg bg-amber-500 hover:bg-amber-600 text-white"
          >
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
