const axios = require('axios');

module.exports = async function (req, res) {
  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ error: "No token provided" });
  }

  try {
    const headers = {
      'Authorization': `OAuth ${token}`,
      'X-Yandex-Music-Client': 'YandexMusicAndroid/24023231'
    };

    const statusRes = await axios.get('https://api.music.yandex.net/account/status', { headers });
    const uid = statusRes.data?.result?.account?.uid;
    
    if (!uid) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const plRes = await axios.get(`https://api.music.yandex.net/users/${uid}/playlists/list`, { headers });
    
    if (!plRes.data.result) {
      return res.json({ playlists: [] });
    }

    const playlists = plRes.data.result
      .filter(p => !p.title || !p.title.startsWith('_ym_stats:'))
      .map(p => ({
        kind: p.kind,
        title: p.title,
        trackCount: p.trackCount,
        coverUri: p.cover?.uri ? "https://" + p.cover.uri.replace("%%", "400x400") : '/favicon.png'
      }));

    res.json({ playlists });
  } catch (error) {
    console.error("Playlists API Error:", error.response?.status, error.response?.data || error.message);
    res.status(500).json({ error: error.message });
  }
};
