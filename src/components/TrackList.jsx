import React from "react";
import RatingScale from "@/components/RatingScale";

const getTrackTitle = (track, index) => {
  const candidates = [
    track?.title,
    track?.name,
    track?.track_name,
    track?.trackTitle,
    track?.song_title,
    track?.song,
  ];

  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return `Track ${track?.position || index + 1}`;
};

export default function TrackList({ tracks, onRateTrack, readOnly = false }) {
  return (
    <div className="space-y-0.5">
      {tracks.map((track, i) => (
        <div
          key={i}
          className="flex flex-wrap items-center gap-3 sm:gap-4 py-3 px-3 rounded-lg hover:bg-white/[0.03] transition-colors group"
        >
          <span className="font-mono text-xs text-white/25 w-6 text-right flex-shrink-0">
            {track.position || i + 1}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-white/90 text-sm font-medium leading-snug break-words sm:truncate">
              {getTrackTitle(track, i)}
            </p>
          </div>
          <div className="w-full pl-9 sm:w-auto sm:pl-0 sm:ml-auto rounded-lg border border-white/10 bg-white/[0.04] px-1.5 py-1.5 shadow-sm shadow-black/20">
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
