import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Search, Sparkles, Calendar, MapPin, Trophy, Code2,
  Mic, Briefcase, BookOpen, Tag, Coins, Filter, Zap, Star,
  ArrowRight, TrendingUp
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format, isPast, differenceInDays } from "date-fns";

/* ── design tokens ─────────────────────────────────────────────────── */
const DISPLAY = "font-['Baloo_2'] tracking-tight";

const TYPE_CONFIG: Record<string, {
  label: string; emoji: string; color: string; bg: string;
  gradient: string; border: string; icon: React.FC<any>;
}> = {
  competition: { label: "Competition", emoji: "🏆", color: "#2E2BE5", bg: "#D6D4FF", gradient: "from-[#2E2BE5] to-[#7C3AED]", border: "#2E2BE5", icon: Trophy },
  hackathon:   { label: "Hackathon",   emoji: "💻", color: "#2F7CFF", bg: "#DDF3FF", gradient: "from-[#2F7CFF] to-[#3BD6F5]", border: "#2F7CFF", icon: Code2 },
  workshop:    { label: "Workshop",    emoji: "🛠️", color: "#0891B2", bg: "#E0FAFF", gradient: "from-[#3BD6F5] to-[#0891B2]", border: "#3BD6F5", icon: BookOpen },
  talk:        { label: "Talk",        emoji: "🎤", color: "#059669", bg: "#D1FAE5", gradient: "from-[#059669] to-[#34D399]", border: "#059669", icon: Mic },
  internship:  { label: "Internship",  emoji: "💼", color: "#D97706", bg: "#FEF3C7", gradient: "from-[#F59E0B] to-[#D97706]", border: "#D97706", icon: Briefcase },
  deal:        { label: "Deal",        emoji: "🎁", color: "#DB2777", bg: "#FCE7F3", gradient: "from-[#DB2777] to-[#F472B6]", border: "#DB2777", icon: Tag },
};

interface Event {
  id: string; title: string; description: string | null; type: string;
  location: string | null; start_date: string | null; end_date: string | null;
  image_url: string | null; is_sponsored: boolean; is_featured: boolean;
  ace_coins_reward: number; registration_url: string | null;
  event_organizers: { name: string; logo_url: string | null; verified: boolean } | null;
}

const TAB_TYPES = {
  all:         null,
  events:      ["competition", "hackathon", "workshop", "talk"],
  internships: ["internship"],
  deals:       ["deal"],
};
type Tab = keyof typeof TAB_TYPES;

const TABS = [
  { key: "all",         label: "✨ All",                  },
  { key: "events",      label: "🎯 Events",               },
  { key: "internships", label: "💼 Internships",          },
  { key: "deals",       label: "🎁 Deals",                },
] as const;

/* ── Countdown badge ─────────────────────────────────────────────────── */
const CountdownBadge = ({ date }: { date: string }) => {
  const days = differenceInDays(new Date(date), new Date());
  if (days < 0) return null;
  if (days === 0) return (
    <span className="absolute top-3 right-3 px-2 py-0.5 rounded-lg bg-red-500 border-[2px] border-white text-white text-[11px] font-extrabold animate-pulse shadow-lg">
      TODAY
    </span>
  );
  if (days <= 7) return (
    <span className="absolute top-3 right-3 px-2 py-0.5 rounded-lg bg-orange-500 border-[2px] border-white text-white text-[11px] font-extrabold shadow-lg">
      {days}d left
    </span>
  );
  return null;
};

