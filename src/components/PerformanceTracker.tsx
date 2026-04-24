import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Award, BarChart2, TrendingDown, TrendingUp, Minus, Sparkles } from "lucide-react";

export interface SubjectAttempt {
  score: number;
  completed_at: string;
  deck_name: string;
}

interface PerformanceTrackerProps {
  category: string;
  currentScore: number;
  history: SubjectAttempt[];
}

const C = {
  cyan: "#3BD6F5", blue: "#2F7CFF", indigo: "#2E2BE5",
  ink: "#0F172A", skySoft: "#DDF3FF", indigoSoft: "#D6D4FF",
  pop: "#FF7A59", sun: "#FFD65C", mintSoft: "#D1FAE5",
};

const CARD    = "border-[3px] border-[#0F172A] rounded-[24px] shadow-[4px_4px_0_0_#0F172A] bg-white overflow-hidden";
const DISPLAY = "font-['Baloo_2'] tracking-tight";
const TAG     = "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border-[2.5px] border-[#0F172A] font-extrabold text-xs";

function fmt(dt: string) {
  const d = new Date(dt);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

export default function PerformanceTracker({ category, currentScore, history }: PerformanceTrackerProps) {
  const past = [...history].reverse();
  const allAttempts: SubjectAttempt[] = [
    ...past,
    { score: currentScore, completed_at: new Date().toISOString(), deck_name: "This attempt" },
  ];

  const previousScore = past.length > 0 ? past[past.length - 1].score : null;
  const diff = previousScore !== null ? +(currentScore - previousScore).toFixed(1) : null;
  const best = Math.max(...allAttempts.map((a) => a.score));
  const avg  = +(allAttempts.reduce((s, a) => s + a.score, 0) / allAttempts.length).toFixed(1);
  const isFirst = previousScore === null;

  const chartData = allAttempts.slice(-7).map((a, i, arr) => ({
    label: i === arr.length - 1 ? "Now" : fmt(a.completed_at),
    score: +a.score.toFixed(1),
    isCurrent: i === arr.length - 1,
  }));

  let trendTag: { label: string; icon: React.ElementType; bg: string; color: string } | null = null;
  if (!isFirst && diff !== null) {
    if (diff > 0)
      trendTag = { label: `+${diff}% from last`, icon: TrendingUp,   bg: C.mintSoft,   color: "#15803d" };
    else if (diff < 0)
      trendTag = { label: `${diff}% from last`,  icon: TrendingDown, bg: "#FFE4E6",    color: C.pop };
    else
      trendTag = { label: "Same as last",         icon: Minus,        bg: C.skySoft,    color: C.blue };
  }

  return (
    <div className={CARD}>
      {/* Header bar */}
      <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${C.blue}, ${C.cyan})` }} />

      <div className="p-5 space-y-4">
        {/* Title row */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[12px] border-[2.5px] border-[#0F172A] shadow-[2px_2px_0_0_#0F172A] flex items-center justify-center shrink-0" style={{ background: C.skySoft }}>
            <BarChart2 className="w-5 h-5" style={{ color: C.blue }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`${DISPLAY} font-extrabold text-lg leading-tight`}>Performance Tracker</p>
            <p className="text-xs font-semibold text-slate-400 truncate">{category}</p>
          </div>
          {trendTag ? (
            <span className={`${TAG} shrink-0`} style={{ background: trendTag.bg, color: trendTag.color }}>
              <trendTag.icon className="w-3.5 h-3.5" />
              {trendTag.label}
            </span>
          ) : isFirst ? (
            <span className={`${TAG} shrink-0`} style={{ background: C.indigoSoft, color: C.indigo }}>
              <Sparkles className="w-3.5 h-3.5" /> First Attempt
            </span>
          ) : null}
        </div>

        {/* Trend message */}
        {diff !== null && diff !== 0 && (
          <div className="rounded-[16px] border-[2px] border-[#0F172A]/10 p-4 flex items-center gap-3"
            style={{ background: diff > 0 ? C.mintSoft : "#FFE4E6" }}>
            {diff > 0
              ? <TrendingUp  className="w-5 h-5 text-emerald-600 shrink-0" />
              : <TrendingDown className="w-5 h-5 shrink-0" style={{ color: C.pop }} />}
            <p className={`text-sm font-bold ${diff > 0 ? "text-emerald-700" : ""}`} style={diff < 0 ? { color: C.pop } : {}}>
              {diff > 0
                ? `You improved ${diff}% from your last attempt! 🎉`
                : `You dropped ${Math.abs(diff)}% from your last attempt.`}
            </p>
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "This Attempt", value: `${currentScore.toFixed(1)}%`, bg: C.indigoSoft, color: C.indigo, icon: null },
            { label: "Best Score",   value: `${best.toFixed(1)}%`,         bg: C.mintSoft,   color: "#15803d", icon: <Award className="w-3.5 h-3.5" /> },
            { label: "Average",      value: `${avg}%`,                     bg: C.skySoft,    color: C.blue,   icon: null },
          ].map(({ label, value, bg, color, icon }) => (
            <div key={label} className="rounded-[16px] border-[2px] border-[#0F172A]/10 p-3 text-center" style={{ background: bg }}>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">{label}</p>
              <p className={`${DISPLAY} font-extrabold text-lg flex items-center justify-center gap-1`} style={{ color }}>
                {icon}{value}
              </p>
            </div>
          ))}
        </div>

        {/* Chart */}
        {allAttempts.length > 1 && (
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">
              Score History — {category}
            </p>
            <div className="h-36">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barCategoryGap="30%">
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "#64748b", fontFamily: "Nunito" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 11, fill: "#64748b", fontFamily: "Nunito" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${v}%`}
                    width={36}
                  />
                  <Tooltip
                    formatter={(val: number) => [`${val}%`, "Score"]}
                    contentStyle={{
                      borderRadius: "14px",
                      fontSize: "12px",
                      border: `2.5px solid ${C.ink}`,
                      background: "#fff",
                      color: C.ink,
                      fontFamily: "Nunito",
                      fontWeight: 700,
                      boxShadow: `3px 3px 0 0 ${C.ink}`,
                    }}
                    cursor={{ fill: "#f1f5f9" }}
                  />
                  <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                    {chartData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.isCurrent ? C.blue : C.skySoft} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[10px] font-semibold text-slate-400 text-center mt-1">
              Showing last {chartData.length} attempt{chartData.length !== 1 ? "s" : ""} · Highlighted bar = this attempt
            </p>
          </div>
        )}

        {/* First attempt prompt */}
        {isFirst && (
          <div className="rounded-[16px] border-[2px] border-[#0F172A]/10 p-4 text-center" style={{ background: C.skySoft }}>
            <p className="text-sm font-semibold text-slate-500">
              Complete more quizzes in <span className={`${DISPLAY} font-extrabold text-[#0F172A]`}>{category}</span> to see your progress trend here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
