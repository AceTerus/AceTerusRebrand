import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tag, ExternalLink, Calendar, Zap, Search, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format, isPast, differenceInDays } from "date-fns";

/* ── design tokens ─────────────────────────────────────────────────── */
const DISPLAY = "font-['Baloo_2'] tracking-tight";

interface Deal {
  id: string; title: string; description: string | null; brand_name: string;
  discount_details: string | null; logo_url: string | null; category: string | null;
  expiry_date: string | null; redemption_url: string | null; is_featured: boolean;
}

const CATEGORIES = [
  { key: "All",               emoji: "✨" },
  { key: "Food & Drink",      emoji: "🍔" },
  { key: "Tech & Gadgets",    emoji: "💻" },
  { key: "Fashion",           emoji: "👗" },
  { key: "Education",         emoji: "📚" },
  { key: "Travel",            emoji: "✈️" },
  { key: "Entertainment",     emoji: "🎮" },
  { key: "Health & Wellness", emoji: "🏃" },
];

const PALETTE = [
  { from: "#2F7CFF", to: "#3BD6F5" },
  { from: "#2E2BE5", to: "#7C3AED" },
  { from: "#DB2777", to: "#F472B6" },
  { from: "#059669", to: "#34D399" },
  { from: "#D97706", to: "#FCD34D" },
  { from: "#DC2626", to: "#F87171" },
];

/* ── Expiry urgency badge ─────────────────────────────────────────── */
const ExpiryBadge = ({ date }: { date: string }) => {
  const days = differenceInDays(new Date(date), new Date());
  if (isPast(new Date(date))) return (
    <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#0F172A]/8 text-[11px] font-bold text-[#0F172A]/40 font-['Nunito']">
      Expired
    </span>
  );
  if (days <= 3) return (
    <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-red-100 border-[1.5px] border-red-300 text-[11px] font-extrabold text-red-600 font-['Nunito'] animate-pulse">
      <Clock className="w-3 h-3" /> {days === 0 ? "Last day!" : `${days}d left!`}
    </span>
  );
  if (days <= 7) return (
    <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-orange-100 border-[1.5px] border-orange-300 text-[11px] font-extrabold text-orange-600 font-['Nunito']">
      <Clock className="w-3 h-3" /> {days}d left
    </span>
  );
  return (
    <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 border-[1.5px] border-emerald-200 text-[11px] font-bold text-emerald-600 font-['Nunito']">
      Until {format(new Date(date), "d MMM")}
    </span>
  );
};

