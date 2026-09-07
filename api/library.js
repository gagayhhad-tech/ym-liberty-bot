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

  const token = req.headers?.authorization || req.query?.token;
  if (!token) {
    return res.status(401).json({ error: "Authorization token required" });
  }

  const authHeader = token.startsWith("OAuth") ? token : `OAuth ${token}`;
  const headers = {
    Authorization: authHeader,
    "User-Agent": "YandexMusic/5.117.1 (Windows)",
  };

  try {
    // 1. Get user status & UID
    const statusRes = await axios.get("https://api.music.yandex.net/account/status", {
      headers,
      timeout: 8000,
    });
    const account = statusRes.data?.result?.account || {};
    const uid = account.uid;
    const hasPlus = Boolean(statusRes.data?.result?.plus?.hasPlus);

    if (!uid) {
      return res.status(401).json({ error: "Invalid token or account not found" });
    }

    // 2. Get liked tracks
    const [likesRes, libertyTracks] = await Promise.all([
      axios.get(`https://api.music.yandex.net/users/${uid}/likes/tracks`, {
        headers,
        timeout: 8000,
      }),
      getLibertyList(),
    ]);

    const likedItems = likesRes.data?.result?.library?.tracks || [];
    const trackIds = likedItems.slice(0, 50).map((t) => t.id);

    let tracks = [];
    if (trackIds.length > 0) {
      const tracksRes = await axios.post(
        "https://api.music.yandex.net/tracks",
        new URLSearchParams({ "track-ids": trackIds.join(",") }).toString(),
        {
          headers: {
            ...headers,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          timeout: 8000,
        }
      );

      const rawTracks = tracksRes.data?.result || [];
      tracks = rawTracks.map((t) => {
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
    }

    return res.status(200).json({
      user: {
        uid,
        login: account.login,
        fullName: account.fullName || account.displayName || account.login,
        hasPlus,
      },
      totalLiked: likedItems.length,
      tracks,
    });
  } catch (err) {
    console.error("Library fetch error:", err.message);
    return res.status(500).json({
      error: "Failed to fetch user library",
      details: err.response?.data || err.message,
    });
  }
};
