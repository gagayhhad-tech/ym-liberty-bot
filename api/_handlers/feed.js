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
    const bestIdsByAlbum = []; // { ids: [...], albumTitle: string }
    for (const ev of events) {
      if (ev.type === "tracks" && Array.isArray(ev.tracks)) {
        ev.tracks.forEach(t => addTrack(t, ev.title || "Новинка"));
      } else if (ev.type === "albums" && Array.isArray(ev.albums)) {
        for (const alb of ev.albums) {
          if (Array.isArray(alb.tracks) && alb.tracks.length > 0) {
            // Full track objects available directly
            alb.tracks.forEach(t => addTrack(t, alb.title));
          } else if (Array.isArray(alb.bests) && alb.bests.length > 0) {
            // Only IDs — need to resolve via /tracks bulk call
            bestIdsByAlbum.push({ ids: alb.bests.slice(0, 5), albumTitle: alb.title });
          }
        }
      }
    }

    // 2. Resolve alb.bests track IDs via bulk /tracks API
    if (bestIdsByAlbum.length > 0) {
      const allBestIds = bestIdsByAlbum.flatMap(x => x.ids);
      try {
        const tracksRes = await axios.get(
          `https://api.music.yandex.net/tracks?track-ids=${allBestIds.join(",")}`,
          { headers, timeout: 8000 }
        );
        const resolvedTracks = tracksRes.data?.result || [];
        resolvedTracks.forEach(t => {
          // Find which album this track belongs to for title
          const matchGroup = bestIdsByAlbum.find(g => g.ids.map(String).includes(String(t.id)));
          addTrack(t, matchGroup?.albumTitle || "Новинка");
        });
      } catch (bulkErr) {
        console.warn("Feed bulk tracks warning:", bulkErr.message);
      }
    }

    // 3. If fewer than 8 tracks found from feed events, use new-releases landing block
    if (extractedTracks.length < 8 && rawToken) {
      try {
        const topRes = await axios.get("https://api.music.yandex.net/landing3?blocks=new-releases", {
          headers,
          timeout: 6000
        });
        const relBlock = (topRes.data?.result?.blocks || []).find(b => b.type === "new-releases");
        if (relBlock && Array.isArray(relBlock.entities)) {
          const albumIds = relBlock.entities.slice(0, 10).map(e => e.data?.id).filter(Boolean);
          if (albumIds.length > 0) {
            const albRes = await axios.get(
              `https://api.music.yandex.net/albums?album-ids=${albumIds.join(",")}&with-tracks=true`,
              { headers, timeout: 8000 }
            );
            const albums = albRes.data?.result || [];
            for (const alb of albums) {
              const tracksArr = (alb.volumes || []).flat();
              tracksArr.slice(0, 3).forEach(t => addTrack(t, alb.title || "Новинка"));
            }
          }
        }
      } catch (relErr) {
        console.warn("Feed new-releases fallback warning:", relErr.message);
      }
    }

    // 4. Final fallback: chart (with token)
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
