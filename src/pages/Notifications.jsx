import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Heart, MessageCircle, UserPlus, Loader2, ChevronRight } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { clearNotifications, fetchNotificationItems, markNotificationsSeen } from "@/lib/notifications";

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
  const [clearing, setClearing] = useState(false);

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
        const events = await fetchNotificationItems(user.id);
        if (!cancelled) {
          setItems(events);
          markNotificationsSeen(user.id);
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

  const handleClearAlerts = () => {
    if (!user?.id || grouped.length === 0) return;
    setClearing(true);
    clearNotifications(user.id, grouped);
    setItems([]);
    setClearing(false);
  };

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
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-stone-400" />
          <h1 className="text-2xl font-bold">Notifications</h1>
        </div>
        <button
          onClick={handleClearAlerts}
          disabled={grouped.length === 0 || clearing}
          className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-semibold text-white/70 transition-colors hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {clearing ? "Clearing..." : "Clear alerts"}
        </button>
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
