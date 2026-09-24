const fs = require("fs");
const path = require("path");

const CANDIDATES = [
  path.join(__dirname, "..", "..", "public", "version.json"),
  path.join(process.cwd(), "public", "version.json"),
  path.join(__dirname, "version.json"),
];

const FALLBACK = {
  versionCode: 40,
  versionName: "1.1.23",
  apkUrl: "https://ym-liberty-bot.vercel.app/YMLiberty.apk",
  changelog: [
    "Fixed startup crash in the offline-download bridge",
    "Centered the Wave hero and added a soft animated ambient glow",
    "Added swipe navigation and mood/genre filters in Collection",
    "Added offline downloads with MediaStore publishing on Android 10+",
    "Pause on headphone disconnect; resume only after an automatic pause",
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









