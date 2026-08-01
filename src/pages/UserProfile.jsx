import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { db } from "@/api/base44Client";

import { Image } from "@/components/ui/image";
import { useToast } from "@/components/ui/use-toast";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import PullToRefresh from "@/components/PullToRefresh";
import { formatRatingDisplay, getRatingDisplayPreference } from "@/utils/ratings";
import { ArrowLeft, Loader2, UserPlus, UserCheck, Disc, Star, ChevronRight, Globe, Instagram, Youtube, Twitch, ExternalLink, FolderOpen } from "lucide-react";

const normalizeHandle = (value = "") => value.replace(/^@+/, "").trim();
const SOCIAL_KEYS = ["instagram", "twitter", "tiktok", "twitch", "youtube", "kick", "website"];
const DEFAULT_SECTION_ORDER = ["socials", "folders", "reviews"];

const ensureHttp = (value = "") => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
};

const buildSocialHref = (key, value = "") => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  const handle = normalizeHandle(trimmed);
  if (!handle) return "";

  if (key === "instagram") return `https://instagram.com/${handle}`;
  if (key === "twitter") return `https://x.com/${handle}`;
  if (key === "tiktok") return `https://www.tiktok.com/@${handle}`;
  if (key === "twitch") return `https://twitch.tv/${handle}`;
  if (key === "youtube") {
    if (handle.startsWith("channel/") || handle.startsWith("c/") || handle.startsWith("@")) {
      return `https://youtube.com/${handle}`;
    }
    return `https://youtube.com/@${handle}`;
  }
  if (key === "kick") return `https://kick.com/${handle}`;
  return ensureHttp(handle);
};

