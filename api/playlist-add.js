const axios = require('axios');

module.exports = async function (req, res) {
  const { token, kind, trackId, albumId } = req.body || req.query;

  if (!token || !kind || !trackId) {
    return res.status(400).json({ error: "Missing token, kind, or trackId" });
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

    // Get current revision
    const plRes = await axios.get(`https://api.music.yandex.net/users/${uid}/playlists/${kind}`, { headers });
    const revision = plRes.data?.result?.revision || 0;

    const trackObj = { id: String(trackId) };
    if (albumId) trackObj.albumId = String(albumId);

    const diff = JSON.stringify([{
      op: 'insert',
      at: 0,
      tracks: [trackObj]
    }]);

    const changeRes = await axios.post(
      `https://api.music.yandex.net/users/${uid}/playlists/${kind}/change-relative`,
      new URLSearchParams({ diff, revision: String(revision) }).toString(),
      {
        headers: {
          ...headers,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    res.json({ success: true, result: changeRes.data?.result });
  } catch (error) {
    console.error("Playlist Add Error:", error.response?.status, error.response?.data || error.message);
    res.status(500).json({ error: error.response?.data || error.message });
  }
};
