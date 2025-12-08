import { useState, useEffect } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export const ThemeToggle = () => {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("theme");
      if (stored) return stored === "dark";
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDark]);

  // Initialize on mount
  useEffect(() => {
    const stored = localStorage.getItem("theme");
    if (stored === "dark") {
      document.documentElement.classList.add("dark");
    } else if (stored === "light") {
      document.documentElement.classList.remove("dark");
    } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      document.documentElement.classList.add("dark");
      setIsDark(true);
    }
  }, []);

  return (
    <div className="fixed bottom-6 right-6 z-[9999]">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsDark(!isDark)}
            className="h-12 w-12 rounded-full border-2 bg-background shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110"
          >
            {isDark ? (
              <Sun className="h-5 w-5 text-yellow-500 transition-transform duration-300 rotate-0 hover:rotate-90" />
            ) : (
              <Moon className="h-5 w-5 text-slate-700 transition-transform duration-300" />
            )}
            <span className="sr-only">Toggle theme</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>Switch to {isDark ? "light" : "dark"} mode</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
};