export default function UserProfile() {
  const { userId } = useParams();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [folders, setFolders] = useState([]);
  const [selectedFolderId, setSelectedFolderId] = useState("");
  const [selectedYear, setSelectedYear] = useState("all");
  const [followRecord, setFollowRecord] = useState(null);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [openConnections, setOpenConnections] = useState("");
  const [loading, setLoading] = useState(true);
  const [viewerRatingDisplayPreference, setViewerRatingDisplayPreference] = useState("100");

  const resolveProfile = useCallback(async (value) => {
    if (!value) return null;

    const byOwner = await db.entities.Profile.filter({ created_by_id: value });
    if (byOwner[0]) return byOwner[0];

    const byId = await db.entities.Profile.get(value);
    if (byId) return byId;

    const byUsername = await db.entities.Profile.filter({ username: value });
    return byUsername[0] || null;
  }, []);

  const loadData = useCallback(async () => {
    try {
      const resolvedProfile = await resolveProfile(userId);
      const resolvedUserId = resolvedProfile?.created_by_id || userId;

      const [profiles, userReviews, myFollows, userFolders, followersOfUser, followingByUser] = await Promise.all([
        resolvedProfile ? Promise.resolve([resolvedProfile]) : db.entities.Profile.filter({ created_by_id: resolvedUserId }),
        db.entities.Review.filter({ created_by_id: resolvedUserId }, "-updated_date", 50),
        currentUser
          ? db.entities.Follow.filter({ created_by_id: currentUser.id, following_id: resolvedUserId })
          : Promise.resolve([]),
        db.entities.Folder.filter({ created_by_id: resolvedUserId }),
        db.entities.Follow.filter({ following_id: resolvedUserId }),
        db.entities.Follow.filter({ created_by_id: resolvedUserId }),
      ]);

      const followerIds = [...new Set((followersOfUser || []).map((row) => row.created_by_id).filter(Boolean))];
      const followerProfiles = await Promise.all(
        followerIds.map(async (followerId) => {
          const matches = await db.entities.Profile.filter({ created_by_id: followerId });
          return {
            id: followerId,
            username: matches[0]?.username || "Unknown user",
            avatar_url: matches[0]?.avatar_url || "",
          };
        })
      );

      const followingIds = [...new Set((followingByUser || []).map((row) => row.following_id).filter(Boolean))];
      const followingProfiles = await Promise.all(
        followingIds.map(async (followingId) => {
          const matches = await db.entities.Profile.filter({ created_by_id: followingId });
          return {
            id: followingId,
            username: matches[0]?.username || "",
            avatar_url: matches[0]?.avatar_url || "",
          };
        })
      );
      const followingProfileById = new Map(followingProfiles.map((entry) => [entry.id, entry]));

      const followingEntries = (followingByUser || []).map((row) => {
        const matchedProfile = followingProfileById.get(row.following_id);
        return {
          id: row.following_id,
          username: matchedProfile?.username || row.following_username || "Unknown user",
          avatar_url: matchedProfile?.avatar_url || "",
        };
      });

      const allReviews = await db.entities.Review.list("-updated_date", 200);
      const profile = profiles[0] || resolvedProfile || null;
      const fallbackReviews = allReviews.filter((review) => {
        if (review.created_by_id === resolvedUserId) return true;
        if (review.created_by_id === userId) return true;
        if (profile && review.created_by_id === profile.created_by_id) return true;
        if (profile && review.created_by_id === profile.id) return true;
        return false;
      });
      const resolvedReviews = userReviews.length > 0 ? userReviews : fallbackReviews;

      if (profiles.length > 0) setProfile(profiles[0]);
      if (currentUser) {
        const viewerProfiles = await db.entities.Profile.filter({ created_by_id: currentUser.id });
        setViewerRatingDisplayPreference(getRatingDisplayPreference(viewerProfiles[0] || null));
      }
      setReviews(resolvedReviews);
      setFolders(userFolders);
      setFollowers(followerProfiles);
      setFollowing(followingEntries);
      if (myFollows.length > 0) setFollowRecord(myFollows[0]);
      if (myFollows.length === 0) setFollowRecord(null);
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
        await loadData();
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
        await loadData();
      } catch (e) {
        setFollowRecord(null);
        toast({ variant: "destructive", title: "Error", description: "Failed to follow" });
      }
    }
  };

  const isOwn = currentUser?.id === userId;
  const socialLinks = profile?.social_links || {};
  const customization = socialLinks.profile_customization || {};
  const desktopBanner = String(customization.banner_desktop || "").trim();
  const mobileBanner = String(customization.banner_mobile || "").trim();
  const sectionOrderFromProfile = Array.isArray(customization.section_order) ? customization.section_order : [];
  const validSectionOrder = sectionOrderFromProfile.filter((section) => DEFAULT_SECTION_ORDER.includes(section));
  const sectionOrder = validSectionOrder.length
    ? [...validSectionOrder, ...DEFAULT_SECTION_ORDER.filter((section) => !validSectionOrder.includes(section))]
    : DEFAULT_SECTION_ORDER;
  const folderScopedReviews = selectedFolderId
    ? reviews.filter((review) => review.folder_id === selectedFolderId)
    : reviews.filter((review) => review.folder_id || review.folder_name);
  const availableYears = useMemo(() => {
    const years = new Set();
    for (const review of folderScopedReviews) {
      const value = String(review?.release_year || "").trim();
      const match = value.match(/\b(19|20)\d{2}\b/);
      if (match) {
        years.add(match[0]);
      }
    }
    return [...years].sort((a, b) => Number(b) - Number(a));
  }, [folderScopedReviews]);
  const visibleReviews = selectedYear === "all"
    ? folderScopedReviews
    : folderScopedReviews.filter((review) => String(review?.release_year || "").includes(selectedYear));
  const selectedFolder = folders.find((folder) => folder.id === selectedFolderId) || null;

  useEffect(() => {
    if (selectedYear !== "all" && !availableYears.includes(selectedYear)) {
      setSelectedYear("all");
    }
  }, [availableYears, selectedYear]);

  const handleSelectFolder = (folderId) => {
    setSelectedFolderId(folderId);
    setSelectedYear("all");
  };

  const socialEntries = SOCIAL_KEYS
    .map((key) => [key, socialLinks[key]])
    .filter(([, value]) => value);

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

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <PullToRefresh pullDistance={pullDistance} refreshing={refreshing} />
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-white/50 hover:text-white text-sm mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="mb-8">
        {(desktopBanner || mobileBanner) && (
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
            <div className="sm:hidden">
              <img
                src={mobileBanner || desktopBanner}
                alt={`${profile.username} mobile banner`}
                className="h-40 w-full object-cover"
              />
            </div>
            <div className="hidden sm:block">
              <img
                src={desktopBanner || mobileBanner}
                alt={`${profile.username} banner`}
                className="h-52 w-full object-cover"
              />
            </div>
          </div>
        )}

        <div className={`flex items-start gap-4 ${desktopBanner || mobileBanner ? "-mt-10 sm:-mt-12 px-3 sm:px-4 relative z-10" : "mt-0"}`}>
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-stone-500 to-slate-600 flex items-center justify-center text-2xl sm:text-3xl font-bold flex-shrink-0 overflow-hidden border-4 border-zinc-950 shadow-lg">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt={profile.username} className="h-full w-full object-cover" />
          ) : (
            profile.username?.[0]?.toUpperCase() || "U"
          )}
        </div>
        <div className={`flex-1 min-w-0 ${desktopBanner || mobileBanner ? "pt-5 sm:pt-6" : ""}`}>
          <h1 className="text-xl sm:text-2xl font-bold">{profile.display_name || profile.username}</h1>
          <p className="mt-1 text-sm italic text-white/50">@{profile.username}</p>
          {profile.bio && <p className="text-white/50 text-sm mt-2">{profile.bio}</p>}
          {!isOwn && (
            <p className="text-xs uppercase tracking-[0.2em] text-stone-400/70 mt-2">Public profile</p>
          )}

          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            <button
              onClick={() => setOpenConnections("followers")}
              className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-white/80 hover:bg-white/[0.06]"
            >
              <span className="font-semibold text-white">{followers.length}</span> Followers
            </button>
            <button
              onClick={() => setOpenConnections("following")}
              className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-white/80 hover:bg-white/[0.06]"
            >
              <span className="font-semibold text-white">{following.length}</span> Following
            </button>
          </div>
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
      </div>

      {openConnections && (
        <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-white/70">
              {openConnections === "followers" ? "Followers" : "Following"}
            </h2>
            <button
              onClick={() => setOpenConnections("")}
              className="text-xs text-white/50 hover:text-white"
            >
              Close
            </button>
          </div>

          {(openConnections === "followers" ? followers : following).length === 0 ? (
            <p className="text-sm text-white/40">No users to show yet.</p>
          ) : (
            <div className="space-y-2">
              {(openConnections === "followers" ? followers : following).map((entry) => (
                <button
                  key={`${openConnections}-${entry.id}-${entry.username}`}
                  onClick={() => entry.id && navigate(`/user/${entry.id}`)}
                  className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-left text-sm text-white/80 hover:bg-white/[0.06]"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="h-7 w-7 flex-shrink-0 overflow-hidden rounded-full bg-white/10">
                      {entry.avatar_url ? (
                        <img src={entry.avatar_url} alt={entry.username || "User avatar"} className="h-full w-full object-cover" />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-white/70">
                          {String(entry.username || "U").charAt(0).toUpperCase()}
                        </span>
                      )}
                    </span>
                    <span className="truncate">{entry.username}</span>
                  </span>
                  <ChevronRight className="h-4 w-4 text-white/40" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {sectionOrder.map((section) => {
        if (section === "socials") {
          if (socialEntries.length === 0) return null;
          return (
            <div key="socials" className="mb-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="mb-3 flex items-center gap-2">
                <ExternalLink className="w-4 h-4 text-stone-400" />
                <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider">Social links</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {socialEntries.map(([key, value]) => {
                  const href = buildSocialHref(key, String(value || ""));
                  if (!href) return null;
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
            </div>
          );
        }

        if (section === "folders") {
          return (
            <div key="folders" className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <FolderOpen className="w-4 h-4 text-stone-400" />
                <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider">Folders</h2>
              </div>
              {folders.length === 0 ? (
                <p className="text-sm text-white/40">This profile doesn’t have any folders yet.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleSelectFolder("")}
                    className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${selectedFolderId === "" ? "border-stone-500/40 bg-stone-500/10 text-white" : "border-white/10 bg-white/[0.03] text-white/60 hover:bg-white/[0.06]"}`}
                  >
                    All reviews
                  </button>
                  {folders.map((folder) => (
                    <button
                      key={folder.id}
                      onClick={() => handleSelectFolder(folder.id)}
                      className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${selectedFolderId === folder.id ? "border-stone-500/40 bg-stone-500/10 text-white" : "border-white/10 bg-white/[0.03] text-white/60 hover:bg-white/[0.06]"}`}
                    >
                      {folder.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        }

        return (
          <div key="reviews">
            <div className="flex items-center gap-2 mb-4">
              <Star className="w-4 h-4 text-stone-400" />
              <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider">
                {selectedFolder ? `${selectedFolder.name}` : "All reviews"}
              </h2>
            </div>
            {availableYears.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedYear("all")}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${selectedYear === "all" ? "border-stone-500/40 bg-stone-500/10 text-white" : "border-white/10 bg-white/[0.03] text-white/60 hover:bg-white/[0.06]"}`}
                >
                  All years
                </button>
                {availableYears.map((year) => (
                  <button
                    key={year}
                    onClick={() => setSelectedYear(year)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${selectedYear === year ? "border-stone-500/40 bg-stone-500/10 text-white" : "border-white/10 bg-white/[0.03] text-white/60 hover:bg-white/[0.06]"}`}
                  >
                    {year}
                  </button>
                ))}
              </div>
            )}
            {visibleReviews.length === 0 ? (
              <div className="text-center py-12 text-white/30 border border-white/5 rounded-2xl">
                <Disc className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No reviews for this folder and year yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {visibleReviews.map((review) => (
                  (() => {
                    const rating = formatRatingDisplay(review.album_rating, viewerRatingDisplayPreference);
                    return (
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
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white truncate">{review.album_title || "Untitled album"}</p>
                      <p className="text-xs text-white/50 truncate">{review.artist || "Unknown artist"}</p>
                      <div className="mt-1.5 flex items-center gap-2 text-xs text-white/40">
                        <span className="rounded bg-white/10 px-1.5 py-0.5">{rating.value}</span>
                        {rating.suffix && <span>{rating.suffix}</span>}
                        {review.release_year && <span>{review.release_year}</span>}
                        <span>{review.tracks?.length || 0} tracks</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/25 group-hover:text-white/50 transition-colors" />
                  </button>
                    );
                  })()
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}