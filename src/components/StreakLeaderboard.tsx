import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { fetchMutualFollowIds } from "@/hooks/useMutualFollow";

interface LeaderboardEntry {
  user_id: string;
  username: string | null;
  avatar_url: string | null;
  streak: number;
}

const TROPHY = {
  gold:   { bg: "linear-gradient(135deg,#f5c842,#c98a00)", glow: "0 0 24px rgba(220,165,0,0.45)",  icon: "🏆" },
  silver: { bg: "linear-gradient(135deg,#d0d8e0,#8a96a0)", glow: "0 0 18px rgba(160,172,180,0.35)", icon: "🏆" },
  bronze: { bg: "linear-gradient(135deg,#e0945a,#a05520)", glow: "0 0 18px rgba(190,110,60,0.35)",  icon: "🏆" },
} as const;

type TrophyKey = keyof typeof TROPHY;

// CSS variable shorthands
const C = {
  bg:         "hsl(var(--card))",
  bgMuted:    "hsl(var(--muted))",
  bgMutedHalf:"hsl(var(--muted) / 0.6)",
  border:     "hsl(var(--border))",
  fg:         "hsl(var(--foreground))",
  fgMuted:    "hsl(var(--muted-foreground))",
  primary:    "hsl(var(--primary))",
  primaryLow: "hsl(var(--primary) / 0.12)",
  primaryMid: "hsl(var(--primary) / 0.5)",
  primaryGlow:"hsl(var(--primary) / 0.25)",
};

function PodiumCard({
  entry,
  trophy,
  center,
  canClick,
  isMe,
}: {
  entry: LeaderboardEntry;
  trophy: TrophyKey;
  center: boolean;
  canClick: boolean;
  isMe: boolean;
}) {
  const t = TROPHY[trophy];
  const sz = center ? 110 : 82;

  const inner = (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
      flex: center ? "0 0 200px" : "0 0 155px",
      marginTop: center ? 0 : 40,
      cursor: canClick ? "pointer" : "default",
    }}>
      {/* Avatar */}
      <div style={{
        width: sz, height: sz, borderRadius: center ? 16 : 12, overflow: "hidden",
        border: `2px solid ${center ? C.primaryMid : C.border}`,
        boxShadow: center ? `0 0 28px ${C.primaryGlow}` : "none",
        flexShrink: 0,
      }}>
        <img
          src={entry.avatar_url || "/placeholder.svg"}
          alt={entry.username || "User"}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>

      {/* Name */}
      <div style={{ color: C.fg, fontSize: center ? 17 : 13, fontWeight: 700, textAlign: "center", lineHeight: 1.3 }}>
        {entry.username || "Anonymous"}
        {isMe && <span style={{ fontSize: 10, color: C.fgMuted, marginLeft: 5 }}>(you)</span>}
      </div>

      {/* Stats box */}
      <div style={{
        width: "100%",
        background: C.bgMuted,
        border: `1px solid ${C.border}`,
        borderRadius: 14,
        padding: center ? "18px 14px" : "12px 10px",
        display: "flex", flexDirection: "column", alignItems: "center",
        gap: center ? 8 : 6,
      }}>
        {/* Trophy badge */}
        <div style={{
          width: center ? 50 : 38, height: center ? 50 : 38, borderRadius: 12,
          background: t.bg, boxShadow: t.glow,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: center ? 24 : 18,
        }}>{t.icon}</div>

        {/* Streak */}
        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: center ? 24 : 18, fontWeight: 800, color: C.fg }}>
          🔥 {entry.streak}
        </div>
        <div style={{ color: C.fgMuted, fontSize: 11 }}>day streak</div>

        {!canClick && !isMe && (
          <div style={{ color: C.fgMuted, fontSize: 10, textAlign: "center", lineHeight: 1.4 }}>
            🔒 Follow each other<br />to view profile
          </div>
        )}
      </div>
    </div>
  );

  return canClick ? (
    <Link to={isMe ? "/profile" : `/profile/${entry.user_id}`} style={{ textDecoration: "none" }}>
      {inner}
    </Link>
  ) : (
    inner
  );
}

interface Props {
  currentUserId?: string;
  currentStreak: number;
}

