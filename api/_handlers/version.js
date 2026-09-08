module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const versionData = {
  "versionCode": 12,
  "versionName": "1.0.11",
  "apkUrl": "https://ym-liberty-bot.vercel.app/YMLiberty.apk",
  "changelog": "• Исправлена ошибка службы уведомлений (ForegroundServiceDidNotStartInTimeException)\n• Добавлено стабильное отображение медиа-плеера в шторке Android (API 26-35)\n• Тактильная 3D-анимация обложки: выдвигается вперед при воспроизведении и мягко уходит назад на паузе\n• Кнопка поиска перенесена в правый верхний угол главного экрана\n• Быстрые подсказки поиска и кнопка возврата",
  "releaseDate": "2026-09-08",
  "minSupportedVersion": 1
};

  return res.status(200).json(versionData);
};
