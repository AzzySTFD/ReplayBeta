import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { db } from "@/api/base44Client";

import { Image } from "@/components/ui/image";
import { Button } from "@/components/ui/button";
import TrackList from "@/components/TrackList";
import RatingScale from "@/components/RatingScale";
import { useToast } from "@/components/ui/use-toast";
import { formatAdvancedReviewInput, formatReviewRatingValue, getReviewRatingScale, roundToHalfStep, roundToQuarterStep, validateAdvancedReviewInput } from "@/lib/reviewRatings";
import { ArrowLeft, Loader2, Save, Music2, ToggleLeft, ToggleRight, Calendar, MessageCircle, Heart, Laugh, ThumbsDown, ThumbsUp, FolderOpen, Pencil, Trash2, Check, X, Shuffle, Clock3, Disc3, ListMusic, Building2, Tag } from "lucide-react";

const formatRuntime = (runtimeMs) => {
  if (!Number.isFinite(runtimeMs) || runtimeMs <= 0) return "Unavailable";
  const totalMinutes = Math.floor(runtimeMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
};

const formatAlbumType = (albumType) => {
  if (!albumType) return "Unavailable";
  return albumType.charAt(0).toUpperCase() + albumType.slice(1);
};

export default function Review() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const isNew = id === "new";
  const passedAlbum = location.state?.album;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [surprising, setSurprising] = useState(false);
  const [album, setAlbum] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [useManualRating, setUseManualRating] = useState(false);
  const [useAdvancedRating, setUseAdvancedRating] = useState(false);
  const [manualRating, setManualRating] = useState(0);
  const [advancedRatingInput, setAdvancedRatingInput] = useState("");
  const [notes, setNotes] = useState("");
  const [reviewId, setReviewId] = useState(isNew ? null : id);
  const [reviewOwnerId, setReviewOwnerId] = useState("");
  const [readOnly, setReadOnly] = useState(false);
  const [myUsername, setMyUsername] = useState("");
  const [myDisplayName, setMyDisplayName] = useState("");
  const [reviewerName, setReviewerName] = useState("");
  const [reactions, setReactions] = useState([]);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [editingCommentId, setEditingCommentId] = useState("");
  const [editingCommentText, setEditingCommentText] = useState("");
  const [folders, setFolders] = useState([]);
  const [selectedFolderId, setSelectedFolderId] = useState("");
  const [commentProfileByUserId, setCommentProfileByUserId] = useState({});

  const applySelectedAlbum = useCallback(async (selectedAlbum, resetDraft = false) => {
    if (!selectedAlbum) return;

    setAlbum({
      id: selectedAlbum.id || "",
      title: selectedAlbum.title,
      artist: selectedAlbum.artist,
      artwork_url: selectedAlbum.artwork_url,
      release_year: selectedAlbum.release_year || "",
      release_date: selectedAlbum.release_date || "",
      album_type: selectedAlbum.album_type || "",
      track_count: selectedAlbum.track_count || null,
      label: selectedAlbum.label || "",
      genres: selectedAlbum.genres || [],
      runtime_ms: selectedAlbum.runtime_ms || null,
      credits: selectedAlbum.credits || [],
    });

    if (resetDraft) {
      setUseManualRating(false);
      setUseAdvancedRating(false);
      setManualRating(0);
      setAdvancedRatingInput("");
      setNotes("");
      setSelectedFolderId("");
      setReactions([]);
      setComments([]);
    }

    if (selectedAlbum.id) {
      const resp = await db.functions.invoke("spotifyAlbumTracks", {
        albumId: selectedAlbum.id,
      });
      const fetchedTracks = (resp.data.tracks || []).map((t) => ({
        position: t.position,
        title: t.title || t.name || t.track_name || "",
        rating: 0,
      }));
      setTracks(fetchedTracks);
      if (resp.data.album) {
        setAlbum((currentAlbum) => ({ ...currentAlbum, ...resp.data.album }));
      }
      return;
    }

    setTracks([]);
  }, []);

  const getCurrentDisplayName = useCallback(() => {
    const fromDisplayName = String(myDisplayName || "").trim();
    if (fromDisplayName) return fromDisplayName;

    const fromProfile = String(myUsername || "").trim();
    if (fromProfile) return fromProfile;

    const fromUser = String(user?.username || user?.user_metadata?.username || user?.user_metadata?.user_name || "").trim();
    if (fromUser) return fromUser;

    const fallbackName = String(user?.full_name || "").trim();
    if (fallbackName) return fallbackName;

    const emailName = String(user?.email || "").trim();
    if (emailName) return emailName.split("@")[0];

    return "You";
  }, [myDisplayName, myUsername, user]);

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      try {
        if (user) {
          try {
            const profiles = await db.entities.Profile.filter({ created_by_id: user.id });
            if (profiles.length > 0) {
              setMyUsername(profiles[0].username || "");
              setMyDisplayName(profiles[0].display_name || profiles[0].username || "");
            }
          } catch (e) {
            console.error(e);
          }
        }

        if (user) {
          try {
            const userFolders = await db.entities.Folder.filter({ created_by_id: user.id });
            setFolders(userFolders);
          } catch (e) {
            console.error(e);
          }
        }

        if (isNew && passedAlbum) {
          await applySelectedAlbum(passedAlbum, true);
          if (cancelled) return;
        } else if (!isNew) {
          const review = await db.entities.Review.get(id);
          const reviewReactions = await db.entities.Review.filter({ id: review.id });
          const reviewComments = await db.entities.Review.filter({ id: review.id });
          if (cancelled) return;
          setReactions((reviewReactions[0]?.reactions || []));
          setComments((reviewComments[0]?.comments || []));
          if (cancelled) return;
          setAlbum({
            id: review.spotify_album_id || "",
            title: review.album_title,
            artist: review.artist,
            artwork_url: review.album_art_url,
            release_year: review.release_year || "",
            release_date: review.release_year || "",
            album_type: "",
            track_count: review.tracks?.length || null,
            label: "",
            genres: [],
            runtime_ms: null,
            credits: [],
          });
          setTracks(review.tracks || []);
          setUseManualRating(review.use_manual_rating || false);
          setManualRating(review.manual_rating || 0);
          setUseAdvancedRating(Boolean(review.use_manual_rating && Number(review.manual_rating || 0) > 10));
          setAdvancedRatingInput(Boolean(review.use_manual_rating && Number(review.manual_rating || 0) > 10) ? formatAdvancedReviewInput(review.manual_rating) : "");
          setNotes(review.notes || "");
          setReviewerName(review.username || "");
          setSelectedFolderId(review.folder_id || "");
          setReviewOwnerId(review.created_by_id || "");
          const isOwner = Boolean(review.created_by_id && review.created_by_id === user?.id);
          setReadOnly(!isOwner);

          if (review.spotify_album_id) {
            const metadataResponse = await db.functions.invoke("spotifyAlbumTracks", {
              albumId: review.spotify_album_id,
            });
            if (!cancelled && metadataResponse.data.album) {
              setAlbum((currentAlbum) => ({ ...currentAlbum, ...metadataResponse.data.album }));
            }
          }
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          toast({ variant: "destructive", title: "Error", description: "Could not load album data." });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadData();
    return () => {
      cancelled = true;
    };
  }, [id, isNew, passedAlbum, user, applySelectedAlbum]);

  useEffect(() => {
    let cancelled = false;

    const loadCommenterAvatars = async () => {
      const userIds = [...new Set((comments || []).map((comment) => comment?.userId).filter(Boolean))];
      if (userIds.length === 0) {
        if (!cancelled) setCommentProfileByUserId({});
        return;
      }

      const avatarEntries = await Promise.all(
        userIds.map(async (commentUserId) => {
          try {
            const rows = await db.entities.Profile.filter({ created_by_id: commentUserId });
            return [
              commentUserId,
              {
                avatar_url: rows[0]?.avatar_url || "",
                username: rows[0]?.username || "",
                display_name: rows[0]?.display_name || "",
              },
            ];
          } catch {
            return [commentUserId, { avatar_url: "", username: "", display_name: "" }];
          }
        })
      );

      if (!cancelled) {
        setCommentProfileByUserId(Object.fromEntries(avatarEntries));
      }
    };

    loadCommenterAvatars();
    return () => {
      cancelled = true;
    };
  }, [comments]);

  const handleRateTrack = useCallback((index, rating) => {
    if (readOnly) return;
    setTracks((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], rating };
      return updated;
    });
  }, [readOnly]);

  const autoRating = useMemo(() => {
    const rated = tracks.filter((t) => t.rating > 0);
    if (rated.length === 0) return 0;
    return rated.reduce((sum, t) => sum + t.rating, 0) / rated.length;
  }, [tracks]);

  const isAdvancedReview = useManualRating && useAdvancedRating;
  const displayRating = useManualRating ? manualRating : autoRating;
  const ratingScale = getReviewRatingScale(displayRating, isAdvancedReview);
  const formattedDisplayRating = formatReviewRatingValue(displayRating, isAdvancedReview);
  const ratedCount = tracks.filter((t) => t.rating > 0).length;
  const advancedRatingValidation = isAdvancedReview ? validateAdvancedReviewInput(advancedRatingInput) : { value: null, error: "" };

  const handleToggleManualRating = () => {
    if (useManualRating && !useAdvancedRating) {
      setUseManualRating(false);
      setManualRating(0);
      return;
    }

    const nextManualRating = roundToHalfStep(Math.min(10, Math.max(0, isAdvancedReview ? manualRating / 10 : (manualRating || autoRating))));
    setUseAdvancedRating(false);
    setAdvancedRatingInput("");
    setUseManualRating(true);
    setManualRating(nextManualRating);
  };

  const handleToggleAdvancedRating = () => {
    if (useAdvancedRating) {
      setUseAdvancedRating(false);
      setUseManualRating(false);
      setManualRating(0);
      setAdvancedRatingInput("");
      return;
    }

    const seedRating = useManualRating && !useAdvancedRating
      ? roundToQuarterStep(manualRating * 10)
      : roundToQuarterStep(autoRating * 10);

    setUseManualRating(true);
    setUseAdvancedRating(true);
    setManualRating(seedRating);
    setAdvancedRatingInput(formatAdvancedReviewInput(seedRating));
  };

  const handleAdvancedRatingChange = (event) => {
    const nextValue = event.target.value;
    if (!/^\d{0,3}(\.\d{0,2})?$/.test(nextValue)) return;

    setAdvancedRatingInput(nextValue);
    if (!nextValue.trim()) {
      setManualRating(0);
      return;
    }

    const parsed = Number(nextValue);
    if (Number.isFinite(parsed)) {
      setManualRating(parsed);
    }
  };

  const handleAdvancedRatingBlur = () => {
    const validation = validateAdvancedReviewInput(advancedRatingInput);
    if (validation.error || validation.value === null) return;
    setManualRating(validation.value);
    setAdvancedRatingInput(formatAdvancedReviewInput(validation.value));
  };

  const handleReaction = async (emoji) => {
    if (!user || !reviewId) return;
    try {
      const currentDisplayName = getCurrentDisplayName();
      const resp = await db.functions.invoke("reviewInteractions", {
        action: "reaction_toggle",
        reviewId,
        userId: user.id,
        userName: currentDisplayName,
        emoji,
      });

      setReactions(resp?.data?.reactions || []);
      if (Array.isArray(resp?.data?.comments)) {
        setComments(resp.data.comments);
      }
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Error", description: e.message || "Could not save reaction." });
    }
  };

  const handleComment = async (event) => {
    event.preventDefault();
    if (!user || !reviewId || !commentText.trim()) return;

    try {
      const currentDisplayName = getCurrentDisplayName();
      const resp = await db.functions.invoke("reviewInteractions", {
        action: "comment_add",
        reviewId,
        userId: user.id,
        userName: currentDisplayName,
        text: commentText.trim(),
      });

      setComments(resp?.data?.comments || []);
      if (Array.isArray(resp?.data?.reactions)) {
        setReactions(resp.data.reactions);
      }
      setCommentText("");
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Error", description: e.message || "Could not save comment." });
    }
  };

  const handleStartEditComment = (comment) => {
    if (!comment || comment.userId !== user?.id) return;
    setEditingCommentId(comment.id);
    setEditingCommentText(comment.text || "");
  };

  const handleCancelEditComment = () => {
    setEditingCommentId("");
    setEditingCommentText("");
  };

  const handleSaveEditComment = async (commentId) => {
    if (!user || !reviewId || !commentId) return;

    const nextText = editingCommentText.trim();
    if (!nextText) {
      toast({ variant: "destructive", title: "Comment cannot be empty" });
      return;
    }

    try {
      const resp = await db.functions.invoke("reviewInteractions", {
        action: "comment_edit",
        reviewId,
        userId: user.id,
        userName: getCurrentDisplayName(),
        commentId,
        text: nextText,
      });

      setComments(resp?.data?.comments || []);
      if (Array.isArray(resp?.data?.reactions)) {
        setReactions(resp.data.reactions);
      }
      setEditingCommentId("");
      setEditingCommentText("");
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Error", description: e.message || "Could not edit comment." });
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!user || !reviewId || !commentId) return;

    try {
      const resp = await db.functions.invoke("reviewInteractions", {
        action: "comment_delete",
        reviewId,
        userId: user.id,
        userName: getCurrentDisplayName(),
        commentId,
      });

      setComments(resp?.data?.comments || []);
      if (Array.isArray(resp?.data?.reactions)) {
        setReactions(resp.data.reactions);
      }

      if (editingCommentId === commentId) {
        setEditingCommentId("");
        setEditingCommentText("");
      }
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Error", description: e.message || "Could not delete comment." });
    }
  };

  const handleDelete = async () => {
    if (!reviewId || !user) return;
    if (reviewOwnerId && reviewOwnerId !== user.id) {
      toast({ variant: "destructive", title: "Not allowed", description: "You can only delete your own review." });
      return;
    }

    try {
      await db.entities.Review.delete(reviewId);
      toast({ title: "Review deleted" });
      navigate("/", { replace: true });
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Delete failed", description: "Could not delete your review." });
    }
  };

  const handleGoToUserProfile = (commentUserId) => {
    if (!commentUserId) return;
    navigate(`/user/${commentUserId}`);
  };

  const handleSurpriseAgain = async () => {
    if (!isNew || readOnly) return;
    setSurprising(true);
    try {
      const resp = await db.functions.invoke("spotifyRandomAlbum", {});
      const randomAlbum = resp?.data?.album || null;
      if (!randomAlbum) {
        throw new Error("Could not find a random album right now. Try again.");
      }
      await applySelectedAlbum(randomAlbum, true);
      toast({ title: "New random album loaded" });
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Random album failed", description: e.message || "Please try again." });
    } finally {
      setSurprising(false);
    }
  };

  const handleSave = async () => {
    if (!isNew && reviewOwnerId && reviewOwnerId !== user?.id) {
      toast({ variant: "destructive", title: "Not allowed", description: "You can only edit your own review." });
      return;
    }

    if (isAdvancedReview) {
      const validation = validateAdvancedReviewInput(advancedRatingInput);
      if (validation.error || validation.value === null) {
        toast({ variant: "destructive", title: "Invalid advanced rating", description: validation.error });
        return;
      }
    }

    setSaving(true);
    try {
      const savedManualRating = isAdvancedReview
        ? validateAdvancedReviewInput(advancedRatingInput).value
        : (useManualRating ? roundToHalfStep(manualRating) : 0);
      const savedAlbumRating = isAdvancedReview
        ? savedManualRating
        : (useManualRating ? Math.round(savedManualRating * 10) / 10 : Math.round(autoRating * 10) / 10);
      const selectedFolder = folders.find((folder) => folder.id === selectedFolderId);
      const payload = {
        created_by_id: user?.id || null,
        spotify_album_id: album.id || "",
        album_title: album.title,
        artist: album.artist,
        album_art_url: album.artwork_url || "",
        release_year: album.release_year || "",
        username: myUsername,
        tracks,
        album_rating: savedAlbumRating,
        use_manual_rating: useManualRating,
        manual_rating: useManualRating ? savedManualRating : 0,
        notes,
        reactions,
        comments,
        folder_id: selectedFolderId || null,
        folder_name: selectedFolder?.name || "",
      };

      if (reviewId) {
        await db.entities.Review.update(reviewId, payload);
        toast({ title: "Review saved" });
      } else {
        const created = await db.entities.Review.create(payload);
        setReviewId(created.id);
        navigate(`/review/${created.id}`, { replace: true });
        toast({ title: "Review saved" });
      }

      // Auto-share to Discord if the album reaches featured status
      db.functions.invoke("shareFeaturedToDiscord", {
        album_title: album.title,
        artist: album.artist,
      }).catch(() => {});
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Save failed", description: "Could not save your review." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-stone-400 animate-spin" />
      </div>
    );
  }

  if (!album) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-white/40">
        <Music2 className="w-12 h-12 mb-3 opacity-30" />
        <p>Album not found.</p>
        <Button variant="ghost" className="mt-4 text-white/60" onClick={() => navigate("/")}>
          Back to search
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-white/50 hover:text-white text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        {!readOnly && (
          <div className="flex items-center gap-2">
            {isNew && (
              <Button
                variant="outline"
                onClick={handleSurpriseAgain}
                disabled={surprising || saving}
                className="border-amber-500/30 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20"
              >
                {surprising ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Shuffle className="w-4 h-4 mr-2" />}
                Try another random album
              </Button>
            )}
            <Button
              variant="outline"
              onClick={handleDelete}
              className="border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20"
            >
              Delete
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-gradient-to-r from-stone-600 to-slate-600 hover:from-stone-500 hover:to-slate-500 text-white border-0"
            >
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              {reviewId ? "Save Changes" : "Save Review"}
            </Button>
          </div>
        )}
      </div>

      {readOnly && reviewerName && (
        <div className="mb-4 text-sm text-white/40">
          Review by <span className="text-stone-400 font-medium">{reviewerName}</span>
        </div>
      )}

      <section className="mb-8 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] shadow-2xl shadow-black/30" aria-labelledby="album-title">
        <div className="grid gap-0 lg:grid-cols-[minmax(15rem,22rem)_1fr]">
          <div className="relative aspect-square w-full overflow-hidden bg-white/[0.04] lg:min-h-full">
            {album.artwork_url ? (
              <Image src={album.artwork_url} alt={`Cover art for ${album.title}`} fittingType="fill" className="h-full w-full" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-white/25">
                <Music2 className="h-12 w-12" aria-hidden="true" />
                <span className="sr-only">Album artwork unavailable</span>
              </div>
            )}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/60 to-transparent lg:hidden" />
          </div>

          <div className="flex min-w-0 flex-col p-5 sm:p-7">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">Album review</p>
            <h1 id="album-title" className="text-3xl font-bold leading-[1.08] tracking-tight text-white sm:text-4xl">{album.title}</h1>
            <p className="mt-2 text-lg text-white/60 sm:text-xl">{album.artist}</p>

            {album.genres?.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2" aria-label="Album genres">
                {album.genres.map((genre) => (
                  <a
                    key={genre}
                    href={`https://open.spotify.com/search/${encodeURIComponent(genre)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-stone-400/25 bg-stone-400/10 px-3 py-1 text-xs font-medium text-stone-200 transition-colors hover:border-stone-300/50 hover:bg-stone-400/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-300"
                  >
                    {genre}
                  </a>
                ))}
              </div>
            )}

            <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Album metadata">
              <div className="rounded-2xl border border-white/10 bg-black/15 p-3">
                <Calendar className="mb-2 h-4 w-4 text-stone-400" aria-hidden="true" />
                <p className="text-[10px] font-semibold uppercase tracking-wider text-white/35">Released</p>
                <p className="mt-0.5 text-sm font-medium text-white/80">{album.release_date || album.release_year || "Unavailable"}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/15 p-3">
                <Clock3 className="mb-2 h-4 w-4 text-stone-400" aria-hidden="true" />
                <p className="text-[10px] font-semibold uppercase tracking-wider text-white/35">Runtime</p>
                <p className="mt-0.5 text-sm font-medium text-white/80">{formatRuntime(album.runtime_ms)}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/15 p-3">
                <ListMusic className="mb-2 h-4 w-4 text-stone-400" aria-hidden="true" />
                <p className="text-[10px] font-semibold uppercase tracking-wider text-white/35">Tracks</p>
                <p className="mt-0.5 text-sm font-medium text-white/80">{album.track_count || "Unavailable"}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/15 p-3">
                <Disc3 className="mb-2 h-4 w-4 text-stone-400" aria-hidden="true" />
                <p className="text-[10px] font-semibold uppercase tracking-wider text-white/35">Format</p>
                <p className="mt-0.5 text-sm font-medium text-white/80">{formatAlbumType(album.album_type)}</p>
              </div>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-white/10 bg-black/15 px-3 py-3">
                <Building2 className="h-4 w-4 flex-shrink-0 text-stone-400" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-white/35">Record label</p>
                  <p className="truncate text-sm font-medium text-white/80">{album.label || "Unavailable"}</p>
                </div>
              </div>
              <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-white/10 bg-black/15 px-3 py-3">
                <Tag className="h-4 w-4 flex-shrink-0 text-stone-400" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-white/35">Metadata source</p>
                  <p className="truncate text-sm font-medium text-white/80">Spotify</p>
                </div>
              </div>
            </div>

            {album.credits?.length > 0 && (
              <div className="mt-5 border-t border-white/10 pt-5">
                <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-white/45">Credits</h2>
                <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                  {album.credits.map((credit) => (
                    <div key={`${credit.role}-${credit.name}`} className="rounded-xl bg-black/15 px-3 py-2">
                      <dt className="text-[10px] font-semibold uppercase tracking-wider text-white/35">{credit.role}</dt>
                      <dd className="mt-0.5 text-sm text-white/80">{credit.name}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="mb-8 p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-stone-600/10 to-slate-600/10 border border-stone-500/20">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
          <div className="flex-1">
            <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-2">Album Rating</p>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl sm:text-5xl font-bold font-mono bg-gradient-to-r from-stone-300 to-slate-300 bg-clip-text text-transparent">
                {formattedDisplayRating}
              </span>
              <span className="text-white/30 text-lg">/ {ratingScale}</span>
            </div>
            {!useManualRating && (
              <p className="text-white/30 text-xs mt-1">
                Auto-calculated from {ratedCount} of {tracks.length} {ratedCount === 1 ? "track" : "tracks"}
              </p>
            )}
            {isAdvancedReview && (
              <p className="text-white/30 text-xs mt-1">
                Advanced Review uses typed scores from 0 to 100 in .25 increments.
              </p>
            )}
          </div>

          {!readOnly && (
            <>
              <div className="sm:w-px sm:h-24 h-px w-full bg-white/10" />
              <div className="flex-1 max-w-full overflow-hidden">
                <button
                  onClick={handleToggleManualRating}
                  className="flex items-center gap-2 text-sm font-medium mb-2 hover:text-stone-300 transition-colors"
                >
                  {useManualRating && !useAdvancedRating ? (
                    <ToggleRight className="w-5 h-5 text-stone-400" />
                  ) : (
                    <ToggleLeft className="w-5 h-5 text-white/30" />
                  )}
                  Override with manual rating
                </button>
                {useManualRating && !useAdvancedRating && (
                  <RatingScale value={manualRating} onChange={setManualRating} size="lg" />
                )}

                <button
                  onClick={handleToggleAdvancedRating}
                  className="mt-3 flex items-center gap-2 text-sm font-medium hover:text-stone-300 transition-colors"
                >
                  {useAdvancedRating ? (
                    <ToggleRight className="w-5 h-5 text-stone-400" />
                  ) : (
                    <ToggleLeft className="w-5 h-5 text-white/30" />
                  )}
                  Advanced Review
                </button>

                {useAdvancedRating && (
                  <div className="mt-3 max-w-sm">
                    <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
                      Typed Album Score
                    </label>
                    <div className="inline-flex w-full max-w-[18rem] items-center gap-2 rounded-2xl border border-white/10 bg-black/20 p-2 shadow-lg shadow-black/20">
                      <div className="flex min-w-0 flex-1 items-center rounded-xl border border-stone-400/25 bg-white/[0.04] px-3 py-2.5 focus-within:border-stone-300/50 focus-within:bg-white/[0.06]">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={advancedRatingInput}
                          onChange={handleAdvancedRatingChange}
                          onBlur={handleAdvancedRatingBlur}
                          placeholder="00.00"
                          className="w-full min-w-0 bg-transparent font-mono text-base font-semibold tracking-[0.08em] text-white outline-none placeholder:text-white/20 sm:text-lg"
                        />
                        <span className="ml-2 whitespace-nowrap rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/40">
                          /100
                        </span>
                      </div>
                      <div className="rounded-xl border border-stone-400/20 bg-stone-400/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-200">
                        Type
                      </div>
                    </div>
                    <p className="mt-2 pl-1 text-[11px] text-white/28">Quarter-step only: 90.25, 90.50, 90.75.</p>
                    {advancedRatingInput.trim() && advancedRatingValidation.error && (
                      <p className="mt-2 pl-1 text-xs text-red-300">{advancedRatingValidation.error}</p>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {!readOnly && (
        <div className="mb-8 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-1">Folder</h2>
              <p className="text-sm text-white/40">Place this review into a custom folder for easier sorting.</p>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
              <FolderOpen className="h-4 w-4 text-stone-400" />
              <select
                value={selectedFolderId}
                onChange={(e) => setSelectedFolderId(e.target.value)}
                className="bg-transparent text-sm text-white outline-none"
              >
                <option value="" className="bg-zinc-900">No folder</option>
                {folders.map((folder) => (
                  <option key={folder.id} value={folder.id} className="bg-zinc-900">
                    {folder.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      <div className="mb-8">
        <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3">Track List</h2>
        <div className="rounded-2xl bg-white/[0.02] border border-white/5 p-2 sm:p-3 overflow-x-auto">
          <TrackList tracks={tracks} onRateTrack={handleRateTrack} readOnly={readOnly} />
        </div>
      </div>

      {!readOnly && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3">Review Notes</h2>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Write your thoughts about the album..."
            className="w-full min-h-[120px] bg-white/[0.03] border border-white/10 rounded-2xl px-4 py-3 text-white placeholder:text-white/25 text-sm outline-none focus:border-stone-500/50 transition-colors resize-y"
          />
        </div>
      )}

      {readOnly && notes && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3">Review Notes</h2>
          <div className="rounded-2xl bg-white/[0.02] border border-white/5 p-4 text-white/70 text-sm whitespace-pre-wrap">
            {notes}
          </div>
        </div>
      )}

      <div className="mb-8 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex flex-wrap gap-2 mb-4">
          {[{ emoji: '👍', icon: ThumbsUp }, { emoji: '❤️', icon: Heart }, { emoji: '😂', icon: Laugh }, { emoji: '👎', icon: ThumbsDown }].map((item) => {
            const Icon = item.icon;
            const active = reactions.some((reaction) => reaction.userId === user?.id && reaction.emoji === item.emoji);
            return (
              <button
                key={item.emoji}
                onClick={() => handleReaction(item.emoji)}
                className={`flex items-center gap-2 rounded-full border px-3 py-2 text-sm ${active ? 'border-stone-500/50 bg-stone-500/10 text-white' : 'border-white/10 bg-white/[0.02] text-white/60'}`}
              >
                <Icon className="h-4 w-4" />
                <span>{item.emoji}</span>
              </button>
            );
          })}
        </div>

        <div className="mb-4 flex items-center gap-2 text-sm text-white/50">
          <MessageCircle className="h-4 w-4" />
          <span>{reactions.length} reactions • {comments.length} comments</span>
        </div>

        <form onSubmit={handleComment} className="space-y-3">
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Write a comment..."
            className="w-full min-h-[90px] bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder:text-white/25 text-sm outline-none focus:border-stone-500/50 transition-colors resize-y"
          />
          <Button type="submit" className="bg-gradient-to-r from-stone-600 to-slate-600 text-white border-0">
            Comment
          </Button>
        </form>

        <div className="mt-4 space-y-3">
          {comments.map((comment) => (
            <div key={comment.id} className="rounded-xl border border-white/10 bg-black/10 p-3">
              <div className="flex items-center justify-between mb-1 gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="h-7 w-7 flex-shrink-0 overflow-hidden rounded-full bg-white/10">
                    {commentProfileByUserId[comment.userId]?.avatar_url ? (
                      <img
                        src={commentProfileByUserId[comment.userId]?.avatar_url}
                        alt={comment.userName || "Comment avatar"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-white/70">
                        {String(comment.userName || "U").charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    {comment.userId ? (
                      <button
                        onClick={() => handleGoToUserProfile(comment.userId)}
                        className="truncate text-sm font-medium text-stone-300 hover:text-stone-200 hover:underline"
                      >
                        {commentProfileByUserId[comment.userId]?.display_name || comment.userName || "User"}
                      </button>
                    ) : (
                      <p className="truncate text-sm font-medium text-white/80">{comment.userName || "User"}</p>
                    )}
                    <p className="truncate text-xs italic text-white/45">
                      @{commentProfileByUserId[comment.userId]?.username || "user"} • {new Date(comment.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {comment.userId === user?.id && (
                    <>
                      <button
                        onClick={() => handleStartEditComment(comment)}
                        className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-xs text-white/60 hover:bg-white/10 hover:text-white"
                        aria-label="Edit comment"
                      >
                        <Pencil className="h-3 w-3" /> Edit
                      </button>
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-500/30 px-2 py-1 text-xs text-red-300 hover:bg-red-500/20"
                        aria-label="Delete comment"
                      >
                        <Trash2 className="h-3 w-3" /> Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
              {editingCommentId === comment.id && comment.userId === user?.id ? (
                <div className="space-y-2">
                  <textarea
                    value={editingCommentText}
                    onChange={(e) => setEditingCommentText(e.target.value)}
                    className="w-full min-h-[80px] rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none focus:border-stone-500/50"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSaveEditComment(comment.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-stone-500/40 bg-stone-500/10 px-2 py-1 text-xs text-white hover:bg-stone-500/20"
                    >
                      <Check className="h-3 w-3" /> Save
                    </button>
                    <button
                      onClick={handleCancelEditComment}
                      className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-xs text-white/70 hover:bg-white/10 hover:text-white"
                    >
                      <X className="h-3 w-3" /> Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-white/60">{comment.text}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
