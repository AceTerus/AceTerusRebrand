import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function vibrate(pattern: number | number[] = 50) {
  if (typeof window !== 'undefined' && 'navigator' in window && window.navigator.vibrate) {
    try { window.navigator.vibrate(pattern); } catch { /* vibrate not supported */ }
  }
}

export function triggerConfetti() {
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js';
  script.onload = () => {
    const minion = (window as any).confetti;
    if (minion) minion({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
  };
  document.body.appendChild(script);
  setTimeout(() => document.body.removeChild(script), 3000);
}
