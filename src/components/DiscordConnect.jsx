import React, { useState, useEffect } from "react";
import { db } from "@/api/base44Client";

import { Button } from "@/components/ui/button";
import { Loader2, MessageCircle, Check } from "lucide-react";

const CONNECTOR_ID = "6a6061d40f3fcf90dbdbd842";

export default function DiscordConnect({ channelId, channelName, onChannelChange }) {
  const [authed, setAuthed] = useState(false);
  const [connected, setConnected] = useState(false);
  const [guilds, setGuilds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  const fetchChannels = async () => {
    try {
      const res = await db.functions.invoke("getDiscordChannels", {});
      setGuilds(res.data.guilds || []);
      setConnected(true);
    } catch (e) {
      setConnected(false);
      setGuilds([]);
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const isAuth = await db.auth.isAuthenticated();
        setAuthed(isAuth);
        if (isAuth) {
          await fetchChannels();
        }
      } catch (error) {
        console.error('Discord auth check failed', error);
        setAuthed(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const result = await db.connectors.connectAppUser(CONNECTOR_ID);
      const url = result?.url || result?.redirectUrl || result?.redirect_url || '';
      if (!url) {
        setConnecting(false);
        return;
      }
      const popup = window.open(url, "_blank");
      const timer = setInterval(() => {
        if (!popup || popup.closed) {
          clearInterval(timer);
          fetchChannels();
          setConnecting(false);
        }
      }, 500);
    } catch (e) {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await db.connectors.disconnectAppUser(CONNECTOR_ID);
      setConnected(false);
      setGuilds([]);
      onChannelChange("", "");
    } catch (e) {
      // ignore
    }
  };

  const handleSelectChannel = (e) => {
    const selectedId = e.target.value;
    if (!selectedId) {
      onChannelChange("", "");
      return;
    }
    let selectedName = "";
    for (const guild of guilds) {
      const ch = guild.channels.find((c) => c.id === selectedId);
      if (ch) {
        selectedName = ch.name;
        break;
      }
    }
    onChannelChange(selectedId, selectedName);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-white/40 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" /> Checking Discord connection...
      </div>
    );
  }

  if (!authed) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <MessageCircle className="w-4 h-4 text-stone-400" />
        <h3 className="text-sm font-semibold text-white/80">Discord</h3>
      </div>

      {!connected ? (
        <div>
          <Button
            onClick={handleConnect}
            disabled={connecting}
            variant="outline"
            className="bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
          >
            {connecting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <MessageCircle className="w-4 h-4 mr-2" />}
            Connect Discord
          </Button>
          <p className="text-xs text-white/30 mt-2">
            Connect to share featured albums automatically when they reach 10+ ratings averaging above 8.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-xs text-green-400">
              <Check className="w-3 h-3" /> Connected
            </span>
            <button
              onClick={handleDisconnect}
              className="text-xs text-white/30 hover:text-white/60 transition-colors"
            >
              Disconnect
            </button>
          </div>
          {guilds.length > 0 && (
            <select
              value={channelId}
              onChange={handleSelectChannel}
              className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-stone-500/50 transition-colors"
            >
              <option value="">Select a channel...</option>
              {guilds.map((guild) => (
                <optgroup key={guild.id} label={guild.name}>
                  {guild.channels.map((ch) => (
                    <option key={ch.id} value={ch.id}>
                      #{ch.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          )}
          {channelName && (
            <p className="text-xs text-white/40">
              Sharing to <span className="text-stone-400 font-medium">#{channelName}</span> — featured albums will be posted automatically when you rate an album that crosses the threshold.
            </p>
          )}
          {guilds.length === 0 && (
            <p className="text-xs text-white/30">No text channels found in your Discord servers.</p>
          )}
        </div>
      )}
    </div>
  );
}