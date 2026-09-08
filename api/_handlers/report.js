const axios = require('axios');

module.exports = async function (req, res) {
  const { track_id, replaced } = req.body || req.query;

  if (!track_id) {
    return res.status(400).json({ error: "Missing track_id" });
  }

  try {
    const response = await axios.post(
      'https://ym-liberty-bot.vercel.app/api/bot',
      {
        type: 'report',
        track_id: Number(track_id),
        replaced: Boolean(replaced)
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error("Report Proxy Error:", error.response?.status, error.response?.data || error.message);
    res.status(500).json({ error: error.message });
  }
};
