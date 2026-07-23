import React, { useState, useEffect } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";

import { useDarkMode } from "@/hooks/useDarkMode";
import { Disc, Compass, User as UserIcon, LogOut, Home as HomeIcon } from "lucide-react";
import { db } from "@/api/base44Client";

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  useDarkMode();

  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const profiles = await db.entities.Profile.filter({ created_by_id: user.id });
        if (profiles.length > 0) setProfile(profiles[0]);
      } catch (e) {
        console.error(e);
      }
    };
    if (user) loadProfile();
  }, [user]);

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === "/") return "ReplayReviews";
    if (path === "/discover") return "Discover";
    if (path === "/profile") return "Profile";
    if (path.startsWith("/user/")) return "User";
    if (path.startsWith("/review/")) return "Review";
    return "ReplayReviews";
  };

  const navItems = [
    { to: "/", label: "Home", icon: HomeIcon },
    { to: "/discover", label: "Discover", icon: Compass },
    { to: "/profile", label: "Profile", icon: UserIcon },
  ];

  return (
    <div className="min-h-screen bg-background text-white">
      {/* Desktop navbar */}
      <nav className="hidden sm:flex sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between w-full">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-stone-500 to-slate-600 flex items-center justify-center">
              <Disc className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-[15px]">ReplayReviews</span>
          </Link>
          <div className="flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/5 text-sm font-medium transition-colors"
              >
                <item.icon className="w-4 h-4" />
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
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-stone-500 to-slate-600 flex items-center justify-center">
              <Disc className="w-3.5 h-3.5 text-white" />
            </div>
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
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-3 py-2.5 text-center transition-all ${
                  active ? "text-stone-300" : "text-white/40"
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-[10px] font-semibold leading-none">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}