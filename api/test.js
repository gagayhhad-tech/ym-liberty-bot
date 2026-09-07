module.exports = async (req, res) => {
  const axios = require("axios");
  try {
    const response = await axios.get("https://api.music.yandex.net/account/status", {
      timeout: 5000,
      validateStatus: () => true // resolve all statuses
    });
    res.json({
      success: true,
      status: response.status,
      data: response.data
    });
  } catch (err) {
    res.json({
      success: false,
      error: err.message,
      code: err.code
    });
  }
};
