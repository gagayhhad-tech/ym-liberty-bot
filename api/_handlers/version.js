module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const versionData = {
    versionCode: 6,
    versionName: "1.0.5",
    apkUrl: "https://ym-liberty-bot.vercel.app/YMLiberty.apk",
    changelog: "• Актуальные новинки 2026 года из официальных редакционных подборок Яндекса\n• Полноценное переключение настроений в Моей Волне (Бодрое, Спокойное, Радостное, Открытия)\n• Бесшовное обновление очереди при смене вайба\n• Улучшена стабильность автообновления и кэширования",
    releaseDate: "2026-09-08",
    minSupportedVersion: 1
  };

  return res.status(200).json(versionData);
};