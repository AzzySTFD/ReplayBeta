import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { db } from "@/api/base44Client";

import { Image } from "@/components/ui/image";
import { useToast } from "@/components/ui/use-toast";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import PullToRefresh from "@/components/PullToRefresh";
import { ArrowLeft, Loader2, UserPlus, UserCheck, Disc, Star, ChevronRight, Globe, Instagram, Youtube, Twitch, ExternalLink, FolderOpen } from "lucide-react";

export default function UserProfile() {
  const { userId } = useParams();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [folders, setFolders] = useState([]);
  const [selectedFolderId, setSelectedFolderId] = useState("");
  const [followRecord, setFollowRecord] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [profiles, userReviews, myFollows, userFolders] = await Promise.all([
        db.entities.Profile.filter({ created_by_id: userId }),
        db.entities.Review.filter({ created_by_id: userId }, "-updated_date", 50),
        currentUser
          ? db.entities.Follow.filter({ created_by_id: currentUser.id, following_id: userId })
          : Promise.resolve([]),
        db.entities.Folder.filter({ created_by_id: userId }),
      ]);

      const allReviews = await db.entities.Review.list("-updated_date", 200);
      const profile = profiles[0] || null;
      const fallbackReviews = allReviews.filter((review) => {
        if (review.created_by_id === userId) return true;
        if (profile && review.created_by_id === profile.created_by_id) return true;
        if (profile && review.created_by_id === profile.id) return true;
        return false;
      });
      const resolvedReviews = userReviews.length > 0 ? userReviews : fallbackReviews;

      if (profiles.length > 0) setProfile(profiles[0]);
      setReviews(resolvedReviews);
      setFolders(userFolders);
      if (myFollows.length > 0) setFollowRecord(myFollows[0]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [userId, currentUser]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const { pullDistance, refreshing } = usePullToRefresh(loadData);

  const handleFollowToggle = async () => {
    if (followRecord) {
      const prev = followRecord;
      setFollowRecord(null);
      try {
        await db.entities.Follow.delete(prev.id);
      } catch (e) {
        setFollowRecord(prev);
        toast({ variant: "destructive", title: "Error", description: "Failed to unfollow" });
      }
    } else {
      const tempId = `temp-${Date.now()}`;
      const tempRecord = {
        id: tempId,
        following_id: userId,
        following_username: profile?.username || "",
      };
      setFollowRecord(tempRecord);
      try {
        const created = await db.entities.Follow.create({
          following_id: userId,
          following_username: profile?.username || "",
        });
        setFollowRecord(created);
      } catch (e) {
        setFollowRecord(null);
        toast({ variant: "destructive", title: "Error", description: "Failed to follow" });
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 text-stone-400 animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-20 text-white/40">
        <Disc className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>User not found.</p>
        <button onClick={() => navigate("/discover")} className="mt-4 text-stone-400 text-sm">Back to Discover</button>
      </div>
    );
  }

  const isOwn = currentUser?.id === userId;
  const socialLinks = profile.social_links || {};
  const visibleReviews = selectedFolderId
    ? reviews.filter((review) => review.folder_id === selectedFolderId)
    : reviews.filter((review) => review.folder_id || review.folder_name);
  const selectedFolder = folders.find((folder) => folder.id === selectedFolderId) || null;

  const socialEntries = Object.entries(socialLinks).filter(([, value]) => value);

  const getSocialStyle = (key) => {
    switch (key) {
      case "instagram":
        return "border-stone-400/30 bg-stone-500/10 text-stone-200 hover:border-stone-400/50 hover:text-white";
      case "twitter":
        return "border-slate-400/30 bg-slate-500/10 text-slate-200 hover:border-slate-400/50 hover:text-white";
      case "tiktok":
        return "border-cyan-400/30 bg-cyan-500/10 text-cyan-200 hover:border-cyan-400/50 hover:text-white";
      case "twitch":
        return "border-slate-400/30 bg-slate-500/10 text-slate-200 hover:border-slate-400/50 hover:text-white";
      case "youtube":
        return "border-red-400/30 bg-red-500/10 text-red-200 hover:border-red-400/50 hover:text-white";
      case "kick":
        return "border-emerald-400/30 bg-emerald-500/10 text-emerald-200 hover:border-emerald-400/50 hover:text-white";
      case "website":
      default:
        return "border-stone-400/30 bg-stone-500/10 text-stone-200 hover:border-stone-400/50 hover:text-white";
    }
  };

  const getSocialIcon = (key) => {
    switch (key) {
      case "instagram":
        return <Instagram className="w-4 h-4" />;
      case "twitter":
        return <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true"><path d="M18.9 2H22l-6.7 7.7L23.3 22h-5.8l-4.6-6-5.2 6H1.4l7.1-8.1L.7 2h5.9l4.2 5.5L18.9 2Zm-1 18h1.1L6.2 4H4.9l13 16Z"/></svg>;
      case "tiktok":
        return <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true"><path d="M14.5 2c.3 2.1 1.4 3.8 3.4 4.8v3.5c-1.3.1-2.5-.2-3.7-.8v5.8c0 3.7-2.9 6.6-6.7 6.6-2.2 0-4.2-1.1-5.4-2.8a6.8 6.8 0 0 0 6.6 4.7c3.8 0 6.9-3.1 6.9-6.9V9.6c1.1.9 2.4 1.5 3.8 1.5v-3.4c-1.1 0-2.2-.3-3.2-.8V2h-.6Z"/></svg>;
      case "twitch":
        return <Twitch className="w-4 h-4" />;
      case "youtube":
        return <Youtube className="w-4 h-4" />;
      case "kick":
        return <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true"><path d="M4 3h16v10.5c0 2.8-2.2 5-5 5h-2.8v2.5H8.2v-2.5H4V3Zm2 2v8.5h2.2v2.5h3.2v-2.5h2.8c1.7 0 3-1.3 3-3V5H6Zm2.5 2h7v2h-7V7Zm0 3h7v2h-7v-2Z"/></svg>;
      case "website":
      default:
        return <Globe className="w-4 h-4" />;
    }
  };

  const formatSocialLabel = (key) => {
    switch (key) {
      case "twitter":
        return "X";
      case "youtube":
        return "YouTube";
      case "tiktok":
        return "TikTok";
      default:
        return key.charAt(0).toUpperCase() + key.slice(1);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <PullToRefresh pullDistance={pullDistance} refreshing={refreshing} />
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-white/50 hover:text-white text-sm mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="flex items-start gap-4 mb-8">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-stone-500 to-slate-600 flex items-center justify-center text-2xl sm:text-3xl font-bold flex-shrink-0 overflow-hidden">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt={profile.username} className="h-full w-full object-cover" />
          ) : (
            profile.username?.[0]?.toUpperCase() || "U"
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold">{profile.username}</h1>
          {profile.bio && <p className="text-white/50 text-sm mt-1">{profile.bio}</p>}
          {!isOwn && (
            <p className="text-xs uppercase tracking-[0.2em] text-stone-400/70 mt-2">Public profile</p>
          )}
          {socialEntries.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {socialEntries.map(([key, value]) => {
                const href = value.startsWith("http") ? value : `https://${value}`;
                return (
                  <a
                    key={key}
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium shadow-sm transition-all ${getSocialStyle(key)}`}
                    title={formatSocialLabel(key)}
                  >
                    {getSocialIcon(key)}
                    <span>{formatSocialLabel(key)}</span>
                  </a>
                );
              })}
            </div>
          )}
        </div>
        {!isOwn && (
          <button
            onClick={handleFollowToggle}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors flex-shrink-0 ${
              followRecord
                ? "bg-white/5 text-white/60 hover:bg-white/10"
                : "bg-gradient-to-r from-stone-600 to-slate-600 text-white"
            }`}
          >
            {followRecord ? (
              <><UserCheck className="w-4 h-4" /> Following</>
            ) : (
              <><UserPlus className="w-4 h-4" /> Follow</>
            )}
          </button>
        )}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <FolderOpen className="w-4 h-4 text-stone-400" />
          <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider">Folders</h2>
        </div>
        {folders.length === 0 ? (
          <p className="text-sm text-white/40">This profile doesn’t have any folders yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedFolderId("")}
              className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${selectedFolderId === "" ? "border-stone-500/40 bg-stone-500/10 text-white" : "border-white/10 bg-white/[0.03] text-white/60 hover:bg-white/[0.06]"}`}
            >
              All reviews
            </button>
            {folders.map((folder) => (
              <button
                key={folder.id}
                onClick={() => setSelectedFolderId(folder.id)}
                className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${selectedFolderId === folder.id ? "border-stone-500/40 bg-stone-500/10 text-white" : "border-white/10 bg-white/[0.03] text-white/60 hover:bg-white/[0.06]"}`}
              >
                {folder.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 mb-4">
        <Star className="w-4 h-4 text-stone-400" />
        <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider">
          {selectedFolder ? `${selectedFolder.name}` : "All reviews"}
        </h2>
      </div>
      {visibleReviews.length === 0 ? (
        <div className="text-center py-12 text-white/30 border border-white/5 rounded-2xl">
          <Disc className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No reviews in this folder yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {visibleReviews.map((review) => (
            <button
              key={review.id}
              onClick={() => navigate(`/review/${review.id}`)}
              className="group flex items-center gap-4 p-3 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-white/15 transition-all text-left"
            >
              <div className="w-16 h-16 rounded-lg overflow-hidden bg-white/5 flex-shrink-0">
                {review.album_art_url && (
                  <Image src={review.album_art_url} alt={review.album_title} fittingType="fill" className="w-full h-full" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm truncate">{review.album_title}</h3>
                <p className="text-white/40 text-xs truncate">{review.artist}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-stone-400 text-sm font-bold font-mono">
                    {review.album_rating?.toFixed(1) || "—"}
                  </span>
                  <span className="text-white/30 text-xs">/ 10</span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-white/20 group-hover:text-white/40 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}