/* ── DealCard ──────────────────────────────────────────────────────── */
const DealCard = ({ deal, index }: { deal: Deal; index: number }) => {
  const expired = deal.expiry_date ? isPast(new Date(deal.expiry_date)) : false;
  const palette = PALETTE[index % PALETTE.length];

  return (
    <div className={`group border-[2.5px] border-[#0F172A] rounded-[20px] shadow-[4px_4px_0_0_#0F172A] bg-white overflow-hidden transition-all duration-200 ${expired ? "opacity-60" : "hover:-translate-y-1.5 hover:shadow-[6px_6px_0_0_#0F172A]"}`}>

      {/* Coloured header */}
      <div className={`relative bg-gradient-to-br`} style={{ background: `linear-gradient(135deg, ${palette.from}, ${palette.to})`, padding: "20px 20px 28px" }}>
        {/* Logo */}
        <div className="flex items-start justify-between gap-3">
          {deal.logo_url ? (
            <img src={deal.logo_url} alt={deal.brand_name} className="w-12 h-12 rounded-[14px] object-cover border-[2.5px] border-white shadow-[2px_2px_0_0_rgba(0,0,0,0.2)]" />
          ) : (
            <div className="w-12 h-12 rounded-[14px] bg-white/25 border-[2.5px] border-white/40 flex items-center justify-center shadow-[2px_2px_0_0_rgba(0,0,0,0.1)]">
              <Tag className="w-5 h-5 text-white" />
            </div>
          )}
          {deal.is_featured && (
            <span className="px-2 py-0.5 rounded-lg bg-amber-400 border-[2px] border-white text-[11px] font-extrabold text-[#0F172A] shadow-[2px_2px_0_0_rgba(0,0,0,0.15)]">
              🔥 HOT
            </span>
          )}
        </div>

        <div className="mt-3">
          <p className="text-white/60 font-['Nunito'] font-bold text-[11px] uppercase tracking-wider">{deal.brand_name}</p>
          <h3 className={`${DISPLAY} font-extrabold text-[17px] text-white leading-tight mt-0.5 line-clamp-2`}>{deal.title}</h3>
        </div>

        {/* Wave divider */}
        <div className="absolute bottom-0 left-0 right-0 h-4 bg-white rounded-t-[18px]" />
      </div>

      {/* Body */}
      <div className="px-5 pb-5 space-y-3">
        {/* Discount highlight */}
        {deal.discount_details && (
          <div className="text-center py-3 -mx-1">
            <p className={`${DISPLAY} font-extrabold text-[28px] leading-none`} style={{ color: palette.from }}>
              {deal.discount_details}
            </p>
          </div>
        )}

        {deal.description && (
          <p className="text-[13px] font-['Nunito'] text-[#0F172A]/60 leading-snug line-clamp-2">{deal.description}</p>
        )}

        {/* Tags row */}
        <div className="flex flex-wrap items-center gap-2">
          {deal.category && (
            <span className="px-2 py-0.5 rounded-lg bg-[#F3FAFF] border-[1.5px] border-[#0F172A]/15 text-[11px] font-bold text-[#0F172A]/55 font-['Nunito']">
              {CATEGORIES.find(c => c.key === deal.category)?.emoji ?? "🏷️"} {deal.category}
            </span>
          )}
          {deal.expiry_date && <ExpiryBadge date={deal.expiry_date} />}
        </div>

        {/* CTA */}
        {deal.redemption_url && !expired ? (
          <a
            href={deal.redemption_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-[14px] border-[2.5px] border-[#0F172A] font-bold font-['Nunito'] text-[14px] text-white shadow-[3px_3px_0_0_#0F172A] hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#0F172A] active:translate-y-0 transition-all duration-150"
            style={{ background: `linear-gradient(135deg, ${palette.from}, ${palette.to})` }}
          >
            <ExternalLink className="w-4 h-4" /> Claim Deal
          </a>
        ) : expired ? (
          <div className="flex items-center justify-center py-2.5 rounded-[14px] bg-[#0F172A]/06 text-[14px] font-bold text-[#0F172A]/35 font-['Nunito']">
            Deal Expired
          </div>
        ) : null}
      </div>
    </div>
  );
};

const DealSkeleton = () => (
  <div className="border-[2.5px] border-[#0F172A]/20 rounded-[20px] bg-white overflow-hidden">
    <div className="h-28 bg-gradient-to-br from-gray-100 to-gray-200" />
    <div className="px-5 pb-5 pt-3 space-y-3">
      <Skeleton className="h-8 w-3/4 rounded-lg" />
      <Skeleton className="h-4 w-full rounded-lg" />
      <Skeleton className="h-10 w-full rounded-[14px]" />
    </div>
  </div>
);

export default function DealsPage() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");

  useEffect(() => { document.title = "Student Deals – AceTerus Events"; }, []);

  const { data: deals = [], isLoading } = useQuery({
    queryKey: ["deals", activeCategory, search],
    queryFn: async () => {
      let q = supabase
        .from("deals")
        .select("*")
        .order("is_featured", { ascending: false })
        .order("created_at", { ascending: false });
      if (activeCategory !== "All") q = q.eq("category", activeCategory);
      if (search.trim()) q = q.ilike("title", `%${search.trim()}%`);
      const { data, error } = await q.limit(60);
      if (error) throw error;
      return (data ?? []) as Deal[];
    },
  });

  const featured = deals.filter((d) => d.is_featured);
  const rest = deals.filter((d) => !d.is_featured);

  return (
    <div className="space-y-0">
      {/* Hero */}
      <div className="bg-gradient-to-br from-[#DB2777] via-[#9333EA] to-[#2E2BE5] border-b-[2.5px] border-[#0F172A] py-12 px-4 text-center relative overflow-hidden">
        {/* Floating emojis */}
        <span className="absolute top-6 left-10 text-4xl opacity-20 animate-bounce hidden sm:block" style={{ animationDuration: "3s" }}>🎁</span>
        <span className="absolute top-8 right-14 text-3xl opacity-20 animate-bounce hidden sm:block" style={{ animationDuration: "4s", animationDelay: "0.5s" }}>💸</span>
        <span className="absolute bottom-6 left-20 text-3xl opacity-15 animate-bounce hidden sm:block" style={{ animationDuration: "3.5s", animationDelay: "1s" }}>🎉</span>
        <span className="absolute bottom-4 right-10 text-4xl opacity-15 animate-bounce hidden sm:block" style={{ animationDuration: "2.8s" }}>⚡</span>

        <div className="relative z-10 space-y-4 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border-[2px] border-white/25 bg-white/10 backdrop-blur-sm">
            <Zap className="w-4 h-4 text-yellow-300" />
            <span className="text-[13px] font-bold text-white/90 font-['Nunito'] tracking-wide uppercase">Exclusive for Malaysian Students</span>
          </div>
          <h1 className={`${DISPLAY} font-extrabold text-[44px] sm:text-[56px] text-white leading-none`}>
            Student<br /><span className="text-yellow-300">Deals 🎁</span>
          </h1>
          <p className="text-white/65 text-[16px] font-['Nunito'] max-w-md mx-auto">
            Brand discounts, free tools, and perks — because being a student should have more perks.
          </p>

          {/* Search */}
          <div className="max-w-md mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#0F172A]/45" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search deals…"
                className="w-full pl-12 pr-4 py-3.5 border-[2.5px] border-[#0F172A] rounded-[16px] shadow-[4px_4px_0_0_rgba(15,23,42,0.3)] font-['Nunito'] text-[15px] outline-none focus:border-yellow-400 focus:shadow-[4px_4px_0_0_rgba(234,179,8,0.3)] transition-all placeholder:text-[#0F172A]/35 bg-white"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-10">

        {/* Category pills */}
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(({ key, emoji }) => (
            <button
              key={key}
              onClick={() => setActiveCategory(key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-[14px] border-[2.5px] text-[13px] font-bold font-['Nunito'] transition-all duration-150 ${
                activeCategory === key
                  ? "border-[#DB2777] bg-[#DB2777] text-white shadow-[3px_3px_0_0_#0F172A] -translate-y-0.5"
                  : "border-[#0F172A]/20 bg-white text-[#0F172A]/65 hover:-translate-y-0.5 hover:border-[#DB2777]/50"
              }`}
            >
              <span>{emoji}</span> {key}
            </button>
          ))}
        </div>

        {/* Hot deals */}
        {!isLoading && featured.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-orange-500 border-[2.5px] border-[#0F172A] shadow-[2px_2px_0_0_#0F172A] flex items-center justify-center">
                <span className="text-sm">🔥</span>
              </div>
              <h2 className={`${DISPLAY} font-extrabold text-[22px] text-[#0F172A]`}>Hot Right Now</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {featured.map((d, i) => <DealCard key={d.id} deal={d} index={i} />)}
            </div>
          </section>
        )}

        {/* All deals */}
        <section className="space-y-4">
          {featured.length > 0 && rest.length > 0 && (
            <h2 className={`${DISPLAY} font-extrabold text-[22px] text-[#0F172A]`}>All Deals</h2>
          )}

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, i) => <DealSkeleton key={i} />)}
            </div>
          ) : deals.length === 0 ? (
            <div className="border-[2.5px] border-[#0F172A] rounded-[20px] shadow-[4px_4px_0_0_#0F172A] bg-white p-16 text-center space-y-3">
              <div className="text-6xl">🎁</div>
              <p className={`${DISPLAY} font-bold text-[20px] text-[#0F172A]/45`}>
                {search ? "No deals match your search" : "Deals coming soon!"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {rest.map((d, i) => <DealCard key={d.id} deal={d} index={i + featured.length} />)}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
