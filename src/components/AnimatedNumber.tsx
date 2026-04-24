import { useEffect, useState } from "react";

export function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    if (display === value) return;

    const duration = 600; // ms
    const frames = 30;
    const stepTime = Math.max(16, duration / frames);
    const difference = value - display;
    const stepValue = difference / (duration / stepTime);

    let current = display;
    const timer = setInterval(() => {
      current += stepValue;
      
      // Stop condition
      if ((stepValue > 0 && current >= value) || (stepValue < 0 && current <= value)) {
        setDisplay(value);
        clearInterval(timer);
      } else {
        setDisplay(Math.round(current));
      }
    }, stepTime);

    // Cleanup timer on unmount
    return () => clearInterval(timer);
  }, [value, display]);

  return <span>{display.toLocaleString()}</span>;
}
