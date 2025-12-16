import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Clock, Flame, GraduationCap, Layers, Target, BookOpen } from "lucide-react";
import Navbar from "@/components/Navbar";
import Logo from "@/assets/logo.png";
import { useAuth } from "@/hooks/useAuth";
import { useStreak } from "@/hooks/useStreak";
import { fetchOpenMcDecks, isOpenMcConfigured, OpenMcClientError } from "@/lib/openmc-client";
import type { OpenMcDeck } from "@/types/openmc";

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

const Quiz = () => {
  const { user } = useAuth();
  const { streak } = useStreak();
  const navigate = useNavigate();
  const openMcReady = isOpenMcConfigured();
  const [decks, setDecks] = useState<OpenMcDeck[]>([]);
  const [loadingDecks, setLoadingDecks] = useState(openMcReady);
  const [deckError, setDeckError] = useState<string | null>(null);

  useEffect(() => {
    if (!openMcReady) {
      setLoadingDecks(false);
      return;
    }

    const controller = new AbortController();
    setLoadingDecks(true);
    setDeckError(null);

    fetchOpenMcDecks(undefined, controller.signal)
      .then((payload) => setDecks(payload ?? []))
      .catch((error) => {
        if (error.name === "AbortError") return;
        const message = error instanceof OpenMcClientError ? error.message : "Failed to load quizzes.";
        setDeckError(message);
      })
      .finally(() => setLoadingDecks(false));

    return () => controller.abort();
  }, [openMcReady]);

  const deckCount = decks.length;
  const totalQuestions = useMemo(
    () => decks.reduce((acc, deck) => acc + (deck.questions?.length ?? 0), 0),
    [decks]
  );
  const moduleCount = useMemo(() => {
    const modules = new Set(
      decks
        .map((deck) => deck.module?.name ?? deck.module?.subject?.name ?? null)
        .filter(Boolean) as string[]
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
    <div className="min-h-screen pb-8 bg-gradient-to-br from-background via-muted/20 to-background">
      {!user && <Navbar />}
      <div className={`container mx-auto px-4 max-w-6xl ${!user ? 'pt-20' : ''}`}>
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

        {(!openMcReady || deckError) && (
          <Alert variant={openMcReady ? "destructive" : "default"} className="mb-8">
            <AlertTitle>{openMcReady ? "Unable to reach OpenMultipleChoice" : "Quiz service offline"}</AlertTitle>
            <AlertDescription>
              {openMcReady
                ? deckError
                : "Set VITE_OPENMC_API_URL (and optional VITE_OPENMC_API_TOKEN) to load quizzes from OpenMultipleChoice."}
            </AlertDescription>
          </Alert>
        )}

        <div className="mb-10">
          <Card className="shadow-elegant mb-6">
            <CardHeader>
              <CardTitle className="text-2xl">Available quizzes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <p>
                Choose any public deck from the OpenMultipleChoice library. We will fetch the latest questions, answers,
                and media directly from the Laravel backend before each session.
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
                      {deck.module?.subject?.name && <Badge variant="secondary">{deck.module.subject.name}</Badge>}
                      {deck.module?.name && <span>{deck.module.name}</span>}
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col space-y-4">
                    <p className="text-sm text-muted-foreground">
                      {deck.description ?? "This deck does not include a description yet."}
                    </p>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-primary" />
                        {(deck.questions?.length ?? 0).toLocaleString()} questions
                      </span>
                      <span className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-primary" />
                        {deck.exam_at ? new Date(deck.exam_at).toLocaleDateString() : "Flexible exam date"}
                      </span>
                    </div>
                    <Button
                      className="w-full bg-gradient-primary shadow-glow"
                      onClick={() => navigate(`/quiz/${deck.id}`)}
                    >
                      Start
                    </Button>
                  </CardContent>
                </Card>
              ))}
          </div>

          {!loadingDecks && openMcReady && !deckError && decks.length === 0 && (
            <Card className="shadow-elegant mt-6">
              <CardContent className="py-6 text-center text-muted-foreground">
                No public decks are available yet. Publish one from the OpenMultipleChoice admin panel to see it here.
              </CardContent>
            </Card>
          )}
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