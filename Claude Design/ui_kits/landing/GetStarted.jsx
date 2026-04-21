// GetStarted — the 4-step journey block.
function GetStarted() {
  const toolkit = [
    { title: 'Quizzes',       tagline: '500+ curated CS questions' },
    { title: 'Materials',     tagline: 'Notes & diagrams for fast learning' },
    { title: 'AI Analytics',  tagline: 'Track strengths & weaknesses' },
    { title: 'Tutor Classes', tagline: 'Live & recorded CS sessions' },
  ];
  return (
    <section id="get-started" className="relative overflow-hidden py-32">
      <div className="absolute inset-0" style={{background:'linear-gradient(135deg, rgba(37,99,235,.05), rgba(59,214,245,.05), rgba(241,245,249,.3))'}} />
      <div className="absolute inset-x-0 top-10 mx-auto h-48 w-48 rounded-full bg-blue-500/20 blur-3xl" />
      <div className="container relative mx-auto px-6">
        <div className="mx-auto mb-16 max-w-4xl text-center space-y-6">
          <h2 className="text-4xl md:text-6xl font-bold" style={{fontFamily:"'Space Grotesk', sans-serif", letterSpacing:'-0.02em'}}>
            Start your journey with AceTerus
          </h2>
          <p className="text-xl text-slate-600">
            A powerful all-in-one platform to help you master computer science through quizzes, study materials, AI analytics, and a thriving community.
          </p>
        </div>

        <div className="grid gap-10 md:grid-cols-2 max-w-6xl mx-auto">
          {[{n:'1. Sign up — free', d:'Create your account instantly using Google or email. No friction, no commitment—just immediate access to your dashboard.'},
            {n:'2. Personalize everything', d:'Choose topics, pace, and study goals so AceTerus can adapt quizzes, reminders, and recommended materials to you.'}
          ].map(c => (
            <div key={c.n} className="rounded-3xl border border-white/20 bg-white/70 p-8 shadow-2xl backdrop-blur-lg">
              <h3 className="text-3xl font-semibold">{c.n}</h3>
              <p className="mt-4 text-slate-600">{c.d}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-[2.5rem] border border-white/20 bg-white/80 p-10 shadow-2xl backdrop-blur-lg">
          <h3 className="mb-10 text-center text-3xl font-semibold">3. Explore the toolkit</h3>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {toolkit.map(f => (
              <div key={f.title} className="rounded-2xl border border-slate-200/60 bg-white/80 p-6 text-center shadow-lg">
                <h4 className="text-2xl font-semibold">{f.title}</h4>
                <p className="mt-2 text-sm text-slate-600">{f.tagline}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 rounded-3xl border border-slate-200/60 bg-white/90 p-10 text-center shadow-xl">
          <h3 className="text-3xl font-semibold">4. Join the community feed</h3>
          <p className="mt-4 text-slate-600">
            Share your progress, ask questions, get feedback, and learn together with other students. AceTerus isn't just a platform—it's a community.
          </p>
        </div>
      </div>
    </section>
  );
}
Object.assign(window, { GetStarted });
