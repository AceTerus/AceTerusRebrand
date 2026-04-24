import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Home } from "lucide-react";

const C = {
  indigo: '#2E2BE5', ink: '#0F172A', indigoSoft: '#D6D4FF', pop: '#FF7A59',
};
const DISPLAY = "font-['Baloo_2'] tracking-tight";

interface Props {
  message?: string;
}

export function SignInGate({ message = "Please sign in to continue." }: Props) {
  const navigate = useNavigate();
  const [count, setCount] = useState(5);

  useEffect(() => {
    if (count <= 0) { navigate("/"); return; }
    const t = setTimeout(() => setCount(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [count, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#F8FAFF' }}>
      <div
        className="w-full max-w-sm border-[2.5px] border-[#0F172A] rounded-[24px] shadow-[4px_4px_0_0_#0F172A] bg-white overflow-hidden"
      >
        {/* Header band */}
        <div
          className="flex items-center gap-3 px-6 py-4 border-b-[2.5px] border-[#0F172A]"
          style={{ background: C.indigoSoft }}
        >
          <div
            className="w-10 h-10 rounded-[14px] border-[2px] border-[#0F172A] shadow-[2px_2px_0_0_#0F172A] flex items-center justify-center shrink-0"
            style={{ background: C.indigo }}
          >
            <Lock className="w-5 h-5 text-white" />
          </div>
          <p className={`${DISPLAY} font-extrabold text-lg`}>Sign in required</p>
        </div>

        {/* Body */}
        <div className="px-6 py-6 flex flex-col items-center gap-5 text-center">
          <p className="font-semibold text-slate-500 text-sm leading-relaxed">{message}</p>

          {/* Countdown ring */}
          <div className="relative flex items-center justify-center">
            <svg className="w-20 h-20 -rotate-90" viewBox="0 0 64 64">
              <circle cx="32" cy="32" r="28" fill="none" stroke="#E2E8F0" strokeWidth="5" />
              <circle
                cx="32" cy="32" r="28" fill="none"
                stroke={C.indigo} strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 28}`}
                strokeDashoffset={`${2 * Math.PI * 28 * (1 - count / 5)}`}
                style={{ transition: 'stroke-dashoffset 0.9s linear' }}
              />
            </svg>
            <span className={`${DISPLAY} font-extrabold text-2xl absolute`} style={{ color: C.indigo }}>
              {count}
            </span>
          </div>

          <p className="text-xs font-semibold text-slate-400">
            Redirecting to home in {count} second{count !== 1 ? 's' : ''}…
          </p>

          <button
            onClick={() => navigate("/")}
            className={`${DISPLAY} inline-flex items-center gap-2 font-extrabold text-sm border-[2.5px] border-[#0F172A] rounded-full px-6 py-2.5 shadow-[3px_3px_0_0_#0F172A] hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#0F172A] transition-all text-white cursor-pointer`}
            style={{ background: C.indigo }}
          >
            <Home className="w-4 h-4" /> Go to Home
          </button>
        </div>
      </div>
    </div>
  );
}
