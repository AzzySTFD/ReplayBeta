import React from "react";
import { cn } from "@/lib/utils";
import RatingStars from "@/components/RatingStars";
import { formatRatingDescription } from "@/utils/ratings";

export default function RatingInput({ value = 0, onChange, readOnly = false, className = "" }) {
  const normalizedValue = Number.isFinite(Number(value)) ? Math.min(Math.max(Math.round(Number(value)), 0), 100) : 0;

  const handleChange = (event) => {
    if (readOnly) return;
    const nextValue = Number(event.target.value);
    if (!Number.isFinite(nextValue)) {
      onChange(0);
      return;
    }

    onChange(Math.min(100, Math.max(0, Math.round(nextValue))));
  };

  return (
    <div className={cn("rounded-3xl border border-white/10 bg-black/15 px-4 py-5 shadow-lg shadow-black/20", className)}>
      <div className="mx-auto flex max-w-sm flex-col items-center text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/35">Rate Album</p>
        <label className="mt-3 flex w-full items-center justify-center">
          <input
            type="number"
            min="0"
            max="100"
            step="1"
            value={normalizedValue || ""}
            onChange={handleChange}
            readOnly={readOnly}
            className="w-full border-0 bg-transparent text-center font-mono text-6xl font-bold tracking-tight text-white outline-none placeholder:text-white/10 sm:text-7xl"
            inputMode="numeric"
          />
        </label>
        <p className="mt-1 text-sm font-medium text-stone-300">{formatRatingDescription(normalizedValue)}</p>
        <div className="mt-4">
          <RatingStars value={normalizedValue} size="lg" />
        </div>
      </div>
    </div>
  );
}