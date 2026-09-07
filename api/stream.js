const axios = require("axios");
const crypto = require("crypto");

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
      // try next url
    }
  }
  return cachedList || {};
}

function parseXmlField(xml, field) {
  const match = xml.match(new RegExp(`<${field}>([^<]+)<\/${field}>`));
  return match ? match[1] : null;
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const trackId = req.query.trackId || req.query.id || req.body?.trackId;
  if (!trackId) {
    return res.status(400).json({ error: "Missing trackId" });
  }

  const token = req.headers?.authorization || req.query?.token || req.body?.token;
  const idStr = String(trackId);

  try {
    // 1. Check YM Liberty uncensored DB first
    const libertyList = await getLibertyList();
    if (libertyList && libertyList[idStr]) {
      return res.status(200).json({
        trackId: idStr,
        streamUrl: libertyList[idStr],
        isLiberty: true,
        bitrate: 320,
        format: "mp3",
      });
    }

    // 2. Official track playback via Yandex Music API
    if (!token) {
      return res.status(401).json({
        error: "Трек защищен авторским правом Яндекса. Введите токен Яндекс Плюс в настройках для прослушивания официальных треков.",
        needAuth: true,
        isLiberty: false,
      });
    }

    const proxyBase = "https://ym-proxy.gagayhhad.workers.dev/?url=";
    const authHeader = token.startsWith("OAuth") ? token : `OAuth ${token}`;
    const dlInfoRes = await axios.get(
      proxyBase + encodeURIComponent(`https://api.music.yandex.net/tracks/${trackId}/download-info`),
      {
        headers: {
          Authorization: authHeader,
          "User-Agent": "YandexMusic/5.117.1 (Windows)",
        },
        timeout: 8000,
      }
    );

    const downloadOptions = dlInfoRes.data?.result || [];
    if (!downloadOptions.length) {
      return res.status(404).json({ error: "No download info available", isLiberty: false });
    }

    // Sort by bitrate descending, prefer mp3
    downloadOptions.sort((a, b) => (b.bitrateInKbps || 0) - (a.bitrateInKbps || 0));
    const selectedOption =
      downloadOptions.find((opt) => opt.codec === "mp3") || downloadOptions[0];

    const xmlRes = await axios.get(proxyBase + encodeURIComponent(selectedOption.downloadInfoUrl), {
      headers: {
        Authorization: authHeader,
      },
      timeout: 8000,
    });

    const xml = xmlRes.data;
    const host = parseXmlField(xml, "host");
    const path = parseXmlField(xml, "path");
    const ts = parseXmlField(xml, "ts");
    const s = parseXmlField(xml, "s");

    if (!host || !path || !ts || !s) {
      return res.status(500).json({ error: "Failed to parse download info XML" });
    }

    const hash = crypto
      .createHash("md5")
      .update("XGRSTTXRwy" + path.slice(1) + s)
      .digest("hex");

    const directStreamUrl = `https://${host}/get-mp3/${hash}/${ts}${path}`;

    return res.status(200).json({
      trackId: idStr,
      streamUrl: directStreamUrl,
      isLiberty: false,
      bitrate: selectedOption.bitrateInKbps || 320,
      format: selectedOption.codec || "mp3",
    });
  } catch (err) {
    console.error("Stream resolution error:", err.message);
    const status = err.response?.status || 500;
    return res.status(status).json({
      error: "Failed to resolve audio stream",
      details: err.response?.data || err.message,
      isLiberty: false,
    });
  }
};
