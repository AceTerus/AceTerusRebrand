import { AlertTriangle, CheckCircle2, Lightbulb, Loader2, Sparkles, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface PerformanceAnalysis {
  overall_trend: "improving" | "declining" | "stable" | "first_attempt";
  performance_summary: string;
  weak_areas: string[];
  strong_areas: string[];
  improvement_tips: string[];
  comparison_note: string;
}

interface QuizAnalysisProps {
  analysis: PerformanceAnalysis | null;
  loading: boolean;
  error: string | null;
}

const trendConfig = {
  improving: {
    icon: TrendingUp,
    label: "Improving",
    className: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300 border-green-300 dark:border-green-500/40",
    iconClass: "text-green-600 dark:text-green-400",
  },
  declining: {
    icon: TrendingDown,
    label: "Needs Attention",
    className: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300 border-red-300 dark:border-red-500/40",
    iconClass: "text-red-500",
  },
  stable: {
    icon: Minus,
    label: "Stable",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 border-blue-300 dark:border-blue-500/40",
    iconClass: "text-blue-500",
  },
  first_attempt: {
    icon: Sparkles,
    label: "First Attempt",
    className: "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300 border-purple-300 dark:border-purple-500/40",
    iconClass: "text-purple-500",
  },
};

export default function QuizAnalysis({ analysis, loading, error }: QuizAnalysisProps) {
  if (loading) {
    return (
      <Card className="shadow-elegant border-primary/20">
        <CardContent className="py-8 flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
          <p className="font-semibold text-primary">Analysing your performance...</p>
          <p className="text-sm text-muted-foreground">Gemini AI is reviewing your answers and past quizzes</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="shadow-elegant border-orange-300 dark:border-orange-500/40">
        <CardContent className="py-6 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-orange-700 dark:text-orange-400">Analysis unavailable</p>
            <p className="text-sm text-muted-foreground mt-1">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analysis) return null;

  const trend = trendConfig[analysis.overall_trend];
  const TrendIcon = trend.icon;

  return (
    <Card className="shadow-elegant border-primary/20">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg">AI Performance Analysis</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Powered by Gemini AI</p>
          </div>
          <Badge variant="outline" className={`flex items-center gap-1.5 ${trend.className}`}>
            <TrendIcon className={`w-3.5 h-3.5 ${trend.iconClass}`} />
            {trend.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Summary */}
        <div className="rounded-xl bg-muted/40 border p-4">
          <p className="text-sm leading-relaxed">{analysis.performance_summary}</p>
          {analysis.comparison_note && (
            <p className="text-xs text-muted-foreground mt-2 italic">{analysis.comparison_note}</p>
          )}
        </div>

        {/* Strong and weak areas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {analysis.strong_areas.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                <p className="text-sm font-semibold text-green-700 dark:text-green-400">Strong Areas</p>
              </div>
              <ul className="space-y-1.5">
                {analysis.strong_areas.map((area, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-green-500 mt-2" />
                    <span>{area}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {analysis.weak_areas.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-500" />
                <p className="text-sm font-semibold text-orange-600 dark:text-orange-400">Areas to Improve</p>
              </div>
              <ul className="space-y-1.5">
                {analysis.weak_areas.map((area, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-orange-400 mt-2" />
                    <span>{area}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Tips */}
        {analysis.improvement_tips.length > 0 && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-primary" />
              <p className="text-sm font-semibold text-primary">Tips to Improve</p>
            </div>
            <ul className="space-y-2">
              {analysis.improvement_tips.map((tip, i) => (
                <li key={i} className="flex items-start gap-3 text-sm">
                  <span className="shrink-0 w-5 h-5 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  <span className="text-muted-foreground leading-relaxed">{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
