module.exports = async (req, res) => {
  const axios = require("axios");
  try {
    const response = await axios.get("https://api.music.yandex.ru/account/status", {
      timeout: 5000,
      headers: {
        "Authorization": "OAuth y0_AgAAAA_DUMMY",
        "User-Agent": "com.yandex.music/5.117 (Android 13; samsung SM-G998B)"
      },
      validateStatus: () => true
    });
    res.json({
      success: true,
      status: response.status,
      data: response.data
    });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
};
