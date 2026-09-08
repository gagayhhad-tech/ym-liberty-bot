module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const versionData = {
  "versionCode": 7,
  "versionName": "1.0.6",
  "apkUrl": "https://ym-liberty-bot.vercel.app/YMLiberty.apk",
  "changelog": "• Живой аудио-реактивный фон в Моей Волне\n• Адаптация цветов волны под обложку трека\n• Управление свайпами (свайп вниз — закрыть плеер, свайп влево/вправо — следующий/предыдущий трек)\n• Исправлено управление воспроизведением в шторке уведомлений на Android 12+",
  "releaseDate": "2026-09-08",
  "minSupportedVersion": 1
};

  return res.status(200).json(versionData);
};
