import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { db } from "@/api/base44Client";

import { Image } from "@/components/ui/image";
import { Button } from "@/components/ui/button";
import TrackList from "@/components/TrackList";
import RatingScale from "@/components/RatingScale";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, Loader2, Save, Music2, ToggleLeft, ToggleRight, Calendar, MessageCircle, Heart, Laugh, ThumbsDown, ThumbsUp, FolderOpen, Pencil, Trash2, Check, X } from "lucide-react";

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
  const [album, setAlbum] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [useManualRating, setUseManualRating] = useState(false);
  const [manualRating, setManualRating] = useState(0);
  const [notes, setNotes] = useState("");
  const [reviewId, setReviewId] = useState(isNew ? null : id);
  const [readOnly, setReadOnly] = useState(false);
  const [myUsername, setMyUsername] = useState("");
  const [reviewerName, setReviewerName] = useState("");
  const [reactions, setReactions] = useState([]);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [editingCommentId, setEditingCommentId] = useState("");
  const [editingCommentText, setEditingCommentText] = useState("");
  const [folders, setFolders] = useState([]);
  const [selectedFolderId, setSelectedFolderId] = useState("");

  const getCurrentDisplayName = useCallback(() => {
    const fromProfile = String(myUsername || "").trim();
    if (fromProfile) return fromProfile;

    const fromUser = String(user?.username || user?.user_metadata?.username || user?.user_metadata?.user_name || "").trim();
    if (fromUser) return fromUser;

    const fallbackName = String(user?.full_name || "").trim();
    if (fallbackName) return fallbackName;

    const emailName = String(user?.email || "").trim();
    if (emailName) return emailName.split("@")[0];

    return "You";
  }, [myUsername, user]);

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      try {
        let profileUsername = "";
        if (user) {
          try {
            const profiles = await db.entities.Profile.filter({ created_by_id: user.id });
            if (profiles.length > 0) {
              profileUsername = profiles[0].username || "";
              setMyUsername(profileUsername);
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
          setAlbum({
            title: passedAlbum.title,
            artist: passedAlbum.artist,
            artwork_url: passedAlbum.artwork_url,
            release_year: passedAlbum.release_year || "",
          });

          if (passedAlbum.id) {
            const resp = await db.functions.invoke("spotifyAlbumTracks", {
              albumId: passedAlbum.id,
            });
            if (cancelled) return;
            const fetchedTracks = (resp.data.tracks || []).map((t) => ({
              position: t.position,
              title: t.title,
              rating: 0,
            }));
            setTracks(fetchedTracks);
          }
        } else if (!isNew) {
          const review = await db.entities.Review.get(id);
          const reviewReactions = await db.entities.Review.filter({ id: review.id });
          const reviewComments = await db.entities.Review.filter({ id: review.id });
          if (cancelled) return;
          setReactions((reviewReactions[0]?.reactions || []));
          setComments((reviewComments[0]?.comments || []));
          if (cancelled) return;
          setAlbum({
            title: review.album_title,
            artist: review.artist,
            artwork_url: review.album_art_url,
            release_year: review.release_year || "",
          });
          setTracks(review.tracks || []);
          setUseManualRating(review.use_manual_rating || false);
          setManualRating(review.manual_rating || 0);
          setNotes(review.notes || "");
          setReviewerName(review.username || "");
          setSelectedFolderId(review.folder_id || "");
          const isOwner = review.created_by_id
            ? review.created_by_id === user?.id
            : Boolean(user && profileUsername && review.username && review.username === profileUsername);
          setReadOnly(!isOwner);
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
  }, [id, isNew, passedAlbum, user]);

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

  const displayRating = useManualRating ? manualRating : autoRating;
  const ratedCount = tracks.filter((t) => t.rating > 0).length;

  const handleReaction = async (emoji) => {
    if (!user || !reviewId) return;

    const nextReactions = [...reactions];
    const existing = nextReactions.find((item) => item.userId === user.id && item.emoji === emoji);
    let updatedReactions;

    if (existing) {
      updatedReactions = nextReactions.filter((item) => !(item.userId === user.id && item.emoji === emoji));
    } else {
      const currentDisplayName = getCurrentDisplayName();
      updatedReactions = [
        ...nextReactions,
        { id: `reaction-${Date.now()}`, userId: user.id, userName: currentDisplayName, emoji },
      ];
    }

    setReactions(updatedReactions);

    const review = await db.entities.Review.get(reviewId);
    if (review) {
      await db.entities.Review.update(reviewId, {
        reactions: updatedReactions,
      });
    }
  };

  const handleComment = async (event) => {
    event.preventDefault();
    if (!user || !reviewId || !commentText.trim()) return;

    const currentDisplayName = getCurrentDisplayName();
    const nextComments = [
      ...comments,
      {
        id: `comment-${Date.now()}`,
        userId: user.id,
        userName: currentDisplayName,
        text: commentText.trim(),
        created_at: new Date().toISOString(),
      },
    ];
    setComments(nextComments);
    setCommentText("");

    const review = await db.entities.Review.get(reviewId);
    if (review) {
      await db.entities.Review.update(reviewId, { comments: nextComments });
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

    const updatedComments = comments.map((comment) => {
      if (comment.id !== commentId || comment.userId !== user.id) return comment;
      return {
        ...comment,
        text: nextText,
        edited_at: new Date().toISOString(),
      };
    });

    setComments(updatedComments);
    setEditingCommentId("");
    setEditingCommentText("");

    const review = await db.entities.Review.get(reviewId);
    if (review) {
      await db.entities.Review.update(reviewId, { comments: updatedComments });
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!user || !reviewId || !commentId) return;

    const updatedComments = comments.filter((comment) => !(comment.id === commentId && comment.userId === user.id));
    setComments(updatedComments);

    if (editingCommentId === commentId) {
      setEditingCommentId("");
      setEditingCommentText("");
    }

    const review = await db.entities.Review.get(reviewId);
    if (review) {
      await db.entities.Review.update(reviewId, { comments: updatedComments });
    }
  };

  const handleDelete = async () => {
    if (!reviewId || !user) return;

    try {
      await db.entities.Review.delete(reviewId);
      toast({ title: "Review deleted" });
      navigate("/", { replace: true });
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Delete failed", description: "Could not delete your review." });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const selectedFolder = folders.find((folder) => folder.id === selectedFolderId);
      const payload = {
        created_by_id: user?.id || null,
        album_title: album.title,
        artist: album.artist,
        album_art_url: album.artwork_url || "",
        release_year: album.release_year || "",
        username: myUsername,
        tracks,
        album_rating: Math.round(displayRating * 10) / 10,
        use_manual_rating: useManualRating,
        manual_rating: useManualRating ? manualRating : 0,
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

      <div className="flex flex-col sm:flex-row gap-6 mb-8">
        <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-2xl overflow-hidden bg-white/5 flex-shrink-0 shadow-2xl shadow-black/50 mx-auto sm:mx-0">
          {album.artwork_url && (
            <Image src={album.artwork_url} alt={album.title} fittingType="fill" className="w-full h-full" />
          )}
        </div>
        <div className="flex-1 flex flex-col justify-end text-center sm:text-left">
          <p className="text-stone-400 text-xs font-semibold uppercase tracking-wider mb-1">Album Review</p>
          <h1 className="text-2xl sm:text-3xl font-bold leading-tight mb-1">{album.title}</h1>
          <p className="text-white/50 text-lg mb-2">{album.artist}</p>
          {album.release_year && (
            <div className="flex items-center justify-center sm:justify-start gap-1.5 text-white/30 text-sm">
              <Calendar className="w-3.5 h-3.5" /> {album.release_year}
            </div>
          )}
        </div>
      </div>

      <div className="mb-8 p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-stone-600/10 to-slate-600/10 border border-stone-500/20">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
          <div className="flex-1">
            <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-2">Album Rating</p>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl sm:text-5xl font-bold font-mono bg-gradient-to-r from-stone-300 to-slate-300 bg-clip-text text-transparent">
                {displayRating > 0 ? displayRating.toFixed(1) : "—"}
              </span>
              <span className="text-white/30 text-lg">/ 10</span>
            </div>
            {!useManualRating && (
              <p className="text-white/30 text-xs mt-1">
                Auto-calculated from {ratedCount} of {tracks.length} {ratedCount === 1 ? "track" : "tracks"}
              </p>
            )}
          </div>

          {!readOnly && (
            <>
              <div className="sm:w-px sm:h-16 h-px w-full bg-white/10" />
              <div className="flex-1">
                <button
                  onClick={() => setUseManualRating(!useManualRating)}
                  className="flex items-center gap-2 text-sm font-medium mb-2 hover:text-stone-300 transition-colors"
                >
                  {useManualRating ? (
                    <ToggleRight className="w-5 h-5 text-stone-400" />
                  ) : (
                    <ToggleLeft className="w-5 h-5 text-white/30" />
                  )}
                  Override with manual rating
                </button>
                {useManualRating && (
                  <RatingScale value={manualRating} onChange={setManualRating} size="lg" />
                )}
              </div>
            </>
          )}
        </div>
      </div>

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
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium text-white/80">{comment.userName}</p>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-white/30">{new Date(comment.created_at).toLocaleString()}</p>
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