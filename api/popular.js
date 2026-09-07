const axios = require("axios");

// Curated list of iconic uncensored track IDs confirmed in YM Liberty DB
const POPULAR_LIBERTY_IDS = [
  "17198343", // Сектор Газа - Опять сегодня
  "17198411", // Сектор Газа - Наркоман
  "24442524", // Агата Кристи - Моряк
  "25738208", // GUF - Выдох-вдох
  "25168288", // ЛСП - Уровни
  "21220262", // Anacondaz - Радуга
  "21287099", // Anacondaz - Не учи меня как жить
  "25319594", // Anacondaz - Мама, я люблю
  "152973936", // ROCKET - Monday
  "153116884", // ROCKET - Инкассатор
];

let cachedTracks = null;
let lastCacheTime = 0;

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const now = Date.now();
  if (cachedTracks && now - lastCacheTime < 3600000) {
    return res.status(200).json({ tracks: cachedTracks });
  }

  try {
    const tracksRes = await axios.post(
      "https://api.music.yandex.net/tracks",
      new URLSearchParams({ "track-ids": POPULAR_LIBERTY_IDS.join(",") }).toString(),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "YandexMusic/5.117.1 (Windows)",
        },
        timeout: 8000,
      }
    );

    const rawTracks = tracksRes.data?.result || [];
    const tracks = rawTracks.map((t) => {
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
        isLiberty: true,
        explicit: true,
      };
    });

    cachedTracks = tracks;
    lastCacheTime = now;

    return res.status(200).json({ tracks });
  } catch (err) {
    console.error("Popular tracks fetch error:", err.message);
    return res.status(500).json({ error: "Failed to fetch popular tracks" });
  }
};
