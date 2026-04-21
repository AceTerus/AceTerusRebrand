# Landing UI Kit

Pixel-faithful recreation of `src/pages/Index.tsx` from `AceTerus/AceTerusWebpage`, the public-facing marketing landing page.

## Files
- `index.html` — entry. Loads Tailwind CDN, Lucide, React + Babel, then mounts `<App />`.
- `Navbar.jsx` — fixed top nav with logo + Sign In CTA.
- `Hero.jsx` — headline, stats row, primary + outline CTAs.
- `TrustedBy.jsx` — four-logo trust strip.
- `GetStarted.jsx` — 4-step onboarding block (frosted glass cards).
- `FeatureCards.jsx` — "Everything you need" grid with wide quiz card + profile/community cards.
- `Testimonials.jsx` — two big-quote cards.
- `FinalCTA.jsx` — gradient pill with logo-marked CTA.

## Design notes
- Components are cosmetic recreations — no routing, no auth, no scroll hijack. Click handlers are omitted.
- Tailwind runs via CDN, so arbitrary-value classes (`rounded-[3rem]`) and hsl() literals work as in the source.
- All copy is verbatim from `Index.tsx`.
- Hero video is replaced with a soft brand-gradient wash; swap in a real `<video>` at `../../assets/promo.mp4` once available.
- Icons come from Lucide CDN, matching `lucide-react` in the repo.
