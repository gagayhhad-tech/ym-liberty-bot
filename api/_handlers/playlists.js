const axios = require('axios');

module.exports = async function (req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const token = req.query.token || req.body?.token || req.headers?.authorization?.replace(/^OAuth\s+/i, '');

  if (!token) {
    return res.status(400).json({ error: "No token provided" });
  }

  try {
    const rawToken = String(token).replace(/^OAuth\s+/i, '').replace(/^Bearer\s+/i, '').trim();
    const headers = {
      'Authorization': `OAuth ${rawToken}`,
      'X-Yandex-Music-Client': 'YandexMusicAndroid/24023231'
    };

    const statusRes = await axios.get('https://api.music.yandex.net/account/status', { headers });
    const uid = statusRes.data?.result?.account?.uid;
    
    if (!uid) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (req.method === 'POST') {
      const { action, title, kind } = req.body || req.query;
      if (action === 'create') {
        const createRes = await axios.post(`https://api.music.yandex.net/users/${uid}/playlists/create`, 
          new URLSearchParams({ title: title || '', visibility: 'private' }).toString(),
          { headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' } }
        );
        return res.json(createRes.data?.result || {});
      }
      if (action === 'rename') {
        const renameRes = await axios.post(`https://api.music.yandex.net/users/${uid}/playlists/${kind}/name`,
          new URLSearchParams({ value: title || '' }).toString(),
          { headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' } }
        );
        return res.json(renameRes.data?.result || {});
      }
    }

    const plRes = await axios.get(`https://api.music.yandex.net/users/${uid}/playlists/list`, { headers });
    
    if (req.query.raw) {
      return res.json({ playlists: plRes.data?.result || [] });
    }

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
