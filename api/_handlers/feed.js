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

    // 1. Основной источник: landing3 new-releases (настоящие новинки)
    try {
      const relRes = await axios.get("https://api.music.yandex.net/landing3?blocks=new-releases", {
        headers,
        timeout: 8000
      });
      const relBlock = (relRes.data?.result?.blocks || []).find(b => b.type === "new-releases");
      if (relBlock && Array.isArray(relBlock.entities)) {
        const albumIds = relBlock.entities.slice(0, 12).map(e => e.data?.id).filter(Boolean);
        if (albumIds.length > 0) {
          const albRes = await axios.get(
            `https://api.music.yandex.net/albums?album-ids=${albumIds.join(",")}&with-tracks=true`,
            { headers, timeout: 10000 }
          );
          const albums = albRes.data?.result || [];
          for (const alb of albums) {
            const tracksArr = (alb.volumes || []).flat();
            tracksArr.slice(0, 2).forEach(t => addTrack(t, alb.title || "Новинка"));
          }
        }
      }
    } catch (relErr) {
      console.warn("Feed new-releases error:", relErr.message);
    }

    // 2. Дополнение: личный фид (только type=tracks — персональные новинки)
    if (extractedTracks.length < 15 && rawToken) {
      try {
        const feedRes = await axios.get("https://api.music.yandex.net/feed", {
          headers,
          timeout: 8000
        });
        const events = feedRes.data?.result?.days?.[0]?.events || [];
        for (const ev of events) {
          if (ev.type === "tracks" && Array.isArray(ev.tracks)) {
            ev.tracks.forEach(t => addTrack(t, ev.title || "Новинка"));
          }
        }
      } catch (feedErr) {
        console.warn("Feed personal error:", feedErr.message);
      }
    }

    return res.status(200).json({
      tracks: extractedTracks.slice(0, 20),
      generatedPlaylists: []
    });
  } catch (err) {
    console.error("Error in /api/feed:", err.message);
    return res.status(500).json({ error: "Failed to fetch feed", message: err.message });
  }
};
