import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Flame,
  GraduationCap,
  Layers,
  Loader2,
  Sparkles,
  Target,
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

const placeholderHighlights = [
  {
    title: "Personalised Practice",
    description: "Build quizzes from your saved study materials and focus on weak topics.",
    icon: Target,
  },
  {
    title: "Live Performance Insights",
    description: "Track accuracy, speed, and readiness across upcoming exam seasons.",
    icon: Clock,
  },
  {
    title: "Community Challenges",
    description: "Compete with friends and unlock streak rewards for consistent study.",
    icon: Flame,
  },
];

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

const Quiz = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { streak } = useStreak();
  const navigate = useNavigate();
  const [decks, setDecks] = useState<OpenMcDeckSummary[]>([]);
  const [loadingDecks, setLoadingDecks] = useState(false);
  const [deckError, setDeckError] = useState<string | null>(null);
  const [activeDeck, setActiveDeck] = useState<OpenMcDeckSummary | null>(null);
  const [quizPayload, setQuizPayload] = useState<OpenMcQuizPayload | null>(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizError, setQuizError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswerId, setSelectedAnswerId] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [sessionComplete, setSessionComplete] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    setLoadingDecks(true);
    setDeckError(null);

    fetchOpenMcDeckSummaries()
      .then((payload) => {
        if (!cancelled) {
          setDecks(payload ?? []);
        }
      })
      .catch((error) => {
        if (cancelled) return;
        const message =
          error instanceof OpenMcClientError ? error.message : "Failed to sync decks from OpenMultipleChoice.";
        setDeckError(message);
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingDecks(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  const deckCount = decks.length;
  const totalQuestions = useMemo(
    () => decks.reduce((acc, deck) => acc + (deck.questionCount ?? 0), 0),
    [decks]
  );
  const moduleCount = useMemo(() => {
    const modules = new Set(
      decks.map((deck) => deck.subjectName ?? deck.moduleName ?? deck.name).filter(Boolean) as string[]
    );
    return modules.size;
  }, [decks]);

  const stats = [
    {
      icon: Flame,
      value: streak.toString(),
      label: "day streak",
      color: "text-orange-500 dark:text-orange-300",
      bgColor: "bg-orange-50 dark:bg-orange-400/15",
    },
    {
      icon: BookOpen,
      value: loadingDecks ? "..." : deckCount.toString(),
      label: "quizzes online",
      color: "text-red-500 dark:text-red-300",
      bgColor: "bg-red-50 dark:bg-red-400/15",
    },
    {
      icon: Target,
      value: loadingDecks ? "..." : totalQuestions.toString(),
      label: "questions ready",
      color: "text-green-500 dark:text-green-300",
      bgColor: "bg-green-50 dark:bg-green-400/15",
    },
    {
      icon: GraduationCap,
      value: loadingDecks ? "..." : moduleCount.toString(),
      label: "modules covered",
      color: "text-purple-500 dark:text-purple-300",
      bgColor: "bg-purple-50 dark:bg-purple-400/15",
    },
  ];

  const questions: OpenMcQuizQuestion[] = quizPayload?.questions ?? [];
  const currentQuestion = questions[currentIndex];
  const progressPercent = questions.length
    ? ((currentIndex + (showFeedback || sessionComplete ? 1 : 0)) / questions.length) * 100
    : 0;
  const accuracy = questions.length ? Math.round((correctCount / questions.length) * 100) : 0;
  const isLastQuestion = currentIndex >= questions.length - 1;
  const selectedIsCorrect = currentQuestion
    ? selectedAnswerId === currentQuestion.correctAnswerId
    : false;

  const resetSessionState = () => {
    setCurrentIndex(0);
    setSelectedAnswerId(null);
    setShowFeedback(false);
    setCorrectCount(0);
    setSessionComplete(false);
  };

  const handleStartQuiz = async (deck: OpenMcDeckSummary) => {
    setActiveDeck(deck);
    setQuizLoading(true);
    setQuizError(null);

    try {
      const payload = await fetchOpenMcQuiz({ deckId: deck.id, shuffle: true });
      setQuizPayload(payload);
      resetSessionState();
    } catch (error) {
      const message = error instanceof OpenMcClientError ? error.message : "Failed to load the quiz deck.";
      setQuizError(message);
    } finally {
      setQuizLoading(false);
    }
  };

  const handleAnswerSelect = (answerId: number) => {
    if (!currentQuestion || showFeedback) return;

    setSelectedAnswerId(answerId);
    if (answerId === currentQuestion.correctAnswerId) {
      setCorrectCount((prev) => prev + 1);
    }
    setShowFeedback(true);
  };

  const handleNextQuestion = () => {
    if (!showFeedback) return;

    if (isLastQuestion) {
      setSessionComplete(true);
      setShowFeedback(false);
      return;
    }

    setCurrentIndex((prev) => prev + 1);
    setSelectedAnswerId(null);
    setShowFeedback(false);
  };

  const handleRestartSession = () => {
    resetSessionState();
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy':
        return 'text-green-600 dark:text-green-300 bg-green-50 dark:bg-green-500/15 border-green-200 dark:border-green-500/40';
      case 'Medium':
        return 'text-yellow-600 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-500/15 border-yellow-200 dark:border-yellow-500/40';
      case 'Hard':
        return 'text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-500/15 border-red-200 dark:border-red-500/40';
      default:
        return 'text-foreground bg-muted/40 dark:bg-muted/20 border-border';
    }
  };

  return (
    <div className="min-h-screen pb-12 bg-gradient-to-br from-background via-muted/20 to-background">
      <Navbar />
      <div className="container mx-auto px-4 max-w-6xl pt-24">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <img src={Logo} alt="AceTerus Logo" className="w-16 h-16" />
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              AceTerus
            </h1>
          </div>
          <p className="text-muted-foreground">
            Practice with authentic exam papers and track your progress
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} className="shadow-elegant hover:shadow-glow transition-shadow">
                <CardContent className="p-4 text-center">
                  <div className={`w-12 h-12 ${stat.bgColor} rounded-lg flex items-center justify-center mx-auto mb-3`}>
                    <Icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                  <div className="text-2xl font-bold text-primary mb-1">
                    {stat.value}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {stat.label}
                  </div>
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

        <div className="mb-10">
          <Card className="shadow-elegant mb-6">
            <CardHeader>
              <CardTitle className="text-2xl">Available quizzes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <p>
                Choose any public deck from the OpenMultipleChoice library. We secure the request via Supabase auth,
                normalize the questions, and keep the experience native to AceTerus.
              </p>
              <div className="text-sm text-muted-foreground">
                {loadingDecks
                  ? "Syncing decks..."
                  : `Loaded ${deckCount} deck${deckCount === 1 ? "" : "s"} with ${totalQuestions} questions.`}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {loadingDecks &&
              Array.from({ length: 6 }).map((_, index) => (
                <Card key={`skeleton-${index}`} className="shadow-elegant">
                  <CardHeader>
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/3" />
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                    <div className="flex gap-3">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-4 w-1/3" />
                    </div>
                    <Skeleton className="h-10 w-full" />
                  </CardContent>
                </Card>
              ))}

            {!loadingDecks &&
              decks.map((deck) => (
                <Card key={deck.id} className="shadow-elegant hover:shadow-glow transition-shadow flex flex-col">
                  <CardHeader className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-xl">{deck.name}</CardTitle>
                      {deck.access && (
                        <Badge variant="outline" className="text-xs">
                          {deck.access}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap text-sm text-muted-foreground">
                      {deck.subjectName && <Badge variant="secondary">{deck.subjectName}</Badge>}
                      {deck.moduleName && <span>{deck.moduleName}</span>}
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col space-y-4">
                    <p className="text-sm text-muted-foreground">
                      {deck.description ?? "This deck does not include a description yet."}
                    </p>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-primary" />
                        {deck.questionCount.toLocaleString()} questions
                      </span>
                      <span className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-primary" />
                        {deck.examAt ? new Date(deck.examAt).toLocaleDateString() : "Flexible exam date"}
                      </span>
                    </div>
                    <Button
                      className="w-full bg-gradient-primary shadow-glow"
                      disabled={quizLoading && activeDeck?.id === deck.id}
                      onClick={() => handleStartQuiz(deck)}
                    >
                      {quizLoading && activeDeck?.id === deck.id ? (
                        <>
                          Preparing... <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                        </>
                      ) : (
                        "Start"
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ))}
          </div>

          {!loadingDecks && !deckError && decks.length === 0 && (
            <Card className="shadow-elegant mt-6">
              <CardContent className="py-6 text-center text-muted-foreground">
                No public decks are available yet. Publish one from the OpenMultipleChoice admin panel to see it here.
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6 mb-10">
          <Card className="shadow-elegant">
            <CardHeader className="space-y-3">
              <CardTitle className="text-2xl">Live practice</CardTitle>
              <p className="text-muted-foreground text-sm">
                Select any deck above to load its questions instantly. Your Supabase session authorizes the Edge
                Function so only authenticated AceTerus learners can access the quiz data.
              </p>
              {activeDeck && (
                <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                  <Badge variant="secondary">{activeDeck.subjectName ?? "General"}</Badge>
                  {activeDeck.moduleName && <Badge variant="outline">{activeDeck.moduleName}</Badge>}
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Layers className="h-3.5 w-3.5" />
                    {activeDeck.questionCount} questions
                  </Badge>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {quizError && (
                <Alert variant="destructive" className="mb-6">
                  <AlertTitle>Unable to load quiz</AlertTitle>
                  <AlertDescription>{quizError}</AlertDescription>
                </Alert>
              )}

              {quizLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-6 w-1/3" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-48 w-full" />
                </div>
              ) : !quizPayload || !questions.length ? (
                <div className="py-6 text-center text-muted-foreground">
                  {activeDeck
                    ? "This deck does not contain any questions yet."
                    : "Choose a deck above to begin practising immediately."}
                </div>
              ) : sessionComplete ? (
                <div className="space-y-6">
                  <div className="rounded-xl border p-6 text-center">
                    <p className="text-sm uppercase tracking-wider text-muted-foreground mb-2">Session complete</p>
                    <h3 className="text-3xl font-bold text-primary">{activeDeck?.name}</h3>
                    <p className="text-muted-foreground mt-2">Great job! Review your results below or restart the deck.</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="rounded-xl border p-4 text-center">
                      <p className="text-sm text-muted-foreground">Accuracy</p>
                      <p className="text-3xl font-bold text-primary">{accuracy}%</p>
                    </div>
                    <div className="rounded-xl border p-4 text-center">
                      <p className="text-sm text-muted-foreground">Correct answers</p>
                      <p className="text-3xl font-bold text-primary">{correctCount}</p>
                    </div>
                    <div className="rounded-xl border p-4 text-center">
                      <p className="text-sm text-muted-foreground">Questions</p>
                      <p className="text-3xl font-bold text-primary">{questions.length}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button className="bg-gradient-primary shadow-glow" onClick={handleRestartSession}>
                      Retake deck
                    </Button>
                    <Button variant="outline" disabled={!activeDeck} onClick={() => activeDeck && handleStartQuiz(activeDeck)}>
                      Load fresh order
                    </Button>
                  </div>
                </div>
              ) : (
                currentQuestion && (
                  <div className="space-y-6">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <p className="text-sm uppercase tracking-wide text-muted-foreground">
                          Question {currentIndex + 1} of {questions.length}
                        </p>
                        <CardTitle className="text-2xl">Practice mode</CardTitle>
                      </div>
                      <Progress value={progressPercent} className="h-2 w-full sm:w-60" />
                    </div>
                    <HtmlContent content={currentQuestion.prompt} className="text-lg" />

                    {currentQuestion.images?.length && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {currentQuestion.images.map((image) => {
                          const url = buildOpenMcImageUrl(image.path ?? undefined, image.url ?? undefined);
                          if (!url) return null;

                          return (
                            <div key={image.id} className="rounded-xl overflow-hidden border bg-muted/30">
                              <img
                                src={url}
                                alt={image.comment ?? `Question image ${image.id}`}
                                className="w-full h-auto object-cover"
                                loading="lazy"
                              />
                              {image.comment && (
                                <p className="px-3 py-2 text-xs text-muted-foreground border-t border-border/60">
                                  {image.comment}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="space-y-3">
                      {currentQuestion.choices.length ? (
                        currentQuestion.choices.map((choice) => (
                          <Button
                            key={choice.id}
                            variant="outline"
                            disabled={showFeedback}
                            onClick={() => handleAnswerSelect(choice.id)}
                            className={cn(
                              "w-full justify-start text-left whitespace-normal",
                              showFeedback &&
                                choice.id === currentQuestion.correctAnswerId &&
                                "border-green-500 bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-200",
                              showFeedback &&
                                selectedAnswerId === choice.id &&
                                choice.id !== currentQuestion.correctAnswerId &&
                                "border-red-500 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-200"
                            )}
                          >
                            <HtmlContent content={choice.text} className="text-base" />
                          </Button>
                        ))
                      ) : (
                        <Alert>
                          <AlertTitle>No answers found</AlertTitle>
                          <AlertDescription>This question has no answer options yet.</AlertDescription>
                        </Alert>
                      )}
                    </div>

                    {showFeedback && (
                      <Alert variant={selectedIsCorrect ? "default" : "destructive"}>
                        <div className="flex items-start gap-3">
                          {selectedIsCorrect ? (
                            <CheckCircle2 className="w-5 h-5 text-green-500 mt-1" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-500 mt-1" />
                          )}
                          <div>
                            <AlertTitle>{selectedIsCorrect ? "Correct!" : "Not quite"}</AlertTitle>
                            <AlertDescription>
                              {selectedIsCorrect
                                ? "Great work — keep the streak going."
                                : "Review the explanation below and try again next round."}
                            </AlertDescription>
                          </div>
                        </div>
                      </Alert>
                    )}

                    {currentQuestion.explanation && (
                      <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-2">
                        <p className="text-sm font-semibold text-primary">Explanation</p>
                        <HtmlContent content={currentQuestion.explanation} className="text-sm" />
                      </div>
                    )}

                    <div className="flex flex-wrap gap-3">
                      <Button
                        className="bg-gradient-primary shadow-glow"
                        disabled={!showFeedback}
                        onClick={handleNextQuestion}
                      >
                        {isLastQuestion ? (
                          <>
                            Finish quiz <Sparkles className="ml-2 h-4 w-4" />
                          </>
                        ) : (
                          <>
                            Next question <ChevronRight className="ml-2 h-4 w-4" />
                          </>
                        )}
                      </Button>
                      <Button variant="outline" onClick={handleRestartSession}>
                        Restart deck
                      </Button>
                    </div>
                  </div>
                )
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {placeholderHighlights.map((highlight) => {
            const Icon = highlight.icon;
            return (
              <Card key={highlight.title} className="shadow-elegant hover:shadow-glow transition-shadow">
                <CardHeader className="flex flex-row items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{highlight.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground">
                  {highlight.description}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle className="text-xl">What to expect next</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <Badge className={getDifficultyColor("Medium")}>Roadmap</Badge>
              <div>
                <p className="font-semibold mb-1">Native AceTerus quizzes</p>
                <p className="text-muted-foreground">
                  Structured around Malaysian syllabi and synced with your Supabase profile for instant progress sync.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Badge variant="outline">Community</Badge>
              <div>
                <p className="font-semibold mb-1">Deck collaborations</p>
                <p className="text-muted-foreground">
                  Build and share question banks with teammates while keeping everything moderated inside AceTerus.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Quiz;