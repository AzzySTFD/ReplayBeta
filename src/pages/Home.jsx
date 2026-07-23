import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";

import { Image } from "@/components/ui/image";
import AlbumSearchBar from "@/components/AlbumSearchBar";
import AlbumCard from "@/components/AlbumCard";
import { Disc, Star, ChevronRight, Loader2, Users } from "lucide-react";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import PullToRefresh from "@/components/PullToRefresh";
import { db } from "@/api/base44Client";

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [feed, setFeed] = useState([]);
  const [follows, setFollows] = useState([]);
  const [profile, setProfile] = useState(null);
  const [tab, setTab] = useState("mine");
  const [loadingData, setLoadingData] = useState(true);
  const [featuredAlbums, setFeaturedAlbums] = useState([]);
  const [loadingFeatured, setLoadingFeatured] = useState(false);
  const [folders, setFolders] = useState([]);
  const [selectedFolderId, setSelectedFolderId] = useState("");

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const [myProfile, myReviews, myFollows, myFolders] = await Promise.all([
        db.entities.Profile.filter({ created_by_id: user.id }),
        db.entities.Review.filter({ created_by_id: user.id }, "-updated_date", 50),
        db.entities.Follow.filter({ created_by_id: user.id }),
        db.entities.Folder.filter({ created_by_id: user.id }),
      ]);

      const allReviews = await db.entities.Review.list("-updated_date", 200);
      const profile = myProfile[0] || null;
      const fallbackReviews = allReviews.filter((review) => {
        if (review.created_by_id === user.id) return true;
        if (profile && review.created_by_id === profile.created_by_id) return true;
        if (profile && review.created_by_id === profile.id) return true;
        return false;
      });
      const resolvedReviews = myReviews.length > 0 ? myReviews : fallbackReviews;

      if (myProfile.length > 0) setProfile(myProfile[0]);
      setReviews(resolvedReviews);
      setFollows(myFollows);
      setFolders(myFolders);

      const followingIds = myFollows.map((f) => f.following_id);
      if (followingIds.length > 0) {
        const allRecent = await db.entities.Review.list("-updated_date", 200);
        setFeed(allRecent.filter((r) => followingIds.includes(r.created_by_id)));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingData(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const { pullDistance, refreshing } = usePullToRefresh(loadData);

  const loadFeatured = useCallback(async () => {
    setLoadingFeatured(true);
    try {
      const res = await db.functions.invoke("getFeaturedAlbums", {});
      setFeaturedAlbums(res.data.featured || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingFeatured(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "featured") loadFeatured();
  }, [tab, loadFeatured]);

  const handleSearch = async (query) => {
    setSearching(true);
    setHasSearched(true);
    try {
      const resp = await db.functions.invoke("spotifySearch", { query });
      setResults(resp.data.albums || []);
    } catch (e) {
      console.error(e);
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleAlbumClick = (album) => {
    navigate("/review/new", { state: { album } });
  };

  const visibleReviews = useMemo(() => {
    if (!selectedFolderId) return reviews;
    if (selectedFolderId === "unfiled") {
      return reviews.filter((review) => !review.folder_id);
    }
    return reviews.filter((review) => review.folder_id === selectedFolderId);
  }, [reviews, selectedFolderId]);


  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <PullToRefresh pullDistance={pullDistance} refreshing={refreshing} />
      {!loadingData && !profile && (
        <Link
          to="/profile"
          className="block mb-6 p-4 rounded-2xl bg-gradient-to-r from-stone-600/15 to-slate-600/15 border border-stone-500/20 hover:border-stone-500/40 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-stone-500 to-slate-600 flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-sm">Set up your profile</p>
              <p className="text-white/50 text-xs">Choose a username so others can find and follow you.</p>
            </div>
            <ChevronRight className="w-5 h-5 text-white/30 ml-auto" />
          </div>
        </Link>
      )}

      <div className="text-center mb-10 sm:mb-12">
        <div className="inline-flex items-center gap-2 mb-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-stone-500 to-slate-600 flex items-center justify-center shadow-lg shadow-stone-500/20">
            <Disc className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-[2rem] sm:text-[2.6rem] font-bold tracking-tight">ReplayReviews</h1>
        </div>
        <p className="text-white/40 text-[15px] sm:text-[16px] max-w-md mx-auto">
          Search any album, rate every track, and build your music review collection.
        </p>
      </div>

      <div className="max-w-2xl mx-auto mb-12 sm:mb-14">
        <AlbumSearchBar onSearch={handleSearch} loading={searching} />
      </div>

      {hasSearched && (
        <section className="mb-16 sm:mb-20">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white/80">
              {searching ? "Searching..." : `${results.length} ${results.length === 1 ? "result" : "results"}`}
            </h2>
          </div>
          {searching ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 text-stone-400 animate-spin" />
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-16 text-white/30">
              <Disc className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No albums found. Try a different search.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {results.map((album, i) => (
                <AlbumCard
                  key={`${album.title}-${i}`}
                  album={album}
                  onClick={() => handleAlbumClick(album)}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {!hasSearched && (
        <section>
          <div className="flex items-center gap-1 mb-6 p-1 bg-white/[0.03] rounded-xl border border-white/5 w-fit">
            <button
              onClick={() => setTab("mine")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === "mine" ? "bg-white/10 text-white" : "text-white/40 hover:text-white/60"
              }`}
            >
              Your Reviews
            </button>
            <button
              onClick={() => setTab("following")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === "following" ? "bg-white/10 text-white" : "text-white/40 hover:text-white/60"
              }`}
            >
              Following
            </button>
            <button
              onClick={() => setTab("featured")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === "featured" ? "bg-white/10 text-white" : "text-white/40 hover:text-white/60"
              }`}
            >
              Featured
            </button>
          </div>

          {tab === "mine" ? (
            loadingData ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-8 h-8 text-stone-400 animate-spin" />
              </div>
            ) : visibleReviews.length === 0 ? (
              <div className="text-center py-20 px-4 border border-white/5 rounded-2xl bg-white/[0.02]">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-stone-500/20 to-slate-600/20 flex items-center justify-center">
                  <Disc className="w-8 h-8 text-stone-400/50" />
                </div>
                <p className="text-white/50 font-medium mb-1">No reviews in this view</p>
                <p className="text-white/30 text-sm">Try another folder or create a new review above.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-white/40">{visibleReviews.length} {visibleReviews.length === 1 ? "review" : "reviews"}</p>
                  <select
                    value={selectedFolderId}
                    onChange={(e) => setSelectedFolderId(e.target.value)}
                    className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none"
                  >
                    <option value="" className="bg-zinc-900">All reviews</option>
                    <option value="unfiled" className="bg-zinc-900">Unfiled</option>
                    {folders.map((folder) => (
                      <option key={folder.id} value={folder.id} className="bg-zinc-900">
                        {folder.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {visibleReviews.map((review) => (
                    <div key={review.id} className="group flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-white/15 hover:bg-white/[0.05] transition-all">
                      <button onClick={() => navigate(`/review/${review.id}`)} className="flex items-center gap-4 flex-1 min-w-0 text-left">
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-white/5 flex-shrink-0">
                          {review.album_art_url && (
                            <Image src={review.album_art_url} alt={review.album_title} fittingType="fill" className="w-full h-full" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm truncate">{review.album_title}</h3>
                          <p className="text-white/40 text-xs truncate">{review.artist}</p>
                          <div className="mt-1 flex items-center gap-1.5">
                            {review.folder_name ? (
                              <span className="rounded-full border border-stone-500/20 bg-stone-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-stone-200">
                                {review.folder_name}
                              </span>
                            ) : (
                              <span className="text-[10px] uppercase tracking-wide text-white/25">Unfiled</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-stone-400 text-sm font-bold font-mono">
                              {review.album_rating?.toFixed(1) || "—"}
                            </span>
                            <span className="text-white/30 text-xs">/ 10</span>
                          </div>
                        </div>
                      </button>
                      <button
                        onClick={async (event) => {
                          event.stopPropagation();
                          try {
                            await db.entities.Review.delete(review.id);
                            setReviews((prev) => prev.filter((item) => item.id !== review.id));
                          } catch (e) {
                            console.error(e);
                          }
                        }}
                        className="rounded-lg border border-red-500/20 bg-red-500/10 px-2.5 py-1.5 text-xs font-medium text-red-300 hover:bg-red-500/20"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )
          ) : tab === "following" ? (
            loadingData ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-8 h-8 text-stone-400 animate-spin" />
              </div>
            ) : follows.length === 0 ? (
              <div className="text-center py-20 px-4 border border-white/5 rounded-2xl bg-white/[0.02]">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-stone-500/20 to-slate-600/20 flex items-center justify-center">
                  <Users className="w-8 h-8 text-stone-400/50" />
                </div>
                <p className="text-white/50 font-medium mb-1">Not following anyone yet</p>
                <Link to="/discover" className="text-stone-400 text-sm hover:underline">Discover users to follow →</Link>
              </div>
            ) : feed.length === 0 ? (
              <div className="text-center py-16 text-white/30 border border-white/5 rounded-2xl">
                <p className="text-sm">The people you follow haven't reviewed anything yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {feed.map((review) => (
                  <button
                    key={review.id}
                    onClick={() => navigate(`/review/${review.id}`)}
                    className="group flex items-center gap-4 p-3 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-white/15 hover:bg-white/[0.05] transition-all text-left w-full"
                  >
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-white/5 flex-shrink-0">
                      {review.album_art_url && (
                        <Image src={review.album_art_url} alt={review.album_title} fittingType="fill" className="w-full h-full" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-stone-400 font-medium mb-0.5">{review.username || "Unknown"}</p>
                      <h3 className="font-semibold text-sm truncate">{review.album_title}</h3>
                      <p className="text-white/40 text-xs truncate">{review.artist}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-stone-400 text-lg font-bold font-mono">
                        {review.album_rating?.toFixed(1) || "—"}
                      </span>
                      <span className="text-white/30 text-xs">/ 10</span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-white/20 group-hover:text-white/40 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                  </button>
                ))}
              </div>
            )
          ) : null}

          {tab === "featured" && (
            loadingFeatured ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-8 h-8 text-stone-400 animate-spin" />
              </div>
            ) : featuredAlbums.length === 0 ? (
              <div className="text-center py-20 px-4 border border-white/5 rounded-2xl bg-white/[0.02]">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-stone-500/20 to-slate-600/20 flex items-center justify-center">
                  <Star className="w-8 h-8 text-stone-400/50" />
                </div>
                <p className="text-white/50 font-medium mb-1">No featured albums yet</p>
                <p className="text-white/30 text-sm">Albums with 10+ ratings averaging above 8 will appear here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {featuredAlbums.map((album, i) => (
                  <div
                    key={`${album.album_title}-${i}`}
                    className="flex items-center gap-4 p-3 rounded-2xl bg-white/[0.03] border border-white/5"
                  >
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-white/5 flex-shrink-0">
                      {album.album_art_url && (
                        <Image src={album.album_art_url} alt={album.album_title} fittingType="fill" className="w-full h-full" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm truncate">{album.album_title}</h3>
                      <p className="text-white/40 text-xs truncate">{album.artist}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Star className="w-3.5 h-3.5 text-stone-400" />
                        <span className="text-stone-400 text-sm font-bold font-mono">{album.avg_rating}</span>
                        <span className="text-white/30 text-xs">/ 10 · {album.rating_count} ratings</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

        </section>
      )}
    </div>
  );
}