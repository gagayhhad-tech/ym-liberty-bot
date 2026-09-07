const axios = require("axios");

let cachedList = null;
let lastCacheTime = 0;

async function getLibertyList() {
  const now = Date.now();
  if (cachedList && now - lastCacheTime < 60000) {
    return cachedList;
  }
  const urls = [
    "https://cdn.jsdelivr.net/gh/gagayhhad-tech/ym-liberty-db@main/list.json",
    "https://raw.githubusercontent.com/gagayhhad-tech/ym-liberty-db/refs/heads/main/list.json"
  ];
  for (const url of urls) {
    try {
      const res = await axios.get(url, { timeout: 4000 });
      cachedList = res.data && res.data.tracks ? res.data.tracks : res.data;
      lastCacheTime = now;
      return cachedList;
    } catch (e) {
      // try next
    }
  }
  return cachedList || {};
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const query = req.query.q || req.query.text;
  if (!query) {
    return res.status(400).json({ error: "Missing query parameter 'q'" });
  }

  const token = req.headers?.authorization || req.query?.token;
  const page = parseInt(req.query.page, 10) || 0;

  try {
    const headers = {
      "User-Agent": "YandexMusic/5.117.1 (Windows)",
    };
    if (token) {
      headers["Authorization"] = token.startsWith("OAuth") ? token : `OAuth ${token}`;
    }

    const [ymRes, libertyTracks] = await Promise.all([
      axios.get(`https://api.music.yandex.net/search`, {
        params: { text: query, type: "track", page },
        headers,
        timeout: 8000,
      }),
      getLibertyList(),
    ]);

    const rawTracks = ymRes.data?.result?.tracks?.results || [];
    const tracks = rawTracks.map((t) => {
      const idStr = String(t.id);
      const isLiberty = Boolean(libertyTracks && libertyTracks[idStr]);
      const cover = t.coverUri
        ? "https://" + t.coverUri.replace("%%", "400x400")
        : t.albums?.[0]?.coverUri
        ? "https://" + t.albums[0].coverUri.replace("%%", "400x400")
        : "";

      return {
        id: t.id,
        title: t.title,
        version: t.version || "",
        artists: (t.artists || []).map((a) => a.name).join(", "),
        durationMs: t.durationMs || 0,
        coverUri: cover,
        isLiberty,
        explicit: Boolean(t.contentWarning === "explicit" || t.explicit),
      };
    });

    return res.status(200).json({
      total: ymRes.data?.result?.tracks?.total || tracks.length,
      page,
      tracks,
    });
  } catch (err) {
    console.error("Search error:", err.message);
    return res.status(500).json({
      error: "Search failed",
      details: err.response?.data || err.message,
    });
  }
};
