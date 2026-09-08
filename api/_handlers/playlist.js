const axios = require('axios');

module.exports = async function (req, res) {
  const { token, kind } = req.query;

  if (!token || kind === undefined) {
    return res.status(400).json({ error: "Missing token or kind" });
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

    const plRes = await axios.get(`https://api.music.yandex.net/users/${uid}/playlists/${kind}`, { headers });
    
    if (!plRes.data.result) {
      return res.json({ tracks: [] });
    }

    const rawTracks = plRes.data.result.tracks || [];
    
    // We need to fetch full track data if they are just track IDs/briefs
    const trackIds = rawTracks.map(t => t.id || t.track?.id).filter(Boolean);
    
    let tracks = [];
    if (trackIds.length > 0) {
      const chunkSize = 200;
      const chunks = [];
      for (let i = 0; i < trackIds.length; i += chunkSize) {
        chunks.push(trackIds.slice(i, i + chunkSize));
      }

      const fetchPromises = chunks.map(chunk => 
        axios.post(
          "https://api.music.yandex.net/tracks",
          new URLSearchParams({ "track-ids": chunk.join(",") }).toString(),
          { headers: { ...headers, "Content-Type": "application/x-www-form-urlencoded" }, timeout: 10000 }
        )
      );

      const trackResponses = await Promise.all(fetchPromises);
      const fetchedTracks = trackResponses.flatMap(r => r.data?.result || []);
      
      const getLibertyList = require('./libertyList');
      const libertyTracks = await getLibertyList();

      tracks = fetchedTracks.map(t => {
        const cover = t.coverUri
          ? "https://" + t.coverUri.replace("%%", "400x400")
          : t.albums?.[0]?.coverUri
          ? "https://" + t.albums[0].coverUri.replace("%%", "400x400")
          : "";

        return {
          id: t.id,
          title: t.title,
          version: t.version || "",
          artists: (t.artists || []).map((a) => a.name).join(", "),
          durationMs: t.durationMs || 0,
          coverUri: cover,
          explicit: Boolean(t.contentWarning === "explicit" || t.explicit),
          isLiberty: Boolean(libertyTracks && libertyTracks[String(t.id)]),
          track: t
        };
      });
    }

    res.json({
      title: plRes.data.result.title,
      coverUri: plRes.data.result.cover?.uri ? "https://" + plRes.data.result.cover.uri.replace("%%", "400x400") : '/favicon.png',
      tracks
    });
  } catch (error) {
    console.error("Playlist API Error:", error.response?.status, error.response?.data || error.message);
    res.status(500).json({ error: error.message });
  }
};
