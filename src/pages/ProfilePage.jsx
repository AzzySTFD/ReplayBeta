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
import { Loader2, Save, AtSign, Trash2, Upload, FolderPlus } from "lucide-react";
import DiscordConnect from "@/components/DiscordConnect";
import ThemeCustomizer from "@/components/ThemeCustomizer";

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState(null);
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [discordChannelId, setDiscordChannelId] = useState("");
  const [discordChannelName, setDiscordChannelName] = useState("");
  const [importUrl, setImportUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [folders, setFolders] = useState([]);
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const profiles = await db.entities.Profile.filter({ created_by_id: user.id });
        if (profiles.length > 0) {
          setProfile(profiles[0]);
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
      };

      if (profile) {
        await db.entities.Profile.update(profile.id, {
          username: username.trim(),
          bio,
          avatar_url: avatarUrl.trim(),
          social_links,
        });
      } else {
        const created = await db.entities.Profile.create({
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
    navigate(`/user/${user.id}`);
  };

  const extractImportQuery = (value) => {
    const trimmed = value.trim();
    if (!trimmed) return "";

    try {
      const url = new URL(trimmed);
      const pathSegments = decodeURIComponent(url.pathname)
        .split("/")
        .filter(Boolean);

      if (url.hostname.includes("rateyourmusic")) {
        const albumIndex = pathSegments.findIndex((segment) => ["album", "ep", "lp", "single", "release"].includes(segment.toLowerCase()));
        if (albumIndex >= 0) {
          const queryParts = pathSegments.slice(albumIndex + 1).filter((segment) => !["album", "ep", "lp", "single", "release"].includes(segment.toLowerCase()));
          if (queryParts.length) {
            return queryParts.slice(-2).join(" ");
          }
        }
        return pathSegments.slice(-2).join(" ");
      }

      if (url.hostname.includes("albumoftheyear")) {
        const albumIndex = pathSegments.findIndex((segment) => segment.toLowerCase() === "album");
        if (albumIndex >= 0) {
          const queryParts = pathSegments.slice(albumIndex + 1);
          if (queryParts.length) {
            return queryParts.join(" ");
          }
        }
      }

      const lastSegment = pathSegments[pathSegments.length - 1];
      return lastSegment ? lastSegment.replace(/\.(html?|php|asp|aspx)$/i, "") : trimmed;
    } catch (e) {
      return trimmed;
    }
  };

  const handleImportReviews = async () => {
    if (!importUrl.trim()) {
      toast({ variant: "destructive", title: "Paste a profile URL or album title first" });
      return;
    }

    setImporting(true);
    try {
      const rawValue = importUrl.trim();
      let source = "external service";
      try {
        const url = new URL(rawValue);
        source = url.hostname.includes("rateyourmusic")
          ? "Rate Your Music"
          : url.hostname.includes("albumoftheyear")
            ? "Album of the Year"
            : "external service";
      } catch (e) {
        // treat plain text titles as generic imports
      }

      const importResult = await db.functions.invoke("importProfile", { url: rawValue });
      const preview = importResult?.data?.preview || [];
      const isProfileImport = importResult?.data?.ok && preview.length > 0 && (importResult?.data?.source !== "generic" || /\/user\/|\/~/i.test(rawValue));

      const createImportedReview = async (candidate, index = 0) => {
        const searchQuery = candidate?.title || candidate?.href || rawValue;
        let importedAlbum = null;
        let importedTracks = [];
        let importRating = candidate?.rating;
        let importNotes = candidate?.notes;

        try {
          const searchResult = await db.functions.invoke("spotifySearch", { query: searchQuery });
          importedAlbum = (searchResult?.data?.albums || [])[0] || null;

          if (importedAlbum?.id) {
            const tracksResult = await db.functions.invoke("spotifyAlbumTracks", { albumId: importedAlbum.id });
            importedTracks = (tracksResult?.data?.tracks || []).map((track) => ({
              position: track.position,
              title: track.title,
              rating: 0,
            }));
          }
        } catch (e) {
          console.error(e);
        }

        const albumRating = Number.isFinite(importRating) ? Math.min(10, Math.max(0, importRating)) : 8;

        return {
          id: `import-${Date.now()}-${index}`,
          created_by_id: user.id,
          username: username.trim() || "Imported user",
          album_title: importedAlbum?.title || searchQuery || `Imported from ${source}`,
          artist: importedAlbum?.artist || "Imported review",
          album_art_url: importedAlbum?.artwork_url || "",
          release_year: importedAlbum?.release_year || "",
          album_rating: albumRating,
          use_manual_rating: false,
          manual_rating: 0,
          notes: importNotes
            ? `${importNotes}`
            : `Imported from ${source}: ${rawValue}${searchQuery ? ` • ${searchQuery}` : ""}`,
          tracks: importedTracks,
          reactions: [],
          comments: [],
          created_at: new Date().toISOString(),
          source_name: source,
          source_url: rawValue,
          import_title: searchQuery || "",
        };
      };

      if (isProfileImport) {
        const importedReviews = [];
        for (const [index, candidate] of preview.entries()) {
          const reviewPayload = await createImportedReview(candidate, index);
          await db.entities.Review.create(reviewPayload);
          importedReviews.push(reviewPayload);
        }

        if (importedReviews.length > 0) {
          toast({
            title: `Imported ${importedReviews.length} reviews`,
            description: `Added ${importedReviews.length} reviews from ${source}.`,
          });
        } else {
          toast({ title: "No reviews found", description: "We couldn’t discover albums from that profile URL yet." });
        }
      } else {
        const searchQuery = extractImportQuery(rawValue);
        const importedReview = await createImportedReview({ title: searchQuery || rawValue, href: rawValue, rating: undefined, notes: undefined });
        await db.entities.Review.create(importedReview);
        toast({
          title: "Review imported",
          description: importedReview.album_title
            ? `Added ${importedReview.album_title} with album details and tracks.`
            : `Added a review from ${source}.`,
        });
      }

      setImportUrl("");
    } catch (e) {
      toast({ variant: "destructive", title: "Import failed", description: e.message });
    } finally {
      setImporting(false);
    }
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
      <p className="text-white/40 text-sm mb-8">Set your username so others can find and follow you.</p>

      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="username" className="text-white/80">Username</Label>
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
          <h3 className="text-sm font-semibold text-white/80 mb-2">Import your existing reviews</h3>
          <p className="text-sm text-white/50 mb-4">Paste a profile URL from another service and we’ll try to discover the albums on that profile and bring them into your new account here.</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              value={importUrl}
              onChange={(e) => setImportUrl(e.target.value)}
              placeholder="Paste a profile URL or album link"
              className="bg-white/[0.03] border-white/10 text-white placeholder:text-white/25"
            />
            <Button
              onClick={handleImportReviews}
              disabled={importing}
              className="bg-gradient-to-r from-stone-600 to-slate-600 text-white border-0"
            >
              {importing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {importing ? "Importing..." : "Import profile"}
            </Button>
          </div>
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