// FeatureCards — "Everything you need to succeed" grid from Index.tsx.
function FeatureCards() {
  return (
    <section className="bg-slate-100/50 py-28">
      <div className="container mx-auto px-6">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <p className="text-sm uppercase tracking-[0.4em] font-semibold" style={{color:'hsl(220 70% 50%)'}}>What's inside</p>
          <h2 className="mt-4 text-4xl md:text-5xl font-bold" style={{fontFamily:"'Space Grotesk', sans-serif", letterSpacing:'-0.02em'}}>
            Everything you need to succeed in education
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Each module is designed to keep you accountable, inspired, and in sync with your learning milestones.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          <a href="#" className="group md:col-span-2">
            <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-10 shadow-2xl transition-all duration-300 hover:shadow-[0_0_60px_rgba(70,130,255,0.25)]">
              <div className="absolute right-0 top-0 h-64 w-64 rounded-full blur-3xl group-hover:opacity-70" style={{background:'rgba(37,99,235,.10)'}} />
              <div className="relative">
                <i data-lucide="brain" className="mb-6 w-12 h-12" style={{color:'hsl(220 70% 50%)'}}></i>
                <h3 className="text-4xl font-semibold">Interactive quizzes</h3>
                <p className="mt-3 text-lg text-slate-600">
                  Test your knowledge with engaging computer science quizzes designed to challenge and improve your skills.
                </p>
                <div className="mt-6 flex items-center gap-2 font-medium" style={{color:'hsl(220 70% 50%)'}}>
                  Take a quiz
                  <i data-lucide="arrow-right" className="w-5 h-5 transition-transform group-hover:translate-x-2"></i>
                </div>
              </div>
            </div>
          </a>

          {[{icon:'user', t:'Your profile', d:'Build your academic identity with posts, uploads, and achievements that grow alongside you.', cta:'View profiles'},
            {icon:'zap',  t:'Connect & grow', d:'Join a community of learners, share knowledge, and grow together with curated rooms and discussions.', cta:'Discover more'}
          ].map(c => (
            <a key={c.t} href="#" className="group">
              <div className="h-full rounded-3xl border border-slate-200 bg-white p-8 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_40px_rgba(70,130,255,0.25)]">
                <i data-lucide={c.icon} className="mb-6 w-10 h-10" style={{color:'hsl(220 70% 50%)'}}></i>
                <h3 className="text-2xl font-semibold">{c.t}</h3>
                <p className="mt-4 text-slate-600">{c.d}</p>
                <div className="mt-6 flex items-center gap-2 text-sm font-semibold" style={{color:'hsl(220 70% 50%)'}}>
                  {c.cta}
                  <i data-lucide="arrow-right" className="w-4 h-4 transition-transform group-hover:translate-x-1"></i>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
Object.assign(window, { FeatureCards });
