// AceTerusLanding.tsx
// Drop-in landing page for AceTerus. Works with Vite + React + Tailwind.
//
// Prereqs in your repo:
// 1. Tailwind CSS installed and configured (it is, per your repo).
// 2. lucide-react installed:   npm i lucide-react
// 3. Nunito + Baloo 2 fonts — add this <link> to index.html <head>:
//      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800;900&family=Baloo+2:wght@500;600;700;800&display=swap" rel="stylesheet">
// 4. (Optional) Add brand tokens to tailwind.config.ts — see README-paste.md.
// 5. Place your logo at /public/logo.png (or change the <img src> below).
//
// Usage:
//   import AceTerusLanding from "./AceTerusLanding";
//   export default function App(){ return <AceTerusLanding/>; }

import React from "react";
import {
  ArrowRight, Rocket, Eye, Zap, Sparkles, Star, Flame, CheckCircle2, Trophy,
  Brain, Users, FileText, Play,
} from "lucide-react";

/* ---------- brand tokens (inline so no tailwind config edit required) ---------- */
const C = {
  cyan: "#3BD6F5",
  blue: "#2F7CFF",
  indigo: "#2E2BE5",
  ink: "#0F172A",
  skySoft: "#DDF3FF",
  blueSoft: "#C8DEFF",
  indigoSoft: "#D6D4FF",
  cloud: "#F3FAFF",
  sun: "#FFD65C",
  pop: "#FF7A59",
};

/* ---------- shared class snippets ---------- */
const DISPLAY = "font-[Baloo_2] tracking-tight";
const BODY = "font-[Nunito]";
const STICKER =
  "border-[3px] border-[#0F172A] rounded-[28px] shadow-[6px_6px_0_0_#0F172A] bg-white";
const STICKER_SM =
  "border-[2.5px] border-[#0F172A] rounded-[18px] shadow-[4px_4px_0_0_#0F172A] bg-white";
const PILL =
  "border-[2.5px] border-[#0F172A] rounded-full shadow-[3px_3px_0_0_#0F172A] bg-white";
const BTN =
  "inline-flex items-center gap-2.5 font-extrabold font-[Baloo_2] border-[3px] border-[#0F172A] rounded-full px-6 py-3.5 shadow-[6px_6px_0_0_#0F172A] transition-transform duration-150 hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[8px_8px_0_0_#0F172A] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_0_#0F172A]";
