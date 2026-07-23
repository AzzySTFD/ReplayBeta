import { createClient } from "@supabase/supabase-js";

const buildAdminClient = () => {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    return null;
  }

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
};

const parseBody = (body) => {
  if (typeof body === "string") {
    try {
      return JSON.parse(body || "{}");
    } catch {
      return {};
    }
  }
  return body || {};
};

const nowIso = () => new Date().toISOString();

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const admin = buildAdminClient();
  if (!admin) {
    return res.status(503).json({ error: "Missing SUPABASE_SERVICE_ROLE_KEY on server" });
  }

  try {
    const body = parseBody(req.body);
    const action = String(body.action || "").trim();
    const reviewId = String(body.reviewId || "").trim();
    const userId = String(body.userId || "").trim();
    const userName = String(body.userName || "").trim() || "User";

    if (!reviewId || !userId || !action) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const { data: review, error: reviewError } = await admin
      .from("reviews")
      .select("id, comments, reactions")
      .eq("id", reviewId)
      .maybeSingle();

    if (reviewError) {
      throw reviewError;
    }

    if (!review) {
      return res.status(404).json({ error: "Review not found" });
    }

    const existingComments = Array.isArray(review.comments) ? review.comments : [];
    const existingReactions = Array.isArray(review.reactions) ? review.reactions : [];

    let comments = existingComments;
    let reactions = existingReactions;

    if (action === "comment_add") {
      const text = String(body.text || "").trim();
      if (!text) {
        return res.status(400).json({ error: "Comment text is required" });
      }

      comments = [
        ...existingComments,
        {
          id: `comment-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
          userId,
          userName,
          text,
          created_at: nowIso(),
        },
      ];
    } else if (action === "comment_edit") {
      const commentId = String(body.commentId || "").trim();
      const text = String(body.text || "").trim();
      if (!commentId || !text) {
        return res.status(400).json({ error: "Comment id and text are required" });
      }

      comments = existingComments.map((comment) => {
        if (comment?.id !== commentId) return comment;
        if (String(comment?.userId || "") !== userId) return comment;
        return {
          ...comment,
          text,
          edited_at: nowIso(),
        };
      });
    } else if (action === "comment_delete") {
      const commentId = String(body.commentId || "").trim();
      if (!commentId) {
        return res.status(400).json({ error: "Comment id is required" });
      }

      comments = existingComments.filter((comment) => {
        if (comment?.id !== commentId) return true;
        return String(comment?.userId || "") !== userId;
      });
    } else if (action === "reaction_toggle") {
      const emoji = String(body.emoji || "").trim();
      if (!emoji) {
        return res.status(400).json({ error: "Reaction emoji is required" });
      }

      const existing = existingReactions.find((reaction) => reaction?.userId === userId && reaction?.emoji === emoji);
      reactions = existing
        ? existingReactions.filter((reaction) => !(reaction?.userId === userId && reaction?.emoji === emoji))
        : [
            ...existingReactions,
            {
              id: `reaction-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
              userId,
              userName,
              emoji,
              created_at: nowIso(),
            },
          ];
    } else {
      return res.status(400).json({ error: "Unknown action" });
    }

    const { data: updated, error: updateError } = await admin
      .from("reviews")
      .update({ comments, reactions, updated_at: nowIso() })
      .eq("id", reviewId)
      .select("id, comments, reactions")
      .single();

    if (updateError) {
      throw updateError;
    }

    return res.status(200).json({
      ok: true,
      reviewId: updated.id,
      comments: Array.isArray(updated.comments) ? updated.comments : [],
      reactions: Array.isArray(updated.reactions) ? updated.reactions : [],
    });
  } catch (error) {
    console.error("Review interaction API error", error);
    return res.status(500).json({ error: error.message || "Failed to update review interaction" });
  }
}
