import React, { useState, useEffect } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";

import { useDarkMode } from "@/hooks/useDarkMode";
import { Disc, Compass, User as UserIcon, LogOut, Home as HomeIcon, Bell } from "lucide-react";
import { db } from "@/api/base44Client";
import { computeUnreadCount, fetchNotificationItems } from "@/lib/notifications";

const BRAND_NAME = "SpinRate";
const BRAND_ICON_CANDIDATES = ["/spinrate-icon.png", "/icon-192.png", "/icon-512.png"];

function BrandMark({ sizeClass, iconSizeClass }) {
  const [iconIndex, setIconIndex] = useState(0);
  const iconSrc = BRAND_ICON_CANDIDATES[iconIndex];
  const exhausted = iconIndex >= BRAND_ICON_CANDIDATES.length;

  const handleImageError = () => {
    setIconIndex((prev) => prev + 1);
  };

  return (
    <div className={`${sizeClass} rounded-lg bg-gradient-to-br from-stone-500 to-slate-600 flex items-center justify-center overflow-hidden`}>
      {!exhausted ? (
        <img
          src={iconSrc}
          alt="SpinRate logo"
          className="h-full w-full object-cover"
          onError={handleImageError}
        />
      ) : (
        <Disc className={`${iconSizeClass} text-white`} />
      )}
    </div>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  useDarkMode();

  const [unreadCount, setUnreadCount] = useState(0);
  const [profilePath, setProfilePath] = useState(user?.id ? `/user/${user.id}` : "/profile");

  useEffect(() => {
    let cancelled = false;

    const loadProfilePath = async () => {
      if (!user?.id) {
        if (!cancelled) setProfilePath("/profile");
        return;
      }

      try {
        const profiles = await db.entities.Profile.filter({ created_by_id: user.id });
        const username = String(profiles?.[0]?.username || "").trim();
        if (!cancelled) {
          setProfilePath(username ? `/user/${username}` : `/user/${user.id}`);
        }
      } catch {
        if (!cancelled) {
          setProfilePath(`/user/${user.id}`);
        }
      }
    };

    loadProfilePath();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    let cancelled = false;

    const loadUnread = async () => {
      if (!user?.id) {
        if (!cancelled) setUnreadCount(0);
        return;
      }

      try {
        const items = await fetchNotificationItems(user.id);
        if (!cancelled) {
          const count = location.pathname === "/notifications" ? 0 : computeUnreadCount(items, user.id);
          setUnreadCount(count);
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) setUnreadCount(0);
      }
    };

    loadUnread();
    const pollId = window.setInterval(loadUnread, 15000);
    const handleFocus = () => loadUnread();
    const handleNotificationsUpdate = () => loadUnread();

    window.addEventListener("focus", handleFocus);
    window.addEventListener("notifications:updated", handleNotificationsUpdate);

    return () => {
      cancelled = true;
      window.clearInterval(pollId);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("notifications:updated", handleNotificationsUpdate);
    };
  }, [user, location.pathname]);

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === "/") return BRAND_NAME;
    if (path === "/discover") return "Discover";
    if (path === "/notifications") return "Notifications";
    if (path === "/profile") return "Profile";
    if (path.startsWith("/user/")) return "User";
    if (path.startsWith("/review/")) return "Review";
    return BRAND_NAME;
  };

  const navItems = [
    { to: "/", label: "Home", icon: HomeIcon },
    { to: "/discover", label: "Discover", icon: Compass },
    { to: "/notifications", label: "Alerts", icon: Bell },
    { to: profilePath, label: "Profile", icon: UserIcon, isProfile: true },
  ];

  return (
    <div className="min-h-screen bg-background text-white">
      {/* Desktop navbar */}
      <nav className="hidden sm:flex sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between w-full">
          <Link to="/" className="flex items-center gap-2">
            <BrandMark sizeClass="w-7 h-7" iconSizeClass="w-4 h-4" />
            <span className="font-bold text-[15px]">{BRAND_NAME}</span>
          </Link>
          <div className="flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/5 text-sm font-medium transition-colors"
              >
                <span className="relative inline-flex">
                  <item.icon className="w-4 h-4" />
                  {item.to === "/notifications" && unreadCount > 0 && (
                    <span className="absolute -right-2 -top-2 inline-flex min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-4 text-white">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </span>
                <span>{item.label}</span>
              </Link>
            ))}
            <button
              onClick={() => logout()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/5 text-sm font-medium transition-colors ml-1"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile top header */}
      <header
        className="sm:hidden sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-white/5"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="h-16 grid grid-cols-[1fr_auto_1fr] items-center px-4 gap-3">
          <div />
          <div className="flex items-center justify-center gap-2">
            <BrandMark sizeClass="w-6 h-6" iconSizeClass="w-3.5 h-3.5" />
            <h1 className="font-bold text-lg">{getPageTitle()}</h1>
          </div>
          <div className="flex justify-end">
            <button
              onClick={() => logout()}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Logout"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Page content */}
      <div className="tab-bar-content pt-4 pb-8 sm:pt-6 sm:pb-10">
        <Outlet />
      </div>

      {/* Mobile bottom tab bar */}
      <nav
        className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-xl border-t border-white/5"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex items-center justify-around h-16 px-2 py-1">
          {navItems.map((item) => {
            const active = item.isProfile
              ? location.pathname === "/profile" || location.pathname.startsWith("/user/") || location.pathname.startsWith("/@")
              : location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-3 py-2.5 text-center transition-all ${
                  active ? "text-stone-300" : "text-white/40"
                }`}
              >
                <span className="relative inline-flex">
                  <item.icon className="w-5 h-5" />
                  {item.to === "/notifications" && unreadCount > 0 && (
                    <span className="absolute -right-2 -top-2 inline-flex min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-4 text-white">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </span>
                <span className="text-[10px] font-semibold leading-none">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}