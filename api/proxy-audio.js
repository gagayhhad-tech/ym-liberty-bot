const axios = require("axios");

module.exports = async function (req, res) {
  const targetUrl = req.query.url;
  if (!targetUrl) {
    return res.status(400).send("Missing url parameter");
  }

  try {
    const range = req.headers.range;
    const requestHeaders = {
      "User-Agent": "YandexMusic/5.117.1 (Windows)",
    };
    if (range) {
      requestHeaders["Range"] = range;
    }

    const response = await axios({
      method: "GET",
      url: targetUrl,
      responseType: "stream",
      headers: requestHeaders,
      validateStatus: (status) => status >= 200 && status < 400,
    });

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Range, Content-Type");
    res.setHeader("Access-Control-Expose-Headers", "Content-Range, Content-Length, Accept-Ranges");
    res.setHeader("Accept-Ranges", "bytes");

    if (response.headers["content-range"]) {
      res.setHeader("Content-Range", response.headers["content-range"]);
    }
    if (response.headers["content-length"]) {
      res.setHeader("Content-Length", response.headers["content-length"]);
    }
    if (response.headers["content-type"]) {
      res.setHeader("Content-Type", response.headers["content-type"]);
    }

    res.status(response.status);
    response.data.pipe(res);
  } catch (err) {
    console.error("Audio proxy error:", err.message);
    if (!res.headersSent) {
      res.status(500).send("Audio proxy streaming error: " + err.message);
    }
  }
};
