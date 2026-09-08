const axios = require("axios");

const CLIENT_ID = "23cabbbdc6cd418abb4b39c32c41195d";
const CLIENT_SECRET = "53bc75238f0c4d08a118e51fe9203300";

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const action = req.query?.action || req.body?.action;

  try {
    if (action === "code") {
      const params = new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        device_id: "ym_web_" + Math.random().toString(36).substring(2, 12),
        device_name: "Yandex Music Web",
      });

      const response = await axios.post("https://oauth.yandex.ru/device/code", params.toString(), {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        timeout: 8000,
      });

      return res.status(200).json(response.data);
    }

    if (action === "poll") {
      const device_code = req.query?.device_code || req.body?.device_code;
      if (!device_code) {
        return res.status(400).json({ error: "device_code is required" });
      }

      const params = new URLSearchParams({
        grant_type: "device_code",
        code: device_code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
      });

      try {
        const response = await axios.post("https://oauth.yandex.ru/token", params.toString(), {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          timeout: 8000,
        });

        return res.status(200).json({
          status: "success",
          access_token: response.data.access_token,
          expires_in: response.data.expires_in,
        });
      } catch (pollErr) {
        const errData = pollErr.response?.data || {};
        if (errData.error === "authorization_pending") {
          return res.status(200).json({ status: "pending" });
        }
        return res.status(200).json({
          status: "error",
          error: errData.error || "Unknown error",
          error_description: errData.error_description || pollErr.message,
        });
      }
    }

    if (action === "password") {
      const username = req.query?.username || req.body?.username;
      const password = req.query?.password || req.body?.password;
      if (!username || !password) {
        return res.status(400).json({ error: "Username and password required" });
      }

      try {
        const params = new URLSearchParams({
          grant_type: "password",
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          username,
          password,
        });

        const response = await axios.post("https://oauth.yandex.com/token", params.toString(), {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          timeout: 8000,
        });

        return res.status(200).json({
          status: "success",
          access_token: response.data.access_token,
        });
      } catch (passErr) {
        const errData = passErr.response?.data || {};
        return res.status(200).json({
          status: "error",
          error: errData.error || "Login failed",
          error_description: errData.error_description || passErr.message,
        });
      }
    }

    return res.status(400).json({ error: "Invalid action. Supported: code, poll, password" });
  } catch (err) {
    console.error("Auth handler error:", err.message);
    return res.status(500).json({
      error: "Auth service error",
      details: err.response?.data || err.message,
    });
  }
};
