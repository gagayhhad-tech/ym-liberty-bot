const axios = require('axios');

module.exports = async function (req, res) {
  const { token, trackId, action } = req.body; // action: 'like' or 'unlike'

  if (!token || !trackId || !action) {
    return res.status(400).json({ error: "Missing parameters" });
  }

  try {
    const headers = {
      'Authorization': `OAuth ${token}`,
      'X-Yandex-Music-Client': 'YandexMusicAndroid/24023231',
      'Content-Type': 'application/x-www-form-urlencoded'
    };

    // First get user ID
    const statusRes = await axios.get('https://api.music.yandex.net/account/status', { headers });
    const uid = statusRes.data?.result?.account?.uid;
    
    if (!uid) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const payload = new URLSearchParams({ 'track-ids': String(trackId) }).toString();
    
    let result;
    if (action === 'like') {
      result = await axios.post(`https://api.music.yandex.net/users/${uid}/likes/tracks/add-multiple`, payload, { headers });
    } else {
      result = await axios.post(`https://api.music.yandex.net/users/${uid}/likes/tracks/remove`, payload, { headers });
    }

    res.json({ success: true, result: result.data });
  } catch (error) {
    console.error("Like API Error:", error.response?.status, error.response?.data || error.message);
    res.status(500).json({ error: error.message, details: error.response?.data });
  }
};
