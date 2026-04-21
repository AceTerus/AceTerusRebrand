// Testimonials — two big quote cards.
function Testimonials() {
  const items = [
    { quote: "AceTerus helps me stay consistent with CS prep. The quizzes feel like mini wins every day.",
      author: 'Nadia Rahman', role: '2nd year CS, Purdue' },
    { quote: 'Materials + community feedback have replaced three separate tools I used before.',
      author: 'Aiden Cross', role: 'AP CS Student' },
  ];
  return (
    <section className="py-28">
      <div className="container mx-auto px-6">
        <div className="grid gap-10 lg:grid-cols-2">
          {items.map(it => (
            <div key={it.author} className="rounded-[2rem] border border-slate-200 bg-white/90 p-10 shadow-xl backdrop-blur">
              <i data-lucide="quote" className="w-10 h-10" style={{color:'hsl(220 70% 50%)'}}></i>
              <p className="mt-6 text-2xl font-light leading-relaxed">{it.quote}</p>
              <div className="mt-8 text-sm uppercase tracking-[0.3em]" style={{color:'hsl(220 70% 50%)'}}>{it.role}</div>
              <p className="text-lg font-semibold">{it.author}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
Object.assign(window, { Testimonials });
