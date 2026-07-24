import React, { useState } from "react";
import { cn } from "@/lib/utils";

export default function RatingScale({ value = 0, onChange, max = 10, size = "md", readOnly = false }) {
  const [hover, setHover] = useState(0);

  const sizes = {
    sm: { star: "w-3.5 h-3.5", text: "text-[10px]", gap: "gap-0.5", pad: "p-1" },
    md: { star: "w-4.5 h-4.5", text: "text-xs", gap: "gap-1", pad: "p-1" },
    lg: { star: "w-5 h-5 sm:w-6 sm:h-6", text: "text-xs sm:text-sm", gap: "gap-1 sm:gap-1.5", pad: "p-1 sm:p-1.5" },
  };

  const s = sizes[size];

  const handleSelect = (num) => {
    if (readOnly) return;
    const current = Number(value || 0);
    const nextValue = current === num ? num - 0.5 : num;
    onChange(nextValue);
  };

  const handleTouchStart = (e, num) => {
    if (readOnly) return;
    e.preventDefault();
    setHover(num);
  };

  const handleTouchEnd = (e, num) => {
    if (readOnly) return;
    e.preventDefault();
    setHover(0);
    handleSelect(num);
  };

  return (
    <div
      className="flex max-w-full items-center"
      onMouseLeave={() => !readOnly && setHover(0)}
    >
      {Array.from({ length: max }).map((_, i) => {
        const num = i + 1;
        const displayValue = hover || value || 0;
        const active = displayValue >= num;
        const halfActive = !active && displayValue >= num - 0.5;

        return (
          <button
            key={i}
            type="button"
            disabled={readOnly}
            onMouseEnter={() => !readOnly && setHover(num)}
            onClick={() => handleSelect(num)}
            onTouchStart={(e) => handleTouchStart(e, num)}
            onTouchEnd={(e) => handleTouchEnd(e, num)}
            className={cn("transition-all duration-150", s.pad, s.gap, readOnly ? "cursor-default" : "cursor-pointer")}
            style={{ touchAction: "none" }}
          >
            <div className={cn("relative", s.star)}>
              <svg viewBox="0 0 24 24" className={cn("w-full h-full text-white/20", s.star)} fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 2.75l2.9 5.86 6.48.94-4.69 4.57 1.11 6.46L12 17.98 6.2 20.63l1.11-6.46L2.62 9.55l6.48-.94L12 2.75z" />
              </svg>
              {(active || halfActive) && (
                <div className="absolute inset-0 overflow-hidden">
                  <svg viewBox="0 0 24 24" className={cn("w-full h-full text-amber-400", s.star)} fill="currentColor" stroke="currentColor" strokeWidth="0.5">
                    <path d="M12 2.75l2.9 5.86 6.48.94-4.69 4.57 1.11 6.46L12 17.98 6.2 20.63l1.11-6.46L2.62 9.55l6.48-.94L12 2.75z" />
                  </svg>
                </div>
              )}
              {halfActive && (
                <div className="absolute inset-0 overflow-hidden" style={{ width: "50%" }}>
                  <svg viewBox="0 0 24 24" className={cn("w-full h-full text-amber-400", s.star)} fill="currentColor" stroke="currentColor" strokeWidth="0.5">
                    <path d="M12 2.75l2.9 5.86 6.48.94-4.69 4.57 1.11 6.46L12 17.98 6.2 20.63l1.11-6.46L2.62 9.55l6.48-.94L12 2.75z" />
                  </svg>
                </div>
              )}
            </div>
          </button>
        );
      })}
      <span className={cn("ml-2 font-mono font-bold tabular-nums text-white/80", s.text)}>
        {(hover || value || 0).toFixed(1)}
      </span>
    </div>
  );
}
