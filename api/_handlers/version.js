module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const versionData = {
    versionCode: 5,
    versionName: "1.0.4",
    apkUrl: "https://ym-liberty-bot.vercel.app/YMLiberty.apk",
    changelog: "• Исправлен раздел «Новинки и премьеры» — теперь показывает реальные новинки\n• Новинки обновляются автоматически каждые 30 минут\n• Исправлена загрузка треков из альбомных новинок\n• Исправлен тумблер кроссфейда в настройках",
    releaseDate: "2026-09-08",
    minSupportedVersion: 1
  };

  return res.status(200).json(versionData);
};