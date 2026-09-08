module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const versionData = {
    versionCode: 4,
    versionName: "1.0.3",
    apkUrl: "https://ym-liberty-bot.vercel.app/YMLiberty.apk",
    changelog: "• Плавный переход между треками (Кроссфейд от 1 до 12 сек)\n• Раздел «Новинки и премьеры» на главной странице по вашим вкусам\n• Автопауза при отключении наушников (Bluetooth и проводных)\n• Повышение плавности воспроизведения и автообновление",
    releaseDate: "2026-09-08",
    minSupportedVersion: 1
  };

  return res.status(200).json(versionData);
};