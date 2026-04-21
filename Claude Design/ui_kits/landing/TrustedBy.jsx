// TrustedBy strip — 1:1 from Index.tsx.
function TrustedBy() {
  const logos = ['PoliTech', 'Northstar STEM', 'ACE Collegiate', 'Quantum Labs'];
  return (
    <section className="border-y border-slate-200/60 bg-slate-50/40 py-8">
      <div className="container mx-auto px-6">
        <p className="mb-6 text-center text-sm uppercase tracking-[0.5em] text-slate-500">Trusted by learners at</p>
        <div className="grid gap-4 text-center text-base font-semibold text-slate-500 sm:grid-cols-2 lg:grid-cols-4">
          {logos.map(l => (
            <div key={l} className="rounded-2xl border border-slate-200/60 bg-white/40 px-6 py-4">{l}</div>
          ))}
        </div>
      </div>
    </section>
  );
}
Object.assign(window, { TrustedBy });
