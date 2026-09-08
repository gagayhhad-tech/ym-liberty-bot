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
    const libertyTracks = await getLibertyList();
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

    // 1. Официальный плейлист редакции Яндекса «Громкие новинки месяца» (103372440:1175)
    try {
      const plRes = await axios.get("https://api.music.yandex.net/users/103372440/playlists/1175", {
        headers,
        timeout: 8000
      });
      const pl = plRes.data?.result;
      const items = pl?.tracks || [];
      console.log("[FEED] Fetched 1175 playlist items:", items.length);
      for (const item of items.slice(0, 30)) {
        const t = item.track || item;
        addTrack(t, "Новинка");
      }
    } catch (plErr) {
      console.warn("[FEED] Error fetching 1175 playlist:", plErr.message);
    }

    // 2. Если мало треков, дополняем «Громкие новинки: поп» (103372440:2440)
    if (extractedTracks.length < 15) {
      try {
        const popRes = await axios.get("https://api.music.yandex.net/users/103372440/playlists/2440", {
          headers,
          timeout: 8000
        });
        const items = popRes.data?.result?.tracks || [];
        console.log("[FEED] Fetched 2440 playlist items:", items.length);
        for (const item of items.slice(0, 20)) {
          const t = item.track || item;
          addTrack(t, "Новинка");
        }
      } catch (popErr) {
        console.warn("[FEED] Error fetching 2440 playlist:", popErr.message);
      }
    }

    console.log("[FEED] Total new release tracks ready:", extractedTracks.length);

    return res.status(200).json({
      tracks: extractedTracks.slice(0, 30),
      generatedPlaylists: []
    });
  } catch (err) {
    console.error("Error in /api/feed:", err.message);
    return res.status(500).json({ error: "Failed to fetch feed", message: err.message });
  }
};

