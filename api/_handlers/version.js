module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const versionData = {
  "versionCode": 8,
  "versionName": "1.0.7",
  "apkUrl": "https://ym-liberty-bot.vercel.app/YMLiberty.apk",
  "changelog": "• Живые светящиеся полосы-визуализаторы в Моей Волне (пульсируют под частоты и бас)\n• Адаптация всех анимаций под 120 Гц дисплеи (сверхплавные жесты без рывков)\n• Интерактивные свайпы на мини-плеере с кинетическим вылетом треков\n• Свайп вправо для возврата с карточек артиста и альбома\n• Разблокирован скролл на главном экране Моей Волны",
  "releaseDate": "2026-09-08",
  "minSupportedVersion": 1
};

  return res.status(200).json(versionData);
};