const TAG =
  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border-[2.5px] border-[#0F172A] font-extrabold text-xs";

/* ---------- icon blob (pill-bg cartoon icon) ---------- */
function IconBlob({ bg, children }: { bg: string; children: React.ReactNode }) {
  return (
    <div
      className="relative w-16 h-16 rounded-[22px] border-[3px] border-[#0F172A] flex items-center justify-center shadow-[4px_4px_0_0_#0F172A]"
      style={{ background: bg }}
    >
      <span
        aria-hidden
        className="absolute top-2 left-2.5 w-4 h-2.5 rounded-[10px] bg-white/70"
        style={{ transform: "rotate(-18deg)" }}
      />
      {children}
    </div>
  );
}

/* ---------- reusable tilt helper ---------- */
const tiltL: React.CSSProperties = { transform: "rotate(-2.5deg)" };
const tiltR: React.CSSProperties = { transform: "rotate(2.5deg)" };

export default function AceTerusLanding() {
  return (
    <div
      className={`${BODY} relative text-[#0F172A] min-h-screen`}
      style={{
        backgroundImage: `
          radial-gradient(1200px 600px at 85% -10%, rgba(59,214,245,.55), transparent 60%),
          radial-gradient(900px 500px at -5% 10%, rgba(47,124,255,.45), transparent 60%),
          radial-gradient(800px 600px at 50% 100%, rgba(46,43,229,.30), transparent 60%)
        `,
        backgroundColor: C.cloud,
      }}
    >
      {/* subtle grain overlay */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[1] opacity-[0.05] mix-blend-multiply"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.6'/></svg>\")",
        }}
      />

      {/* keyframes + helpers */}
      <style>{`
        @keyframes atl-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        @keyframes atl-wobble { 0%,100%{transform:rotate(-3deg)} 50%{transform:rotate(3deg)} }
        @keyframes atl-marq { from{transform:translateX(0)} to{transform:translateX(-50%)} }
        .atl-float  { animation: atl-float 4s ease-in-out infinite; }
        .atl-float2 { animation: atl-float 5s ease-in-out infinite .6s; }
        .atl-float3 { animation: atl-float 3.5s ease-in-out infinite 1.2s; }
        .atl-wobble { animation: atl-wobble 6s ease-in-out infinite; }
        .atl-marq   { animation: atl-marq 24s linear infinite; }
        .atl-underline{ position:relative; display:inline-block; }
        .atl-underline::after{
          content:''; position:absolute; left:-4px; right:-4px; bottom:2px;
          height:14px; z-index:-1; background:${C.cyan}; border-radius:8px;
          transform:rotate(-1.5deg);
        }
        .atl-dots{ background-image: radial-gradient(${C.blue} 2px, transparent 2px); background-size:20px 20px; }
      `}</style>

      {/* NAV */}
      <header className="sticky top-0 z-30 px-5 py-4">
        <div className={`${PILL} max-w-6xl mx-auto flex items-center justify-between px-5 py-2`}>
          <a href="#" className="flex items-center gap-2">
            <img src="/logo.png" alt="AceTerus" className="w-10 h-10 rounded-xl" />
            <span className={`${DISPLAY} font-extrabold text-xl`}>AceTerus</span>
          </a>
          <nav className="hidden md:flex items-center gap-6 font-bold text-sm">
            <a href="#play" className="hover:text-[#2F7CFF]">Play</a>
            <a href="#learn" className="hover:text-[#2F7CFF]">Learn</a>
            <a href="#squad" className="hover:text-[#2F7CFF]">Squad</a>
            <a href="#rewards" className="hover:text-[#2F7CFF]">Rewards</a>
          </nav>
          <button className={`${BTN} !py-2 !px-4 !text-sm text-white`} style={{ background: C.blue }}>
            Jump in <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* HERO */}
      <section className="relative px-5 pt-10 pb-24 overflow-hidden">
        {/* clouds */}
        <div className="absolute atl-float bg-white border-[3px] border-[#0F172A] rounded-full shadow-[4px_4px_0_0_#0F172A]" style={{ top: 80, left: "6%", width: 110, height: 48 }} />
        <div className="absolute atl-float2 bg-white border-[3px] border-[#0F172A] rounded-full shadow-[4px_4px_0_0_#0F172A]" style={{ top: 180, right: "8%", width: 90, height: 40 }} />
        <div className="absolute atl-float3 bg-white border-[3px] border-[#0F172A] rounded-full shadow-[4px_4px_0_0_#0F172A]" style={{ bottom: 100, left: "45%", width: 70, height: 32 }} />
        {/* sparkles */}
        <Sparkles className="absolute atl-float" style={{ top: 140, left: "10%", color: C.cyan, width: 28, height: 28 }} />
        <Star className="absolute atl-float2" style={{ top: 70, right: "14%", color: C.indigo, fill: C.indigo, width: 30, height: 30 }} />
        <Zap className="absolute atl-float3" style={{ bottom: 50, left: "20%", color: C.sun, fill: C.sun, width: 28, height: 28 }} />

        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center relative">
          <div>
            <span className={TAG} style={{ background: C.cyan }}>
              <Zap className="w-3.5 h-3.5" /> #1 study sidekick for kids &amp; teens
            </span>
            <h1 className={`${DISPLAY} font-extrabold mt-5 leading-[0.95]`} style={{ fontSize: "clamp(44px,7vw,96px)" }}>
              Learn stuff.<br />
              <span className="atl-underline">Ace quizzes.</span><br />
              <span style={{ color: C.blue }}>Have fun</span> doing it.
            </h1>
            <p className="mt-6 text-lg md:text-xl max-w-xl font-medium">
              AceTerus turns studying into a game you actually wanna play. Quizzes, streaks, squads, and a cheeky mascot named Ace — all in one app. Built for students, powered by AI.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <button className={`${BTN} text-white`} style={{ background: C.blue }}>
                Start my quest <Rocket className="w-5 h-5" />
              </button>
              <button className={`${BTN} bg-white`}>
                Peek inside <Eye className="w-5 h-5" />
              </button>
            </div>
            <div className="mt-8 flex items-center gap-3">
              <div className="flex -space-x-2">
                {[C.cyan, C.blue, C.indigo, C.sun].map((c, i) => (
                  <div key={i} className="w-9 h-9 rounded-full border-[3px] border-[#0F172A]" style={{ background: c }} />
                ))}
              </div>
              <p className="font-bold text-sm">12,000+ students already levelling up today</p>
            </div>
          </div>

          {/* MASCOT CLUSTER */}
          <div className="relative h-[520px]">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-[380px] h-[380px] rounded-full atl-wobble border-[4px] border-[#0F172A] shadow-[10px_10px_0_0_#0F172A]" style={{ background: C.blue }} />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <svg viewBox="0 0 260 260" className="w-[280px] h-[280px] atl-float">
                <g stroke="#0F172A" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round">
                  <ellipse cx={130} cy={140} rx={100} ry={95} fill={C.cyan} />
                  <ellipse cx={95} cy={105} rx={24} ry={14} fill={C.skySoft} stroke="none" opacity={0.7} />
                  <circle cx={95} cy={130} r={13} fill="#0F172A" />
                  <circle cx={165} cy={130} r={13} fill="#0F172A" />
                  <circle cx={100} cy={125} r={3.5} fill="#fff" stroke="none" />
                  <circle cx={170} cy={125} r={3.5} fill="#fff" stroke="none" />
                  <path d="M95 170 Q130 200 165 170" fill="none" />
                  <ellipse cx={70} cy={160} rx={14} ry={8} fill={C.pop} opacity={0.85} />
                  <ellipse cx={190} cy={160} rx={14} ry={8} fill={C.pop} opacity={0.85} />
                  <path d="M78 72 Q130 20 182 72 Q182 80 78 80 Z" fill={C.indigo} />
                  <circle cx={130} cy={38} r={7} fill={C.sun} />
                </g>
              </svg>
            </div>

            {/* floating preview cards */}
            <div className={`${STICKER_SM} absolute top-2 left-2 p-3 w-44 atl-float`} style={{ ...tiltL, background: C.cyan }}>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-[14px] border-[2px] border-[#0F172A] bg-white flex items-center justify-center shadow-[3px_3px_0_0_#0F172A]">
                  <Flame className="w-5 h-5" style={{ color: C.pop }} />
                </div>
                <div>
                  <div className={`${DISPLAY} font-extrabold text-lg leading-none`}>12 day</div>
                  <div className="text-[10px] font-bold">streak 🔥</div>
                </div>
              </div>
            </div>
            <div className={`${STICKER_SM} absolute bottom-4 right-0 p-3 w-52 atl-float2`} style={tiltR}>
              <div className="text-[10px] font-bold mb-1 uppercase tracking-wider" style={{ color: C.blue }}>Quiz · Biology</div>
              <div className="font-bold text-sm leading-snug">What powers the mitochondria?</div>
              <div className="mt-2 flex items-center justify-between">
                <div className="text-[10px] font-bold" style={{ color: C.indigo }}>+50 XP</div>
                <CheckCircle2 className="w-5 h-5" style={{ color: C.blue }} />
              </div>
            </div>
            <div className={`${STICKER_SM} absolute top-28 right-2 p-2.5 w-36 atl-float3 text-white`} style={{ ...tiltR, background: C.indigo }}>
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5" style={{ color: C.sun }} />
                <div className={`${DISPLAY} font-extrabold text-xs`}>Top 3 this week!</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MARQUEE */}
      <section className="py-6 border-y-[3px] border-[#0F172A] text-white" style={{ background: C.indigo }}>
        <div className="overflow-hidden">
          <div className={`${DISPLAY} atl-marq flex gap-10 font-extrabold text-2xl whitespace-nowrap`}>
            {Array.from({ length: 2 }).map((_, i) => (
              <span key={i}>✦ LEARN FASTER ✦ PLAY HARDER ✦ QUIZ YOUR FRIENDS ✦ STREAKS ✦ SQUADS ✦ XP ✦ AI TUTOR ✦ ACE IT ✦ LEARN FASTER ✦ PLAY HARDER ✦ QUIZ YOUR FRIENDS ✦ STREAKS ✦ SQUADS ✦ XP ✦ AI TUTOR ✦ ACE IT ✦</span>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="play" className="px-5 py-24">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <span className={TAG} style={{ background: C.cyan }}>What's inside</span>
            <h2 className={`${DISPLAY} font-extrabold mt-4 leading-none`} style={{ fontSize: "clamp(36px,5vw,64px)" }}>
              Your new favourite<br />study kit 🎒
            </h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { t: "Brainy quizzes", d: "500+ bite-sized quizzes that feel like mini-games. Make your own or steal ones from the community.", Icon: Brain, cardBg: C.cyan, blob: C.blue, iconColor: "#fff", tilt: tiltL },
              { t: "Streaks that stick", d: "Show up, earn XP, keep your flame alive. Miss a day and Ace will absolutely guilt-trip you (lovingly).", Icon: Flame, cardBg: C.blueSoft, blob: C.indigo, iconColor: "#fff" },
              { t: "AI study buddy", d: "Stuck on a topic? Ace breaks it down like your coolest tutor — memes and analogies included.", Icon: Sparkles, cardBg: C.indigo, blob: C.cyan, iconColor: "#0F172A", text: "#fff", tilt: tiltR },
              { t: "Squad up", d: "Pull your besties in. Study sessions, shared notes, group quizzes. It's more fun when nobody fails alone.", Icon: Users, cardBg: C.skySoft, blob: C.sun, iconColor: "#0F172A", tilt: tiltR },
              { t: "Drop your notes", d: "Upload a PDF, get a quiz. Upload a photo, get a summary. Pure magic, zero effort.", Icon: FileText, cardBg: C.indigoSoft, blob: C.blue, iconColor: "#fff" },
              { t: "Real rewards", d: "Climb the leaderboard, collect badges, unlock mascot skins. Yes, tiny hats are a core feature.", Icon: Trophy, cardBg: C.blue, blob: C.sun, iconColor: "#0F172A", text: "#fff", tilt: tiltL },
            ].map(({ t, d, Icon, cardBg, blob, iconColor, text, tilt }) => (
              <div key={t} className={`${STICKER} p-6`} style={{ background: cardBg, color: text ?? "#0F172A", ...(tilt ?? {}) }}>
                <IconBlob bg={blob}>
                  <Icon className="w-[30px] h-[30px]" strokeWidth={2.5} style={{ color: iconColor }} />
                </IconBlob>
                <h3 className={`${DISPLAY} font-extrabold text-2xl mt-4`}>{t}</h3>
                <p className="mt-2 font-medium">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="learn" className="px-5 py-24 relative border-y-[3px] border-[#0F172A]" style={{ background: C.skySoft }}>
        <div className="absolute top-8 right-8 atl-dots w-28 h-28 opacity-60" />
        <div className="absolute bottom-8 left-8 atl-dots w-24 h-24 opacity-60" />
        <div className="max-w-6xl mx-auto relative">
          <div className="text-center mb-16">
            <span className={`${TAG} text-white`} style={{ background: C.blue }}>3 easy steps</span>
            <h2 className={`${DISPLAY} font-extrabold mt-4 leading-none`} style={{ fontSize: "clamp(36px,5vw,64px)" }}>
              How it works ✨
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { n: "1", c: C.cyan, t: "Sign up free", d: "Takes 30 seconds. We promise. No cards, no catches.", tilt: tiltL },
              { n: "2", c: C.blue, t: "Pick your subjects", d: "Ace tailors quizzes, reminders, and vibes just for you." },
              { n: "3", c: C.indigo, t: "Start acing it", d: "Play daily, crush streaks, flex on the leaderboard.", tilt: tiltR },
            ].map(({ n, c, t, d, tilt }) => (
              <div key={n} className={`${STICKER} p-6 text-center`} style={tilt}>
                <div className={`${DISPLAY} font-extrabold text-7xl`} style={{ color: c, WebkitTextStroke: `3px ${C.ink}` }}>{n}</div>
                <h3 className={`${DISPLAY} font-extrabold text-2xl`}>{t}</h3>
                <p className="font-medium mt-2">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section id="squad" className="px-5 py-24">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <span className={TAG} style={{ background: C.cyan }}>Real students</span>
            <h2 className={`${DISPLAY} font-extrabold mt-4 leading-none`} style={{ fontSize: "clamp(36px,5vw,64px)" }}>
              The squad loves it 💙
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { q: "I went from failing bio to actually explaining mitochondria at dinner. Parents are shook.", n: "Nadia, 16", r: "High school, KL", bg: "#fff", starColor: C.blue, avBg: C.cyan, tilt: tiltL },
              { q: "Streaks are evil in the best way. I literally cannot miss a day or Ace gets sad.", n: "Aiden, 14", r: "Year 9", bg: C.cyan, starColor: C.indigo, avBg: C.indigo },
              { q: "My squad of 6 studies together every night now. It's basically TikTok but for quizzes.", n: "Mei, 17", r: "Pre-U", bg: C.indigo, starColor: C.sun, avBg: C.sun, text: "#fff", tilt: tiltR },
            ].map((x, i) => (
              <div key={i} className={`${STICKER} p-6`} style={{ background: x.bg, color: x.text ?? "#0F172A", ...(x.tilt ?? {}) }}>
                <div className="flex items-center gap-1 text-xl" style={{ color: x.starColor }}>★★★★★</div>
                <p className="mt-3 font-medium text-lg">"{x.q}"</p>
                <div className="mt-5 flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full border-[3px] border-[#0F172A]" style={{ background: x.avBg }} />
                  <div>
                    <div className={`${DISPLAY} font-extrabold`}>{x.n}</div>
                    <div className="text-xs font-bold opacity-70">{x.r}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* STATS */}
      <section id="rewards" className="px-5 py-16">
        <div className={`${STICKER} max-w-6xl mx-auto p-10 grid md:grid-cols-4 gap-6 text-center text-white`} style={{ background: C.blue }}>
          {[
            { n: "12K+", l: "happy learners" },
            { n: "4.3K", l: "quizzes shared" },
            { n: "890K", l: "streak days 🔥" },
            { n: "4.9★", l: "avg rating" },
          ].map((s) => (
            <div key={s.n}>
              <div className={`${DISPLAY} font-extrabold text-5xl`}>{s.n}</div>
              <div className="font-bold text-sm mt-1">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-5 py-24">
        <div
          className={`${STICKER} max-w-4xl mx-auto p-12 text-center relative overflow-hidden text-white`}
          style={{ background: `linear-gradient(135deg, ${C.cyan} 0%, ${C.blue} 55%, ${C.indigo} 100%)` }}
        >
          <Star className="absolute" style={{ top: 20, left: 30, color: C.sun, fill: C.sun, width: 36, height: 36 }} />
          <Sparkles className="absolute" style={{ bottom: 20, right: 30, color: "#fff", width: 36, height: 36 }} />
          <h2 className={`${DISPLAY} font-extrabold leading-none`} style={{ fontSize: "clamp(36px,6vw,72px)" }}>
            Ready to ace it?
          </h2>
          <p className="mt-4 font-bold text-lg md:text-xl max-w-xl mx-auto">
            Join 12,000+ students turning study sessions into a sport. Free forever. Zero boring bits.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <button className={`${BTN} bg-white text-[#0F172A]`}>Let's go! <Rocket className="w-5 h-5" /></button>
            <button className={`${BTN} text-white`} style={{ background: C.ink }}>Watch the vibes <Play className="w-5 h-5" /></button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="px-5 py-10">
        <div className={`${PILL} max-w-6xl mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-3`}>
          <div className="flex items-center gap-2">
            <img src="/logo.png" className="w-8 h-8 rounded-lg" />
            <span className={`${DISPLAY} font-extrabold`}>AceTerus</span>
          </div>
          <div className="flex gap-5 font-bold text-sm">
            <a href="#">About</a><a href="#">Schools</a><a href="#">Privacy</a><a href="#">Contact</a>
          </div>
          <div className="font-bold text-xs opacity-70">Made with 💙 for curious kids.</div>
        </div>
      </footer>
    </div>
  );
}
