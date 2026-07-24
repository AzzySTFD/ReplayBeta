import React from "react";
import RatingScale from "@/components/RatingScale";

export default function TrackList({ tracks, onRateTrack, readOnly = false }) {
  return (
    <div className="space-y-0.5">
      {tracks.map((track, i) => (
        <div
          key={i}
          className="flex items-center gap-3 sm:gap-4 py-3 px-3 rounded-lg hover:bg-white/[0.03] transition-colors group min-h-[52px]"
        >
          <span className="font-mono text-xs text-white/25 w-6 text-right flex-shrink-0">
            {track.position || i + 1}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-white/90 text-sm font-medium truncate">
              {String(track?.title || track?.name || track?.track_name || `Track ${track?.position || i + 1}`)}
            </p>
          </div>
          <div className="flex-shrink-0 rounded-lg border border-white/10 bg-white/[0.04] px-1.5 py-1.5 shadow-sm shadow-black/20">
            <RatingScale
              value={track.rating || 0}
              onChange={(val) => onRateTrack(i, val)}
              size="sm"
              readOnly={readOnly}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
