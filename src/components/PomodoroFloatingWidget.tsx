import { useRef, useState } from "react";
import { X } from "lucide-react";
import { usePomodoro, WORK_SECS, BREAK_SECS } from "@/context/PomodoroContext";

const DISPLAY = "font-['Baloo_2'] tracking-tight";

export const PomodoroFloatingWidget = () => {
  const { mode, secs, active, done, visible, toggle, switchMode, dismiss } = usePomodoro();

  const [pos, setPos] = useState({ x: -1, y: -1 });
  const drag = useRef<{ on: boolean; ox: number; oy: number }>({ on: false, ox: 0, oy: 0 });

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    drag.current = { on: true, ox: e.clientX - (pos.x === -1 ? window.innerWidth - 188 : pos.x), oy: e.clientY - (pos.y === -1 ? 16 : pos.y) };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current.on) return;
    setPos({
      x: Math.max(0, Math.min(e.clientX - drag.current.ox, window.innerWidth  - 188)),
      y: Math.max(0, Math.min(e.clientY - drag.current.oy, window.innerHeight - 160)),
    });
  };
  const onPointerUp = () => { drag.current.on = false; };

  if (!visible) return null;

  const total  = mode === "work" ? WORK_SECS : BREAK_SECS;
  const pct    = (total - secs) / total;
  const R      = 20;
  const CIRC   = 2 * Math.PI * R;
  const offset = CIRC * (1 - pct);
  const mins   = String(Math.floor(secs / 60)).padStart(2, "0");
  const ss     = String(secs % 60).padStart(2, "0");
  const bg     = done ? "#22c55e" : mode === "work" ? "#2F7CFF" : "#22c55e";

  const style: React.CSSProperties =
    pos.x === -1
      ? { position: "fixed", top: 16, right: 16 }
      : { position: "fixed", top: pos.y, left: pos.x };

  return (
    <div
      style={{ ...style, zIndex: 200, width: 172, background: bg }}
      className="rounded-[18px] border-[2.5px] border-[#0F172A] shadow-[4px_4px_0_0_#0F172A] overflow-hidden select-none"
    >
      {/* Drag zone = whole top area */}
      <div
        className="cursor-grab active:cursor-grabbing px-3 pt-2.5 pb-2"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        {/* Row 1: label + X */}
        <div className="flex items-center justify-between mb-2">
          <span className={`${DISPLAY} font-extrabold text-[11px] text-white/90 uppercase tracking-wider`}>
            {done ? "Done 🎉" : mode === "work" ? "🍅 Focus" : "☕ Break"}
          </span>
          <button
            onPointerDown={e => e.stopPropagation()}
            onClick={dismiss}
            className="w-5 h-5 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-3 h-3 text-white" />
          </button>
        </div>

        {/* Row 2: ring + big time */}
        <div className="flex items-center gap-2.5">
          <svg width="48" height="48" viewBox="0 0 48 48" className="shrink-0">
            <circle cx="24" cy="24" r={R} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="4.5" />
            <circle
              cx="24" cy="24" r={R} fill="none"
              stroke="white" strokeWidth="4.5" strokeLinecap="round"
              strokeDasharray={CIRC} strokeDashoffset={offset}
              transform="rotate(-90 24 24)"
              style={{ transition: "stroke-dashoffset 0.9s linear" }}
            />
          </svg>
          <div>
            <div className={`${DISPLAY} font-extrabold text-white leading-none`} style={{ fontSize: 28 }}>
              {done ? "🎉" : `${mins}:${ss}`}
            </div>
            <div className="text-[10px] font-bold text-white/70 uppercase tracking-wider mt-0.5">
              {done ? "session done" : mode === "work" ? "focus" : "break"}
            </div>
          </div>
        </div>
      </div>

      {/* Action button */}
      <div className="px-3 pb-3">
        {done ? (
          <button
            className="w-full py-1.5 rounded-full bg-white text-[11px] font-extrabold font-['Baloo_2'] border-[2px] border-[#0F172A] shadow-[2px_2px_0_0_#0F172A] cursor-pointer hover:-translate-y-0.5 transition-transform"
            style={{ color: bg }}
            onClick={switchMode}
          >
            {mode === "work" ? "☕ Start break" : "🎯 Focus again"}
          </button>
        ) : (
          <button
            className="w-full py-1.5 rounded-full bg-white text-[11px] font-extrabold font-['Baloo_2'] border-[2px] border-[#0F172A] shadow-[2px_2px_0_0_#0F172A] cursor-pointer hover:-translate-y-0.5 transition-transform"
            style={{ color: bg }}
            onClick={toggle}
          >
            {active ? "⏸ Pause" : "▶ Start"}
          </button>
        )}
      </div>
    </div>
  );
};
