const axios = require('axios');

module.exports = async function (req, res) {
  const { token, batchId, trackId, type, duration, station } = req.body;

  if (!token || !batchId || !trackId) {
    return res.status(400).json({ error: "Missing required parameters" });
  }

  try {
    const headers = {
      'Authorization': `OAuth ${token}`,
      'X-Yandex-Music-Client': 'YandexMusicAndroid/24023231'
    };

    const cleanStation = station || 'user:onyourwave';
    const body = {
      type: type || 'trackFinished',
      timestamp: new Date().toISOString(),
      trackId: String(trackId),
      from: cleanStation.startsWith('track:') ? 'mobile-radio-track' : 'mobile-radio-user-onyourwave',
      totalPlayedSeconds: duration !== undefined ? duration : 0
    };

    const fbRes = await axios.post(
      `https://api.music.yandex.net/rotor/station/${encodeURIComponent(cleanStation)}/feedback?batch-id=${encodeURIComponent(batchId)}`,
      body,
      { headers }
    );
    
    res.json({ success: true, result: fbRes.data });
  } catch (error) {
    console.error("Feedback API Error:", error.response?.status, error.response?.data || error.message);
    res.status(500).json({ error: error.message });
  }
};
