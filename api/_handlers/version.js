const fs = require("fs");
const path = require("path");

// Single source of truth for the released build. The APK, the web app and this
// endpoint are all versioned here, so a release only has to update one file
// (public/version.json). Previously the values were duplicated in this handler
// and silently drifted out of sync with version.json.
const VERSION_FILE = path.join(__dirname, "..", "..", "public", "version.json");

function loadVersion() {
  const raw = fs.readFileSync(VERSION_FILE, "utf8");
  const data = JSON.parse(raw);
  if (!data || typeof data.versionCode !== "number") {
    throw new Error("version.json is missing a numeric versionCode");
  }
  return data;
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const data = loadVersion();
    // The client also fetches /version.json directly, so both shapes are kept
    // identical: changelog stays an array here as well.
    return res.status(200).json({
      versionCode: data.versionCode,
      versionName: data.versionName,
      apkUrl: data.apkUrl,
      changelog: Array.isArray(data.changelog)
        ? data.changelog
        : String(data.changelog || "").split("\n").filter(Boolean),
      releaseDate: data.releaseDate || null,
      minSupportedVersion: data.minSupportedVersion || 1,
    });
  } catch (err) {
    console.error("version handler error:", err);
    // Never let the updater see a 200 with a broken payload: it would make the
    // app believe it is up to date.
    return res.status(500).json({ error: "Version metadata unavailable" });
  }
};