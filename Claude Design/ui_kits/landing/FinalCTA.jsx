// Final CTA block + footer note.
function FinalCTA() {
  return (
    <section className="py-32">
      <div className="container mx-auto px-6">
        <div className="mx-auto max-w-4xl rounded-[3rem] border border-blue-300/30 p-12 text-center text-white shadow-2xl"
             style={{background:'linear-gradient(135deg, hsl(220 70% 50%), hsl(220 70% 45%), hsl(200 95% 55%))'}}>
          <h2 className="text-4xl md:text-5xl font-bold" style={{fontFamily:"'Space Grotesk', sans-serif", letterSpacing:'-0.02em'}}>
            Ready to level up your CS skills?
          </h2>
          <p className="mt-4 text-xl text-white/90">Join 1,200+ students already learning on AceTerus.</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <button className="h-14 px-10 text-lg rounded-md bg-white font-medium inline-flex items-center gap-3" style={{color:'hsl(220 70% 50%)'}}>
              <img src="../../assets/logo.png" alt="" className="h-8 w-8 rounded-lg object-contain" />
              Start your first quiz
              <i data-lucide="arrow-right" className="w-5 h-5"></i>
            </button>
            <button className="h-14 px-8 text-lg rounded-md bg-white/15 border border-white/40 text-white font-medium hover:bg-white/25 transition">
              Create free account
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
Object.assign(window, { FinalCTA });
