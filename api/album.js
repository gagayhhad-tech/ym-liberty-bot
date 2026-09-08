const axios = require('axios');

module.exports = async function (req, res) {
  const { token, id } = req.query;

  if (!id) {
    return res.status(400).json({ error: "Missing album id" });
  }

  try {
    const headers = {
      'X-Yandex-Music-Client': 'YandexMusicAndroid/24023231'
    };
    if (token) {
      headers['Authorization'] = `OAuth ${token}`;
    }

    const albumRes = await axios.get(`https://api.music.yandex.net/albums/${id}/with-tracks`, { headers });
    const albumData = albumRes.data.result;

    if (!albumData) {
      return res.status(404).json({ error: "Album not found" });
    }

    const getLibertyList = require('./libertyList');
    const libertyTracks = await getLibertyList();

    const rawTracks = (albumData.volumes || []).flat();

    const tracks = rawTracks.map(t => {
      const cover = t.coverUri
        ? "https://" + t.coverUri.replace("%%", "400x400")
        : albumData.coverUri
        ? "https://" + albumData.coverUri.replace("%%", "400x400")
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

    res.json({
      id: albumData.id,
      title: albumData.title,
      artists: albumData.artists || [],
      year: albumData.year,
      coverUri: albumData.coverUri ? "https://" + albumData.coverUri.replace("%%", "400x400") : '/favicon.png',
      tracks
    });
  } catch (error) {
    console.error("Album API Error:", error.response?.status, error.response?.data || error.message);
    res.status(500).json({ error: error.message });
  }
};
