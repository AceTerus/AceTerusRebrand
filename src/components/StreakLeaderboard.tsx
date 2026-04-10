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

const C = {
  bg:          "hsl(var(--card))",
  bgMuted:     "hsl(var(--muted))",
  bgMutedHalf: "hsl(var(--muted) / 0.6)",
  border:      "hsl(var(--border))",
  fg:          "hsl(var(--foreground))",
  fgMuted:     "hsl(var(--muted-foreground))",
  primary:     "hsl(var(--primary))",
  primaryLow:  "hsl(var(--primary) / 0.12)",
  primaryMid:  "hsl(var(--primary) / 0.5)",
  primaryGlow: "hsl(var(--primary) / 0.25)",
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

  // All sizes are fluid: clamp(min, preferred-vw, max)
  const avatarSz    = center ? "clamp(68px, 21vw, 110px)" : "clamp(52px, 16vw, 82px)";
  const cardWidth   = center ? "clamp(108px, 32vw, 200px)" : "clamp(84px, 25vw, 155px)";
  const nameFontSz  = center ? "clamp(12px, 3.6vw, 17px)" : "clamp(10px, 3vw, 13px)";
  const trophySz    = center ? "clamp(34px, 10vw, 50px)"  : "clamp(26px, 8vw, 38px)";
  const trophyIcon  = center ? "clamp(16px, 5vw, 24px)"   : "clamp(12px, 4vw, 18px)";
  const streakFsz   = center ? "clamp(17px, 5vw, 24px)"   : "clamp(13px, 4vw, 18px)";
  const padBox      = center ? "clamp(10px, 3vw, 18px) clamp(8px, 2vw, 14px)" : "8px 6px";
  const marginTop   = center ? 0 : "clamp(20px, 7vw, 40px)";

  const inner = (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
      flex: `0 0 ${cardWidth}`,
      width: cardWidth,
      marginTop,
      cursor: canClick ? "pointer" : "default",
      minWidth: 0,
    }}>
      {/* Avatar */}
      <div style={{
        width: avatarSz, height: avatarSz,
        borderRadius: center ? 16 : 12,
        overflow: "hidden",
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
      <div style={{
        color: C.fg, fontSize: nameFontSz, fontWeight: 700,
        textAlign: "center", lineHeight: 1.3,
        wordBreak: "break-word", width: "100%",
      }}>
        {entry.username || "Anonymous"}
        {isMe && <span style={{ fontSize: "10px", color: C.fgMuted, marginLeft: 4 }}>(you)</span>}
      </div>

      {/* Stats box */}
      <div style={{
        width: "100%",
        background: C.bgMuted,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        padding: padBox,
        display: "flex", flexDirection: "column", alignItems: "center",
        gap: center ? 6 : 4,
      }}>
        {/* Trophy badge */}
        <div style={{
          width: trophySz, height: trophySz, borderRadius: 10,
          background: t.bg, boxShadow: t.glow,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: trophyIcon,
        }}>{t.icon}</div>

        {/* Streak */}
        <div style={{
          display: "flex", alignItems: "center", gap: 4,
          fontSize: streakFsz, fontWeight: 800, color: C.fg,
        }}>
          🔥 {entry.streak}
        </div>
        <div style={{ color: C.fgMuted, fontSize: "10px" }}>day streak</div>

        {!canClick && !isMe && (
          <div style={{ color: C.fgMuted, fontSize: "9px", textAlign: "center", lineHeight: 1.4 }}>
            🔒 Follow each other<br />to view profile
          </div>
        )}
      </div>
    </div>
  );

  return canClick ? (
    <Link to={isMe ? "/profile" : `/profile/${entry.user_id}`} style={{ textDecoration: "none", minWidth: 0 }}>
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
      {/* Header */}
      <div style={{
        background: "var(--gradient-primary)",
        padding: "14px 20px",
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <span style={{ fontSize: 20 }}>🔥</span>
        <span style={{ color: "#fff", fontSize: "clamp(15px, 4.5vw, 20px)", fontWeight: 700, letterSpacing: 0.4 }}>
          Streak Leaderboard
        </span>
      </div>

      <div style={{ padding: "20px 12px 24px", width: "100%", boxSizing: "border-box" }}>

        {/* Podium — never overflows, gaps are fluid */}
        <div style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-end",
          gap: "clamp(6px, 2vw, 12px)",
          marginBottom: 20,
          width: "100%",
          overflow: "hidden",
        }}>
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
          borderRadius: 12, padding: "10px 16px",
          textAlign: "center", fontSize: "clamp(12px, 3.5vw, 14px)",
          color: C.fg, marginBottom: rest.length > 0 ? 20 : 0,
        }}>
          Your current streak: 🔥{" "}
          <strong style={{ color: C.primary }}>{currentStreak}</strong>{" "}
          day{currentStreak !== 1 ? "s" : ""}
        </div>

        {/* Table — ranks 4+ */}
        {rest.length > 0 && (
          <>
            <div style={{
              display: "grid",
              gridTemplateColumns: "40px 1fr 64px",
              padding: "0 8px 8px",
              color: C.fgMuted, fontSize: 11, fontWeight: 600,
              borderBottom: `1px solid ${C.border}`,
              textTransform: "uppercase", letterSpacing: 0.5,
            }}>
              {["Rank", "User", "Streak"].map((h, i) => (
                <span key={h} style={{ textAlign: i === 2 ? "center" : "left" }}>{h}</span>
              ))}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 8 }}>
              {rest.map((entry, i) => {
                const rank = i + 4;
                const clickable = canClick(entry.user_id);
                const isMe = entry.user_id === currentUserId;

                const row = (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "40px 1fr 64px",
                      alignItems: "center",
                      padding: "9px 8px",
                      background: C.bgMutedHalf,
                      border: `1px solid ${C.border}`,
                      borderRadius: 10,
                      cursor: clickable ? "pointer" : "default",
                      transition: "background .15s",
                    }}
                    onMouseEnter={e => { if (clickable) (e.currentTarget as HTMLDivElement).style.background = C.bgMuted; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = C.bgMutedHalf; }}
                  >
                    <span style={{ fontWeight: 700, color: C.fgMuted, fontSize: 13 }}>{rank}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                      <img
                        src={entry.avatar_url || "/placeholder.svg"}
                        alt={entry.username || "User"}
                        style={{
                          width: 32, height: 32, borderRadius: "50%",
                          objectFit: "cover", flexShrink: 0,
                          border: `1px solid ${C.border}`,
                        }}
                      />
                      <div style={{ minWidth: 0 }}>
                        <div style={{
                          fontWeight: 600, fontSize: "clamp(12px, 3.2vw, 14px)",
                          color: C.fg, overflow: "hidden",
                          textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          {entry.username || "Anonymous"}
                          {isMe && <span style={{ fontSize: 10, color: C.fgMuted, marginLeft: 4 }}>(you)</span>}
                        </div>
                        {!clickable && !isMe && (
                          <div style={{ fontSize: 10, color: C.fgMuted }}>🔒 Follow each other</div>
                        )}
                      </div>
                    </div>
                    <div style={{
                      display: "flex", alignItems: "center", justifyContent: "center",
                      gap: 3, fontWeight: 700, color: "#f97316",
                      fontSize: "clamp(12px, 3.2vw, 14px)",
                    }}>
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
