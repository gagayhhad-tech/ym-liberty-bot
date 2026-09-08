module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const versionData = {
  "versionCode": 14,
  "versionName": "1.0.13",
  "apkUrl": "https://ym-liberty-bot.vercel.app/YMLiberty.apk",
  "changelog": "• Иконка поиска опущена ниже сейфзоны (не перекрывается статус-баром и вырезом камеры)\n• Удалены неиспользуемые блоки рекомендаций и жанров из поиска\n• Поиск перенесен в правый верхний угол, а нижний бар сбалансирован на 3 вкладки\n• Исправлена служба уведомлений (startForeground)\n• Добавлена прямая загрузка обновления",
  "releaseDate": "2026-09-08",
  "minSupportedVersion": 1
};

  return res.status(200).json(versionData);
};
