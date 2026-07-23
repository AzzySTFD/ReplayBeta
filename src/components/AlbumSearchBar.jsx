import React, { useState } from "react";
import { Search, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AlbumSearchBar({ onSearch, loading }) {
  const [query, setQuery] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) onSearch(query.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="relative w-full">
      <div className="relative group">
        <div className="absolute inset-0 bg-gradient-to-r from-stone-600/20 to-slate-600/20 rounded-2xl blur-xl group-focus-within:opacity-100 opacity-0 transition-opacity duration-300" />
        <div className="relative flex items-center bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden focus-within:border-stone-500/50 transition-colors min-h-[52px]">
          <Search className="ml-4 w-5 h-5 text-white/30 flex-shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for an album or artist..."
            className="flex-1 bg-transparent px-3 py-3.5 text-white placeholder:text-white/30 outline-none text-[15px]"
            disabled={loading}
          />
          {query && !loading && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="mr-2 p-1 rounded-full hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4 text-white/40" />
            </button>
          )}
          {loading && <Loader2 className="mr-4 w-5 h-5 text-stone-400 animate-spin flex-shrink-0" />}
          {!loading && query.trim() && (
            <button
              type="submit"
              className="mr-2 px-4 py-2.5 bg-gradient-to-r from-stone-600 to-slate-600 hover:from-stone-500 hover:to-slate-500 text-white text-sm font-semibold rounded-xl transition-all duration-200 min-h-[40px]"
            >
              Search
            </button>
          )}
        </div>
      </div>
    </form>
  );
}