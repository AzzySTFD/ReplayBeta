import { db } from "@/api/base44Client";

const seenKeyForUser = (userId) => `notifications:last-seen:${userId}`;
const dismissedKeyForUser = (userId) => `notifications:dismissed:${userId}`;

const eventTime = (value) => {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const getLastSeenAt = (userId) => {
  if (!userId || typeof window === "undefined" || !window.localStorage) return 0;
  const raw = window.localStorage.getItem(seenKeyForUser(userId));
  return Number(raw || 0);
};

export const markNotificationsSeen = (userId) => {
  if (!userId || typeof window === "undefined" || !window.localStorage) return;
  window.localStorage.setItem(seenKeyForUser(userId), String(Date.now()));
  window.dispatchEvent(new CustomEvent("notifications:updated"));
};

const getDismissedNotificationIds = (userId) => {
  if (!userId || typeof window === "undefined" || !window.localStorage) return new Set();

  try {
    const raw = window.localStorage.getItem(dismissedKeyForUser(userId));
    const parsed = JSON.parse(raw || "[]");
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.map((value) => String(value)));
  } catch {
    return new Set();
  }
};

const setDismissedNotificationIds = (userId, ids) => {
  if (!userId || typeof window === "undefined" || !window.localStorage) return;
  window.localStorage.setItem(dismissedKeyForUser(userId), JSON.stringify(Array.from(ids)));
};

export const clearNotifications = (userId, items = []) => {
  if (!userId || !Array.isArray(items) || items.length === 0) {
    markNotificationsSeen(userId);
    return;
  }

  const dismissed = getDismissedNotificationIds(userId);
  for (const item of items) {
    if (item?.id) {
      dismissed.add(String(item.id));
    }
  }

  setDismissedNotificationIds(userId, dismissed);
  markNotificationsSeen(userId);
};

const buildInteractionEventId = (type, reviewId, interaction, index) => {
  const createdAt = interaction?.created_at || "";
  const actorId = interaction?.userId || "";
  const interactionId = interaction?.id || `${actorId}-${createdAt}-${index}`;
  return `${type}-${reviewId}-${interactionId}`;
};

export const fetchNotificationItems = async (userId) => {
  if (!userId) return [];

  const [incomingFollows, myReviews] = await Promise.all([
    db.entities.Follow.filter({ following_id: userId }, "-created_at", 100),
    db.entities.Review.filter({ created_by_id: userId }, "-updated_date", 200),
  ]);

  const followerIds = [...new Set((incomingFollows || []).map((item) => item.created_by_id).filter(Boolean))];
  const interactionActorIds = new Set();

  for (const review of myReviews) {
    const reactions = Array.isArray(review.reactions) ? review.reactions : [];
    const comments = Array.isArray(review.comments) ? review.comments : [];
    for (const reaction of reactions) {
      if (reaction?.userId && reaction.userId !== userId) interactionActorIds.add(reaction.userId);
    }
    for (const comment of comments) {
      if (comment?.userId && comment.userId !== userId) interactionActorIds.add(comment.userId);
    }
  }

  const profileIds = [...new Set([...followerIds, ...interactionActorIds])];
  const profiles = await Promise.all(
    profileIds.map(async (profileUserId) => {
      const rows = await db.entities.Profile.filter({ created_by_id: profileUserId });
      return {
        id: profileUserId,
        username: rows[0]?.username || "Someone",
        avatar_url: rows[0]?.avatar_url || "",
      };
    })
  );
  const profileById = new Map(profiles.map((entry) => [entry.id, entry]));

  const events = [];

  for (const follow of incomingFollows) {
    const followerProfile = profileById.get(follow.created_by_id);
    const followerName = followerProfile?.username || "Someone";
    events.push({
      id: `follow-${follow.id}`,
      type: "follow",
      title: `${followerName} followed you`,
      description: "You have a new follower.",
      created_at: follow.created_at,
      icon: "follow",
      href: "/discover",
      actor_avatar_url: followerProfile?.avatar_url || "",
      actor_user_id: follow.created_by_id || "",
    });
  }

  for (const review of myReviews) {
    const reviewHref = `/review/${review.id}`;
    const reactions = Array.isArray(review.reactions) ? review.reactions : [];
    const comments = Array.isArray(review.comments) ? review.comments : [];

    for (const reaction of reactions) {
      if (!reaction || reaction.userId === userId) continue;
      const actorProfile = profileById.get(reaction.userId);
      events.push({
        id: buildInteractionEventId("reaction", review.id, reaction, events.length),
        type: "reaction",
        title: `${actorProfile?.username || reaction.userName || "Someone"} reacted ${reaction.emoji || ""}`.trim(),
        description: `On your review of ${review.album_title || "an album"}.`,
        created_at: reaction.created_at || review.updated_at || review.created_at,
        icon: "reaction",
        href: reviewHref,
        actor_avatar_url: actorProfile?.avatar_url || "",
        actor_user_id: reaction.userId || "",
      });
    }

    for (const comment of comments) {
      if (!comment || comment.userId === userId) continue;
      const actorProfile = profileById.get(comment.userId);
      events.push({
        id: buildInteractionEventId("comment", review.id, comment, events.length),
        type: "comment",
        title: `${actorProfile?.username || comment.userName || "Someone"} commented on your review`,
        description: comment.text || `On your review of ${review.album_title || "an album"}.`,
        created_at: comment.created_at || review.updated_at || review.created_at,
        icon: "comment",
        href: reviewHref,
        actor_avatar_url: actorProfile?.avatar_url || "",
        actor_user_id: comment.userId || "",
      });
    }
  }

  events.sort((a, b) => eventTime(b.created_at) - eventTime(a.created_at));
  const dismissedIds = getDismissedNotificationIds(userId);
  return events.filter((item) => !dismissedIds.has(String(item.id)));
};

export const computeUnreadCount = (items, userId) => {
  const seenAt = getLastSeenAt(userId);
  if (!seenAt) {
    return items.length;
  }

  return items.filter((item) => eventTime(item.created_at) > seenAt).length;
};
