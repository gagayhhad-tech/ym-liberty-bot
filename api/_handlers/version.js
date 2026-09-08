module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const versionData = {
  "versionCode": 16,
  "versionName": "1.0.15",
  "apkUrl": "https://ym-liberty-bot.vercel.app/YMLiberty.apk",
  "changelog": "• Исправлено зацикливание и повторение треков в «Моей Волне»: корректная передача параметров очереди в Ротор Яндекса\n• Яркий динамический фон полноэкранного плеера: насыщенное размытие цветов обложки вместо черного экрана\n• Тактильная 3D-анимация обложки: выдвижение вперед при воспроизведении и мягкое отдаление на паузе",
  "releaseDate": "2026-09-08",
  "minSupportedVersion": 1
};

  return res.status(200).json(versionData);
};
