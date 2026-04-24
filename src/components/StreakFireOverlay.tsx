import { useEffect } from "react";
import { createPortal } from "react-dom";
import Lottie from "lottie-react";
import fireAnimation from "@/assets/fire-animation.json";
import { Flame } from "lucide-react";

interface StreakFireOverlayProps {
  streak: number;
  onDismiss: () => void;
}

const StreakFireOverlay = ({ streak, onDismiss }: StreakFireOverlayProps) => {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 3000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm cursor-pointer"
      onClick={onDismiss}
    >
      {/* Fire animation */}
      <div className="w-64 h-64 pointer-events-none select-none">
        <Lottie animationData={fireAnimation} loop autoplay />
      </div>

      {/* Streak number */}
      <div className="flex flex-col items-center gap-2 -mt-6">
        <div className="flex items-center gap-2">
          <Flame className="w-8 h-8 text-orange-400 drop-shadow-[0_0_8px_rgba(251,146,60,0.8)]" />
          <span className="text-6xl font-extrabold text-white drop-shadow-[0_0_12px_rgba(251,146,60,0.9)]">
            {streak}
          </span>
          <Flame className="w-8 h-8 text-orange-400 drop-shadow-[0_0_8px_rgba(251,146,60,0.8)]" />
        </div>
        <p className="text-xl font-bold text-orange-300 tracking-wide uppercase">
          Day Streak!
        </p>
        <p className="text-sm text-white/60 mt-1">Tap anywhere to continue</p>
      </div>
    </div>,
    document.body
  );
};

export default StreakFireOverlay;
