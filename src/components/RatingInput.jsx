import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import RatingStars from "@/components/RatingStars";
import { clampRatingValue, formatRatingDescription } from "@/utils/ratings";

export default function RatingInput({ value = 0, onChange, readOnly = false, className = "" }) {
  const normalizedValue = clampRatingValue(value);
  const [draftValue, setDraftValue] = useState(normalizedValue > 0 ? String(normalizedValue) : "");
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!isEditing) {
      setDraftValue(normalizedValue > 0 ? String(normalizedValue) : "");
    }
  }, [normalizedValue, isEditing]);

  const handleChange = (event) => {
    if (readOnly) return;
    const nextValue = event.target.value;
    setDraftValue(nextValue);

    if (nextValue === "") {
      onChange(0);
      return;
    }

    const parsedValue = Number(nextValue);
    if (!Number.isFinite(parsedValue)) {
      return;
    }

    onChange(clampRatingValue(parsedValue));
  };

  const handleBlur = () => {
    if (readOnly) return;
    setIsEditing(false);
    setDraftValue(normalizedValue > 0 ? String(normalizedValue) : "");
  };

  return (
    <div className={cn("rounded-3xl border border-white/10 bg-black/15 px-4 py-5 shadow-lg shadow-black/20", className)}>
      <div className="mx-auto flex max-w-sm flex-col items-center text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/35">Rate Album</p>
        <label className="mt-3 flex w-full items-center justify-center">
          <input
            type="text"
            min="0"
            max="100"
            step="0.01"
            value={draftValue}
            onChange={handleChange}
            onFocus={() => setIsEditing(true)}
            onBlur={handleBlur}
            readOnly={readOnly}
            className="w-full border-0 bg-transparent text-center font-mono text-6xl font-bold tracking-tight text-white outline-none placeholder:text-white/10 sm:text-7xl"
            inputMode="decimal"
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