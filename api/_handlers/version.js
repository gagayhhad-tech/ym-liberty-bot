module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const versionData = {
  "versionCode": 13,
  "versionName": "1.0.12",
  "apkUrl": "https://ym-liberty-bot.vercel.app/YMLiberty.apk",
  "changelog": "• Кнопка поиска перенесена в правый верхний угол (как в Яндекс Музыке и Spotify)\n• Вкладка поиска убрана из нижнего меню, навигация сбалансирована на 3 кнопки\n• Исправлена служба фонового воспроизведения и уведомлений (startForeground)\n• Улучшен нативный установщик обновлений и добавлена прямая загрузка через браузер\n• Тактильная 3D-анимация обложки в плеере",
  "releaseDate": "2026-09-08",
  "minSupportedVersion": 1
};

  return res.status(200).json(versionData);
};
