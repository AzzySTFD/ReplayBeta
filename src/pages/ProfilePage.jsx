import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { db } from "@/api/base44Client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2, Save, AtSign, Trash2, Upload, FolderPlus, User, ArrowUp, ArrowDown, Monitor, Smartphone } from "lucide-react";
import DiscordConnect from "@/components/DiscordConnect";
import ThemeCustomizer from "@/components/ThemeCustomizer";
import { normalizeRatingDisplayPreference } from "@/utils/ratings";
import {
  findBestAlbumMatchForImport,
  getNeedsReviewReasonLabel,
  parseAotyCsv,
} from "@/utils/import/aotyCsvImport";

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [instagram, setInstagram] = useState("");
  const [twitter, setTwitter] = useState("");
  const [tiktok, setTiktok] = useState("");
  const [twitch, setTwitch] = useState("");
  const [youtube, setYoutube] = useState("");
  const [kick, setKick] = useState("");
  const [website, setWebsite] = useState("");
  const [desktopBannerUrl, setDesktopBannerUrl] = useState("");
  const [mobileBannerUrl, setMobileBannerUrl] = useState("");
  const [sectionOrder, setSectionOrder] = useState(["socials", "folders", "reviews"]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [discordChannelId, setDiscordChannelId] = useState("");
  const [discordChannelName, setDiscordChannelName] = useState("");
  const [importing, setImporting] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importFileName, setImportFileName] = useState("");
  const [importSummary, setImportSummary] = useState(null);
  const [needsReviewRows, setNeedsReviewRows] = useState([]);
  const [skippedExistingRows, setSkippedExistingRows] = useState([]);
  const [folders, setFolders] = useState([]);
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [ratingDisplayPreference, setRatingDisplayPreference] = useState("100");

  useEffect(() => {
    const load = async () => {
      try {
        const profiles = await db.entities.Profile.filter({ created_by_id: user.id });
        if (profiles.length > 0) {
          setProfile(profiles[0]);
          setDisplayName(profiles[0].display_name || profiles[0].username || "");
          setUsername(profiles[0].username || "");
          setBio(profiles[0].bio || "");
          setAvatarUrl(profiles[0].avatar_url || "");
          setInstagram(profiles[0].social_links?.instagram || "");
          setTwitter(profiles[0].social_links?.twitter || "");
          setTiktok(profiles[0].social_links?.tiktok || "");
          setTwitch(profiles[0].social_links?.twitch || "");
          setYoutube(profiles[0].social_links?.youtube || "");
          setKick(profiles[0].social_links?.kick || "");
          setWebsite(profiles[0].social_links?.website || "");
          const customization = profiles[0].social_links?.profile_customization || {};
          setRatingDisplayPreference(normalizeRatingDisplayPreference(customization.rating_display_preference));
          setDesktopBannerUrl(customization.banner_desktop || "");
          setMobileBannerUrl(customization.banner_mobile || "");
          const incomingOrder = Array.isArray(customization.section_order) ? customization.section_order : [];
          const validOrder = incomingOrder.filter((entry) => ["socials", "folders", "reviews"].includes(entry));
          if (validOrder.length) {
            const remainder = ["socials", "folders", "reviews"].filter((entry) => !validOrder.includes(entry));
            setSectionOrder([...validOrder, ...remainder]);
          }
          setDiscordChannelId(profiles[0].discord_channel_id || "");
          setDiscordChannelName(profiles[0].discord_channel_name || "");
        }

        if (user) {
          const userFolders = await db.entities.Folder.filter({ created_by_id: user.id });
          setFolders(userFolders);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    if (user) load();
  }, [user]);

  const handleDiscordChannelChange = async (newChannelId, newChannelName) => {
    setDiscordChannelId(newChannelId);
    setDiscordChannelName(newChannelName);
    try {
      if (profile) {
        await db.entities.Profile.update(profile.id, {
          discord_channel_id: newChannelId,
          discord_channel_name: newChannelName,
        });
      }
      toast({ title: newChannelId ? "Discord channel saved" : "Discord channel cleared" });
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    }
  };

  const handleAvatarUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setAvatarUrl(reader.result || "");
    };
    reader.readAsDataURL(file);
  };

  const handleBannerUpload = (event, target) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const nextValue = reader.result || "";
      if (target === "desktop") {
        setDesktopBannerUrl(nextValue);
      } else {
        setMobileBannerUrl(nextValue);
      }
    };
    reader.readAsDataURL(file);
  };

  const moveSection = (index, direction) => {
    const nextIndex = direction === "up" ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= sectionOrder.length) return;

    setSectionOrder((prev) => {
      const copy = [...prev];
      const current = copy[index];
      copy[index] = copy[nextIndex];
      copy[nextIndex] = current;
      return copy;
    });
  };

  const getSectionLabel = (section) => {
    if (section === "socials") return "Social links";
    if (section === "folders") return "Folders";
    return "Reviews";
  };

  const handleCreateFolder = async () => {
    const trimmed = newFolderName.trim();
    if (!trimmed) {
      toast({ variant: "destructive", title: "Folder name required" });
      return;
    }

    if (folders.some((folder) => folder.name?.toLowerCase() === trimmed.toLowerCase())) {
      toast({ variant: "destructive", title: "Folder already exists" });
      return;
    }

    setCreatingFolder(true);
    try {
      const created = await db.entities.Folder.create({
        name: trimmed,
        created_by_id: user.id,
      });
      setFolders((prev) => [created, ...prev]);
      setNewFolderName("");
      toast({ title: "Folder created", description: `${trimmed} is ready to use.` });
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    } finally {
      setCreatingFolder(false);
    }
  };

  const handleSave = async () => {
    if (!username.trim()) {
      toast({ variant: "destructive", title: "Username required" });
      return;
    }
    if (!displayName.trim()) {
      toast({ variant: "destructive", title: "Display name required" });
      return;
    }
    setSaving(true);
    try {
      const existing = await db.entities.Profile.filter({ username: username.trim() });
      const taken = existing.find((p) => p.created_by_id !== user.id);
      if (taken) {
        toast({ variant: "destructive", title: "Username taken", description: "Try another one." });
        setSaving(false);
        return;
      }
      const social_links = {
        instagram: instagram.trim(),
        twitter: twitter.trim(),
        tiktok: tiktok.trim(),
        twitch: twitch.trim(),
        youtube: youtube.trim(),
        kick: kick.trim(),
        website: website.trim(),
        profile_customization: {
          banner_desktop: desktopBannerUrl.trim(),
          banner_mobile: mobileBannerUrl.trim(),
          section_order: sectionOrder,
          rating_display_preference: ratingDisplayPreference,
        },
      };

      if (profile) {
        await db.entities.Profile.update(profile.id, {
          display_name: displayName.trim(),
          username: username.trim(),
          bio,
          avatar_url: avatarUrl.trim(),
          social_links,
        });
      } else {
        const created = await db.entities.Profile.create({
          display_name: displayName.trim(),
          username: username.trim(),
          bio,
          avatar_url: avatarUrl.trim(),
          social_links,
          created_by_id: user.id,
        });
        setProfile(created);
      }
      toast({ title: "Profile saved" });
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    } finally {
      setSaving(false);
    }
  };

  const handleViewPublicProfile = () => {
    if (!user?.id) return;
    const slug = String(profile?.username || username || user.id).trim();
    navigate(`/user/${slug}`);
  };

  const buildImportedNotes = (entry) => {
    const prefix = entry.reviewText ? `${entry.reviewText}\n\n` : "";
    const dateText = entry.dateReviewed ? `Date reviewed: ${entry.dateReviewed}` : "Date reviewed: unavailable";
    return `${prefix}Imported from Album of the Year CSV. ${dateText}`;
  };

  const handleCsvFileSelected = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportFile(file);
    setImportFileName(file.name || "");
    setImportSummary(null);
    setNeedsReviewRows([]);
    setSkippedExistingRows([]);
    event.target.value = "";
  };

  const runCsvImport = async ({ dryRun = false } = {}) => {
    const file = importFile;
    if (!file) {
      toast({ variant: "destructive", title: "No CSV selected", description: "Choose an Album of the Year CSV first." });
      return;
    }

    if (!user?.id) {
      toast({ variant: "destructive", title: "Login required", description: "You need to be logged in before importing." });
      return;
    }

    setImporting(true);
    setImportSummary(null);
    setNeedsReviewRows([]);
    setSkippedExistingRows([]);

    try {
      const csvText = await file.text();
      const parsed = parseAotyCsv(csvText);

      if (parsed.missingColumns.length > 0) {
        toast({
          variant: "destructive",
          title: "Unsupported CSV format",
          description: `Missing required columns: ${parsed.missingColumns.join(", ")}`,
        });
        return;
      }

      if (parsed.entries.length === 0) {
        toast({ variant: "destructive", title: "No review rows found", description: "The CSV does not contain importable review history rows." });
        return;
      }

      const existingReviews = await db.entities.Review.filter({ created_by_id: user.id });
      const existingSpotifyAlbumIds = new Set(
        existingReviews
          .map((review) => String(review.spotify_album_id || "").trim())
          .filter(Boolean)
      );

      const localNeedsReview = [];
      const localSkippedExisting = [];
      let importedCount = 0;
      let wouldImportCount = 0;

      for (const entry of parsed.entries) {
        const searchQuery = `${entry.artist} ${entry.albumTitle}`.trim();
        if (!searchQuery) {
          localNeedsReview.push({ ...entry, reason: "missing_artist_or_title" });
          continue;
        }

        let candidates = [];
        try {
          const searchResult = await db.functions.invoke("spotifySearch", { query: searchQuery });
          candidates = searchResult?.data?.albums || [];
        } catch {
          localNeedsReview.push({ ...entry, reason: "search_failed" });
          continue;
        }

        const match = findBestAlbumMatchForImport(entry, candidates);
        if (match.status !== "matched" || !match.album?.id) {
          localNeedsReview.push({
            ...entry,
            reason: match.reason || "no_match",
            candidatePreview: (match.candidates || []).map((candidate) => `${candidate.artist} - ${candidate.title}`),
          });
          continue;
        }

        if (existingSpotifyAlbumIds.has(match.album.id)) {
          localSkippedExisting.push(entry);
          continue;
        }

        let albumMetadata = null;
        let albumTracks = [];
        try {
          const metadataResult = await db.functions.invoke("spotifyAlbumTracks", { albumId: match.album.id });
          albumMetadata = metadataResult?.data?.album || null;
          albumTracks = (metadataResult?.data?.tracks || []).map((track) => ({
            position: track.position,
            title: track.title || track.name || track.track_name || "",
            rating: 0,
          }));
        } catch {
          localNeedsReview.push({ ...entry, reason: "metadata_load_failed" });
          continue;
        }

        if (!albumMetadata?.id || !albumMetadata?.title || !albumMetadata?.artist) {
          localNeedsReview.push({ ...entry, reason: "metadata_load_failed" });
          continue;
        }

        const importedRating = Number.isFinite(entry.rating) ? entry.rating : 0;
        const hasManualRating = Number.isFinite(entry.rating);

        if (dryRun) {
          wouldImportCount += 1;
          continue;
        }

        try {
          await db.entities.Review.create({
            created_by_id: user.id,
            username: username.trim() || profile?.username || "",
            spotify_album_id: albumMetadata.id,
            album_title: albumMetadata.title,
            artist: albumMetadata.artist,
            album_art_url: albumMetadata.artwork_url || "",
            release_year: albumMetadata.release_year || "",
            tracks: albumTracks,
            album_rating: importedRating,
            use_manual_rating: hasManualRating,
            manual_rating: hasManualRating ? importedRating : 0,
            notes: buildImportedNotes(entry),
            reactions: [],
            comments: [],
          });
          existingSpotifyAlbumIds.add(albumMetadata.id);
          importedCount += 1;
        } catch {
          localNeedsReview.push({ ...entry, reason: "create_review_failed" });
        }
      }

      const summary = {
        dryRun,
        totalRows: parsed.entries.length,
        importedCount,
        wouldImportCount,
        skippedExistingCount: localSkippedExisting.length,
        needsReviewCount: localNeedsReview.length,
      };

      setImportSummary(summary);
      setNeedsReviewRows(localNeedsReview);
      setSkippedExistingRows(localSkippedExisting);

      if (dryRun) {
        toast({
          title: "Dry import complete",
          description: `${wouldImportCount} would import, ${localSkippedExisting.length} already reviewed, ${localNeedsReview.length} need review.`,
        });
      } else {
        toast({
          title: "CSV import complete",
          description: `${importedCount} imported, ${localSkippedExisting.length} already reviewed, ${localNeedsReview.length} need review.`,
        });
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Import failed", description: e.message || "Could not import CSV." });
    } finally {
      setImporting(false);
    }
  };

  const handleImportReviews = async () => runCsvImport({ dryRun: false });
  const handleDryRunImport = async () => runCsvImport({ dryRun: true });

  const escapeCsvCell = (value) => {
    const text = String(value || "");
    if (!/[",\n\r]/.test(text)) return text;
    return `"${text.replace(/"/g, '""')}"`;
  };

  const handleExportNeedsReviewCsv = () => {
    if (needsReviewRows.length === 0) {
      toast({ variant: "destructive", title: "Nothing to export", description: "There are no Needs Review rows to export." });
      return;
    }

    const header = ["Row", "Artist", "Album Title", "Rating", "Review Text", "Date Reviewed", "Album Type", "Year", "Reason", "Candidate Preview"];
    const lines = [header.map(escapeCsvCell).join(",")];

    for (const row of needsReviewRows) {
      const cells = [
        row.rowNumber,
        row.artist,
        row.albumTitle,
        row.ratingRaw,
        row.reviewText,
        row.dateReviewed,
        row.albumType,
        row.year,
        getNeedsReviewReasonLabel(row.reason),
        Array.isArray(row.candidatePreview) ? row.candidatePreview.join(" | ") : "",
      ];
      lines.push(cells.map(escapeCsvCell).join(","));
    }

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const downloadUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = downloadUrl;
    anchor.download = `needs-review-${Date.now()}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(downloadUrl);
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      if (profile) {
        await db.entities.Profile.delete(profile.id);
      }
      logout(false);
      window.location.href = "/register";
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: e.message });
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 text-stone-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-bold mb-1">Your Profile</h1>
      <p className="text-white/40 text-sm mb-8">Set your display name and unique @username so others can find and follow you.</p>

      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="displayName" className="text-white/80">Display Name</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Azzy"
              className="pl-9 bg-white/[0.03] border-white/10 text-white placeholder:text-white/25"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="username" className="text-white/80">@ Username</Label>
          <div className="relative">
            <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="musiclover97"
              className="pl-9 bg-white/[0.03] border-white/10 text-white placeholder:text-white/25"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="bio" className="text-white/80">Bio</Label>
          <textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell people about your music taste..."
            className="w-full min-h-[100px] bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder:text-white/25 text-sm outline-none focus:border-stone-500/50 transition-colors resize-y"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="avatar" className="text-white/80">Profile picture</Label>
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-white/15 bg-white/[0.03] px-4 py-4 text-sm text-white/70 transition hover:border-stone-500/40 hover:text-white">
            <Upload className="h-4 w-4" />
            <span>{avatarUrl ? "Choose a different image" : "Upload an image from your device"}</span>
            <input id="avatar" type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          </label>
          {avatarUrl && (
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <img src={avatarUrl} alt="Profile preview" className="h-12 w-12 rounded-full object-cover" />
              <p className="text-sm text-white/60">This image will be shown on your public profile.</p>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-white/80">Profile banners</h3>
            <p className="text-sm text-white/50">Use different banner images for desktop and mobile profile views.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="desktopBanner" className="text-white/80 inline-flex items-center gap-2"><Monitor className="h-4 w-4" />Desktop banner</Label>
              <Input
                id="desktopBanner"
                value={desktopBannerUrl}
                onChange={(e) => setDesktopBannerUrl(e.target.value)}
                placeholder="https://example.com/desktop-banner.jpg"
                className="bg-white/[0.03] border-white/10 text-white placeholder:text-white/25"
              />
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-white/15 bg-white/[0.03] px-3 py-2 text-xs text-white/70 transition hover:border-stone-500/40 hover:text-white">
                <Upload className="h-3.5 w-3.5" />
                <span>Upload desktop banner</span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleBannerUpload(e, "desktop")} />
              </label>
              {desktopBannerUrl && (
                <div className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.02]">
                  <img src={desktopBannerUrl} alt="Desktop banner preview" className="h-24 w-full object-cover" />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="mobileBanner" className="text-white/80 inline-flex items-center gap-2"><Smartphone className="h-4 w-4" />Mobile banner</Label>
              <Input
                id="mobileBanner"
                value={mobileBannerUrl}
                onChange={(e) => setMobileBannerUrl(e.target.value)}
                placeholder="https://example.com/mobile-banner.jpg"
                className="bg-white/[0.03] border-white/10 text-white placeholder:text-white/25"
              />
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-white/15 bg-white/[0.03] px-3 py-2 text-xs text-white/70 transition hover:border-stone-500/40 hover:text-white">
                <Upload className="h-3.5 w-3.5" />
                <span>Upload mobile banner</span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleBannerUpload(e, "mobile")} />
              </label>
              {mobileBannerUrl && (
                <div className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.02]">
                  <img src={mobileBannerUrl} alt="Mobile banner preview" className="h-24 w-full object-cover" />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-white/80">Preferred rating display</h3>
            <p className="text-sm text-white/50">This only changes how ratings are shown. Stored ratings stay on a 0–100 scale.</p>
          </div>
          <select
            value={ratingDisplayPreference}
            onChange={(e) => setRatingDisplayPreference(normalizeRatingDisplayPreference(e.target.value))}
            className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none"
          >
            <option value="100" className="bg-zinc-900">100 Point</option>
            <option value="10" className="bg-zinc-900">10 Point</option>
            <option value="stars" className="bg-zinc-900">5 Star</option>
          </select>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <h3 className="text-sm font-semibold text-white/80">Profile layout order</h3>
          <p className="text-sm text-white/50 mb-3">Arrange how sections appear on your public profile.</p>
          <div className="space-y-2">
            {sectionOrder.map((section, index) => (
              <div key={section} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2">
                <span className="text-sm text-white/85">{getSectionLabel(section)}</span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={index === 0}
                    onClick={() => moveSection(index, "up")}
                    className="h-8 w-8 text-white/70 hover:bg-white/[0.08]"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={index === sectionOrder.length - 1}
                    onClick={() => moveSection(index, "down")}
                    className="h-8 w-8 text-white/70 hover:bg-white/[0.08]"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="instagram" className="text-white/80">Instagram</Label>
            <Input
              id="instagram"
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              placeholder="@yourname"
              className="bg-white/[0.03] border-white/10 text-white placeholder:text-white/25"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="twitter" className="text-white/80">X / Twitter</Label>
            <Input
              id="twitter"
              value={twitter}
              onChange={(e) => setTwitter(e.target.value)}
              placeholder="@yourname"
              className="bg-white/[0.03] border-white/10 text-white placeholder:text-white/25"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tiktok" className="text-white/80">TikTok</Label>
            <Input
              id="tiktok"
              value={tiktok}
              onChange={(e) => setTiktok(e.target.value)}
              placeholder="@yourname"
              className="bg-white/[0.03] border-white/10 text-white placeholder:text-white/25"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="twitch" className="text-white/80">Twitch</Label>
            <Input
              id="twitch"
              value={twitch}
              onChange={(e) => setTwitch(e.target.value)}
              placeholder="yourname"
              className="bg-white/[0.03] border-white/10 text-white placeholder:text-white/25"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="youtube" className="text-white/80">YouTube</Label>
            <Input
              id="youtube"
              value={youtube}
              onChange={(e) => setYoutube(e.target.value)}
              placeholder="@yourchannel"
              className="bg-white/[0.03] border-white/10 text-white placeholder:text-white/25"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="kick" className="text-white/80">Kick</Label>
            <Input
              id="kick"
              value={kick}
              onChange={(e) => setKick(e.target.value)}
              placeholder="yourname"
              className="bg-white/[0.03] border-white/10 text-white placeholder:text-white/25"
            />
          </div>
          <div className="space-y-2 md:col-span-2 xl:col-span-1">
            <Label htmlFor="website" className="text-white/80">Website</Label>
            <Input
              id="website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://example.com"
              className="bg-white/[0.03] border-white/10 text-white placeholder:text-white/25"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center gap-2 mb-3">
            <FolderPlus className="h-4 w-4 text-stone-400" />
            <div>
              <h3 className="text-sm font-semibold text-white/80">Review folders</h3>
              <p className="text-sm text-white/50">Create folders like Indie, Jazz, or 2024 favorites and assign reviews to them.</p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="New folder name"
              className="bg-white/[0.03] border-white/10 text-white placeholder:text-white/25"
            />
            <Button
              onClick={handleCreateFolder}
              disabled={creatingFolder}
              className="bg-white/[0.06] text-white border-white/10 hover:bg-white/[0.1]"
            >
              {creatingFolder ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FolderPlus className="w-4 h-4 mr-2" />}
              Create folder
            </Button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {folders.length === 0 ? (
              <p className="text-sm text-white/40">No folders yet. Create one above and start sorting your reviews.</p>
            ) : (
              folders.map((folder) => (
                <div key={folder.id} className="rounded-full border border-stone-500/20 bg-stone-500/10 px-3 py-1 text-sm text-stone-200">
                  {folder.name}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white/80">Profile actions</h3>
              <p className="text-sm text-white/50">Open your public profile or sign out from this device.</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                variant="outline"
                onClick={handleViewPublicProfile}
                disabled={!user?.id}
                className="border-white/10 bg-white/[0.03] text-white hover:bg-white/[0.06]"
              >
                View my public profile
              </Button>
              <Button
                variant="outline"
                onClick={() => logout()}
                className="border-white/10 bg-white/[0.03] text-white hover:bg-white/[0.06]"
              >
                Logout
              </Button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-gradient-to-r from-stone-600 to-slate-600 hover:from-stone-500 hover:to-slate-500 text-white border-0"
          >
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            {profile ? "Save Changes" : "Create Profile"}
          </Button>

          {profile?.created_by_id && (
            <Button
              variant="outline"
              onClick={handleViewPublicProfile}
              className="border-white/10 bg-white/[0.03] text-white hover:bg-white/[0.06]"
            >
              View my public profile
            </Button>
          )}
        </div>
      </div>

      <div className="mt-8 pt-8 border-t border-white/5">
        <ThemeCustomizer />
      </div>

      <div className="mt-8 pt-8 border-t border-white/5">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <h3 className="text-sm font-semibold text-white/80 mb-2">Import music history (CSV)</h3>
          <p className="text-sm text-white/50 mb-4">
            Upload your Album of the Year CSV. We import your review history, then resolve each album using SpinRate metadata providers.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-white/15 bg-white/[0.03] px-4 py-2.5 text-sm text-white/70 transition hover:border-stone-500/40 hover:text-white sm:flex-1">
              <Upload className="h-4 w-4" />
              <span>{importFileName ? `Selected: ${importFileName}` : "Choose Album of the Year CSV"}</span>
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={handleCsvFileSelected}
                disabled={importing}
              />
            </label>
            <Button
              variant="outline"
              onClick={handleDryRunImport}
              disabled={importing || !importFile}
              className="border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]"
            >
              {importing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Run dry import
            </Button>
            <Button
              onClick={handleImportReviews}
              disabled={importing || !importFile}
              className="bg-gradient-to-r from-stone-600 to-slate-600 hover:from-stone-500 hover:to-slate-500 text-white border-0"
            >
              {importing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Import reviews
            </Button>
          </div>

          {importSummary && (
            <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-white/75 space-y-1">
              <p>Mode: {importSummary.dryRun ? "Dry run (no reviews created)" : "Live import"}</p>
              <p>Total rows: {importSummary.totalRows}</p>
              {importSummary.dryRun && <p>Would import: {importSummary.wouldImportCount}</p>}
              <p>Imported: {importSummary.importedCount}</p>
              <p>Skipped (already reviewed): {importSummary.skippedExistingCount}</p>
              <p>Needs review: {importSummary.needsReviewCount}</p>
            </div>
          )}

          {needsReviewRows.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-sm font-semibold text-amber-200">Needs Review</h4>
                <Button
                  variant="outline"
                  onClick={handleExportNeedsReviewCsv}
                  className="h-8 border-amber-400/30 bg-amber-500/10 px-3 text-xs text-amber-100 hover:bg-amber-500/20"
                >
                  Export CSV
                </Button>
              </div>
              <p className="text-xs text-white/45 mb-2">These rows were not imported to avoid bad album matches.</p>
              <div className="space-y-2 max-h-64 overflow-auto pr-1">
                {needsReviewRows.map((row) => (
                  <div key={`needs-review-${row.rowNumber}-${row.artist}-${row.albumTitle}`} className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2">
                    <p className="text-sm text-white/90">{row.artist} - {row.albumTitle}</p>
                    <p className="text-xs text-amber-200">{getNeedsReviewReasonLabel(row.reason)}</p>
                    {Array.isArray(row.candidatePreview) && row.candidatePreview.length > 0 && (
                      <p className="text-xs text-white/55">Candidates: {row.candidatePreview.join(" | ")}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {skippedExistingRows.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-semibold text-white/80">Skipped Existing Reviews</h4>
              <p className="text-xs text-white/45 mb-2">These albums were already reviewed by this account.</p>
              <div className="space-y-2 max-h-52 overflow-auto pr-1">
                {skippedExistingRows.map((row) => (
                  <div key={`existing-review-${row.rowNumber}-${row.artist}-${row.albumTitle}`} className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white/80">
                    {row.artist} - {row.albumTitle}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 pt-8 border-t border-white/5">
        <DiscordConnect
          channelId={discordChannelId}
          channelName={discordChannelName}
          onChannelChange={handleDiscordChannelChange}
        />
      </div>

      <div className="mt-12 pt-8 border-t border-white/5">
        <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3">Danger Zone</h2>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" disabled={deleting}>
              {deleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Delete Account
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="bg-zinc-900 border-white/10 text-white">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Account</AlertDialogTitle>
              <AlertDialogDescription className="text-white/50">
                This will permanently delete your profile and sign you out. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-white/5 text-white/60 border-white/10 hover:bg-white/10">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  handleDeleteAccount();
                }}
                className="bg-red-600 text-white hover:bg-red-700 border-0"
              >
                {deleting ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}