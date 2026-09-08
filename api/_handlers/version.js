module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const versionData = {
  "versionCode": 9,
  "versionName": "1.0.8",
  "apkUrl": "https://ym-liberty-bot.vercel.app/YMLiberty.apk",
  "changelog": "• Оптимизация анимаций до стабильных 60-120 FPS на телефонах (устранена нагрузка на GPU)\n• Исправлена видимая граница света в Моей Волне (добавлено плавное растворение маской)\n• Снижено энергопотребление и нагрев при отображении волны",
  "releaseDate": "2026-09-08",
  "minSupportedVersion": 1
};

  return res.status(200).json(versionData);
};
