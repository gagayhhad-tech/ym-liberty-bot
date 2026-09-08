module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const versionData = {
    versionCode: 3,
    versionName: "1.0.2",
    apkUrl: "https://ym-liberty-bot.vercel.app/YMLiberty.apk",
    changelog: "• Исправлен фоновый учет времени прослушивания («В потоке» и «Минут всего»)\n• Исправлена навигация жестов Android и позиция мини-плеера\n• Добавлено запоминание треков в Моей Волне (без повторов)\n• Добавлена система автообновления приложения",
    releaseDate: "2026-09-08",
    minSupportedVersion: 1
  };

  return res.status(200).json(versionData);
};