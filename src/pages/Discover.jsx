import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { db } from "@/api/base44Client";

import { useToast } from "@/components/ui/use-toast";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import PullToRefresh from "@/components/PullToRefresh";
import { Search, Loader2, UserPlus, UserCheck, Compass } from "lucide-react";

export default function Discover() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [allProfiles, setAllProfiles] = useState([]);
  const [follows, setFollows] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [profiles, myFollows] = await Promise.all([
        db.entities.Profile.list(),
        user ? db.entities.Follow.filter({ created_by_id: user.id }) : Promise.resolve([]),
      ]);
      setAllProfiles(profiles);
      setFollows(myFollows);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const { pullDistance, refreshing } = usePullToRefresh(loadData);

  const followingIds = new Set(follows.map((f) => f.following_id));

  const filtered = allProfiles.filter((p) => {
    const username = String(p.username || "").trim().toLowerCase();
    const search = String(query || "").trim().toLowerCase();
    return p.created_by_id !== user?.id && (!search || username.includes(search));
  });

  const following = allProfiles.filter((p) => followingIds.has(p.created_by_id));

  const handleFollowToggle = async (profile) => {
    const existing = follows.find((f) => f.following_id === profile.created_by_id);
    if (existing) {
      setFollows((prev) => prev.filter((f) => f.id !== existing.id));
      try {
        await db.entities.Follow.delete(existing.id);
      } catch (e) {
        setFollows((prev) => [...prev, existing]);
        toast({ variant: "destructive", title: "Error", description: "Failed to unfollow" });
      }
    } else {
      const tempId = `temp-${Date.now()}`;
      const tempFollow = {
        id: tempId,
        following_id: profile.created_by_id,
        following_username: profile.username,
      };
      setFollows((prev) => [...prev, tempFollow]);
      try {
        const created = await db.entities.Follow.create({
          following_id: profile.created_by_id,
          following_username: profile.username,
        });
        setFollows((prev) => prev.map((f) => (f.id === tempId ? created : f)));
      } catch (e) {
        setFollows((prev) => prev.filter((f) => f.id !== tempId));
        toast({ variant: "destructive", title: "Error", description: "Failed to follow" });
      }
    }
  };

  const renderUserRow = (p) => (
    <div
      key={p.id}
      className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/15 transition-colors"
    >
      <button
        onClick={() => navigate(`/user/${p.created_by_id}`)}
        className="flex items-center gap-3 flex-1 text-left min-w-0"
      >
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-stone-500 to-slate-600 flex items-center justify-center text-sm font-bold flex-shrink-0">
          {p.username[0]?.toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-sm truncate">{p.username}</p>
          {p.bio && <p className="text-white/40 text-xs truncate">{p.bio}</p>}
        </div>
      </button>
      <button
        onClick={() => handleFollowToggle(p)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex-shrink-0 ${
          followingIds.has(p.created_by_id)
            ? "bg-white/5 text-white/60 hover:bg-white/10"
            : "bg-gradient-to-r from-stone-600 to-slate-600 text-white"
        }`}
      >
        {followingIds.has(p.created_by_id) ? (
          <><UserCheck className="w-4 h-4" /> Following</>
        ) : (
          <><UserPlus className="w-4 h-4" /> Follow</>
        )}
      </button>
    </div>
  );

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 text-stone-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <PullToRefresh pullDistance={pullDistance} refreshing={refreshing} />
      <h1 className="text-2xl font-bold mb-2">Discover</h1>
      <p className="text-white/40 text-sm mb-8">Search public profiles, follow reviewers you like, and open their public pages.</p>

      <div className="relative mb-10">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search usernames..."
          className="w-full pl-11 pr-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-white placeholder:text-white/30 outline-none focus:border-stone-500/50 transition-colors text-sm"
        />
      </div>

      {query && (
        <section className="mb-10">
          <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3">
            {filtered.length} {filtered.length === 1 ? "user" : "users"} found
          </h2>
          {filtered.length === 0 ? (
            <p className="text-white/30 text-sm py-8 text-center">No users match "{query}"</p>
          ) : (
            <div className="space-y-3">{filtered.map(renderUserRow)}</div>
          )}
        </section>
      )}

      {!query && following.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3">
            People You Follow
          </h2>
          <div className="space-y-3">{following.map(renderUserRow)}</div>
        </section>
      )}

      {!query && following.length === 0 && (
        <div className="text-center py-20 text-white/30">
          <Compass className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Search for users above to start following.</p>
        </div>
      )}
    </div>
  );
}