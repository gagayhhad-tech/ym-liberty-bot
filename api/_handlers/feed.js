const axios = require("axios");
const getLibertyList = require("./libertyList");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  let token = req.headers?.authorization || req.query?.token || "";
  token = token.trim();
  const rawToken = token.replace(/^OAuth\s+/i, "").replace(/^Bearer\s+/i, "").trim();

  const headers = {
    "User-Agent": "com.yandex.music/5.117 (Android 13; samsung SM-G998B)",
    "X-Yandex-Music-Client": "YandexMusicAndroid/24023621",
    "Accept": "application/json",
    "Accept-Language": "ru"
  };

  if (rawToken && rawToken.length >= 8) {
    headers["Authorization"] = `OAuth ${rawToken}`;
  }

  try {
    const [feedRes, libertyTracks] = await Promise.all([
      axios.get("https://api.music.yandex.net/feed", { headers, timeout: 10000 }),
      getLibertyList()
    ]);

    const feedData = feedRes.data?.result || {};
    const days = feedData.days || [];
    const firstDay = days[0] || {};
    const events = firstDay.events || [];

    const extractedTracks = [];
    const seenTrackIds = new Set();

    function addTrack(t, source = "Новинка") {
      if (!t || !t.id) return;
      const idStr = String(t.id);
      if (seenTrackIds.has(idStr)) return;
      seenTrackIds.add(idStr);

      const cover = t.coverUri
        ? "https://" + t.coverUri.replace("%%", "400x400")
        : t.albums?.[0]?.coverUri
        ? "https://" + t.albums[0].coverUri.replace("%%", "400x400")
        : "";

      extractedTracks.push({
        id: idStr,
        title: t.title,
        version: t.version || "",
        artists: (t.artists || []).map(a => a.name).join(", "),
        durationMs: t.durationMs || 0,
        coverUri: cover,
        explicit: Boolean(t.contentWarning === "explicit" || t.explicit),
        isLiberty: Boolean(libertyTracks && libertyTracks[idStr]),
        source: source,
        track: t
      });
    }

    // 1. Process events (new tracks & albums)
    for (const ev of events) {
      if (ev.type === "tracks" && Array.isArray(ev.tracks)) {
        ev.tracks.forEach(t => addTrack(t, ev.title || "Новинка"));
      } else if (ev.type === "albums" && Array.isArray(ev.albums)) {
        for (const alb of ev.albums) {
          if (Array.isArray(alb.bests)) {
            alb.bests.forEach(id => {
              // Best track IDs
            });
          }
          if (Array.isArray(alb.tracks)) {
            alb.tracks.forEach(t => addTrack(t, alb.title));
          }
        }
      }
    }

    // If fewer than 10 tracks found from albums/events, fetch popular/top tracks
    if (extractedTracks.length < 8) {
      try {
        const topRes = await axios.get("https://api.music.yandex.net/landing3?blocks=chart&eitherUserId=true", {
          headers,
          timeout: 6000
        });
        const chartBlock = (topRes.data?.result?.blocks || []).find(b => b.type === "chart");
        if (chartBlock && Array.isArray(chartBlock.entities)) {
          chartBlock.entities.slice(0, 15).forEach(e => {
            if (e.data?.track) addTrack(e.data.track, "Чарт");
          });
        }
      } catch (chartErr) {
        console.warn("Feed chart fallback warning:", chartErr.message);
      }
    }

    return res.status(200).json({
      tracks: extractedTracks.slice(0, 20),
      generatedPlaylists: feedData.generatedPlaylists || []
    });
  } catch (err) {
    console.error("Error in /api/feed:", err.message);
    return res.status(500).json({ error: "Failed to fetch feed", message: err.message });
  }
};