export function StreakLeaderboard({ currentUserId, currentStreak }: Props) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [mutualIds, setMutualIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUserId) return;
    const load = async () => {
      const [{ data }, mutuals] = await Promise.all([
        supabase
          .from("profiles")
          .select("user_id, username, avatar_url, streak")
          .order("streak", { ascending: false })
          .limit(10),
        fetchMutualFollowIds(currentUserId),
      ]);
      setEntries(data ?? []);
      setMutualIds(new Set(mutuals));
      setLoading(false);
    };
    load();
  }, [currentUserId]);

  if (loading || entries.length === 0) return null;

  const canClick = (uid: string) => uid === currentUserId || mutualIds.has(uid);

  const [gold, silver, bronze] = entries;
  // Podium display order: silver | gold | bronze
  const podium = [silver, gold, bronze].filter(Boolean) as LeaderboardEntry[];
  const podiumTrophy = (e: LeaderboardEntry): TrophyKey => {
    if (e.user_id === gold?.user_id)   return "gold";
    if (e.user_id === silver?.user_id) return "silver";
    return "bronze";
  };

  const rest = entries.slice(3);

  return (
    <div style={{
      background: C.bg,
      border: `1px solid ${C.border}`,
      borderRadius: 16,
      overflow: "hidden",
      marginBottom: 32,
      boxShadow: "var(--shadow-elegant)",
    }}>
      {/* Header bar */}
      <div style={{
        background: "var(--gradient-primary)",
        padding: "18px 24px",
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <span style={{ fontSize: 22 }}>🔥</span>
        <span style={{ color: "#fff", fontSize: 20, fontWeight: 700, letterSpacing: 0.4 }}>
          Streak Leaderboard
        </span>
      </div>

      <div style={{ padding: "24px 16px 28px", maxWidth: 680, margin: "0 auto" }}>

        {/* Podium */}
        <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-end", gap: 12, marginBottom: 24 }}>
          {podium.map((entry) => (
            <PodiumCard
              key={entry.user_id}
              entry={entry}
              trophy={podiumTrophy(entry)}
              center={podiumTrophy(entry) === "gold"}
              canClick={canClick(entry.user_id)}
              isMe={entry.user_id === currentUserId}
            />
          ))}
        </div>

        {/* Your streak pill */}
        <div style={{
          background: C.primaryLow,
          border: `1px solid ${C.primaryMid}`,
          borderRadius: 12, padding: "12px 20px",
          textAlign: "center", fontSize: 14,
          color: C.fg, marginBottom: rest.length > 0 ? 24 : 0,
        }}>
          Your current streak: 🔥{" "}
          <strong style={{ color: C.primary }}>{currentStreak}</strong>{" "}
          day{currentStreak !== 1 ? "s" : ""}
        </div>

        {/* Table — ranks 4+ */}
        {rest.length > 0 && (
          <>
            <div style={{
              display: "grid", gridTemplateColumns: "52px 1fr 80px",
              padding: "0 12px 10px",
              color: C.fgMuted, fontSize: 12, fontWeight: 600,
              borderBottom: `1px solid ${C.border}`,
              textTransform: "uppercase", letterSpacing: 0.5,
            }}>
              {["Rank", "User", "Streak"].map((h, i) => (
                <span key={h} style={{ textAlign: i === 2 ? "center" : "left" }}>{h}</span>
              ))}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
              {rest.map((entry, i) => {
                const rank = i + 4;
                const clickable = canClick(entry.user_id);
                const isMe = entry.user_id === currentUserId;

                const row = (
                  <div
                    style={{
                      display: "grid", gridTemplateColumns: "52px 1fr 80px",
                      alignItems: "center", padding: "11px 12px",
                      background: C.bgMutedHalf,
                      border: `1px solid ${C.border}`,
                      borderRadius: 10,
                      cursor: clickable ? "pointer" : "default",
                      transition: "background .15s",
                    }}
                    onMouseEnter={e => { if (clickable) (e.currentTarget as HTMLDivElement).style.background = C.bgMuted; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = C.bgMutedHalf; }}
                  >
                    <span style={{ fontWeight: 700, color: C.fgMuted, fontSize: 14 }}>{rank}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <img
                        src={entry.avatar_url || "/placeholder.svg"}
                        alt={entry.username || "User"}
                        style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: `1px solid ${C.border}` }}
                      />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14, color: C.fg }}>
                          {entry.username || "Anonymous"}
                          {isMe && <span style={{ fontSize: 11, color: C.fgMuted, marginLeft: 5 }}>(you)</span>}
                        </div>
                        {!clickable && !isMe && (
                          <div style={{ fontSize: 11, color: C.fgMuted }}>🔒 Follow each other</div>
                        )}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, fontWeight: 700, color: "#f97316", fontSize: 14 }}>
                      🔥 {entry.streak}
                    </div>
                  </div>
                );

                return clickable ? (
                  <Link key={entry.user_id} to={isMe ? "/profile" : `/profile/${entry.user_id}`} style={{ textDecoration: "none" }}>
                    {row}
                  </Link>
                ) : (
                  <div key={entry.user_id}>{row}</div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
