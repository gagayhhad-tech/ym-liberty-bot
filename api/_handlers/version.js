const fs = require("fs");
const path = require("path");

const CANDIDATES = [
  path.join(__dirname, "..", "..", "public", "version.json"),
  path.join(process.cwd(), "public", "version.json"),
  path.join(__dirname, "version.json"),
];

const FALLBACK = {
  versionCode: 29,
  versionName: "1.1.12",
  apkUrl: "https://ym-liberty-bot.vercel.app/YMLiberty.apk",
  changelog: [
    "Native HttpURLConnection download instead of DownloadManager",
    "Circular download progress indicator",
    "Downloaded track icon in the collection",
    "Fixed active lyric line alignment",
  ],
  releaseDate: "2026-09-24",
  minSupportedVersion: 1,
};

function loadVersion() {
  for (const file of CANDIDATES) {
    try {
      const data = JSON.parse(fs.readFileSync(file, "utf8"));
      if (data && typeof data.versionCode === "number") return data;
    } catch (_) {}
  }
  return FALLBACK;
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  if (req.method === "OPTIONS") return res.status(200).end();

  const data = loadVersion();
  if (!data || typeof data.versionCode !== "number" || !data.apkUrl) {
    return res.status(500).json({ error: "Version metadata unavailable" });
  }

  return res.status(200).json({
    versionCode: data.versionCode,
    versionName: data.versionName,
    apkUrl: data.apkUrl,
    changelog: Array.isArray(data.changelog) ? data.changelog : [],
    releaseDate: data.releaseDate || null,
    minSupportedVersion: data.minSupportedVersion || 1,
  });
};
