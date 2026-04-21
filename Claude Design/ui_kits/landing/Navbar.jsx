// AceTerus landing — Navbar
// Source: src/components/Navbar.tsx in AceTerusWebpage
// Public variant: no auth state, shows Sign In CTA only.
function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-[hsl(214.3_31.8%_91.4%)] shadow-[0_10px_30px_-10px_rgba(37,99,235,0.10)]" style={{height:80}}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          <a href="#" className="group">
            <img src="../../assets/logo.png" alt="AceTerus"
                 className="w-20 h-20 object-contain rounded-xl transition-all duration-300 group-hover:drop-shadow-[0_0_24px_rgba(70,130,255,0.45)]" />
          </a>
          <div className="hidden md:flex items-center gap-2">
            <a href="#get-started">
              <button className="h-11 px-6 text-[15px] font-semibold flex items-center gap-2 rounded-xl text-white shadow-[0_0_40px_rgba(70,130,255,0.35)] transition-all hover:scale-[1.02]"
                      style={{background:'linear-gradient(135deg, hsl(220 70% 50%), hsl(220 70% 60%))'}}>
                <i data-lucide="log-in" className="w-[18px] h-[18px]"></i>
                <span>Sign In</span>
              </button>
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
}
Object.assign(window, { Navbar });