/* ── EventCard ───────────────────────────────────────────────────────── */
const EventCard = ({ event, featured = false }: { event: Event; featured?: boolean }) => {
  const cfg = TYPE_CONFIG[event.type] ?? TYPE_CONFIG.talk;
  const Icon = cfg.icon;
  const expired = event.end_date ? isPast(new Date(event.end_date)) : false;

  return (
    <Link
      to={`/event/${event.id}`}
      className="group block border-[2.5px] border-[#0F172A] rounded-[20px] shadow-[4px_4px_0_0_#0F172A] bg-white overflow-hidden hover:-translate-y-1.5 hover:shadow-[6px_6px_0_0_#0F172A] transition-all duration-200 cursor-pointer"
    >
      {/* Coloured top band / image */}
      <div className="relative overflow-hidden" style={{ height: featured ? "160px" : "120px" }}>
        {event.image_url ? (
          <>
            <img src={event.image_url} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          </>
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${cfg.gradient} flex items-center justify-center relative`}>
            <span className="text-5xl opacity-30 group-hover:scale-110 transition-transform duration-300 select-none">{cfg.emoji}</span>
            {/* decorative circles */}
            <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-white/10" />
            <div className="absolute -bottom-6 -left-4 w-24 h-24 rounded-full bg-white/10" />
          </div>
        )}

        {/* Type badge top-left */}
        <span className="absolute top-3 left-3 flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white border-[2px] border-[#0F172A] text-[11px] font-extrabold shadow-[2px_2px_0_0_#0F172A]" style={{ color: cfg.color }}>
          {cfg.emoji} {cfg.label}
        </span>

        {/* Sponsored badge */}
        {event.is_sponsored && (
          <span className="absolute bottom-3 left-3 px-2 py-0.5 rounded-lg bg-amber-400 border-[2px] border-[#0F172A] text-[11px] font-extrabold text-[#0F172A] shadow-[2px_2px_0_0_#0F172A]">
            ⭐ SPONSORED
          </span>
        )}

        {/* Countdown */}
        {event.start_date && !expired && <CountdownBadge date={event.start_date} />}
      </div>

      <div className="p-4 space-y-2">
        <h3 className={`${DISPLAY} font-bold text-[16px] text-[#0F172A] leading-tight line-clamp-2 group-hover:text-[#2F7CFF] transition-colors`}>
          {event.title}
        </h3>

        <div className="flex flex-col gap-1 text-[12px] text-[#0F172A]/55 font-['Nunito']">
          {event.location && (
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3 h-3 shrink-0" style={{ color: cfg.color }} />
              {event.location}
            </span>
          )}
          {event.start_date && (
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3 h-3 shrink-0" style={{ color: cfg.color }} />
              {expired
                ? <span className="text-red-400 font-bold">Ended</span>
                : format(new Date(event.start_date), "d MMM yyyy")
              }
            </span>
          )}
        </div>

        {event.ace_coins_reward > 0 && (
          <div className="flex items-center gap-1.5 mt-1 px-2 py-1 rounded-lg bg-amber-50 border-[1.5px] border-amber-200 w-fit">
            <Coins className="w-3 h-3 text-amber-500" />
            <span className="text-[11px] font-extrabold text-amber-600">+{event.ace_coins_reward} ACE Coins</span>
          </div>
        )}
      </div>
    </Link>
  );
};

/* ── Skeleton ───────────────────────────────────────────────────────── */
const CardSkeleton = ({ tall = false }: { tall?: boolean }) => (
  <div className="border-[2.5px] border-[#0F172A]/20 rounded-[20px] bg-white overflow-hidden">
    <Skeleton className={`w-full rounded-none ${tall ? "h-40" : "h-28"}`} />
    <div className="p-4 space-y-2">
      <Skeleton className="h-4 w-full rounded-lg" />
      <Skeleton className="h-3 w-3/4 rounded-lg" />
    </div>
  </div>
);

/* ── Marquee ticker ─────────────────────────────────────────────────── */
const MARQUEE_ITEMS = [
  "🏆 National Coding Challenge", "💼 Google Summer Internship",
  "🛠️ UI/UX Workshop by MDEC", "🎤 TEDx UM 2026", "🎁 50% off Notion Pro",
  "💻 Hack Malaysia 2026", "🏆 Petronas STEM Competition",
];
const Marquee = () => (
  <div className="overflow-hidden border-y-[2.5px] border-[#0F172A] bg-[#2F7CFF] py-2 relative">
    <div className="flex gap-8 animate-[marquee_25s_linear_infinite] whitespace-nowrap">
      {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
        <span key={i} className="text-white font-['Nunito'] font-bold text-[13px] flex items-center gap-2 shrink-0">
          {item} <span className="text-white/40">·</span>
        </span>
      ))}
    </div>
  </div>
);

/* ── Hero stat pill ──────────────────────────────────────────────────── */
const StatPill = ({ emoji, label }: { emoji: string; label: string }) => (
  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border-[2px] border-[#0F172A]/20 bg-white/80 backdrop-blur-sm shadow-[2px_2px_0_0_rgba(15,23,42,0.08)]">
    <span className="text-base">{emoji}</span>
    <span className="text-[13px] font-bold font-['Nunito'] text-[#0F172A]">{label}</span>
  </div>
);

/* ── Main page ──────────────────────────────────────────────────────── */
export default function DiscoveryFeed() {
  const { user, session } = useAuth();
  const [tab, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");
  const [aiRecs, setAiRecs] = useState<{ recommended_event_ids: string[]; reason: string } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [campusFilter, setCampusFilter] = useState<string | null>(null);

  useEffect(() => { document.title = "Discover – AceTerus Events"; }, []);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["events", tab, search],
    queryFn: async () => {
      let q = supabase
        .from("events")
        .select("*, event_organizers(name, logo_url, verified)")
        .eq("status", "published")
        .order("is_sponsored", { ascending: false })
        .order("is_featured", { ascending: false })
        .order("start_date", { ascending: true });
      const types = TAB_TYPES[tab];
      if (types) q = q.in("type", types);
      if (search.trim()) q = q.ilike("title", `%${search.trim()}%`);
      const { data, error } = await q.limit(60);
      if (error) throw error;
      return (data ?? []) as Event[];
    },
  });

  const { data: campuses = [] } = useQuery({
    queryKey: ["user-campuses", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("student_schools")
        .select("schools(name)")
        .eq("user_id", user!.id)
        .eq("is_current", true)
        .limit(3);
      return (data ?? []).map((r: any) => r.schools?.name).filter(Boolean) as string[];
    },
  });

  useEffect(() => {
    if (!user || !session) return;
    setAiLoading(true);
    supabase.functions
      .invoke("event-matcher", { headers: { Authorization: `Bearer ${session.access_token}` } })
      .then(({ data, error }) => { if (!error && data?.recommended_event_ids?.length) setAiRecs(data); })
      .finally(() => setAiLoading(false));
  }, [user, session]);

  const featured = events.filter((e) => e.is_featured || e.is_sponsored).slice(0, 4);
  const regular = events.filter((e) => !(e.is_featured || e.is_sponsored));
  const aiRecommended = aiRecs ? events.filter((e) => aiRecs.recommended_event_ids.includes(e.id)).slice(0, 5) : [];
  const filtered = campusFilter ? regular.filter((e) => e.location?.toLowerCase().includes(campusFilter.toLowerCase())) : regular;

  return (
    <div className="space-y-0">

      {/* ── Marquee ticker ──────────────────────────────────────────── */}
      <style>{`
        @keyframes marquee { from { transform: translateX(0) } to { transform: translateX(-50%) } }
        @keyframes floatY { 0%,100% { transform: translateY(0px) } 50% { transform: translateY(-12px) } }
        @keyframes floatY2 { 0%,100% { transform: translateY(-8px) } 50% { transform: translateY(4px) } }
      `}</style>
      <Marquee />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-12">

        {/* ── Hero ──────────────────────────────────────────────────── */}
        <div className="relative rounded-[28px] overflow-hidden border-[2.5px] border-[#0F172A] shadow-[6px_6px_0_0_#0F172A] bg-gradient-to-br from-[#0F172A] via-[#1E3A8A] to-[#2E2BE5] p-8 sm:p-12 text-center">
          {/* Floating emojis */}
          <span className="absolute top-8 left-8 text-4xl opacity-30 hidden sm:block" style={{ animation: "floatY 4s ease-in-out infinite" }}>🏆</span>
          <span className="absolute top-6 right-12 text-3xl opacity-30 hidden sm:block" style={{ animation: "floatY2 3.5s ease-in-out infinite" }}>💻</span>
          <span className="absolute bottom-8 left-16 text-3xl opacity-25 hidden sm:block" style={{ animation: "floatY 5s ease-in-out infinite 1s" }}>🎁</span>
          <span className="absolute bottom-6 right-8 text-4xl opacity-25 hidden sm:block" style={{ animation: "floatY2 4.5s ease-in-out infinite 0.5s" }}>💼</span>

          <div className="relative z-10 space-y-5">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border-[2px] border-white/20 bg-white/10 backdrop-blur-sm">
              <Zap className="w-4 h-4 text-[#3BD6F5]" />
              <span className="text-[13px] font-bold text-white/90 font-['Nunito'] tracking-wider uppercase">For Malaysian Students</span>
            </div>

            <h1 className={`${DISPLAY} font-extrabold text-[42px] sm:text-[58px] text-white leading-none`}>
              Your Next Big<br />
              <span className="text-[#3BD6F5]">Opportunity</span> is Here
            </h1>

            <p className="text-white/65 text-[16px] font-['Nunito'] max-w-md mx-auto">
              Competitions, hackathons, internships, and exclusive deals — all in one place.
            </p>

            {/* Search */}
            <div className="max-w-lg mx-auto">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#0F172A]/50" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search events, hackathons, internships…"
                  className="w-full pl-12 pr-4 py-4 border-[2.5px] border-[#0F172A] rounded-[16px] shadow-[4px_4px_0_0_rgba(15,23,42,0.4)] font-['Nunito'] text-[15px] outline-none focus:border-[#3BD6F5] focus:shadow-[4px_4px_0_0_rgba(59,214,245,0.3)] transition-all placeholder:text-[#0F172A]/35 bg-white"
                />
              </div>
            </div>

            {/* Stat pills */}
            <div className="flex flex-wrap justify-center gap-2 pt-1">
              <StatPill emoji="🏆" label="Competitions" />
              <StatPill emoji="💻" label="Hackathons" />
              <StatPill emoji="💼" label="Internships" />
              <StatPill emoji="🎁" label="Student Deals" />
            </div>
          </div>
        </div>

        {/* ── Campus filter ─────────────────────────────────────────── */}
        {campuses.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 text-[13px] font-bold font-['Nunito'] text-[#0F172A]/50">
              <Filter className="w-3.5 h-3.5" /> Your Campus:
            </span>
            {[null, ...campuses].map((c) => (
              <button
                key={c ?? "all"}
                onClick={() => setCampusFilter(c)}
                className={`px-3 py-1.5 rounded-xl border-[2px] text-[13px] font-bold font-['Nunito'] transition-all duration-150 ${
                  campusFilter === c
                    ? "border-[#2F7CFF] bg-[#2F7CFF] text-white shadow-[2px_2px_0_0_#0F172A] -translate-y-0.5"
                    : "border-[#0F172A]/20 bg-white text-[#0F172A]/60 hover:-translate-y-0.5 hover:border-[#2F7CFF]/50"
                }`}
              >
                {c ?? "🌐 All Locations"}
              </button>
            ))}
          </div>
        )}

        {/* ── Featured ──────────────────────────────────────────────── */}
        {(isLoading || featured.length > 0) && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-400 border-[2.5px] border-[#0F172A] shadow-[2px_2px_0_0_#0F172A] flex items-center justify-center">
                  <Star className="w-4 h-4 text-[#0F172A]" />
                </div>
                <h2 className={`${DISPLAY} font-extrabold text-[22px] text-[#0F172A]`}>Featured</h2>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {isLoading
                ? Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} tall />)
                : featured.map((e) => <EventCard key={e.id} event={e} featured />)
              }
            </div>
          </section>
        )}

        {/* ── AI Recommendations ────────────────────────────────────── */}
        {user && (aiLoading || aiRecommended.length > 0) && (
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#2E2BE5] to-[#7C3AED] border-[2.5px] border-[#0F172A] shadow-[2px_2px_0_0_#0F172A] flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <h2 className={`${DISPLAY} font-extrabold text-[22px] text-[#0F172A]`}>Recommended for You</h2>
            </div>
            {aiRecs?.reason && (
              <div className="flex items-start gap-2 px-4 py-3 rounded-[14px] bg-[#D6D4FF] border-[2px] border-[#2E2BE5]/30 w-fit max-w-xl">
                <Sparkles className="w-4 h-4 text-[#2E2BE5] mt-0.5 shrink-0" />
                <p className="text-[13px] text-[#2E2BE5] font-bold font-['Nunito'] italic">{aiRecs.reason}</p>
              </div>
            )}
            <div className="flex gap-4 overflow-x-auto pb-3 -mx-1 px-1 scrollbar-thin">
              {aiLoading
                ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="min-w-[220px]"><CardSkeleton /></div>)
                : aiRecommended.map((e) => (
                  <div key={e.id} className="min-w-[220px] max-w-[240px] shrink-0">
                    <EventCard event={e} />
                  </div>
                ))
              }
            </div>
          </section>
        )}

        {/* ── Tabs + Grid ───────────────────────────────────────────── */}
        <section className="space-y-6">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {TABS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setTab(key as Tab)}
                className={`px-5 py-2.5 rounded-[14px] border-[2.5px] text-[14px] font-bold font-['Nunito'] whitespace-nowrap transition-all duration-150 ${
                  tab === key
                    ? "border-[#0F172A] bg-[#0F172A] text-white shadow-[3px_3px_0_0_rgba(15,23,42,0.3)] -translate-y-0.5"
                    : "border-[#0F172A]/20 bg-white text-[#0F172A]/65 hover:-translate-y-0.5 hover:border-[#0F172A]/50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Type quick-filter row */}
          {tab === "events" && (
            <div className="flex flex-wrap gap-2">
              {(["competition", "hackathon", "workshop", "talk"] as const).map((t) => {
                const cfg = TYPE_CONFIG[t];
                return (
                  <button
                    key={t}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-[2px] border-[#0F172A]/15 bg-white text-[13px] font-bold font-['Nunito'] hover:-translate-y-0.5 hover:shadow-[2px_2px_0_0_rgba(15,23,42,0.1)] transition-all"
                    style={{ color: cfg.color, backgroundColor: cfg.bg }}
                  >
                    <span>{cfg.emoji}</span> {cfg.label}
                  </button>
                );
              })}
            </div>
          )}

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="border-[2.5px] border-[#0F172A] rounded-[20px] shadow-[4px_4px_0_0_#0F172A] bg-white p-16 text-center space-y-3">
              <div className="text-6xl">🔭</div>
              <p className={`${DISPLAY} font-bold text-[20px] text-[#0F172A]/50`}>
                {search ? "No events match your search" : "Nothing here yet — check back soon!"}
              </p>
              {search && (
                <button onClick={() => setSearch("")} className="text-[14px] font-bold text-[#2F7CFF] hover:underline font-['Nunito']">
                  Clear search
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filtered.map((e) => <EventCard key={e.id} event={e} />)}
            </div>
          )}
        </section>

        {/* ── Not logged in nudge ───────────────────────────────────── */}
        {!user && (
          <div className="border-[2.5px] border-[#0F172A] rounded-[24px] shadow-[5px_5px_0_0_#0F172A] overflow-hidden">
            <div className="bg-gradient-to-r from-[#2F7CFF] to-[#2E2BE5] p-8 flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
              <div className="text-6xl shrink-0">🚀</div>
              <div className="flex-1">
                <h3 className={`${DISPLAY} font-extrabold text-[24px] text-white`}>Get personalised event picks</h3>
                <p className="text-white/70 font-['Nunito'] text-[15px] mt-1">Sign in to unlock AI recommendations, register for events, and earn ACE Coins.</p>
              </div>
              <a
                href="https://aceterus.com/auth"
                className="shrink-0 flex items-center gap-2 px-6 py-3 rounded-xl border-[2.5px] border-white bg-white text-[#2F7CFF] font-bold font-['Nunito'] shadow-[3px_3px_0_0_rgba(255,255,255,0.3)] hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_rgba(255,255,255,0.4)] transition-all"
              >
                Sign In <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
