import React from "react";
import { cn } from "@/lib/utils";
import { getRatingStarSegments } from "@/utils/ratings";

export default function RatingStars({ value = 0, className = "", size = "md" }) {
  const sizes = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  const segments = getRatingStarSegments(value, 5);

  return (
    <div className={cn("inline-flex items-center gap-1", className)} aria-hidden="true">
      {segments.map((fill, index) => (
        <span key={index} className={cn("relative inline-block", sizes[size] || sizes.md)}>
          <svg viewBox="0 0 24 24" className="absolute inset-0 h-full w-full text-white/15" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M12 2.75l2.9 5.86 6.48.94-4.69 4.57 1.11 6.46L12 17.98 6.2 20.63l1.11-6.46L2.62 9.55l6.48-.94L12 2.75z" />
          </svg>
          <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
            <svg viewBox="0 0 24 24" className="h-full w-full text-amber-400" fill="currentColor" stroke="currentColor" strokeWidth="0.5">
              <path d="M12 2.75l2.9 5.86 6.48.94-4.69 4.57 1.11 6.46L12 17.98 6.2 20.63l1.11-6.46L2.62 9.55l6.48-.94L12 2.75z" />
            </svg>
          </span>
        </span>
      ))}
    </div>
  );
}