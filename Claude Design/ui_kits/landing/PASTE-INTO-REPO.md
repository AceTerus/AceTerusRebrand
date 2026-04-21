# Paste-into-VS-Code instructions — AceTerus cartoon landing

A single drop-in React component. Works with your existing Vite + React + Tailwind repo.

---

## 1. Install the one missing dependency

```bash
npm i lucide-react
```

(Tailwind is already in your repo; no changes needed to `tailwind.config.ts`.)

---

## 2. Add fonts to `index.html`

Open `index.html` at the repo root and add inside `<head>`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link
  href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800;900&family=Baloo+2:wght@500;600;700;800&display=swap"
  rel="stylesheet"
/>
```

---

## 3. Drop the component in

Copy **`AceTerusLanding.tsx`** (sitting next to this file) into `src/pages/` or `src/components/`.

---

## 4. Make sure `/public/logo.png` exists

The navbar and footer reference `/logo.png`. If your logo lives somewhere else, find-and-replace `"/logo.png"` in `AceTerusLanding.tsx`.

---

## 5. Use it

### If you're using React Router

```tsx
// src/App.tsx
import { Routes, Route } from "react-router-dom";
import AceTerusLanding from "./pages/AceTerusLanding";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<AceTerusLanding />} />
      {/* ...your other routes */}
    </Routes>
  );
}
```

### Or standalone

```tsx
// src/App.tsx
import AceTerusLanding from "./components/AceTerusLanding";
export default function App() { return <AceTerusLanding />; }
```

---

## 6. Run it

```bash
npm run dev
```

Open `http://localhost:5173` — you should see the cartoon landing.

---

## Notes

- All brand tokens live inline in the `C` object at the top of the component. Change them there to re-theme.
- Icons come from `lucide-react` — already matched to the cartoon "blob" style with chunky borders.
- The page is self-contained — no extra CSS files to import. Animations are injected via a `<style>` tag inside the component.
- If you have ESLint complaining about the inline `<style>` tag, it's safe to ignore — it's scoped with prefixed class names (`atl-*`).

## Optional: move brand tokens to Tailwind

If you'd rather use `bg-brand-blue` etc., add to `tailwind.config.ts`:

```ts
theme: {
  extend: {
    colors: {
      brand: {
        cyan:   "#3BD6F5",
        blue:   "#2F7CFF",
        indigo: "#2E2BE5",
        ink:    "#0F172A",
        sun:    "#FFD65C",
        pop:    "#FF7A59",
      },
    },
    fontFamily: {
      display: ['"Baloo 2"', "system-ui", "sans-serif"],
      sans:    ['"Nunito"',  "system-ui", "sans-serif"],
    },
  },
},
```

Then you can simplify to `className="bg-brand-blue font-display"` etc.
