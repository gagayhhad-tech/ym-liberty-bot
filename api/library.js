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

  let token = req.headers?.authorization || req.query?.token || "";
  token = token.trim();

  if (!token) {
    return res.status(401).json({ error: "Authorization token required" });
  }

  // Strip "OAuth " / "Bearer " prefix if already present, then rebuild cleanly
  const rawToken = token.replace(/^OAuth\s+/i, "").replace(/^Bearer\s+/i, "").trim();

  if (!rawToken || rawToken.length < 8) {
    return res.status(401).json({ error: "Токен слишком короткий или недействительный" });
  }

  const authHeader = `OAuth ${rawToken}`;
  const headers = {
    Authorization: authHeader,
    "User-Agent": "com.yandex.music/5.117 (Android 13; samsung SM-G998B)",
    "X-Yandex-Music-Client": "YandexMusicAndroid/24023621",
    "Accept": "application/json",
    "Accept-Language": "ru",
  };

  try {
    // 1. Get user status & UID
    const statusRes = await axios.get("https://api.music.yandex.ru/account/status", {
      headers,
      timeout: 10000,
    });

    console.log("Status response code:", statusRes.status);
    console.log("Status response result keys:", Object.keys(statusRes.data?.result || {}));

    const account = statusRes.data?.result?.account || {};
    const uid = account.uid;
    const hasPlus = Boolean(statusRes.data?.result?.plus?.hasPlus);

    if (!uid) {
      console.error("No uid in account response:", JSON.stringify(statusRes.data?.result || {}));
      return res.status(401).json({
        error: "Аккаунт не найден. Проверьте токен — он должен быть в формате y0_... или OAuth y0_...",
        debug: {
          status: statusRes.status,
          resultKeys: Object.keys(statusRes.data?.result || {}),
          accountKeys: Object.keys(account),
        }
      });
    }

    // 2. Get liked tracks
    const [likesRes, libertyTracks] = await Promise.all([
      axios.get(`https://api.music.yandex.ru/users/${uid}/likes/tracks`, {
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
        "https://api.music.yandex.ru/tracks",
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
    const errStatus = err.response?.status;
    const errData = err.response?.data;
    console.error("Library fetch error:", err.message, "| HTTP status:", errStatus, "| body:", JSON.stringify(errData));

    if (errStatus === 401 || errStatus === 403) {
      return res.status(401).json({
        error: "Токен недействителен или истёк. Выполните вход заново.",
        details: errData,
      });
    }

    return res.status(500).json({
      error: `Не удалось получить данные аккаунта (HTTP ${errStatus || 'none'}): ${err.message}`,
      details: err.message,
      httpStatus: errStatus,
    });
  }
};
