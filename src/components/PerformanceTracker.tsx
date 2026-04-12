import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Award, BarChart2, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface SubjectAttempt {
  score: number;          // 0–100
  completed_at: string;   // ISO timestamp
  deck_name: string;
}

interface PerformanceTrackerProps {
  category: string;
  currentScore: number;   // 0–100
  history: SubjectAttempt[]; // past attempts for this subject (newest first), NOT including current
}

function fmt(dt: string) {
  const d = new Date(dt);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

export default function PerformanceTracker({ category, currentScore, history }: PerformanceTrackerProps) {
  // Build chronological list: oldest → newest → current
  const past = [...history].reverse(); // history is newest-first, reverse to chronological
  const allAttempts: SubjectAttempt[] = [
    ...past,
    { score: currentScore, completed_at: new Date().toISOString(), deck_name: "This attempt" },
  ];

  const previousScore = past.length > 0 ? past[past.length - 1].score : null;
  const diff = previousScore !== null ? +(currentScore - previousScore).toFixed(1) : null;

  const best = Math.max(...allAttempts.map((a) => a.score));
  const avg = +(allAttempts.reduce((s, a) => s + a.score, 0) / allAttempts.length).toFixed(1);

  // Chart data (up to last 6 attempts + current)
  const chartData = allAttempts.slice(-7).map((a, i, arr) => ({
    label: i === arr.length - 1 ? "Now" : fmt(a.completed_at),
    score: +a.score.toFixed(1),
    isCurrent: i === arr.length - 1,
  }));

  const isFirst = previousScore === null;

  let trendBadge: { label: string; icon: React.ElementType; className: string } | null = null;
  if (!isFirst && diff !== null) {
    if (diff > 0) {
      trendBadge = {
        label: `+${diff}% from last`,
        icon: TrendingUp,
        className: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300 border-green-300 dark:border-green-500/40",
      };
    } else if (diff < 0) {
      trendBadge = {
        label: `${diff}% from last`,
        icon: TrendingDown,
        className: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300 border-red-300 dark:border-red-500/40",
      };
    } else {
      trendBadge = {
        label: "Same as last",
        icon: Minus,
        className: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 border-blue-300 dark:border-blue-500/40",
      };
    }
  }

  return (
    <Card className="shadow-elegant border-primary/20">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <BarChart2 className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg">Performance Tracker</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{category}</p>
          </div>
          {trendBadge && (
            <Badge variant="outline" className={`flex items-center gap-1.5 shrink-0 ${trendBadge.className}`}>
              <trendBadge.icon className="w-3.5 h-3.5" />
              {trendBadge.label}
            </Badge>
          )}
          {isFirst && (
            <Badge variant="outline" className="shrink-0 bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300 border-purple-300 dark:border-purple-500/40">
              First Attempt
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Stat row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">This Attempt</p>
            <p className="text-xl font-bold text-primary">{currentScore.toFixed(1)}%</p>
          </div>
          <div className="rounded-xl border p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Best Score</p>
            <p className="text-xl font-bold text-green-600 dark:text-green-400 flex items-center justify-center gap-1">
              <Award className="w-4 h-4" />
              {best.toFixed(1)}%
            </p>
          </div>
          <div className="rounded-xl border p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Average</p>
            <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{avg}%</p>
          </div>
        </div>

        {/* Chart */}
        {allAttempts.length > 1 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
              Score History — {category}
            </p>
            <div className="h-36">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barCategoryGap="30%">
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "currentColor" }}
                    axisLine={false}
                    tickLine={false}
                    className="text-muted-foreground"
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 11, fill: "currentColor" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${v}%`}
                    className="text-muted-foreground"
                    width={36}
                  />
                  <Tooltip
                    formatter={(val: number) => [`${val}%`, "Score"]}
                    contentStyle={{
                      borderRadius: "8px",
                      fontSize: "12px",
                      border: "1px solid hsl(var(--border))",
                      background: "hsl(var(--background))",
                      color: "hsl(var(--foreground))",
                    }}
                    cursor={{ fill: "hsl(var(--muted)/0.4)" }}
                  />
                  <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, idx) => (
                      <Cell
                        key={idx}
                        fill={entry.isCurrent ? "hsl(var(--primary))" : "hsl(var(--primary)/0.35)"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-1">
              Showing last {chartData.length} attempt{chartData.length !== 1 ? "s" : ""} • Highlighted bar = this attempt
            </p>
          </div>
        )}

        {/* First attempt prompt */}
        {isFirst && (
          <div className="rounded-xl bg-muted/40 border p-4 text-center">
            <p className="text-sm text-muted-foreground">
              Complete more quizzes in <span className="font-semibold text-foreground">{category}</span> to see your progress trend here.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
