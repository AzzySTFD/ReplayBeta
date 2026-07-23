import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Heart, MessageCircle, UserPlus, Loader2, ChevronRight } from "lucide-react";
import { db } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";

const eventTime = (value) => {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatTimeAgo = (value) => {
  const time = eventTime(value);
  if (!time) return "recently";

  const diffMs = Date.now() - time;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

export default function Notifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);

  useEffect(() => {
    let cancelled = false;

    const loadNotifications = async (showSpinner = true) => {
      if (!user?.id) {
        setItems([]);
        setLoading(false);
        return;
      }

      if (showSpinner) {
        setLoading(true);
      }
      try {
        const [incomingFollows, myReviews] = await Promise.all([
          db.entities.Follow.filter({ following_id: user.id }, "-created_at", 100),
          db.entities.Review.filter({ created_by_id: user.id }, "-updated_date", 200),
        ]);

        const followerIds = [...new Set((incomingFollows || []).map((item) => item.created_by_id).filter(Boolean))];
        const followerProfiles = await Promise.all(
          followerIds.map(async (followerId) => {
            const rows = await db.entities.Profile.filter({ created_by_id: followerId });
            return { id: followerId, username: rows[0]?.username || "Someone" };
          })
        );
        const followerNameById = new Map(followerProfiles.map((entry) => [entry.id, entry.username]));

        const events = [];

        for (const follow of incomingFollows) {
          const followerName = followerNameById.get(follow.created_by_id) || "Someone";
          events.push({
            id: `follow-${follow.id}`,
            type: "follow",
            title: `${followerName} followed you`,
            description: "You have a new follower.",
            created_at: follow.created_at,
            icon: "follow",
            href: "/discover",
          });
        }

        for (const review of myReviews) {
          const reviewHref = `/review/${review.id}`;
          const reactions = Array.isArray(review.reactions) ? review.reactions : [];
          const comments = Array.isArray(review.comments) ? review.comments : [];

          for (const reaction of reactions) {
            if (!reaction || reaction.userId === user.id) continue;
            events.push({
              id: `reaction-${review.id}-${reaction.id || reaction.userId || Math.random()}`,
              type: "reaction",
              title: `${reaction.userName || "Someone"} reacted ${reaction.emoji || ""}`.trim(),
              description: `On your review of ${review.album_title || "an album"}.`,
              created_at: review.updated_at || review.created_at,
              icon: "reaction",
              href: reviewHref,
            });
          }

          for (const comment of comments) {
            if (!comment || comment.userId === user.id) continue;
            events.push({
              id: `comment-${review.id}-${comment.id || comment.userId || Math.random()}`,
              type: "comment",
              title: `${comment.userName || "Someone"} commented on your review`,
              description: comment.text || `On your review of ${review.album_title || "an album"}.`,
              created_at: comment.created_at || review.updated_at || review.created_at,
              icon: "comment",
              href: reviewHref,
            });
          }
        }

        events.sort((a, b) => eventTime(b.created_at) - eventTime(a.created_at));
        if (!cancelled) {
          setItems(events);
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setItems([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadNotifications(true);
    const pollId = window.setInterval(() => {
      loadNotifications(false);
    }, 15000);

    const handleFocus = () => {
      loadNotifications(false);
    };

    window.addEventListener("focus", handleFocus);
    return () => {
      cancelled = true;
      window.clearInterval(pollId);
      window.removeEventListener("focus", handleFocus);
    };
  }, [user]);

  const grouped = useMemo(() => items.slice(0, 100), [items]);

  const iconFor = (kind) => {
    if (kind === "follow") return <UserPlus className="h-4 w-4" />;
    if (kind === "comment") return <MessageCircle className="h-4 w-4" />;
    return <Heart className="h-4 w-4" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-stone-400" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center gap-2">
        <Bell className="h-5 w-5 text-stone-400" />
        <h1 className="text-2xl font-bold">Notifications</h1>
      </div>

      {grouped.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-white/50">
          No notifications yet.
        </div>
      ) : (
        <div className="space-y-3">
          {grouped.map((item) => (
            <button
              key={item.id}
              onClick={() => navigate(item.href)}
              className="group flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left transition-colors hover:bg-white/[0.05]"
            >
              <div className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-white/15 text-white/80">
                {iconFor(item.icon)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{item.title}</p>
                <p className="truncate text-xs text-white/50">{item.description}</p>
              </div>
              <div className="flex flex-shrink-0 items-center gap-2 text-xs text-white/40">
                <span>{formatTimeAgo(item.created_at)}</span>
                <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
