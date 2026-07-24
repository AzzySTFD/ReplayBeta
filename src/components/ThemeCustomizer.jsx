import React, { useEffect, useState } from "react";
import { Palette, Sparkles, Circle } from "lucide-react";
import { db } from "@/api/base44Client";

const DEFAULT_THEME = {
  mode: "solid",
  accent: "#8a8378",
  accent2: "#6b7280",
  surfaceColor: "#2a2a2a",
};

const normalizeTheme = (value) => {
  const raw = value || {};
  const migratedSurfaceColor = raw.surfaceColor || raw.textColor || DEFAULT_THEME.surfaceColor;
  return {
    mode: raw.mode || DEFAULT_THEME.mode,
    accent: raw.accent || DEFAULT_THEME.accent,
    accent2: raw.accent2 || DEFAULT_THEME.accent2,
    surfaceColor: migratedSurfaceColor,
  };
};

export default function ThemeCustomizer() {
  const [theme, setTheme] = useState(DEFAULT_THEME);

  useEffect(() => {
    const savedTheme = db.theme.get();
    if (savedTheme) {
      const normalizedSavedTheme = normalizeTheme(savedTheme);
      setTheme(normalizedSavedTheme);
      if (savedTheme.textColor && !savedTheme.surfaceColor) {
        db.theme.set(normalizedSavedTheme);
      }
    }

    const applyTheme = (value) => {
      const nextTheme = normalizeTheme(value);
      setTheme(nextTheme);
      document.documentElement.style.setProperty('--theme-accent', hexToHsl(nextTheme.accent));
      document.documentElement.style.setProperty('--theme-accent-2', hexToHsl(nextTheme.accent2));
      document.documentElement.style.setProperty('--theme-surface-rgb', hexToRgbChannels(nextTheme.surfaceColor));
      document.documentElement.style.setProperty('--theme-surface-foreground', getReadableTextColor(nextTheme.surfaceColor));
      document.documentElement.style.setProperty('--theme-accent-foreground', getReadableTextColor(nextTheme.accent));
      document.documentElement.style.setProperty('--theme-style', nextTheme.mode);
      document.body.classList.toggle('app-theme-gradient', nextTheme.mode === 'gradient');
      document.body.classList.toggle('app-theme-solid', nextTheme.mode === 'solid');
      document.body.style.setProperty('--theme-accent', hexToHsl(nextTheme.accent));
      document.body.style.setProperty('--theme-accent-2', hexToHsl(nextTheme.accent2));
      document.body.style.setProperty('--theme-surface-rgb', hexToRgbChannels(nextTheme.surfaceColor));
      document.body.style.setProperty('--theme-surface-foreground', getReadableTextColor(nextTheme.surfaceColor));
      document.body.style.setProperty('--theme-accent-foreground', getReadableTextColor(nextTheme.accent));
    };

    const handleThemeEvent = (event) => applyTheme(event.detail);
    applyTheme(savedTheme || DEFAULT_THEME);
    window.addEventListener('theme:updated', handleThemeEvent);
    return () => window.removeEventListener('theme:updated', handleThemeEvent);
  }, []);

  const applyTheme = (value) => {
    const nextTheme = normalizeTheme(value);
    document.documentElement.style.setProperty('--theme-accent', hexToHsl(nextTheme.accent));
    document.documentElement.style.setProperty('--theme-accent-2', hexToHsl(nextTheme.accent2));
    document.documentElement.style.setProperty('--theme-surface-rgb', hexToRgbChannels(nextTheme.surfaceColor));
    document.documentElement.style.setProperty('--theme-surface-foreground', getReadableTextColor(nextTheme.surfaceColor));
    document.documentElement.style.setProperty('--theme-accent-foreground', getReadableTextColor(nextTheme.accent));
    document.documentElement.style.setProperty('--theme-style', nextTheme.mode);
    document.body.classList.toggle('app-theme-gradient', nextTheme.mode === 'gradient');
    document.body.classList.toggle('app-theme-solid', nextTheme.mode === 'solid');
    document.body.style.setProperty('--theme-accent', hexToHsl(nextTheme.accent));
    document.body.style.setProperty('--theme-accent-2', hexToHsl(nextTheme.accent2));
    document.body.style.setProperty('--theme-surface-rgb', hexToRgbChannels(nextTheme.surfaceColor));
    document.body.style.setProperty('--theme-surface-foreground', getReadableTextColor(nextTheme.surfaceColor));
    document.body.style.setProperty('--theme-accent-foreground', getReadableTextColor(nextTheme.accent));
  };

  const updateTheme = (updates) => {
    const nextTheme = normalizeTheme({ ...theme, ...updates });
    setTheme(nextTheme);
    db.theme.set(nextTheme);
    applyTheme(nextTheme);
  };


  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center gap-2 mb-4">
        <Palette className="h-4 w-4 text-stone-400" />
        <h3 className="text-sm font-semibold text-white/80">Customize your app</h3>
      </div>

      <div className="space-y-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-white/40 mb-2">Style</p>
          <div className="flex gap-2">
            <button
              onClick={() => updateTheme({ mode: 'gradient' })}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${theme.mode === 'gradient' ? 'border-stone-500/50 bg-stone-500/10 text-white' : 'border-white/10 bg-white/[0.02] text-white/60'}`}
            >
              <Sparkles className="h-4 w-4" /> Gradient
            </button>
            <button
              onClick={() => updateTheme({ mode: 'solid' })}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${theme.mode === 'solid' ? 'border-stone-500/50 bg-stone-500/10 text-white' : 'border-white/10 bg-white/[0.02] text-white/60'}`}
            >
              <Circle className="h-4 w-4" /> Solid
            </button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="space-y-2">
            <span className="text-xs uppercase tracking-wider text-white/40">Primary color</span>
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2">
              <input
                type="color"
                value={theme.accent}
                onChange={(event) => updateTheme({ accent: event.target.value })}
                className="h-9 w-12 cursor-pointer rounded border-0 bg-transparent p-0"
              />
              <span className="text-sm text-white/70">{theme.accent}</span>
            </div>
          </label>

          <label className="space-y-2">
            <span className="text-xs uppercase tracking-wider text-white/40">Secondary color</span>
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2">
              <input
                type="color"
                value={theme.accent2}
                onChange={(event) => updateTheme({ accent2: event.target.value })}
                className="h-9 w-12 cursor-pointer rounded border-0 bg-transparent p-0"
              />
              <span className="text-sm text-white/70">{theme.accent2}</span>
            </div>
          </label>

          <label className="space-y-2">
            <span className="text-xs uppercase tracking-wider text-white/40">Box color</span>
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2">
              <input
                type="color"
                value={theme.surfaceColor}
                onChange={(event) => updateTheme({ surfaceColor: event.target.value })}
                className="h-9 w-12 cursor-pointer rounded border-0 bg-transparent p-0"
              />
              <span className="text-sm text-white/70">{theme.surfaceColor}</span>
            </div>
          </label>
        </div>
      </div>
    </div>
  );
}

