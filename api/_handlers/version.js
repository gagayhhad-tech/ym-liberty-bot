module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const versionData = {
  "versionCode": 11,
  "versionName": "1.0.10",
  "apkUrl": "https://ym-liberty-bot.vercel.app/YMLiberty.apk",
  "changelog": "• Восстановлено отображение медиа-плеера в шторке уведомлений (startForegroundService)\n• Тактильная 3D-анимация обложки: выдвигается вперед при воспроизведении и мягко уходит назад на паузе\n• Кнопка поиска перенесена в правый верхний угол главного экрана\n• Добавлены быстрые жанровые подсказки в поиске и кнопка возврата",
  "releaseDate": "2026-09-08",
  "minSupportedVersion": 1
};

  return res.status(200).json(versionData);
};
