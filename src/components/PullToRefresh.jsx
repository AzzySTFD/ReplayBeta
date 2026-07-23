import React from "react";
import { Loader2, ChevronDown } from "lucide-react";

export default function PullToRefresh({ pullDistance, refreshing }) {
  const height = refreshing ? 50 : pullDistance;
  if (height <= 0 && !refreshing) return null;

  const isPulling = pullDistance > 0 && !refreshing;

  return (
    <div
      className="flex justify-center items-end overflow-hidden"
      style={{
        height,
        transition: isPulling ? "none" : "height 0.2s ease-out",
      }}
    >
      <div
        className="mb-2 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"
        style={{ opacity: Math.min(height / 40, 1) }}
      >
        {refreshing ? (
          <Loader2 className="w-5 h-5 text-stone-400 animate-spin" />
        ) : (
          <ChevronDown
            className="w-5 h-5 text-stone-400 transition-transform duration-200"
            style={{ transform: pullDistance >= 70 ? "rotate(180deg)" : "rotate(0deg)" }}
          />
        )}
      </div>
    </div>
  );
}