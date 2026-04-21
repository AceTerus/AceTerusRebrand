// Hero — 1:1 from src/pages/Index.tsx <section> first child.
function Hero() {
  const heroStats = [
    { label: 'Active learners',   value: '12K+' },
    { label: 'Resources shared',  value: '4.3K' },
    { label: 'Avg. session score',value: '4.9/5' },
  ];
  return (
    <section className="relative min-h-[95vh] flex items-center overflow-hidden">
      {/* Soft brand wash stands in for the promotional video */}
      <div className="absolute inset-0" style={{background:'linear-gradient(135deg, hsl(220 70% 50%) 0%, hsl(200 95% 55%) 100%)', opacity:.25}} />
      <div className="absolute inset-0 bg-gradient-to-br from-white/95 via-white/60 to-white/30" />

      <div className="container relative mx-auto px-6 py-24">
        <div className="space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/80 px-4 py-2 shadow-sm">
            <i data-lucide="sparkles" className="w-4 h-4" style={{color:'hsl(220 70% 50%)'}}></i>
            <span className="text-sm font-medium tracking-wide">Where learning meets achievement</span>
          </div>

          <h1 className="font-bold leading-[1.02] tracking-tight text-5xl md:text-7xl lg:text-8xl" style={{fontFamily:"'Space Grotesk', sans-serif", letterSpacing:'-0.025em'}}>
            Ace your
            <span className="block" style={{color:'hsl(220 70% 50%)'}}>journey</span>
            with AceTerus
          </h1>

          <p className="max-w-2xl text-lg md:text-2xl text-slate-700/90">
            Immersive quizzes, collaborative materials, and live insights—crafted to keep you learning, sharing, and celebrating every win.
          </p>

          <div className="flex flex-wrap gap-4">
            <button className="group h-14 px-8 text-lg rounded-md text-white font-medium inline-flex items-center gap-2 shadow-[0_0_40px_rgba(70,130,255,0.45)] transition-all hover:scale-[1.02]"
                    style={{background:'linear-gradient(135deg, hsl(220 70% 50%), hsl(220 70% 60%))'}}>
              Start Learning
              <i data-lucide="arrow-right" className="w-5 h-5 transition-transform group-hover:translate-x-1"></i>
            </button>
            <button className="h-14 px-8 text-lg rounded-md border border-slate-300 bg-white font-medium hover:bg-slate-50 transition-all">
              Sign Up — it's free!
            </button>
          </div>

          <div className="grid gap-6 pt-10 sm:grid-cols-3 max-w-2xl">
            {heroStats.map(s => (
              <div key={s.label} className="rounded-2xl border border-black/10 bg-white/80 p-4 text-center shadow-md">
                <p className="text-3xl font-bold">{s.value}</p>
                <p className="text-sm uppercase tracking-wide text-slate-600">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
Object.assign(window, { Hero });