function hexToHsl(hex) {
  const cleaned = hex.replace('#', '');
  const value = cleaned.length === 3 ? cleaned.split('').map((char) => char + char).join('') : cleaned;
  const num = parseInt(value, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;

  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;
  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  const delta = max - min;

  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case rNorm: h = 60 * (((gNorm - bNorm) / delta) % 6); break;
      case gNorm: h = 60 * (((bNorm - rNorm) / delta) + 2); break;
      default: h = 60 * (((rNorm - gNorm) / delta) + 4); break;
    }
  }

  return `${Math.round(h)} 100% ${Math.round(l * 100)}%`;
}

function hexToRgbChannels(hex) {
  const cleaned = String(hex || "#000000").replace('#', '');
  const value = cleaned.length === 3 ? cleaned.split('').map((char) => char + char).join('') : cleaned;
  const num = parseInt(value, 16);
  if (!Number.isFinite(num)) return "42 42 42";
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `${r} ${g} ${b}`;
}

function getReadableTextColor(hex) {
  const cleaned = String(hex || "#000000").replace('#', '');
  const value = cleaned.length === 3 ? cleaned.split('').map((char) => char + char).join('') : cleaned;
  const num = parseInt(value, 16);
  if (!Number.isFinite(num)) return "#ffffff";
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? "#111111" : "#ffffff";
}
