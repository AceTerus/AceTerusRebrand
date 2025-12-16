import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, ChevronLeft, ChevronRight, Clock, Layers, Sparkles, XCircle } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/hooks/useAuth";
import {
  buildOpenMcImageUrl,
  fetchOpenMcDeckWithQuestions,
  isOpenMcConfigured,
  OpenMcClientError,
} from "@/lib/openmc-client";
import type { OpenMcDeck, OpenMcQuestion } from "@/types/openmc";
import { cn } from "@/lib/utils";

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

export const QuizTaking = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const deckId = Number(quizId);
  const navigate = useNavigate();
  const { user } = useAuth();
  const openMcReady = isOpenMcConfigured();

  const [deck, setDeck] = useState<OpenMcDeck | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswerId, setSelectedAnswerId] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [sessionComplete, setSessionComplete] = useState(false);

  useEffect(() => {
    if (!openMcReady) {
      setLoading(false);
      setError("OpenMultipleChoice API is not configured. Set VITE_OPENMC_API_URL to begin.");
      return;
    }

    if (!Number.isFinite(deckId)) {
      setLoading(false);
      setError("Invalid quiz identifier.");
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetchOpenMcDeckWithQuestions(deckId, controller.signal)
      .then((data) => {
        setDeck(data);
        setCurrentIndex(0);
        setSelectedAnswerId(null);
        setShowFeedback(false);
        setCorrectCount(0);
        setSessionComplete(false);
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        const message = err instanceof OpenMcClientError ? err.message : "Failed to load the quiz.";
        setError(message);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [deckId, openMcReady]);

  const questions: OpenMcQuestion[] = useMemo(() => {
    if (!deck?.questions) return [];
    return deck.questions
      .filter((question) => !question.is_invalid)
      .sort((a, b) => a.id - b.id);
  }, [deck]);

  const currentQuestion = questions[currentIndex];
  const progressPercent = questions.length ? ((currentIndex + (showFeedback || sessionComplete ? 1 : 0)) / questions.length) * 100 : 0;
  const accuracy = questions.length ? Math.round((correctCount / questions.length) * 100) : 0;
  const isLastQuestion = currentIndex >= questions.length - 1;
  const selectedIsCorrect = currentQuestion
    ? selectedAnswerId === currentQuestion.correct_answer_id
    : false;

  const handleAnswerSelect = (answerId: number) => {
    if (!currentQuestion || showFeedback) return;

    setSelectedAnswerId(answerId);
    if (answerId === currentQuestion.correct_answer_id) {
      setCorrectCount((prev) => prev + 1);
    }
    setShowFeedback(true);
  };

  const handleNextStep = () => {
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

  const handleRestart = () => {
    setCurrentIndex(0);
    setSelectedAnswerId(null);
    setShowFeedback(false);
    setCorrectCount(0);
    setSessionComplete(false);
  };

  const handleBackToHub = () => navigate("/quiz");

  const renderImages = (question: OpenMcQuestion) => {
    if (!question.images?.length) {
      return null;
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {question.images.map((image) => {
          const url = buildOpenMcImageUrl(image.path);
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
    );
  };

  const renderQuestionCard = () => {
    if (!currentQuestion) {
      return (
        <Card className="shadow-elegant">
          <CardContent className="py-10 text-center text-muted-foreground">
            This deck does not include any valid questions yet.
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="shadow-elegant">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-wide text-muted-foreground">Question {currentIndex + 1} of {questions.length}</p>
              <CardTitle className="text-2xl">Practice mode</CardTitle>
            </div>
            {currentQuestion.type && (
              <Badge variant="outline" className="text-xs">
                {currentQuestion.type.toUpperCase()}
              </Badge>
            )}
          </div>
          <Progress value={progressPercent} className="h-2" />
        </CardHeader>
        <CardContent className="space-y-6">
          <HtmlContent content={currentQuestion.text} className="text-lg" />
          {renderImages(currentQuestion)}

          {currentQuestion.case && (
            <div className="rounded-xl border border-dashed border-muted-foreground/30 bg-muted/20 p-4 space-y-2">
              <p className="text-sm font-semibold text-primary">Case context</p>
              <HtmlContent content={currentQuestion.case.description ?? currentQuestion.case.title} className="text-sm" />
            </div>
          )}

          <div className="space-y-3">
            {currentQuestion.answers?.length ? (
              currentQuestion.answers.map((answer) => (
                <Button
                  key={answer.id}
                  variant="outline"
                  disabled={showFeedback}
                  onClick={() => handleAnswerSelect(answer.id)}
                  className={cn(
                    "w-full justify-start text-left whitespace-normal",
                    showFeedback &&
                      answer.id === currentQuestion.correct_answer_id &&
                      "border-green-500 bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-200",
                    showFeedback &&
                      selectedAnswerId === answer.id &&
                      answer.id !== currentQuestion.correct_answer_id &&
                      "border-red-500 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-200"
                  )}
                >
                  <HtmlContent content={answer.text} className="text-base" />
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

          {currentQuestion.comment && (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-2">
              <p className="text-sm font-semibold text-primary">Explanation</p>
              <HtmlContent content={currentQuestion.comment} className="text-sm" />
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <Button
              className="bg-gradient-primary shadow-glow"
              disabled={!showFeedback}
              onClick={handleNextStep}
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
            <Button variant="outline" onClick={handleRestart}>
              Restart deck
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderSummaryCard = () => (
    <Card className="shadow-elegant">
      <CardHeader>
        <CardTitle className="text-2xl">Great job!</CardTitle>
        <p className="text-muted-foreground">
          You completed {deck?.name}. Review the results below or jump back into the deck.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl border p-4 text-center">
            <p className="text-sm text-muted-foreground">Accuracy</p>
            <p className="text-3xl font-bold text-primary">{accuracy}%</p>
          </div>
          <div className="rounded-xl border p-4 text-center">
            <p className="text-sm text-muted-foreground">Correct answers</p>
            <p className="text-3xl font-bold text-primary">
              {correctCount} / {questions.length}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button className="bg-gradient-primary shadow-glow" onClick={handleRestart}>
            Retake deck
          </Button>
          <Button variant="outline" onClick={handleBackToHub}>
            Back to quiz hub
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen pb-12 bg-gradient-to-br from-background via-muted/20 to-background">
      {!user && <Navbar />}
      <div className={`container mx-auto px-4 max-w-5xl ${!user ? "pt-20" : "pt-10"}`}>
        <div className="mb-6">
          <Button variant="ghost" onClick={handleBackToHub} className="gap-2">
            <ChevronLeft className="h-4 w-4" />
            Back to quiz hub
          </Button>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-8">
            <AlertTitle>Unable to load quiz</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <Card className="shadow-elegant">
            <CardHeader>
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-40 w-full" />
            </CardContent>
          </Card>
        ) : (
          deck && (
            <div className="space-y-8">
              <Card className="shadow-elegant">
                <CardHeader className="space-y-3">
                  <CardTitle className="text-3xl">{deck.name}</CardTitle>
                  <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                    {deck.module?.subject?.name && <Badge variant="secondary">{deck.module.subject.name}</Badge>}
                    {deck.module?.name && <Badge variant="outline">{deck.module.name}</Badge>}
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Layers className="h-3.5 w-3.5" />
                      {questions.length} questions
                    </Badge>
                    {deck.exam_at && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {new Date(deck.exam_at).toLocaleDateString()}
                      </Badge>
                    )}
                  </div>
                  {deck.description && (
                    <p className="text-muted-foreground">{deck.description}</p>
                  )}
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-xl border p-4">
                    <p className="text-sm text-muted-foreground">Progress</p>
                    <p className="text-2xl font-bold text-primary">
                      {sessionComplete ? questions.length : currentIndex + 1}/{questions.length || 1}
                    </p>
                  </div>
                  <div className="rounded-xl border p-4">
                    <p className="text-sm text-muted-foreground">Correct answers</p>
                    <p className="text-2xl font-bold text-primary">{correctCount}</p>
                  </div>
                  <div className="rounded-xl border p-4">
                    <p className="text-sm text-muted-foreground">Accuracy</p>
                    <p className="text-2xl font-bold text-primary">{accuracy}%</p>
                  </div>
                </CardContent>
              </Card>

              {sessionComplete ? renderSummaryCard() : renderQuestionCard()}
            </div>
          )
        )}
      </div>
    </div>
  );
};

