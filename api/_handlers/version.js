const fs = require("fs");
const path = require("path");

// Version metadata is read from public/version.json so the release only has to
// be updated in one place.
//
// IMPORTANT: on Vercel the serverless bundle does NOT include ../../public, so
// a plain relative readFileSync throws ENOENT and the endpoint answers 500.
// That silently broke /api/version once. We therefore probe several locations
// and, if none of them work, fall back to values embedded at deploy time.
const CANDIDATES = [
  path.join(__dirname, "..", "..", "public", "version.json"), // local / Amvera
  path.join(process.cwd(), "public", "version.json"),         // vercel cwd = repo root
  path.join(__dirname, "version.json"),                       // bundled next to handler
];

// Keep this as a last-resort fallback only. It must match public/version.json.
const FALLBACK = {
  versionCode: 28,
  versionName: "1.1.11",
  apkUrl: "https://ym-liberty-bot.vercel.app/YMLiberty.apk",
  changelog: [
    "Обычная загрузка треков теперь запрашивает FLAC",
    "Кэш использует MP3 320 kbps для экономии памяти",
    "Добавлен контроль фактического статуса DownloadManager и причины ошибки",
    "Анимация синхронизированных текстов стала плавнее",
  ],
  releaseDate: "2026-09-24",
  minSupportedVersion: 1,
};

function loadVersion() {
  for (const file of CANDIDATES) {
    try {
      const raw = fs.readFileSync(file, "utf8");
      const data = JSON.parse(raw);
      if (data && typeof data.versionCode === "number") return data;
    } catch (e) {
      // try the next candidate
    }
  }
  return FALLBACK;
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const data = loadVersion();

  // A 200 with a malformed body would make the in-app updater believe it is up
  // to date, so the payload is always validated before being sent.
  if (!data || typeof data.versionCode !== "number" || !data.apkUrl) {
    return res.status(500).json({ error: "Version metadata unavailable" });
  }

  const changelog = Array.isArray(data.changelog)
    ? data.changelog
    : String(data.changelog || "").split("\n").filter(Boolean);

  return res.status(200).json({
    versionCode: data.versionCode,
    versionName: data.versionName,
    apkUrl: data.apkUrl,
    changelog: changelog,
    releaseDate: data.releaseDate || null,
    minSupportedVersion: data.minSupportedVersion || 1,
  });
};


