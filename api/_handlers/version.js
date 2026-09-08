module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const versionData = {
  "versionCode": 15,
  "versionName": "1.0.14",
  "apkUrl": "https://ym-liberty-bot.vercel.app/YMLiberty.apk",
  "changelog": "• Динамический атмосферный фон полноэкранного плеера под цвет обложки трека (стиль Spotify & Apple Music)\n• Замена устаревших системных диалогов alert() на плавные современные уведомления (Toast)\n• Автоматический переход к следующему треку в Волне при временных сетевых ошибках\n• Иконка поиска опущена ниже сейфзоны (не перекрывается статус-баром и вырезом)\n• Удалены неиспользуемые подсказки и жанры из поиска",
  "releaseDate": "2026-09-08",
  "minSupportedVersion": 1
};

  return res.status(200).json(versionData);
};
