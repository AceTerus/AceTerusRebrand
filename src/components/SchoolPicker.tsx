import { useEffect, useRef, useState } from "react";
import { Search, X, MapPin, Building2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const C = {
  ink: "#0F172A", blue: "#2F7CFF", indigo: "#2E2BE5",
  skySoft: "#DDF3FF", indigoSoft: "#D6D4FF", pop: "#FF7A59",
};

export interface SchoolResult {
  id: string;
  name: string;
  type: string;
  level: string;
  state: string;
  district: string | null;
  city: string | null;
}

const TYPE_COLOR: Record<string, { bg: string; color: string }> = {
  "SMK":                    { bg: C.skySoft,    color: C.blue },
  "SMJK":                   { bg: "#E0F2FE",    color: "#0369a1" },
  "SBP":                    { bg: C.indigoSoft, color: C.indigo },
  "MRSM":                   { bg: "#FEF3C7",    color: "#92400e" },
  "SAM":                    { bg: "#D1FAE5",    color: "#065f46" },
  "SABK":                   { bg: "#D1FAE5",    color: "#065f46" },
  "SK":                     { bg: "#F0FDF4",    color: "#16a34a" },
  "SJK(C)":                 { bg: "#FFF7ED",    color: "#c2410c" },
  "SJK(T)":                 { bg: "#FDF4FF",    color: "#7e22ce" },
  "Sekolah Swasta":         { bg: "#FFE4E6",    color: C.pop },
  "Sekolah Antarabangsa":   { bg: "#FFE4D6",    color: C.pop },
  "Universiti Awam":        { bg: "#DBEAFE",    color: "#1D4ED8" },
  "Universiti Swasta":      { bg: "#EDE9FE",    color: "#6D28D9" },
  "Politeknik":             { bg: "#D1FAE5",    color: "#065f46" },
  "Kolej Komuniti":         { bg: "#FEF3C7",    color: "#92400e" },
  "Kolej Matrikulasi":      { bg: C.indigoSoft, color: C.indigo },
};

const typeBadge = (type: string) => {
  const cfg = TYPE_COLOR[type] ?? { bg: "#f1f5f9", color: "#64748b" };
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold font-['Baloo_2'] border border-[#0F172A]/10 shrink-0"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      {type}
    </span>
  );
};

interface SchoolPickerProps {
  value: SchoolResult | null;
  onChange: (school: SchoolResult | null) => void;
  placeholder?: string;
  filterLevel?: string;
  filterTypes?: string[];
}

export const SchoolPicker = ({ value, onChange, placeholder = "Search for your school…", filterLevel, filterTypes }: SchoolPickerProps) => {
  const [query, setQuery]       = useState("");
  const [results, setResults]   = useState<SchoolResult[]>([]);
  const [loading, setLoading]   = useState(false);
  const [open, setOpen]         = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  /* Close on outside click */
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  /* Search */
  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      // Build filter string for .or() / extra filters using PostgREST params
      const base = (supabase as any)
        .from("schools")
        .select("id, name, type, level, state, district, city")
        .ilike("name", `%${query.trim()}%`)
        .order("name")
        .limit(10);

      const withLevel  = filterLevel             ? base.eq("level", filterLevel)        : base;
      const withTypes  = filterTypes?.length     ? withLevel.in("type", filterTypes)    : withLevel;

      const { data, error } = await withTypes;
      if (!cancelled) {
        if (!error) setResults((data as SchoolResult[]) ?? []);
        setLoading(false);
      }
    }, 220);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [query, filterLevel, filterTypes?.join(",")]);

  const select = (school: SchoolResult) => {
    onChange(school);
    setQuery("");
    setResults([]);
    setOpen(false);
  };

  const clear = () => { onChange(null); setQuery(""); setResults([]); };

  return (
    <div ref={wrapRef} className="relative">
      {value ? (
        /* ── Selected state ── */
        <div
          className="flex items-center gap-3 rounded-[16px] border-[2.5px] border-[#0F172A] shadow-[3px_3px_0_0_#0F172A] p-3 bg-white"
        >
          <div className="w-9 h-9 rounded-[10px] border-[2px] border-[#0F172A] flex items-center justify-center shrink-0" style={{ background: C.skySoft }}>
            <Building2 className="w-4 h-4" style={{ color: C.blue }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-extrabold font-['Baloo_2'] text-sm leading-tight truncate">{value.name}</p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {typeBadge(value.type)}
              <span className="flex items-center gap-0.5 text-[11px] font-semibold text-slate-400">
                <MapPin className="w-3 h-3" /> {value.city ? `${value.city}, ` : ""}{value.state}
              </span>
            </div>
          </div>
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
          <button
            onClick={clear}
            className="relative w-11 h-11 rounded-full border-[2px] border-[#0F172A] flex items-center justify-center hover:bg-red-50 transition-colors shrink-0 group"
          >
            <span className="absolute inset-0 rounded-full border-2 border-red-400 opacity-0 group-hover:opacity-100 animate-ping pointer-events-none" />
            <X className="w-5 h-5 text-slate-500 group-hover:text-red-500 transition-colors" />
          </button>
        </div>
      ) : (
        /* ── Search input ── */
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            className="w-full pl-10 pr-4 py-2.5 text-sm font-semibold border-[2.5px] border-[#0F172A] rounded-[14px] shadow-[2px_2px_0_0_#0F172A] bg-white outline-none focus:shadow-[3px_3px_0_0_#0F172A] transition-shadow placeholder:text-slate-400"
          />
        </div>
      )}

      {/* ── Dropdown ── */}
      {open && !value && (query.trim().length > 0) && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 rounded-[16px] border-[2.5px] border-[#0F172A] shadow-[4px_4px_0_0_#0F172A] bg-white overflow-hidden">
          {loading ? (
            <div className="px-4 py-3 text-sm font-semibold text-slate-400">Searching…</div>
          ) : results.length === 0 ? (
            <div className="px-4 py-4 text-center">
              <p className="text-sm font-semibold text-slate-500">No schools found for "{query}"</p>
              <p className="text-xs font-semibold text-slate-400 mt-0.5">Try a shorter name or different spelling</p>
            </div>
          ) : (
            <ul>
              {results.map((s, i) => (
                <li
                  key={s.id}
                  onClick={() => select(s)}
                  className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-slate-50 transition-colors ${i !== results.length - 1 ? "border-b border-[#0F172A]/5" : ""}`}
                >
                  <div className="w-7 h-7 rounded-[8px] border-[1.5px] border-[#0F172A]/20 flex items-center justify-center shrink-0" style={{ background: C.skySoft }}>
                    <Building2 className="w-3.5 h-3.5" style={{ color: C.blue }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate text-[#0F172A]">{s.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {typeBadge(s.type)}
                      <span className="text-[10px] font-semibold text-slate-400 truncate">
                        {s.city ? `${s.city} · ` : ""}{s.state}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
