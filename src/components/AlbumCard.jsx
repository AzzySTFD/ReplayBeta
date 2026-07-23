import React from "react";
import { Image } from "@/components/ui/image";

export default function AlbumCard({ album, onClick }) {
  return (
    <button
      onClick={onClick}
      className="group text-left w-full"
    >
      <div className="relative aspect-square rounded-xl overflow-hidden bg-white/5 mb-2">
        {album.artwork_url ? (
          <Image
            src={album.artwork_url}
            alt={album.title}
            fittingType="fill"
            className="w-full h-full transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/20 text-xs">
            No Art
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
          <span className="inline-block px-2.5 py-1 bg-white/95 text-black text-[10px] font-bold rounded-full uppercase tracking-wider">
            Review →
          </span>
        </div>
      </div>
      <h3 className="text-white font-semibold text-sm truncate leading-tight">{album.title}</h3>
      <p className="text-white/40 text-xs truncate">{album.artist}</p>
    </button>
  );
}